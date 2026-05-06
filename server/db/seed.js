/**
 * server/db/seed.js — One-time Database Seeder
 *
 * Run once after a fresh clone:
 *   node server/db/seed.js
 *
 * Reads products.json and auth_user.json, creates the tables (via
 * schema.sql), then INSERTs every row. INSERT OR IGNORE makes the
 * script safe to re-run — existing rows are skipped, nothing is
 * duplicated.
 *
 * WHY A SEPARATE SEED SCRIPT?
 * Keeps one-time data setup out of the application boot path.
 * After seeding once, the server never needs to touch products.json
 * or auth_user.json for reads — all data lives in store.db.
 */

'use strict';

const path    = require('path');
const fs      = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH       = path.join(__dirname, '..', '..', 'store.db');
const SCHEMA_PATH   = path.join(__dirname, 'schema.sql');
const PRODUCTS_PATH = path.join(__dirname, '..', '..', 'products.json');
const USERS_PATH    = path.join(__dirname, '..', 'data', 'auth_user.json');

const db       = new sqlite3.Database(DB_PATH);
const schema   = fs.readFileSync(SCHEMA_PATH, 'utf-8');
const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf-8'));
const users    = JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));

db.serialize(function () {

    // ---- Create tables (idempotent) ----
    db.exec(schema);

    // ---- Seed products ----
    // INSERT OR IGNORE: skip rows whose id already exists in the table.
    var pStmt = db.prepare(`
        INSERT OR IGNORE INTO products
            (id, name, category, image, badge, rating, review_count,
             price_type, price_original, price_current, price_max, action)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    products.forEach(function (p) {
        pStmt.run([
            p.id,
            p.name,
            p.category,
            p.image        || null,
            p.badge        || null,
            p.rating       || null,
            p.reviewCount  || 0,
            p.price.type,
            p.price.original || null,
            p.price.current,
            p.price.max    || null,
            p.action
        ]);
    });

    pStmt.finalize();

    // ---- Seed users ----
    // auth_user.json uses `username` for email and `password` for the bcrypt hash.
    var uStmt = db.prepare(`
        INSERT OR IGNORE INTO users (id, email, password_hash, first_name, registered_at)
        VALUES (?, ?, ?, ?, ?)
    `);

    users.forEach(function (u) {
        uStmt.run([
            u.id,
            u.username,       // JSON field name is `username`
            u.password,       // JSON field name is `password` (bcrypt hash)
            u.first_name,
            u.registered_at
        ]);
    });

    uStmt.finalize();

    // ---- Done ----
    db.close(function (err) {
        if (err) {
            console.error('Seed failed:', err.message);
            process.exit(1);
        }
        console.log('Seeded ' + products.length + ' products and ' + users.length + ' users into store.db');
    });
});
