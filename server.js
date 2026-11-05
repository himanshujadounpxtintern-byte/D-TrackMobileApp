require('dotenv').config();
const app = require('./api/index');

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Local dev server running on port ${PORT}`);
  console.log(`👉 Health check: http://localhost:${PORT}/api/health`);
  console.log(`👉 API Endpoint: http://localhost:${PORT}/api/logs`);
});
