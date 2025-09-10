/**
 * Crypto Prices Module
 * Shared JavaScript module for displaying cryptocurrency prices across all pages
 */

class CryptoPrices {
  constructor(config = {}) {
    // Configuration with defaults
    this.config = {
      apiUrl: config.apiUrl || "https://min-api.cryptocompare.com/data/pricemultifull?fsyms=ETH,BTC,SOL&tsyms=USD",
      trackedSymbols: config.trackedSymbols || ["ETH", "BTC", "SOL"],
      updateInterval: config.updateInterval || 10000, // 10 seconds
      containerSelector: config.containerSelector || '#prices-expand-section',
      pricesListSelector: config.pricesListSelector || '#prices-list',
      lastUpdateSelector: config.lastUpdateSelector || '#last-update',
      showPricesBtnSelector: config.showPricesBtnSelector || '#show-prices-btn',
      ...config
    };

    // State variables
    this.prevPrices = {};
    this.prevUpdateTime = null;
    this.userTimezone = null;
    this.pricesExpanded = false;
    this.updateIntervalId = null;

    // Initialize prevPrices for tracked symbols
    this.config.trackedSymbols.forEach(symbol => {
      this.prevPrices[symbol] = null;
    });

    // DOM elements (will be set during initialization)
    this.elements = {};
  }

  // Function to get user's timezone (hybrid approach)
  async getUserTimezone() {
    try {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (browserTimezone) {
        console.log('Using browser timezone:', browserTimezone);
        return browserTimezone;
      }
      throw new Error('Browser timezone not available');
    } catch (error) {
      console.log('Browser timezone detection failed, falling back to IP-based lookup:', error);
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const ipTimezone = data.timezone || 'UTC';
        console.log('Using IP-based timezone:', ipTimezone);
        return ipTimezone;
      } catch (ipError) {
        console.error('IP-based timezone detection failed:', ipError);
        return 'UTC';
      }
    }
  }

  // Function to get current time in user's timezone
  async getCurrentTimeInTimezone() {
    if (!this.userTimezone) {
      this.userTimezone = await this.getUserTimezone();
    }

    const now = new Date();
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: this.userTimezone,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
      });

      const parts = formatter.formatToParts(now);
      const timeParts = {
        hours: parseInt(parts.find(part => part.type === 'hour').value, 10),
        minutes: parseInt(parts.find(part => part.type === 'minute').value, 10),
        seconds: parseInt(parts.find(part => part.type === 'second').value, 10),
        ampm: parts.find(part => part.type === 'dayPeriod')?.value || (now.getHours() >= 12 ? 'PM' : 'AM')
      };

      console.log(`Current time in ${this.userTimezone}: ${timeParts.hours}:${timeParts.minutes}:${timeParts.seconds} ${timeParts.ampm}`);
      return timeParts;
    } catch (error) {
      console.error('Error converting to timezone, using local time:', error);
      const hours = now.getHours();
      return {
        hours: hours % 12 || 12,
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
        ampm: hours >= 12 ? 'PM' : 'AM'
      };
    }
  }

  // Create price container element
  createPriceContainer(symbol) {
    const container = document.createElement('div');
    container.className = 'price-container hide';
    container.id = `expand-${symbol.toLowerCase()}-container`;
    container.innerHTML = `
      <div style="display: flex; align-items: center;">
        <div class="spinner" id="expand-${symbol.toLowerCase()}-spinner" style="margin-right: 5px;"></div>
        <img id="expand-${symbol.toLowerCase()}-icon" src="" alt="${symbol} Icon">
        <h1 id="expand-${symbol.toLowerCase()}-price">${symbol}: Loading...</h1>
      </div>
      <span class="price-ticker" id="expand-${symbol.toLowerCase()}-ticker"></span>
    `;

    container.addEventListener('click', () => {
      window.location.href = '/prices';
    });

    return container;
  }

  // Update prices display
  updatePrices(prices) {
    if (!prices) return;

    let pricesChanged = false;

    this.config.trackedSymbols.forEach(symbol => {
      if (prices.RAW && prices.RAW[symbol] && prices.RAW[symbol].USD) {
        const data = prices.RAW[symbol].USD;
        const priceElement = document.getElementById(`expand-${symbol.toLowerCase()}-price`);
        const ticker = document.getElementById(`expand-${symbol.toLowerCase()}-ticker`);
        const spinner = document.getElementById(`expand-${symbol.toLowerCase()}-spinner`);
        const iconElement = document.getElementById(`expand-${symbol.toLowerCase()}-icon`);

        if (!priceElement || !ticker) return;

        const newPrice = data.PRICE.toFixed(2);
        const prevPrice = this.prevPrices[symbol] !== null ? this.prevPrices[symbol].toFixed(2) : newPrice;

        if (newPrice !== prevPrice) pricesChanged = true;

        if (typeof $ !== 'undefined' && $.fn.countTo) {
          $(priceElement).countTo({
            from: parseFloat(prevPrice),
            to: parseFloat(newPrice),
            speed: 1800,
            refreshInterval: 50,
            decimals: 2,
            formatter: function(value, options) {
              return `${symbol}: $${value.toFixed(options.decimals)}`;
            }
          });
        } else {
          priceElement.textContent = `${symbol}: $${newPrice}`;
        }

        if (spinner) spinner.style.display = 'none';

        if (iconElement && data.IMAGEURL) {
          iconElement.src = `https://www.cryptocompare.com${data.IMAGEURL}`;
          iconElement.onload = () => { iconElement.style.opacity = '1'; };
          if (iconElement.complete) iconElement.style.opacity = '1';
        }

        const change24h = data.CHANGEPCT24HOUR.toFixed(2);
        const changeSymbol = change24h >= 0 ? '▲' : '▼';
        const changeClass = change24h >= 0 ? 'up' : 'down';
        const prevChange = ticker.dataset.prevChange ? parseFloat(ticker.dataset.prevChange) : 0;

        if (typeof $ !== 'undefined' && $.fn.countTo) {
          $(ticker).countTo({
            from: prevChange,
            to: Math.abs(change24h),
            speed: 1800,
            refreshInterval: 50,
            decimals: 2,
            formatter: function(value, options) {
              return `${changeSymbol} ${value.toFixed(options.decimals)}%`;
            }
          });
        } else {
          ticker.textContent = `${changeSymbol} ${Math.abs(change24h)}%`;
        }

        ticker.className = `price-ticker ${changeClass}`;
        ticker.dataset.prevChange = Math.abs(change24h);
        this.prevPrices[symbol] = data.PRICE;
      }
    });

    if (pricesChanged || !this.prevUpdateTime) {
      this.updateTimestamp();
    }
  }

  // ✅ Fixed: Update timestamp display
  // Update timestamp display in 00:00:00 AM/PM format
async updateTimestamp() {
  const timeData = await this.getCurrentTimeInTimezone();
  const hours = String(timeData.hours).padStart(2, '0');   // force 2 digits
  const minutes = String(timeData.minutes).padStart(2, '0');
  const seconds = String(timeData.seconds).padStart(2, '0');
  const ampm = timeData.ampm;

  if (typeof $ !== 'undefined' && $.fn.countTo) {
      $('#last-update-hours').countTo({
          from: parseInt($('#last-update-hours').text()) || 0,
          to: parseInt(hours),
          speed: 700,
          refreshInterval: 50,
          formatter: function(value) {
              return String(Math.round(value)).padStart(2, '0');
          }
      });

      $('#last-update-minutes').countTo({
          from: parseInt($('#last-update-minutes').text()) || 0,
          to: parseInt(minutes),
          speed: 700,
          refreshInterval: 50,
          formatter: function(value) {
              return String(Math.round(value)).padStart(2, '0');
          }
      });

      $('#last-update-seconds').countTo({
          from: parseInt($('#last-update-seconds').text()) || 0,
          to: parseInt(seconds),
          speed: 700,
          refreshInterval: 50,
          formatter: function(value) {
              return String(Math.round(value)).padStart(2, '0');
          }
      });
  } else {
      // fallback without animation
      $('#last-update-hours').text(hours);
      $('#last-update-minutes').text(minutes);
      $('#last-update-seconds').text(seconds);
  }

  // AM/PM update
  $('#last-update-ampm').text(ampm);

  this.prevUpdateTime = timeData;
}


  // Fetch prices from API
  async fetchPrices() {
    try {
      const response = await fetch(this.config.apiUrl);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching prices:', error);
      return null;
    }
  }

  // Initialize the prices module
  async init() {
    this.elements.container = document.querySelector(this.config.containerSelector);
    this.elements.pricesList = document.querySelector(this.config.pricesListSelector);
    this.elements.showPricesBtn = document.querySelector(this.config.showPricesBtnSelector);
    this.elements.lastUpdate = document.querySelector(this.config.lastUpdateSelector);

    if (!this.elements.container || !this.elements.pricesList) {
      console.error('Required DOM elements not found for crypto prices');
      return;
    }

    if (this.elements.showPricesBtn) {
      this.elements.showPricesBtn.onclick = () => this.togglePrices();
    }

    await this.initPrices();
  }

  // Initialize prices display
  async initPrices() {
    this.elements.pricesList.innerHTML = '';

    this.config.trackedSymbols.forEach(symbol => {
      this.elements.pricesList.appendChild(this.createPriceContainer(symbol));
    });

    const priceContainers = this.elements.container.querySelectorAll('.price-container');
    priceContainers.forEach((el, i) => {
      el.classList.remove('hide');
      setTimeout(() => {
        el.classList.add('animate');
      }, 100 * i);
    });

    const initialPrices = await this.fetchPrices();
    this.updatePrices(initialPrices);

    this.updateIntervalId = setInterval(async () => {
      const prices = await this.fetchPrices();
      this.updatePrices(prices);
    }, this.config.updateInterval);
  }

  // Toggle prices section visibility
  togglePrices() {
      this.pricesExpanded = !this.pricesExpanded;
      const priceContainers = this.elements.container.querySelectorAll('.price-container');
    
      if (this.pricesExpanded) {
        // ✅ Make visible first
        this.elements.container.style.display = 'block';
    
        requestAnimationFrame(() => {
          this.elements.container.classList.add('expanded');
          this.elements.container.style.maxHeight = '1000px';
          this.elements.container.style.opacity = '1';
        });
    
        if (!this.elements.container.dataset.inited) {
          this.initPrices();
          this.elements.container.dataset.inited = '1';
        } else {
          priceContainers.forEach((el, i) => {
            el.classList.remove('hide');
            setTimeout(() => el.classList.add('animate'), 100 * i);
          });
        }
      } else {
        // ✅ Start the collapse animation
        this.elements.container.classList.remove('expanded');
        this.elements.container.style.maxHeight = '0';
        this.elements.container.style.opacity = '0';
    
        priceContainers.forEach((el, i) => {
          setTimeout(() => {
            el.classList.remove('animate');
            el.classList.add('hide');
          }, 100 * (priceContainers.length - 1 - i));
        });
    
        // ✅ Wait for CSS transition to finish before removing from flow
        const transitionTime = 700; // match CSS max-height transition
        setTimeout(() => {
          this.elements.container.style.display = 'none';
        }, transitionTime);
      }
    }
    

  // Destroy the instance and clean up
  destroy() {
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }
  }
}

// Auto-initialize if DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  const container = document.querySelector('#prices-expand-section');
  const showBtn = document.querySelector('#show-prices-btn');

  if (container && showBtn) {
    window.cryptoPrices = new CryptoPrices();
    window.cryptoPrices.init();
  }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CryptoPrices;
}
