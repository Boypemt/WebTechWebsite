/**
 * database.js — SQLite Connection Singleton
 *
 * Opens (or creates) store.db at the project root, enables WAL mode
 * for better concurrent reads, and runs the schema once on startup.
 *
 * WHY SINGLETON?
 * better-sqlite3 connections are synchronous and cheap to reuse.
 * Exporting one shared instance avoids opening multiple file handles
 * and keeps prepared statements valid across modules.
 *
 * WHY WAL MODE?
 * Write-Ahead Logging lets readers continue while a write is in
 * progress — important once we add order history queries alongside
 * checkout writes.
 *
 * Used by: services/checkoutService.js
 */

const path     = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', '..', 'store.db');

const db = new Database(DB_PATH);

// WAL mode: readers don't block writers, writers don't block readers
db.pragma('journal_mode = WAL');

// Foreign key enforcement (off by default in SQLite)
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------
// Schema
// One row per line item — order_id groups items from the same order.
// user_id is nullable: NULL means guest checkout (no account needed).
//
// total_price = unit_price * quantity (stored for fast reporting
// without re-multiplication at query time).
// ---------------------------------------------------------------
db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id     TEXT    NOT NULL,
        user_id      INTEGER,
        email        TEXT    NOT NULL,
        card_last4   TEXT    NOT NULL,
        product_id   INTEGER NOT NULL,
        product_name TEXT    NOT NULL,
        quantity     INTEGER NOT NULL,
        unit_price   REAL    NOT NULL,
        total_price  REAL    NOT NULL,
        placed_at    TEXT    NOT NULL
    )
`);

module.exports = db;
