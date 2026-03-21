const { Pool } = require('pg');
require('dotenv').config();

const useSSL = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false)
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
