const { createClient } = require('redis');

let client = null;
let isConnected = false;

const connect = async () => {
  if (isConnected) return client;

  try {
    client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

    client.on('error', (err) => {
      console.warn('⚠️  Redis error (app continues without cache):', err.message);
      isConnected = false;
    });

    client.on('reconnecting', () => console.log('🔄 Redis reconnecting...'));
    client.on('ready', () => {
      isConnected = true;
      console.log('✅ Redis connected');
    });

    await client.connect();
    isConnected = true;
  } catch (err) {
    console.warn('⚠️  Redis unavailable — running without cache/rate-limiting:', err.message);
    client = null;
    isConnected = false;
  }

  return client;
};

const get = async (key) => {
  if (!client || !isConnected) return null;
  try { return await client.get(key); }
  catch { return null; }
};

const set = async (key, value, ttlSeconds) => {
  if (!client || !isConnected) return;
  try {
    if (ttlSeconds) await client.setEx(key, ttlSeconds, value);
    else await client.set(key, value);
  } catch {}
};

const del = async (key) => {
  if (!client || !isConnected) return;
  try { await client.del(key); }
  catch {}
};

const incr = async (key) => {
  if (!client || !isConnected) return null;
  try { return await client.incr(key); }
  catch { return null; }
};

const expire = async (key, ttlSeconds) => {
  if (!client || !isConnected) return;
  try { await client.expire(key, ttlSeconds); }
  catch {}
};

const exists = async (key) => {
  if (!client || !isConnected) return false;
  try { return (await client.exists(key)) === 1; }
  catch { return false; }
};

module.exports = { connect, get, set, del, incr, expire, exists, getClient: () => client };
