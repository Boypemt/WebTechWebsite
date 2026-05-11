# Shop Homepage — Project Context

## Project Overview
E-commerce shop homepage built on the **Start Bootstrap Shop Homepage** template.
Full-stack project: HTML/CSS/JS frontend + **Node.js/Express** backend (live) + **SQLite** database (live).

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Styling | Bootstrap 5.2.3, Bootstrap Icons 1.5.0 |
| Backend | Node.js, Express (live on port 3000) |
| Database | SQLite via `sqlite3` (callback-based, Promise-wrapped — `store.db`) |

---

## Current Website State

### Pages
| File | Status | Description |
|------|--------|-------------|
| `index.html` | Live | Main shop page — navbar, header, search/filter bar, product grid, footer |
| `product.html` | Live | Product detail page — image, info, quantity selector, add to cart |
| `cart.html` | Live | Cart page — item list with qty controls, order summary, checkout form |
| `products.json` | Seed source | 20 seed products — read once by `seed.js`, DB is now source of truth at runtime |
| `js/cart-utils.js` | Live | Shared utilities — `cart[]`, `loadCart`, `saveToLocalStorage`, `updateCartBadge`, `formatPrice` |
| `js/scripts.js` | Live | index.html JS — fetch, filter, render, addToCart |
| `js/product.js` | Live | product.html JS — URL param read, fetch, render, addToCart |
| `js/cart.js` | Live | cart.html JS — render cart items, qty controls, order summary, checkout POST |
| `login.html` | Live | Login page — email/password form, saves JWT + user to localStorage on success |
| `js/login.js` | Live | login.html JS — fetch POST /api/login, saveSession(), redirect to index.html |
| `register.html` | Live | Register page — name/email/password form with live password rule checklist |
| `js/register.js` | Live | register.html JS — real-time rule validation, fetch POST /api/register, auto-login on success |
| `store.db` | Live | SQLite database — 4 tables: users, products, orders, order_items (gitignored) |
| `server/db/index.js` | Live | SQLite connection — opens store.db, runs schema.sql, attaches Promise helpers |
| `server/db/schema.sql` | Live | DDL for all 4 tables with FK constraints |
| `server/db/seed.js` | One-time | Reads products.json + auth_user.json, INSERT OR IGNORE into DB — run once after clone |
| `css/styles.css` | Unchanged | Bootstrap 5.2.3 compiled CSS + template overrides (do not edit manually) |

### First-time setup
```bash
npm install
cp .env.example .env     # then set JWT_SECRET and verify other values
node server/db/seed.js   # seeds products + users into store.db (safe to re-run)
npm run dev
```

### Features Implemented
- **Dynamic product grid** — fetched from `GET /api/products` on load, rendered into `#product-grid` inside `#catalog`
- **Search by name** — fires on spyglass button click or Enter key (not instant/keystroke), case-insensitive partial match against `product.name`, client-side over last server result
- **Category filter** — server-driven round trip on every click; `fetchProductsByCategory()` sends `GET /api/products?category=<name>`; "All Categories" omits the param; outgoing URL logged to console
- **Category gatekeeper** — controller rejects empty string or >50-char category with 400; valid category with zero matches returns 200 with `data: []`
- **Category filter case-insensitive** — `?category=electronics` matches "Electronics" via `LOWER()` in SQL
- **Combined filter** — category applied server-side first, search applied client-side over the result
- **Clear button** — (×) appears when search has text, resets input and re-renders all
- **Result status** — shows `"N products found"` below search bar when any filter is active
- **Empty state** — shows a message when no products match
- **API error state** — shows a helpful error card if the backend is unreachable
- **Product detail page** — "View options" links to `product.html?id=X`; detail page fetches `GET /api/products/:id`, shows image + info + qty selector + "Add to cart"
- **Cart system** — shared `localStorage` key `'cart'` across all pages; navbar badge updates live
- **Login page** — `login.html` posts to `POST /api/login`; on success stores `token` and `user` in `localStorage` and redirects to `index.html`; already-logged-in users are redirected away immediately
- **Checkout → SQLite** — `POST /api/checkout` validates cart/email/card, re-prices server-side via Product Service HTTP call (simulated microservice — `fetch('http://localhost:3000/api/products/:id')`), saves via `orderRepository` (BEGIN/COMMIT transaction); `user_id` is null for guests, integer for logged-in users

### Search & Filter Section (index.html)
```
[ Search by product name...  🔍  ×]   [ All Categories ▾ ]
              N products found
```
- White background, drop shadow, visible heading — placed between header and product grid
- Spyglass (`#search-btn`) is a clickable `<button>` — search fires on click or Enter, NOT on every keystroke
- Category dropdown: Bootstrap custom `<ul>` menu, `data-bs-flip="false"` forces downward direction
- Requires a **local server** (VS Code Live Server) — `fetch()` does not work on `file://`

### Cart System
- `#catalog` is the stable parent `<section>` wrapping `#product-grid`
- ONE event delegation listener on `#catalog` catches all `.add-to-cart` button clicks
- Each `.add-to-cart` button carries `data-id="<product.id>"` set by `buildProductCard()`
- Cart is a **flat array** of cart-item objects — persisted to `localStorage` key `'cart'`
- Cart item shape: `{ id, name, image, price, quantity }`
- Badge in navbar updates live to show total item count

---

## JS Architecture (js/scripts.js)

### Module-level variables
| Variable | Purpose |
|----------|---------|
| `allProducts` | Last server response for current category — updated on each category click |
| `selectedCategory` | Tracks active dropdown choice, default `'All'` |
| `cart` | Array of cart-item objects, starts as `[]`, filled by `loadCart()` |

### Function map
| Function | Role |
|----------|------|
| `requestProducts()` | Initial load only — `GET /api/products` → `buildCategoryDropdown()` → `renderUI()` |
| `fetchProductsByCategory(category)` | Server round trip on category click — `GET /api/products?category=<name>` → updates `allProducts` → `searchProducts()` |
| `filterProducts(searchTerm)` | Client-side name filter over `allProducts` (current server result) |
| `searchProducts()` | Reads search input → `filterProducts(searchTerm)` → `renderUI()` |
| `renderUI(products)` | Injects cards into `#product-grid`, handles empty state |
| `setupSearch()` | Wires search button click, Enter key, and clear button |
| `buildCategoryDropdown(products)` | Builds `<li><a>` items once on load; click → `fetchProductsByCategory()` |
| `updateSearchStatus(count)` | Shows/hides result count below search bar |
| `buildProductCard(product)` | Returns Bootstrap card HTML string for one product |
| `buildStars()` | Returns 5-star Bootstrap Icons HTML |
| `addToCart(productID)` | `.find()` checks cart → increment qty or push new item → save + update badge |

### Data flow
```
DOMContentLoaded
  ├── requestProducts()
  │     └── GET /api/products → responseJson.data
  │           └── allProducts = data
  │                 ├── buildCategoryDropdown()   → populates #category-filter-menu (once)
  │                 └── renderUI(allProducts)     → injects all 20 cards into #product-grid
  │
  ├── setupSearch()
  │     └── binds: #search-btn click  → searchProducts()
  │                Enter on input     → searchProducts()
  │                #search-clear click → reset + searchProducts()
  │
  └── loadCart()  ← cart-utils.js
        └── localStorage → cart[] → updateCartBadge()

user clicks category in dropdown
  └── fetchProductsByCategory(selectedCategory)
        └── GET /api/products?category=<name>
              └── allProducts = responseJson.data
                    └── searchProducts() ← re-applies active search

user clicks "Add to cart" button
  └── #catalog click (event delegation)
        └── e.target.closest('.add-to-cart') → productId = data-id
              └── addToCart(productId)
                    ├── cart.find() → EXISTS   → item.quantity++
                    │             → NOT FOUND → allProducts.find() → cart.push({...})
                    ├── saveToLocalStorage()   ← cart-utils.js
                    └── updateCartBadge()      ← cart-utils.js
```

---

## Product Data Schema
All 20 products in `products.json` / `products` table use the same format:

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Primary key |
| `name` | string | Product display name |
| `category` | string | One of the 11 categories below |
| `image` | string | Image URL (450×300) |
| `badge` | string \| null | `"Sale"` or `null` |
| `rating` | number \| null | 1–5 star rating, or `null` |
| `reviewCount` | integer | Number of reviews (JSON) / `review_count` (DB column) |
| `price.type` | string | `"fixed"`, `"sale"`, or `"range"` (JSON) / `price_type` (DB) |
| `price.original` | number \| null | Struck-through original — sale only |
| `price.current` | number | Current / min price / `price_current` (DB) |
| `price.max` | number \| null | Max price — range only |
| `action` | string | `"add-to-cart"` or `"view-options"` |

`toProductShape(row)` in `productService.js` maps flat DB columns → nested JSON shape for the frontend.

### Categories in use (11)
Accessories, Bags, Beauty, Clothing, Electronics, Footwear, Furniture, Home Decor, Kitchen, Outdoors, Sports

---

## File Structure
```
/
├── index.html
├── product.html
├── cart.html
├── products.json          # seed source — read once by seed.js
├── css/styles.css
├── js/
│   ├── cart-utils.js
│   ├── scripts.js
│   ├── product.js
│   └── cart.js
├── assets/
└── server/
    ├── index.js           # entry point — binds Express app to port 3000
    ├── app.js             # middleware, routes, 404 + error handlers
    ├── db/
    │   ├── index.js       # sqlite3 connection, schema init, Promise helpers (allAsync/getAsync/runAsync)
    │   ├── schema.sql     # DDL — CREATE TABLE IF NOT EXISTS for all 4 tables
    │   └── seed.js        # one-time seeder — INSERT OR IGNORE from products.json + auth_user.json
    ├── routes/
    │   ├── products.js    # GET /api/products, GET /api/products/:id
    │   ├── auth.js        # POST /api/login
    │   ├── register.js    # POST /api/register
    │   └── checkout.js    # POST /api/checkout
    ├── controllers/
    │   ├── productController.js   # HTTP layer — validates req, calls service, sends res
    │   ├── authController.js      # login + register handlers, signs JWT
    │   └── checkoutController.js  # validates items/email/card, delegates to checkoutService
    ├── services/
    │   ├── productService.js      # toProductShape(), chooses repository query by filter combo
    │   ├── authService.js         # bcrypt hash/compare, delegates storage to userRepository
    │   └── checkoutService.js     # re-prices via Product Service fetch(), builds order record, delegates to orderRepository
    ├── repositories/
    │   ├── productRepository.js   # all SQL for products table (findAll, findByCategory, findById…)
    │   ├── orderRepository.js     # BEGIN/INSERT orders + order_items/COMMIT transaction
    │   └── userRepository.js      # findByEmail (JSON), create (JSON + SQLite dual-write)
    ├── data/
    │   └── auth_user.json         # user accounts with bcrypt hashes (salt rounds 10)
    └── utils/
        └── fileReader.js          # fs.promises JSON reader
```

### Script load order (all HTML pages)
```
bootstrap.bundle.min.js   ← Bootstrap JS (CDN)
cart-utils.js             ← shared cart globals (must load before page scripts)
scripts.js / product.js / cart.js   ← page-specific logic
```

---

## Backend Architecture

### Layer responsibilities
```
Route → Controller → Service → Repository → DB
```

| Layer | File(s) | Single responsibility |
|-------|---------|----------------------|
| Route | `routes/*.js` | URL → handler mapping only |
| Controller | `controllers/*.js` | HTTP: parse req, validate input, call service, send res |
| Service | `services/*.js` | Business rules: pricing, bcrypt, card masking, order building |
| Repository | `repositories/*.js` | All SQL — one method per query, raw rows in / raw rows out |
| DB | `db/index.js` | Connection, schema init, Promise wrappers |

### Why the Repository layer exists
Services contain business rules (re-price from DB, PCI-DSS card masking). Repositories contain SQL.
A DB schema change touches only the repository. A business rule change touches only the service. The two never collide.

### db/index.js — Promise helpers
`sqlite3` uses callbacks. Three wrappers let services use `async/await`:

| Helper | Wraps | Returns |
|--------|-------|---------|
| `db.allAsync(sql, params)` | `db.all()` | `rows[]` |
| `db.getAsync(sql, params)` | `db.get()` | one row or `null` |
| `db.runAsync(sql, params)` | `db.run()` | `{ lastID, changes }` |

All use `?` placeholders — no string concatenation into SQL anywhere in the codebase.

### Environment variables
Loaded from `.env` by `require('dotenv').config()` as the **first line** of `server/index.js`.
Server refuses to start (exit 1) if required vars are absent.

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `JWT_SECRET` | **yes** | — | Signs/verifies JWTs |
| `PRODUCT_SERVICE_URL` | **yes** | — | Product microservice base URL |
| `PORT` | no | `3000` | Express listen port |
| `JWT_EXPIRES` | no | `2h` | Token lifetime |
| `BCRYPT_ROUNDS` | no | `10` | bcrypt cost factor |
| `DB_PATH` | no | `store.db` | SQLite file path |
| `CORS_ORIGINS` | no | localhost:5500 + localhost:3000 | Comma-separated allowed origins |

### Start commands
```bash
npm start       # node server/index.js   (production)
npm run dev     # nodemon server/index.js (auto-restart on change)
```

---

## Live API Endpoints
All responses use a consistent envelope:
```json
{ "success": true,  "count": 20, "data": [ ... ] }   ← list
{ "success": true,  "data": { ... } }                  ← single item
{ "success": false, "error": "...", "field": "..." }   ← error (field optional)
```

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/products` | All products (optional `?category=` / `?badge=` filters) |
| GET | `/api/products?category=Electronics` | Category filter — case-insensitive, LOWER() in SQL |
| GET | `/api/products/:id` | Single product by numeric id |
| POST | `/api/login` | Authenticate — returns JWT on success |
| POST | `/api/register` | Register new user — bcrypt hash stored, returns JWT (201) |
| POST | `/api/checkout` | Place order — re-prices server-side, saves to SQLite (201) |

### Category filter gatekeeper (controller)
| Input | Behaviour |
|-------|-----------|
| `?category` missing | Returns all 20 products (200) |
| `?category=Electronics` | Returns matching products, case-insensitive (200) |
| `?category=` (empty string) | `{ success: false, error: "Invalid category" }` (400) |
| `?category=` > 50 chars | Same 400 rejection |
| Valid category, zero matches | `{ success: true, count: 0, data: [] }` (200) |

### Login endpoint behaviour
| Scenario | Status | Response |
|----------|--------|----------|
| Missing email or password | 400 | `{ success: false, error: "Email and password are required" }` |
| Email not found | 401 | `{ success: false, error: "Invalid email or password" }` |
| Wrong password | 401 | `{ success: false, error: "Invalid email or password" }` |
| Valid credentials | 200 | `{ success: true, token: "<jwt>", user: { id, first_name } }` |

Both "email not found" and "wrong password" return the same message — prevents user enumeration.

### Auth
| File | Purpose |
|------|---------|
| `server/data/auth_user.json` | User store — bcrypt hashes (salt rounds 10), `username` field holds email |
| `server/repositories/userRepository.js` | `findByEmail` reads JSON; `create` writes JSON + SQLite (dual-write, known tech debt) |
| `server/services/authService.js` | `bcrypt.hash` (create) / `bcrypt.compare` (login); delegates storage to userRepository |
| `server/controllers/authController.js` | Signs JWT `{ id, email, first_name }`, 2h expiry |
| `.env` | `JWT_SECRET` — gitignored, never committed |

---

## SQLite Database (store.db)

| Detail | Value |
|--------|-------|
| File path | `store.db` (project root — gitignored) |
| Library | `sqlite3` (callback-based, Promise-wrapped in `db/index.js`) |
| Connection | `server/db/index.js` — singleton, runs schema.sql on every startup |
| Schema | `server/db/schema.sql` — 4 tables, FK constraints |
| Seed | `node server/db/seed.js` — run once; INSERT OR IGNORE is idempotent |

### 4-table normalized schema

#### users
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | auto-increment |
| `email` | TEXT UNIQUE | |
| `password_hash` | TEXT | bcrypt output |
| `first_name` | TEXT | |
| `registered_at` | TEXT | ISO date |

#### products
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | matches products.json id |
| `name` | TEXT | |
| `category` | TEXT | |
| `image` | TEXT | |
| `badge` | TEXT \| null | |
| `rating` | REAL \| null | |
| `review_count` | INTEGER | |
| `price_type` | TEXT | `fixed` / `sale` / `range` |
| `price_original` | REAL \| null | |
| `price_current` | REAL | authoritative price used at checkout |
| `price_max` | REAL \| null | |
| `action` | TEXT | |

#### orders
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | auto-increment |
| `order_id` | TEXT UNIQUE | `ORD-<timestamp>` |
| `user_id` | INTEGER \| null | FK → users(id) ON DELETE SET NULL; null = guest |
| `email` | TEXT | customer email |
| `card_last4` | TEXT | last 4 digits only (PCI-DSS) |
| `total` | REAL | |
| `placed_at` | TEXT | ISO 8601 |

#### order_items
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | auto-increment |
| `order_id` | INTEGER | FK → orders(id) ON DELETE CASCADE |
| `product_id` | INTEGER | FK → products(id) ON DELETE RESTRICT |
| `quantity` | INTEGER | |
| `unit_price` | REAL | price at time of purchase — not derived from products table |
| `total_price` | REAL | unit_price × quantity |

One `orders` row per checkout. One `order_items` row per line item. `ON DELETE RESTRICT` on `product_id` prevents deleting a product that appears in order history.

### Simulated Microservice — checkoutService → Product Service
The cross-domain dependency on `productRepository.findById()` has been replaced with an HTTP fetch call, simulating what a real microservice boundary looks like:

| | Before (monolith) | After (simulated) |
|---|---|---|
| Import | `require('../repositories/productRepository')` | removed |
| Price lookup | `productRepository.findById(id)` | `fetch(PRODUCT_SERVICE_URL + '/' + id)` |
| Price field | `product.price_current` (flat DB column) | `product.price.current` (shaped API response) |

`PRODUCT_SERVICE_URL = 'http://localhost:3000/api/products'` — change this one constant to point at a real host when extracting to a true microservice. To fully extract: drop FK constraints on `orders.user_id` and `order_items.product_id`, give the order service its own DB, and replace `userId` lookup with a User Service call.

---

## Planned API Endpoints (future)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orders` | List orders (admin) |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

---

## Backend CORS Whitelist
Configured in `server/app.js` via the `cors` package:
- `http://localhost:5500` — VS Code Live Server
- `http://127.0.0.1:5500` — Live Server (IP variant)
- `http://localhost:3000` — future: frontend served from backend

---

## Developer Notes
- Run frontend via **VS Code Live Server** (`Alt+L Alt+O`) — `fetch()` requires a server, not `file://`
- Always use `127.0.0.1:5500` not `localhost:5500` — Windows IPv6 resolution can cause product-not-found errors
- All monetary values displayed with `.toFixed(2)`
- `price.type` drives card rendering: `range` → "View options", others → "Add to cart"
- Images use `dummyimage.com` placeholders — swap with real URLs
- Bootstrap 5 grid: `row-cols-2 row-cols-md-3 row-cols-xl-4` on `#product-grid`
- Category dropdown uses `data-bs-flip="false"` to always open downward
- Cart uses event delegation on `#catalog` — survives `renderUI()` re-renders
- `data-id` from HTML is a string — `parseInt()` converts it before comparing to numeric `product.id`
- **Navbar consistency**: all pages share the same nav structure — Brand/Home/Shop → `index.html`
- `store.db` is gitignored — new clones must run `node server/db/seed.js` before `npm run dev`
