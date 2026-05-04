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

// Load .env variables (JWT_SECRET, etc.) into process.env before anything else
require('dotenv').config();

const express       = require('express');
const cors          = require('cors');
const productRoutes  = require('./routes/products');
const authRoutes     = require('./routes/auth');
const registerRoutes = require('./routes/register');

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
const corsOptions = {
    origin: [
        'http://localhost:5500',    // VS Code Live Server default
        'http://127.0.0.1:5500',   // Live Server (IP variant)
        'http://localhost:3000'    // future: frontend served from backend
    ],
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
// POST /api/register — receive name + email + password, create user, return JWT
app.use('/api/register', registerRoutes);


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
