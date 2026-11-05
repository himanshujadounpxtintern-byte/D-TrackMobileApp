require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('../db');

const app = express();

app.set('trust proxy', true);

// Fix Vercel Serverless Function rewrites: restore the true path via query param or headers
app.use((req, res, next) => {
  if (req.query && req.query.__path) {
    req.url = '/' + req.query.__path.replace(/^\/+/, '');
  } else {
    const original = req.originalUrl || req.headers['x-matched-path'] || req.headers['x-forwarded-path'] || req.headers['x-forwarded-uri'];
    if (original && (req.url === '/api' || req.url.startsWith('/api/index'))) {
      if (original !== '/api' && !original.includes('/api/index')) {
        req.url = original;
      }
    }
  }
  next();
});

// CORS Configuration - Allow everyone
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: false
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Explicit fallback headers middleware for any client/proxy
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Root documentation handler
const handleRoot = (req, res) => {
  res.json({
    message: 'Welcome to D-Track Mobile App API (Vercel Serverless)',
    version: '1.1.0',
    status: 'online',
    database: 'Supabase PostgreSQL',
    endpoints: {
      postLog: 'POST /api/logs or /api/user-login',
      getLogs: 'GET /api/logs or /api/user-login?emp_code=10245&limit=50',
      getLogsByEmpCode: 'GET /api/logs/:emp_code',
      health: 'GET /api/health or /health'
    },
    samplePayload: {
      event: 'user_login',
      emp_code: '10245',
      device_name: 'Xiaomi Redmi 12 5G',
      android_version: '14',
      mediadrm_id: 'cd0f53b21cf95b58',
      android_id: 'cd0f53b21cf95b58',
      app_version: '2.12.52',
      login_time: '2026-11-05 23:20:00',
      latitude: '28.613929',
      longitude: '77.209021'
    }
  });
};

app.get('/', handleRoot);
app.get('/api', handleRoot);

// Health check handler
const handleHealth = async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      platform: 'Vercel Serverless',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
};

app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

/**
 * POST Log Handler
 * Payload format:
 * {
 *   "event": "user_login",
 *   "emp_code": "10245",
 *   "device_name": "Xiaomi Redmi 12 5G",
 *   "android_version": "14",
 *   "mediadrm_id": "cd0f53b21cf95b58",
 *   "android_id": "cd0f53b21cf95b58",
 *   "app_version": "2.12.52",
 *   "login_time": "2026-11-05 20:15:00"
 * }
 */
const handlePostLog = async (req, res) => {
  try {
    const {
      event,
      emp_code,
      device_name,
      android_version,
      mediadrm_id,
      android_id,
      app_version,
      login_time,
      latitude,
      longitude
    } = req.body || {};

    // Basic Validation
    if (!emp_code) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: "emp_code" is required.'
      });
    }

    const eventName = event || 'user_login';
    const parsedLoginTime = login_time ? new Date(login_time) : new Date();

    // Parse coordinates safely (supports string, number, or null/undefined)
    const rawLat = latitude !== undefined && latitude !== null && latitude !== '' ? parseFloat(latitude) : null;
    const rawLng = longitude !== undefined && longitude !== null && longitude !== '' ? parseFloat(longitude) : null;
    const finalLat = rawLat !== null && !isNaN(rawLat) ? rawLat : null;
    const finalLng = rawLng !== null && !isNaN(rawLng) ? rawLng : null;

    const insertQuery = `
      INSERT INTO login_logs (
        event,
        emp_code,
        device_name,
        android_version,
        mediadrm_id,
        android_id,
        app_version,
        login_time,
        latitude,
        longitude
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const values = [
      eventName,
      String(emp_code),
      device_name || null,
      android_version || null,
      mediadrm_id || null,
      android_id || null,
      app_version || null,
      isNaN(parsedLoginTime.getTime()) ? new Date() : parsedLoginTime,
      finalLat,
      finalLng
    ];

    const result = await db.query(insertQuery, values);

    return res.status(201).json({
      success: true,
      message: 'Log record created successfully',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error inserting log:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: err.message
    });
  }
};

// POST routes (support both /api/logs, /logs, /api/user-login, and /user-login)
app.post('/api/logs', handlePostLog);
app.post('/logs', handlePostLog);
app.post('/api/user-login', handlePostLog);
app.post('/user-login', handlePostLog);
app.post('/api/index.js', handlePostLog);
app.post('/api/index', handlePostLog);
app.post('/api', handlePostLog);

/**
 * GET Logs Handler
 * Query parameters:
 *   - emp_code: filter by employee code (optional)
 *   - event: filter by event name (optional)
 *   - limit: maximum rows to return (default: 50, max: 200)
 *   - offset: offset for pagination (default: 0)
 */
const handleGetLogs = async (req, res) => {
  try {
    const { emp_code, event } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;

    const selectQuery = `
      SELECT * FROM login_logs
      WHERE ($1::text IS NULL OR emp_code = $1)
        AND ($2::text IS NULL OR event = $2)
      ORDER BY id DESC
      LIMIT $3 OFFSET $4;
    `;

    const countQuery = `
      SELECT COUNT(*) AS total FROM login_logs
      WHERE ($1::text IS NULL OR emp_code = $1)
        AND ($2::text IS NULL OR event = $2);
    `;

    const filterParams = [
      emp_code ? String(emp_code) : null,
      event ? String(event) : null
    ];

    const [logsResult, countResult] = await Promise.all([
      db.query(selectQuery, [...filterParams, limit, offset]),
      db.query(countQuery, filterParams)
    ]);

    const total = parseInt(countResult.rows[0].total, 10);

    return res.status(200).json({
      success: true,
      total,
      limit,
      offset,
      count: logsResult.rows.length,
      data: logsResult.rows
    });
  } catch (err) {
    console.error('Error fetching logs:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: err.message
    });
  }
};

// GET routes
app.get('/api/logs', handleGetLogs);
app.get('/logs', handleGetLogs);
app.get('/api/user-login', handleGetLogs);
app.get('/user-login', handleGetLogs);
app.get('/api/index.js', handleGetLogs);
app.get('/api/index', handleGetLogs);

// GET logs for a specific employee code
const handleGetLogsByEmpCode = async (req, res) => {
  try {
    const { emp_code } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const result = await db.query(
      'SELECT * FROM login_logs WHERE emp_code = $1 ORDER BY id DESC LIMIT $2;',
      [emp_code, limit]
    );

    return res.status(200).json({
      success: true,
      emp_code,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('Error fetching logs by employee code:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: err.message
    });
  }
};

app.get('/api/logs/:emp_code', handleGetLogsByEmpCode);
app.get('/logs/:emp_code', handleGetLogsByEmpCode);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.url}`
  });
});

// Export app for Vercel Serverless Function
module.exports = app;

