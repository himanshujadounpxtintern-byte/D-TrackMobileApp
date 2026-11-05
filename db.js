require('dotenv').config();
const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      console.warn('⚠️ WARNING: DATABASE_URL is not defined in environment variables.');
    }

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      // Serverless-friendly pool sizing
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    });
  }
  return pool;
}

module.exports = {
  getPool,
  query: (text, params) => getPool().query(text, params)
};
