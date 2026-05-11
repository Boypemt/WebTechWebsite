/**
 * server/db/index.js — SQLite Connection
 *
 * Opens (or creates) store.db, enforces foreign keys, runs schema.sql
 * once on startup, and attaches three Promise-based helpers so services
 * can use async/await instead of nested callbacks.
 *
 * Exported helpers mirror the sqlite3 callback API names:
 *   db.allAsync(sql, params)  → resolves with rows[]
 *   db.getAsync(sql, params)  → resolves with one row (or null)
 *   db.runAsync(sql, params)  → resolves with { lastID, changes }
 *
 * WHY PROMISIFY?
 * sqlite3 is callback-based. Wrapping each method in a Promise lets
 * services use async/await — the same style as the rest of the codebase
 * — without callback nesting or explicit .then() chains.
 *
 * Used by: services/productService.js
 *           services/checkoutService.js
 *           services/authService.js
 */

const path    = require('path');
const fs      = require('fs');
const sqlite3 = require('sqlite3').verbose();

// DB_PATH in .env lets you point at a different file (e.g. for testing).
// Defaults to store.db in the project root when the variable is not set.
const DB_PATH = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(__dirname, '..', '..', 'store.db');
const SCHEMA_SQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');

// Open (or create) the database file
const db = new sqlite3.Database(DB_PATH, function (err) {
    if (err) throw err;
});

// Enforce FK constraints — sqlite3 disables them by default per connection.
// Must be set before any data-manipulation statements.
db.run('PRAGMA foreign_keys = ON');

// Run schema on every startup — CREATE TABLE IF NOT EXISTS is idempotent
// so this is safe to call even when tables already exist.
db.exec(SCHEMA_SQL, function (err) {
    if (err) console.error('[db] schema error:', err.message);
});


// ---------------------------------------------------------------
// Promise helpers
// ---------------------------------------------------------------

// db.all() → rows[]
db.allAsync = function (sql, params) {
    return new Promise(function (resolve, reject) {
        db.all(sql, params || [], function (err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// db.get() → one row or null
db.getAsync = function (sql, params) {
    return new Promise(function (resolve, reject) {
        db.get(sql, params || [], function (err, row) {
            if (err) reject(err);
            else resolve(row || null);
        });
    });
};

// db.run() → { lastID, changes }
// Uses a regular function (not arrow) so `this` inside the sqlite3
// callback refers to the Statement object that exposes lastID / changes.
db.runAsync = function (sql, params) {
    return new Promise(function (resolve, reject) {
        db.run(sql, params || [], function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};


module.exports = db;
