-- =============================================================
-- schema.sql — Store Database Schema
-- =============================================================
-- Four tables, strict FK constraints.
--
-- Relationship map:
--   users ──< orders              (one user → many orders; SET NULL on delete)
--   orders ──< order_items        (one order → many line items; CASCADE on delete)
--   products ──< order_items      (one product → many line items; RESTRICT on delete)
--
-- ON DELETE RESTRICT on order_items.product_id:
--   Attempting to DELETE a product that appears in any order_items row
--   is rejected by the DB. Protects historical order data — a product
--   can be retired from the catalogue (removed from products.json) without
--   touching the DB row, and the order history stays intact.
-- =============================================================


-- -------------------------------------------------------------
-- USERS
-- Mirrors the shape of server/data/auth_user.json.
-- password_hash stores the bcrypt output (60 chars, salt rounds 10).
-- registered_at defaults to the current UTC timestamp so INSERT
-- statements don't need to supply it explicitly.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    first_name    TEXT    NOT NULL,
    registered_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);


-- -------------------------------------------------------------
-- PRODUCTS
-- Mirrors the flat fields of products.json.
-- Price fields are denormalized (price_type / price_original /
-- price_current / price_max) instead of a nested object so SQL
-- aggregations work without JSON functions.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT    NOT NULL,
    category       TEXT    NOT NULL,
    image          TEXT,
    badge          TEXT,
    rating         REAL,
    review_count   INTEGER NOT NULL DEFAULT 0,
    price_type     TEXT    NOT NULL DEFAULT 'fixed',
    price_original REAL,
    price_current  REAL    NOT NULL,
    price_max      REAL,
    action         TEXT    NOT NULL DEFAULT 'add-to-cart'
);


-- -------------------------------------------------------------
-- ORDERS
-- One row per checkout — the "header" of an order.
-- user_id is nullable: NULL means a guest placed the order.
-- ON DELETE SET NULL on user_id: if a user account is deleted
-- the order record is kept (audit trail) but user_id becomes NULL.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   TEXT    NOT NULL UNIQUE,
    user_id    INTEGER,
    email      TEXT    NOT NULL,
    card_last4 TEXT    NOT NULL,
    total      REAL    NOT NULL,
    placed_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);


-- -------------------------------------------------------------
-- ORDER_ITEMS
-- One row per line item — joins an order to a product.
-- unit_price is stored here (not derived from products.price_current)
-- so the receipt reflects the price at the time of purchase even if
-- the product's price changes later.
--
-- ON DELETE CASCADE  on order_id:
--   Deleting an order removes all its line items automatically.
--
-- ON DELETE RESTRICT on product_id:
--   Prevents deleting a product that appears in any order.
--   Retire a product by removing it from products.json instead of
--   the DB — the catalogue and the order history stay consistent.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id    INTEGER NOT NULL,
    product_id  INTEGER NOT NULL,
    quantity    INTEGER NOT NULL,
    unit_price  REAL    NOT NULL,
    total_price REAL    NOT NULL,

    FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);
