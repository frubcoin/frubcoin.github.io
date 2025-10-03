/**
 * Crypto Prices Full Module
 * Complete cryptocurrency prices page with charts and advanced features
 */

class CryptoPricesFull {
  constructor(config = {}) {
    // Configuration with defaults
    this.config = {
      apiUrl: config.apiUrl || "https://min-api.cryptocompare.com/data/pricemultifull?fsyms=ETH,BTC,SOL&tsyms=USD",
      historyApiUrl: config.historyApiUrl || "https://min-api.cryptocompare.com/data/v2/histominute?fsym=ETH&tsym=USD&limit=10",
      trackedSymbols: config.trackedSymbols || ["ETH", "BTC", "SOL"],
      updateInterval: config.updateInterval || 10000, // 10 seconds
      historyUpdateInterval: config.historyUpdateInterval || 60000, // 60 seconds
      ...config
    };

    // State variables
    this.prevPrices = {};
    this.prevUpdateTime = { hour: null, minute: null, second: null, ampm: null };
    this.userTimezone = null;
    this.selectedCoin = 'ETH';
    this.chart = null;
    this.currentTimeRange = "24h";
    this.chartUpdateInterval = null;
    this.moveable = null;
    this.initialTimeSet = false;
    this.vantaEffect = null;

    // Initialize prevPrices for tracked symbols
    this.config.trackedSymbols.forEach(symbol => {
      this.prevPrices[symbol] = null;
    });

    // DOM elements (will be set during initialization)
    this.elements = {};
  }

  // Function to get user's timezone based on IP
  async getUserTimezone() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.log('IP detection failed, using browser timezone:', error);
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
  }

  // Function to get current time in user's timezone
  getCurrentTimeInTimezone() {
    const now = new Date();
    if (this.userTimezone) {
      // Convert to user's timezone
      const timeInTimezone = new Date(now.toLocaleString("en-US", { timeZone: this.userTimezone }));
      return {
        hours: timeInTimezone.getHours(),
        minutes: timeInTimezone.getMinutes(),
        seconds: timeInTimezone.getSeconds()
      };
    } else {
      // Fallback to local time
      return {
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds()
      };
    }
  }

  // Set initial load timestamp once
  setInitialLoadTimestampOnce() {
    if (this.initialTimeSet) return;
    const timeData = this.getCurrentTimeInTimezone();
    let hours = timeData.hours;
    const minutes = timeData.minutes;
    const seconds = timeData.seconds;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12; hours = hours ? hours : 12;
    
    if (this.elements.initialLoadHour) this.elements.initialLoadHour.innerText = (hours < 10 ? '0' : '') + hours;
    if (this.elements.initialLoadMinute) this.elements.initialLoadMinute.innerText = (minutes < 10 ? '0' : '') + minutes;
    if (this.elements.initialLoadSecond) this.elements.initialLoadSecond.innerText = (seconds < 10 ? '0' : '') + seconds;
    if (this.elements.initialLoadAmPm) this.elements.initialLoadAmPm.innerText = ampm;
    this.initialTimeSet = true;
  }

  // Fetch prices from API
  async fetchPrices() {
    const apiUrl = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${this.config.trackedSymbols.join(',')}&tsyms=USD`;
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching prices:', error);
      return null;
    }
  }

  // Fetch price history for charts
  async fetchHistory(coin, timeRange = "10m") {
    let limit, endpoint;
    
    switch(timeRange) {
      case "10m":
        limit = 10;
        endpoint = "histominute";
        break;
      case "1h":
        limit = 60;
        endpoint = "histominute";
        break;
      case "6h":
        limit = 36;
        endpoint = "histohour";
        break;
      case "24h":
        limit = 24;
        endpoint = "histohour";
        break;
      case "7d":
        limit = 7;
        endpoint = "histoday";
        break;
      case "1y":
        limit = 365;
        endpoint = "histoday";
        break;
    }

    const response = await fetch(`https://min-api.cryptocompare.com/data/v2/${endpoint}?fsym=${coin}&tsym=USD&limit=${limit}`);
    const data = await response.json();
    return data.Data.Data;
  }

  // Update globe color based on price changes
  updateGlobeColor(prices) {
    if (!prices || !prices.RAW) return;
    
    const changes = this.config.trackedSymbols.map(symbol => {
      return prices.RAW[symbol] ? prices.RAW[symbol].USD.CHANGEPCT24HOUR : 0;
    });
    
    const overallChange = changes.reduce((sum, change) => sum + change, 0);
    
    if (this.vantaEffect && this.vantaEffect.type === "GLOBE") {
      this.vantaEffect.setOptions({
        color2: overallChange >= 0 ? 0x4CAF50 : 0xFF5722 // Green if up, Red if down
      });
    }
  }

  // Update prices display
  updatePrices(prices) {
    if (!prices) return;
    
    let pricesChanged = false;
    
    this.config.trackedSymbols.forEach(coin => {
      if (prices.RAW && prices.RAW[coin] && prices.RAW[coin].USD) {
        const data = prices.RAW[coin].USD;
        const priceElement = document.getElementById(`${coin.toLowerCase()}-price`);
        const ticker = document.getElementById(`${coin.toLowerCase()}-ticker`);
        const spinner = document.getElementById(`${coin.toLowerCase()}-spinner`);
        const iconElement = document.getElementById(`${coin.toLowerCase()}-icon`);
        
        if (!priceElement || !ticker) return;
        
        const newPrice = data.PRICE.toFixed(2);
        const prevPrice = this.prevPrices[coin] !== null ? this.prevPrices[coin].toFixed(2) : newPrice;
        
        if (newPrice !== prevPrice) pricesChanged = true;
        
        // Animate price using jQuery.countTo if available
        if (typeof $ !== 'undefined' && $.fn.countTo) {
          $(priceElement).countTo({
            from: parseFloat(prevPrice),
            to: parseFloat(newPrice),
            speed: 1800,
            refreshInterval: 50,
            decimals: 2,
            formatter: function(value, options) {
              return `${coin}: $${value.toFixed(options.decimals)}`;
            }
          });
        } else {
          // Fallback if jQuery.countTo is not available
          priceElement.textContent = `${coin}: $${newPrice}`;
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
        
        // Animate percentage change using jQuery.countTo if available
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
          // Fallback if jQuery.countTo is not available
          ticker.textContent = `${changeSymbol} ${Math.abs(change24h)}%`;
        }
        
        ticker.className = `price-ticker ${changeClass}`;
        ticker.dataset.prevChange = Math.abs(change24h);
        this.prevPrices[coin] = data.PRICE;
      }
    });
    
    // Update timestamp if prices changed or this is the first update
    if (pricesChanged || this.prevUpdateTime.hour === null) {
      this.updateTimestamp();
    }
    
    this.updateGlobeColor(prices);
    if (this.elements.loadingSpinner) this.elements.loadingSpinner.style.display = 'none';
  }

  // Update timestamp display
  updateTimestamp() {
    const timeData = this.getCurrentTimeInTimezone();
    let hours = timeData.hours;
    const minutes = timeData.minutes;
    const seconds = timeData.seconds;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    // Update hour
    if (this.prevUpdateTime.hour === null || this.prevUpdateTime.hour !== hours) {
      if (this.elements.lastUpdateHour && typeof $ !== 'undefined' && $.fn.countTo) {
        $(this.elements.lastUpdateHour).countTo({
          from: this.prevUpdateTime.hour === null ? 0 : this.prevUpdateTime.hour,
          to: hours,
          speed: 500,
          refreshInterval: 50,
          formatter: function(value, options) {
            return (value < 10 && Math.floor(value) < 10 ? '0' : '') + Math.floor(value);
          }
        });
      } else if (this.elements.lastUpdateHour) {
        this.elements.lastUpdateHour.textContent = (hours < 10 ? '0' : '') + hours;
      }
      this.prevUpdateTime.hour = hours;
    }

    // Update minute
    if (this.prevUpdateTime.minute === null || this.prevUpdateTime.minute !== minutes) {
      if (this.elements.lastUpdateMinute && typeof $ !== 'undefined' && $.fn.countTo) {
        $(this.elements.lastUpdateMinute).countTo({
          from: this.prevUpdateTime.minute === null ? 0 : this.prevUpdateTime.minute,
          to: minutes,
          speed: 500,
          refreshInterval: 50,
          formatter: function(value, options) {
            return (value < 10 && Math.floor(value) < 10 ? '0' : '') + Math.floor(value);
          }
        });
      } else if (this.elements.lastUpdateMinute) {
        this.elements.lastUpdateMinute.textContent = (minutes < 10 ? '0' : '') + minutes;
      }
      this.prevUpdateTime.minute = minutes;
    }

    // Update second
    if (this.prevUpdateTime.second === null || this.prevUpdateTime.second !== seconds) {
      if (this.elements.lastUpdateSecond && typeof $ !== 'undefined' && $.fn.countTo) {
        $(this.elements.lastUpdateSecond).countTo({
          from: this.prevUpdateTime.second === null ? 0 : this.prevUpdateTime.second,
          to: seconds,
          speed: 500,
          refreshInterval: 50,
          formatter: function(value, options) {
            return (value < 10 && Math.floor(value) < 10 ? '0' : '') + Math.floor(value);
          }
        });
      } else if (this.elements.lastUpdateSecond) {
        this.elements.lastUpdateSecond.textContent = (seconds < 10 ? '0' : '') + seconds;
      }
      this.prevUpdateTime.second = seconds;
    }

    // Update AM/PM
    if (this.prevUpdateTime.ampm === null || this.prevUpdateTime.ampm !== ampm) {
      if (this.elements.lastUpdateAmPm) {
        this.elements.lastUpdateAmPm.textContent = ampm;
      }
      this.prevUpdateTime.ampm = ampm;
    }
  }

  // Update price history display
  updateHistory(history) {
    if (this.elements.historyElement) {
      this.elements.historyElement.innerHTML = history.map(item => {
        const date = new Date(item.time * 1000);
        return `<div class="history-item">${date.toLocaleTimeString()}: $${item.close.toFixed(2)}</div>`;
      }).join("");
    }
  }

  // Chart-related methods (simplified for this example)
  // Note: Full chart implementation would be quite extensive
  // This is a placeholder for the chart functionality
  
  // Initialize the full prices page
  async init() {
    // Detect user's timezone first
    this.userTimezone = await this.getUserTimezone();
    console.log('Detected timezone:', this.userTimezone);

    // Get DOM elements
    this.elements = {
      dataWindow: document.getElementById('data-window'),
      loadingSpinner: document.getElementById('loading-spinner'),
      lastUpdateHour: document.getElementById('last-update-hour'),
      lastUpdateMinute: document.getElementById('last-update-minute'),
      lastUpdateSecond: document.getElementById('last-update-second'),
      lastUpdateAmPm: document.getElementById('last-update-am-pm'),
      initialLoadHour: document.getElementById('initial-load-hour'),
      initialLoadMinute: document.getElementById('initial-load-minute'),
      initialLoadSecond: document.getElementById('initial-load-second'),
      initialLoadAmPm: document.getElementById('initial-load-am-pm'),
      historyElement: document.getElementById('price-history'),
      backgroundSelect: document.getElementById('background-select'),
      chartWindow: document.getElementById('chart-window'),
      chartHeader: document.getElementById('chart-header'),
      closeChart: document.getElementById('close-chart'),
      priceChart: document.getElementById('price-chart'),
      chartTimeRanges: document.getElementById('chart-time-ranges')
    };

    // Parse symbols from API_URL
    const urlParams = new URLSearchParams(this.config.apiUrl.split('?')[1]);
    const fsyms = urlParams.get('fsyms');
    if (fsyms) {
      this.config.trackedSymbols = fsyms.split(',');
    }

    // Initialize background
    this.initBackground();

    // Dynamically create coin containers
    this.createCoinContainers();

    // Set initial load timestamp
    this.setInitialLoadTimestampOnce();

    // Fetch and display initial prices
    const initialPrices = await this.fetchPrices();
    this.updatePrices(initialPrices);

    // Fetch and display initial history for the selected coin
    const initialHistory = await this.fetchHistory(this.selectedCoin, this.currentTimeRange);
    this.updateHistory(initialHistory.reverse());

    // Set up event listeners
    this.setupEventListeners();

    // Set up periodic updates
    this.setupPeriodicUpdates();
  }

  // Initialize background effects
  initBackground() {
    // Background initialization logic would go here
    // This is a simplified version
    console.log('Initializing background effects...');
  }

  // Create coin containers dynamically
  createCoinContainers() {
    const dataWindow = this.elements.dataWindow;
    if (!dataWindow) return;

    this.config.trackedSymbols.forEach((symbol, index) => {
      const container = document.createElement('div');
      container.className = 'price-container' + (index === 0 ? ' selected' : '');
      container.id = `${symbol.toLowerCase()}-container`;
      container.innerHTML = `
        <div style="display: flex; align-items: center;">
          <div class="spinner" id="${symbol.toLowerCase()}-spinner" style="margin-right: 5px;"></div>
          <img id="${symbol.toLowerCase()}-icon" src="" alt="${symbol} Icon" style="width: 30px; height: 30px; margin-right: 5px;">
          <h1 id="${symbol.toLowerCase()}-price">${symbol}: Loading...</h1>
        </div>
        <span class="price-ticker" id="${symbol.toLowerCase()}-ticker"></span>
      `;
      dataWindow.insertBefore(container, document.getElementById('last-update'));
      container.addEventListener('dblclick', () => this.handleCoinClick(symbol));
      this.prevPrices[symbol] = null;
    });

    this.selectedCoin = this.config.trackedSymbols[0] || null;
  }

  // Handle coin click for chart display
  async handleCoinClick(coin) {
    this.selectedCoin = coin;
    document.querySelectorAll('.price-container').forEach(c => c.classList.remove('selected'));
    document.getElementById(`${coin.toLowerCase()}-container`).classList.add('selected');
    
    const history = await this.fetchHistory(coin, this.currentTimeRange);
    this.updateHistory(history.reverse());
    
    // Chart functionality would be handled here
    console.log(`Selected coin: ${coin}`);
  }

  // Set up event listeners
  setupEventListeners() {
    // Background select
    if (this.elements.backgroundSelect) {
      this.elements.backgroundSelect.addEventListener("change", (e) => {
        this.setBackground(e.target.value);
      });
    }

    // Chart close
    if (this.elements.closeChart) {
      this.elements.closeChart.addEventListener("click", () => {
        this.closeChartWindow();
      });
    }

    // Chart time ranges
    if (this.elements.chartTimeRanges) {
      this.elements.chartTimeRanges.addEventListener("click", async (e) => {
        if (e.target.classList.contains("time-range-btn")) {
          const timeRange = e.target.dataset.range;
          const coin = document.getElementById("chart-title").textContent.split(" ")[0];

          // Remove active class from all time range buttons
          document.querySelectorAll(".time-range-btn").forEach(btn => {
            btn.classList.remove("active");
          });
          // Add active class to the clicked button
          e.target.classList.add("active");

          // Update the chart with the new time range
          await this.updateChartTimeRange(coin, timeRange);
        }
      });
    }
  }

  // Set up periodic updates
  setupPeriodicUpdates() {
    // Update prices every 10 seconds
    setInterval(async () => {
      const prices = await this.fetchPrices();
      this.updatePrices(prices);
    }, this.config.updateInterval);

    // Update history every 60 seconds
    setInterval(async () => {
      if (this.selectedCoin) {
        const history = await this.fetchHistory(this.selectedCoin, this.currentTimeRange);
        this.updateHistory(history.reverse());
      }
    }, this.config.historyUpdateInterval);
  }

  // Placeholder methods for chart functionality
  setBackground(type) {
    console.log(`Setting background to: ${type}`);
    // Background setting logic would go here
  }

  closeChartWindow() {
    console.log('Closing chart window');
    // Chart close logic would go here
  }

  async updateChartTimeRange(coin, timeRange) {
    console.log(`Updating chart for ${coin} with time range: ${timeRange}`);
    // Chart update logic would go here
  }

  // Destroy the instance and clean up
  destroy() {
    if (this.chartUpdateInterval) {
      clearInterval(this.chartUpdateInterval);
      this.chartUpdateInterval = null;
    }
  }
}

// Auto-initialize if DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Check if we should auto-initialize (only if required elements exist)
  const dataWindow = document.getElementById('data-window');
  
  if (dataWindow) {
    window.cryptoPricesFull = new CryptoPricesFull();
    window.cryptoPricesFull.init();
  }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CryptoPricesFull;
}
