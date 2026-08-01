const redisClient = require('../config/redis');
const logger = require('../utils/logger');

const BASE_CURRENCY = 'INR';
const CACHE_TTL_SECONDS = 60 * 60; // exchange rates don't need to be real-time; 1 hour is plenty fresh

// Free, no-API-key exchange rate provider. Returns rates relative to a base currency.
const RATE_API_URL = (base) => `https://open.er-api.com/v6/latest/${base}`;

// Fetches (and caches) the conversion rate from `currency` -> INR.
// Cache-aside pattern: check Redis first, hit the external API only on a miss.
async function getExchangeRate(currency) {
  if (currency === BASE_CURRENCY) return 1;

  const cacheKey = `exchange_rate:${currency}:${BASE_CURRENCY}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    logger.debug('Exchange rate cache HIT', { currency });
    return parseFloat(cached);
  }

  logger.debug('Exchange rate cache MISS', { currency });
  const response = await fetch(RATE_API_URL(currency));
  if (!response.ok) {
    const err = new Error(`Failed to fetch exchange rate for ${currency}`);
    err.statusCode = 502;
    throw err;
  }

  const data = await response.json();
  const rate = data.rates?.[BASE_CURRENCY];
  if (!rate) {
    const err = new Error(`Unsupported currency: ${currency}`);
    err.statusCode = 400;
    throw err;
  }

  await redisClient.set(cacheKey, rate.toString(), 'EX', CACHE_TTL_SECONDS);
  return rate;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Converts an amount in any supported currency to the group's base currency (INR).
async function convertToBaseCurrency(amount, currency) {
  const rate = await getExchangeRate(currency);
  return round2(amount * rate);
}

module.exports = { getExchangeRate, convertToBaseCurrency, BASE_CURRENCY };