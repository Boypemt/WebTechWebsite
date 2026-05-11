/**
 * app.js — Express Application
 *
 * Creates and configures the Express app:
 *   - JSON body parsing middleware
 *   - API routes
 *   - 404 handler for unknown routes
 *   - Global error handler (catches errors thrown in async controllers)
 *
 * Kept separate from index.js so the app can be tested without
 * actually binding to a port.
 *
 * Used by: index.js
 */

// dotenv is loaded in server/index.js before this module is required.
// Do NOT call require('dotenv').config() here — it would re-load .env
// after process.env is already populated and could shadow later changes.

const express       = require('express');
const cors          = require('cors');
const productRoutes   = require('./routes/products');
const authRoutes      = require('./routes/auth');
const registerRoutes  = require('./routes/register');
const checkoutRoutes  = require('./routes/checkout');

const app = express();


// -------------------------------------------------------------
// CORS MIDDLEWARE
//
// WHY CORS IS NEEDED:
// Browsers enforce the Same-Origin Policy — a page at origin A is
// blocked from making fetch() calls to origin B unless origin B
// explicitly allows it via CORS headers.
// Our frontend (http://localhost:5500) and backend (http://localhost:3000)
// are different origins (different ports), so without this middleware
// the browser would block every API request with a CORS error.
//
// WHY A WHITELIST INSTEAD OF cors() WITH NO OPTIONS:
// cors() with no options sends Access-Control-Allow-Origin: * which
// allows ANY website on the internet to call this API.
// A whitelist restricts access to only the origins we control,
// which is the correct default for any real project.
// -------------------------------------------------------------
// CORS_ORIGINS in .env is a comma-separated list of allowed origins.
// Falls back to safe local-dev defaults when the variable is not set.
const rawOrigins = process.env.CORS_ORIGINS || 'http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000';
const corsOptions = {
    origin:  rawOrigins.split(',').map(function (o) { return o.trim(); }),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

app.use(cors(corsOptions));


// -------------------------------------------------------------
// BODY PARSING MIDDLEWARE
// express.json() parses incoming request bodies with Content-Type
// application/json and makes the result available as req.body.
// -------------------------------------------------------------
app.use(express.json());


// -------------------------------------------------------------
// ROUTES
// All product endpoints are grouped under /api/products.
// The router in routes/products.js handles the sub-paths.
// -------------------------------------------------------------

// Health check — useful for confirming the server is running
app.get('/api/health', function (req, res) {
    res.json({ success: true, data: { status: 'ok' } });
});

// Product endpoints
app.use('/api/products', productRoutes);

// Authentication endpoints
// POST /api/login    — receive email + password, return JWT on success
app.use('/api/login', authRoutes);
// POST /api/register  — receive name + email + password, create user, return JWT
app.use('/api/register', registerRoutes);
// POST /api/checkout  — receive cart items, return order confirmation
app.use('/api/checkout', checkoutRoutes);


// -------------------------------------------------------------
// 404 HANDLER
// Catches any request that didn't match a route above.
// Must be defined AFTER all routes.
// -------------------------------------------------------------
app.use(function (req, res) {
    res.status(404).json({ success: false, error: 'Route not found' });
});


// -------------------------------------------------------------
// GLOBAL ERROR HANDLER
// Express calls this when any route handler throws or calls next(err).
// In Express 5, async errors are forwarded here automatically.
// Must have exactly 4 parameters (err, req, res, next) to be
// recognised as an error handler by Express.
// -------------------------------------------------------------
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).json({ success: false, error: 'Internal server error' });
});


module.exports = app;
