/**
 * index.js — Server Entry Point
 *
 * Imports the configured Express app and binds it to a port.
 * Keeping this separate from app.js means the app logic can be
 * imported and tested without starting a real server.
 *
 * Start commands (defined in package.json):
 *   npm start       → node server/index.js        (production)
 *   npm run dev     → nodemon server/index.js      (development, auto-restart)
 */

const app  = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, function () {
    console.log('─────────────────────────────────────');
    console.log(`  Server running on port ${PORT}`);
    console.log(`  Health:   http://localhost:${PORT}/api/health`);
    console.log(`  Products: http://localhost:${PORT}/api/products`);
    console.log('─────────────────────────────────────');
});
