// Load .env into process.env before any other require — must be first
require('dotenv').config();

// Fail-fast: crash immediately with a clear message if required vars are absent.
// Better to refuse to start than to silently mishandle auth or pricing.
const REQUIRED_ENV = ['JWT_SECRET', 'PRODUCT_SERVICE_URL'];
const missing = REQUIRED_ENV.filter(function (key) { return !process.env[key]; });
if (missing.length) {
    console.error('[startup] Missing required environment variables: ' + missing.join(', '));
    console.error('[startup] Copy .env.example to .env and fill in the values.');
    process.exit(1);
}

const app  = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, function () {
    console.log('─────────────────────────────────────');
    console.log('  Server running on port ' + PORT);
    console.log('  Health:   http://localhost:' + PORT + '/api/health');
    console.log('  Products: http://localhost:' + PORT + '/api/products');
    console.log('─────────────────────────────────────');
});
