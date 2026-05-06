/**
 * database.js — SQLite Connection Singleton
 *
 * Opens (or creates) store.db at the project root, enables WAL mode
 * for better concurrent reads, and runs schema.sql once on startup.
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
 * WHY schema.sql INSTEAD OF INLINE DDL?
 * A separate SQL file can be read by any SQL tool (DB Browser,
 * DBeaver, psql) without touching Node.js. It also makes schema
 * diffs visible in git as plain SQL, not as string diffs inside JS.
 *
 * Used by: services/checkoutService.js
 */

const path = require('path');
const fs   = require('fs');
const Database = require('better-sqlite3');

const DB_PATH       = path.join(__dirname, '..', '..', 'store.db');
const SCHEMA_PATH   = path.join(__dirname, 'schema.sql');
const PRODUCTS_PATH = path.join(__dirname, '..', '..', 'products.json');
const USERS_PATH    = path.join(__dirname, '..', 'data', 'auth_user.json');

const db = new Database(DB_PATH);

// WAL mode: readers don't block writers, writers don't block readers
db.pragma('journal_mode = WAL');

// Enforce FK constraints — SQLite disables them by default
db.pragma('foreign_keys = ON');

// Run schema.sql — CREATE TABLE IF NOT EXISTS is idempotent so this
// is safe on every startup: creates tables the first time, no-ops after.
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

// -------------------------------------------------------------
// Seed the products table from products.json on first run.
// WHY HERE?
// order_items.product_id has a FOREIGN KEY → products.id.
// If products is empty, every checkout insert fails the FK check.
// Seeding once (when count = 0) keeps the FK intact without
// requiring a separate migration step.
// -------------------------------------------------------------
const productCount = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;

if (productCount === 0) {
    const raw      = fs.readFileSync(PRODUCTS_PATH, 'utf-8');
    const products = JSON.parse(raw);

    const insertProduct = db.prepare(`
        INSERT INTO products (id, name, category, image, badge, rating, review_count,
                              price_type, price_original, price_current, price_max, action)
        VALUES (@id, @name, @category, @image, @badge, @rating, @review_count,
                @price_type, @price_original, @price_current, @price_max, @action)
    `);

    const seedAll = db.transaction(function (rows) {
        for (const p of rows) {
            insertProduct.run({
                id:             p.id,
                name:           p.name,
                category:       p.category,
                image:          p.image          || null,
                badge:          p.badge          || null,
                rating:         p.rating         || null,
                review_count:   p.reviewCount    || 0,
                price_type:     p.price.type,
                price_original: p.price.original || null,
                price_current:  p.price.current,
                price_max:      p.price.max      || null,
                action:         p.action
            });
        }
    });

    seedAll(products);
    console.log('[db] seeded ' + products.length + ' products into store.db');
}

// -------------------------------------------------------------
// Seed the users table from auth_user.json on first run.
// auth_user.json uses `username` for email and `password` for hash —
// mapped to `email` and `password_hash` in the DB schema.
// New registrations are kept in sync by authService.createUser().
// -------------------------------------------------------------
const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;

if (userCount === 0) {
    const rawUsers = fs.readFileSync(USERS_PATH, 'utf-8');
    const users    = JSON.parse(rawUsers);

    const insertUser = db.prepare(`
        INSERT INTO users (id, email, password_hash, first_name, registered_at)
        VALUES (@id, @email, @password_hash, @first_name, @registered_at)
    `);

    const seedUsers = db.transaction(function (rows) {
        for (const u of rows) {
            insertUser.run({
                id:            u.id,
                email:         u.username,       // JSON field name is `username`
                password_hash: u.password,       // JSON field name is `password`
                first_name:    u.first_name,
                registered_at: u.registered_at
            });
        }
    });

    seedUsers(users);
    console.log('[db] seeded ' + users.length + ' users into store.db');
}

module.exports = db;
