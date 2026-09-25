(function (global) {
  'use strict';

  const API_BASE = 'https://api.kraken.com/0/public';
  const COIN_IDS = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
    TON: 'the-open-network',
    SUI: 'sui'
  };
  const KRAKEN_PAIRS = {
    BTC: { request: 'BTCUSD', response: 'XXBTZUSD' },
    ETH: { request: 'ETHUSD', response: 'XETHZUSD' },
    SOL: { request: 'SOLUSD', response: 'SOLUSD' },
    TON: { request: 'TONUSD', response: 'TONUSD' },
    SUI: { request: 'SUIUSD', response: 'SUIUSD' }
  };
  const COIN_ICONS = {
    BTC: 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png',
    ETH: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png',
    SOL: 'https://coin-images.coingecko.com/coins/images/4128/large/solana.png',
    TON: 'https://coin-images.coingecko.com/coins/images/17980/large/ton_symbol.png',
    SUI: 'https://coin-images.coingecko.com/coins/images/26375/large/sui_asset.jpeg'
  };
  const priceCache = new Map();
  const historyCache = new Map();
  const pendingPriceRequests = new Map();

  function coinIdFor(symbol) {
    return COIN_IDS[String(symbol).toUpperCase()] || null;
  }

  async function fetchJson(url) {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Crypto price request failed (${response.status})`);
    const data = await response.json();
    if (Array.isArray(data.error) && data.error.length) {
      throw new Error(`Crypto price request failed: ${data.error.join(', ')}`);
    }
    return data;
  }

  async function fetchPrices(symbols) {
    const requestedSymbols = [...new Set(
      symbols.map(symbol => String(symbol).toUpperCase()).filter(symbol => KRAKEN_PAIRS[symbol])
    )];
    if (!requestedSymbols.length) return { RAW: {} };

    const cacheKey = [...requestedSymbols].sort().join(',');
    const cached = priceCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    if (pendingPriceRequests.has(cacheKey)) return pendingPriceRequests.get(cacheKey);

    const request = (async () => {
      const params = new URLSearchParams({
        pair: requestedSymbols.map(symbol => KRAKEN_PAIRS[symbol].request).join(',')
      });
      const data = await fetchJson(`${API_BASE}/Ticker?${params}`);
      const raw = {};

      requestedSymbols.forEach(symbol => {
        const ticker = data.result?.[KRAKEN_PAIRS[symbol].response];
        if (!ticker) return;

        const price = Number(ticker.c?.[0]);
        const openPrice = Number(ticker.o);
        if (!Number.isFinite(price)) return;

        raw[symbol] = {
          USD: {
            PRICE: price,
            CHANGEPCT24HOUR: Number.isFinite(openPrice) && openPrice !== 0
              ? ((price - openPrice) / openPrice) * 100
              : 0,
            IMAGEURL: COIN_ICONS[symbol]
          }
        };
      });

      const result = { RAW: raw };
      priceCache.set(cacheKey, { data: result, expiresAt: Date.now() + 20000 });
      return result;
    })();

    pendingPriceRequests.set(cacheKey, request);
    try {
      return await request;
    } finally {
      pendingPriceRequests.delete(cacheKey);
    }
  }

  async function fetchHistory(symbol, timeRange) {
    const normalizedSymbol = String(symbol).toUpperCase();
    const pair = KRAKEN_PAIRS[normalizedSymbol];
    if (!pair) throw new Error(`Unsupported cryptocurrency symbol: ${symbol}`);

    const ranges = {
      '10m': { seconds: 10 * 60, interval: 1 },
      '1h': { seconds: 60 * 60, interval: 1 },
      '6h': { seconds: 6 * 60 * 60, interval: 5 },
      '24h': { seconds: 24 * 60 * 60, interval: 60 },
      '7d': { seconds: 7 * 24 * 60 * 60, interval: 240 },
      '1y': { seconds: 365 * 24 * 60 * 60, interval: 1440 }
    };
    const range = ranges[timeRange] || ranges['24h'];
    const cacheKey = `${normalizedSymbol}:${timeRange}`;
    const cached = historyCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const cutoff = Math.floor(Date.now() / 1000) - range.seconds;
    const params = new URLSearchParams({
      pair: pair.request,
      interval: String(range.interval),
      since: String(cutoff)
    });
    const data = await fetchJson(`${API_BASE}/OHLC?${params}`);
    const resultKey = Object.keys(data.result || {}).find(key => key !== 'last');
    const history = (resultKey ? data.result[resultKey] : [])
      .filter(row => row[0] >= cutoff)
      .map(row => ({ time: row[0], close: Number(row[4]) }))
      .filter(item => Number.isFinite(item.close));

    historyCache.set(cacheKey, { data: history, expiresAt: Date.now() + 30000 });
    return history;
  }

  global.CryptoPriceApi = { fetchPrices, fetchHistory, coinIdFor };
})(typeof window !== 'undefined' ? window : globalThis);
