(function (global) {
  'use strict';

  const API_BASE = 'https://api.coingecko.com/api/v3';
  const COIN_IDS = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
    TON: 'the-open-network',
    SUI: 'sui'
  };

  function coinIdFor(symbol) {
    return COIN_IDS[String(symbol).toUpperCase()] || null;
  }

  async function fetchJson(url) {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Crypto price request failed (${response.status})`);
    return response.json();
  }

  async function fetchPrices(symbols) {
    const requestedSymbols = symbols.map(symbol => String(symbol).toUpperCase());
    const ids = requestedSymbols.map(coinIdFor).filter(Boolean);
    if (!ids.length) return { RAW: {} };

    const params = new URLSearchParams({
      vs_currency: 'usd',
      ids: ids.join(','),
      order: 'market_cap_desc',
      sparkline: 'false',
      price_change_percentage: '24h'
    });
    const markets = await fetchJson(`${API_BASE}/coins/markets?${params}`);
    const byId = new Map(markets.map(market => [market.id, market]));
    const raw = {};

    requestedSymbols.forEach(symbol => {
      const market = byId.get(coinIdFor(symbol));
      if (!market || !Number.isFinite(market.current_price)) return;
      raw[symbol] = {
        USD: {
          PRICE: market.current_price,
          CHANGEPCT24HOUR: Number.isFinite(market.price_change_percentage_24h)
            ? market.price_change_percentage_24h
            : 0,
          IMAGEURL: market.image || ''
        }
      };
    });

    return { RAW: raw };
  }

  async function fetchHistory(symbol, timeRange) {
    const coinId = coinIdFor(symbol);
    if (!coinId) throw new Error(`Unsupported cryptocurrency symbol: ${symbol}`);

    const rangeMilliseconds = {
      '10m': 10 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000
    };
    const days = timeRange === '7d' ? 7 : timeRange === '1y' ? 365 : 1;
    const params = new URLSearchParams({ vs_currency: 'usd', days: String(days) });
    const data = await fetchJson(`${API_BASE}/coins/${coinId}/market_chart?${params}`);
    const cutoff = Date.now() - (rangeMilliseconds[timeRange] || rangeMilliseconds['24h']);

    return (data.prices || [])
      .filter(([timestamp]) => timestamp >= cutoff)
      .map(([timestamp, price]) => ({
        time: Math.floor(timestamp / 1000),
        close: price
      }));
  }

  global.CryptoPriceApi = { fetchPrices, fetchHistory, coinIdFor };
})(typeof window !== 'undefined' ? window : globalThis);
