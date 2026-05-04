# Shop Homepage — Project Context

## Project Overview
E-commerce shop homepage built on the **Start Bootstrap Shop Homepage** template.
Full-stack project: HTML/CSS/JS frontend + **Node.js/Express** backend (live) + **SQLite** database (planned).

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Styling | Bootstrap 5.2.3, Bootstrap Icons 1.5.0 |
| Backend | Node.js, Express (live on port 3000) |
| Database | SQLite via `better-sqlite3` (planned) |

---

## Current Website State

### Pages
| File | Status | Description |
|------|--------|-------------|
| `index.html` | Live | Main shop page — navbar, header, search/filter bar, product grid, footer |
| `product.html` | Live | Product detail page — image, info, quantity selector, add to cart |
| `cart.html` | Live | Cart page — item list with qty controls, order summary |
| `products.json` | Live | 20 seed products, single source of truth |
| `js/cart-utils.js` | Live | Shared utilities — `cart[]`, `loadCart`, `saveToLocalStorage`, `updateCartBadge`, `formatPrice` |
| `js/scripts.js` | Live | index.html JS — fetch, filter, render, addToCart |
| `js/product.js` | Live | product.html JS — URL param read, fetch, render, addToCart |
| `js/cart.js` | Live | cart.html JS — render cart items, qty controls, order summary |
| `login.html` | Live | Login page — email/password form, saves JWT + user to localStorage on success |
| `js/login.js` | Live | login.html JS — fetch POST /api/login, saveSession(), redirect to index.html |
| `css/styles.css` | Unchanged | Bootstrap 5.2.3 compiled CSS + template overrides (10 825 lines — do not edit manually; use Bootstrap utility classes) |

### Features Implemented
- **Dynamic product grid** — fetched from `GET /api/products` on load, rendered into `#product-grid` inside `#catalog`
- **Search by name** — fires on spyglass button click or Enter key (not instant/keystroke), case-insensitive partial match against `product.name`, client-side over last server result
- **Category filter** — server-driven round trip on every click; `fetchProductsByCategory()` sends `GET /api/products?category=<name>`; "All Categories" omits the param; outgoing URL logged to console
- **Category gatekeeper** — controller rejects empty string or >50-char category with 400; valid category with zero matches returns 200 with `data: []`
- **Category filter case-insensitive** — `?category=electronics` matches "Electronics" on the server
- **Combined filter** — category applied server-side first, search applied client-side over the result
- **Clear button** — (×) appears when search has text, resets input and re-renders all
- **Result status** — shows `"N products found"` below search bar when any filter is active
- **Empty state** — shows a message when no products match
- **API error state** — shows a helpful error card if the backend is unreachable
- **Product detail page** — "View options" links to `product.html?id=X`; detail page fetches `GET /api/products/:id`, shows image + info + qty selector + "Add to cart"
- **Cart system** — shared `localStorage` key `'cart'` across all pages; navbar badge updates live
- **Login page** — `login.html` posts to `POST /api/login`; on success stores `token` and `user` in `localStorage` and redirects to `index.html`; already-logged-in users are redirected away immediately

### Search & Filter Section (index.html)
```
[ Search by product name...  🔍  ×]   [ All Categories ▾ ]
              N products found
```
- White background, drop shadow, visible heading — placed between header and product grid
- Spyglass (`#search-btn`) is a clickable `<button>` — search fires on click or Enter, NOT on every keystroke
- Category dropdown: Bootstrap custom `<ul>` menu, `data-bs-flip="false"` forces downward direction
- Requires a **local server** (`npx serve .` or VS Code Live Server) — `fetch()` does not work on `file://`

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
  └── buildCategoryDropdown click handler
        └── selectedCategory = value
              └── fetchProductsByCategory(selectedCategory)
                    └── GET /api/products?category=<name>  (or no param for "All")
                          └── console.log(url)             ← visible in DevTools
                                └── allProducts = responseJson.data
                                      └── searchProducts() ← re-applies active search

user clicks 🔍 or presses Enter
  └── searchProducts()
        └── filterProducts(searchTerm)   ← client-side, over allProducts
              └── renderUI(results)

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
All 20 products in `products.json` currently use the same format:

| Field | Current value | Notes |
|-------|--------------|-------|
| `badge` | `null` | No sale badges currently |
| `rating` | `null` | No star ratings currently |
| `reviewCount` | `0` | |
| `price.type` | `"fixed"` | All single fixed prices |
| `price.original` | `null` | |
| `price.max` | `null` | |
| `action` | `"view-options"` | All cards show "View options" — change to `"add-to-cart"` to activate cart button |

### Full field reference
| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Primary key |
| `name` | string | Product display name |
| `category` | string | One of the 11 categories below |
| `image` | string | Image URL (450×300) |
| `badge` | string \| null | `"Sale"` or `null` |
| `rating` | number \| null | 1–5 star rating, or `null` |
| `reviewCount` | integer | Number of reviews |
| `price.type` | string | `"fixed"`, `"sale"`, or `"range"` |
| `price.original` | number \| null | Struck-through original (sale only) |
| `price.current` | number | Current / min price |
| `price.max` | number \| null | Max price (range only) |
| `action` | string | `"add-to-cart"` or `"view-options"` |

### Categories in use (11)
Accessories, Bags, Beauty, Clothing, Electronics, Footwear, Furniture, Home Decor, Kitchen, Outdoors, Sports

---

## File Structure
```
/
├── index.html          # Main shop page
├── product.html        # Product detail page (loaded via ?id=X)
├── cart.html           # Cart page
├── products.json       # 20 seed products (single source of truth)
├── css/styles.css      # Bootstrap 5.2.3 compiled + template overrides
├── js/
│   ├── cart-utils.js   # Shared — cart[], loadCart, saveToLocalStorage,
│   │                   #          updateCartBadge, formatPrice
│   ├── scripts.js      # index.html — fetch, filter, render, addToCart
│   ├── product.js      # product.html — URL param, fetch, render, addToCart
│   └── cart.js         # cart.html — render items, qty controls, order summary
├── images/
│   └── products/       # Place product images here; update "image" field in products.json
├── design/             # Claude Design exports (gitignored — workflow reference only)
├── assets/             # Static assets (favicon etc.)
└── CLAUDE.md           # This file
```

### Script load order (all 3 pages)
```
bootstrap.bundle.min.js   ← Bootstrap JS (CDN)
cart-utils.js             ← shared cart globals (must load before page scripts)
scripts.js / product.js / cart.js   ← page-specific logic
```

## Page Navigation Flow
```
index.html
  └── "View options" → product.html?id=X
        └── "Add to cart" → updates localStorage cart[]
              └── cart badge in navbar updates immediately
        └── "Back to shop" → index.html

index.html / product.html
  └── Cart button in navbar → cart.html
        └── qty controls (– n +) → saveToLocalStorage + re-render
        └── trash button        → removeItem + re-render
        └── "Continue Shopping" → index.html
```

## js/cart-utils.js — Shared Utilities
Loaded before every page script. Defines globals used by all three pages.

| Export | Role |
|--------|------|
| `cart` | Shared cart array `[{ id, name, image, price, quantity }]` |
| `loadCart()` | Reads localStorage → fills `cart[]` → `updateCartBadge()` |
| `saveToLocalStorage()` | `JSON.stringify(cart)` → `localStorage.setItem('cart', ...)` |
| `updateCartBadge()` | `.reduce()` total quantity → updates `#cart-badge` |
| `formatPrice(price)` | `fixed` / `sale` / `range` price object → display HTML |

## js/product.js Architecture
| Function | Role |
|----------|------|
| `requestProduct()` | Reads `?id` from URL → `GET /api/products/:id` → `renderProduct()` or `renderNotFound()` |
| `renderProduct(p)` | Injects image, name, category, price, qty selector, add-to-cart button into `#product-detail` |
| `setupProductControls(p)` | Wires –/+ qty buttons and "Add to cart" click after render |
| `renderNotFound()` | Shows friendly message if id missing or API returns 404 |
| `addToCart(p, qty)` | `.find()` → increment qty or push new item → `saveToLocalStorage()` + `updateCartBadge()` |

## Backend CORS Whitelist
Configured in `server/app.js` via the `cors` package. Whitelisted origins:
- `http://localhost:5500` — VS Code Live Server
- `http://127.0.0.1:5500` — Live Server (IP variant)
- `http://localhost:3000` — future: frontend served from backend

Allowed methods: `GET POST PUT DELETE OPTIONS`

## Backend Structure (Express + Node.js)
```
/server
├── index.js                  # Entry point — binds app to port 3000
├── app.js                    # Express app, middleware, routes, error handlers
├── routes/
│   └── products.js           # Mounts GET /api/products, GET /api/products/:id
├── controllers/
│   └── productController.js  # HTTP layer — reads req, calls service, writes res
├── services/
│   └── productService.js     # Business logic — reads ../products.json, filters
└── utils/
    └── fileReader.js         # Async JSON file reader (fs.promises)
```

### Pattern: Controller → Route → Service
| Layer | File | Responsibility |
|-------|------|----------------|
| Route | `routes/products.js` | URL → handler mapping only |
| Controller | `controllers/productController.js` | HTTP: parse req, call service, send res |
| Service | `services/productService.js` | Data: read products.json, filter, find |
| Utility | `utils/fileReader.js` | fs.promises wrapper for JSON files |

### Start commands
```bash
npm start       # node server/index.js   (production)
npm run dev     # nodemon server/index.js (development — auto-restarts on change)
```

## Live API Endpoints
All responses use a consistent envelope shape:
```json
{ "success": true, "count": 20, "data": [ ... ] }   ← list
{ "success": true, "data": { ... } }                  ← single
{ "success": false, "error": "Product not found" }    ← error
```

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/products` | All products (optional `?category=` / `?badge=` filters) |
| GET | `/api/products?category=Electronics` | Category filter — case-insensitive, server-side |
| GET | `/api/products/:id` | Single product by numeric id |
| POST | `/api/login` | Authenticate user — returns JWT on success |

### Category filter gatekeeper (controller)
| Input | Behaviour |
|-------|-----------|
| `?category` missing | Returns all 20 products (200) |
| `?category=Electronics` | Returns matching products, case-insensitive (200) |
| `?category=` (empty string) | `{ success: false, error: "Invalid category" }` (400) |
| `?category=` > 50 chars | Same 400 rejection |
| Valid category, zero matches | `{ success: true, count: 0, data: [] }` (200) |

Frontend fetch targets:
- `js/scripts.js` initial load → `GET /api/products` → `responseJson.data` (array)
- `js/scripts.js` category click → `GET /api/products?category=<name>` → `responseJson.data` (array)
- `js/product.js` → `GET /api/products/:id` → `responseJson.data` (object)

### Login endpoint behaviour
| Scenario | Status | Response |
|----------|--------|----------|
| Missing email or password | 400 | `{ success: false, error: "Email and password are required" }` |
| Email not in database | 401 | `{ success: false, error: "Invalid credentials" }` |
| Wrong password | 401 | `{ success: false, error: "Invalid credentials" }` |
| Valid credentials | 200 | `{ success: true, token: "<jwt>", user: { id, first_name } }` |

Both "email not found" and "wrong password" return the same 401 message intentionally — prevents user enumeration.

### Auth file locations
| File | Purpose |
|------|---------|
| `server/data/auth_user.json` | User database — bcrypt hashes (salt rounds 10) |
| `server/routes/auth.js` | Route: POST / → login controller |
| `server/controllers/authController.js` | HTTP layer: validate input, call service, sign JWT |
| `server/services/authService.js` | Business logic: findUserByEmail, verifyPassword |
| `.env` | `JWT_SECRET` — gitignored, never committed |

JWT payload: `{ id, email, first_name }` — expires in 2 hours.

## Planned API Endpoints (future)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

## Claude Design Workflow
1. Build a mockup at **claude.ai/design**
2. Export as **HTML**
3. Drop the file into the `design/` folder (e.g. `design/index-mockup.html`)
4. Tell Claude Code: *"I added a mockup at design/index-mockup.html for the shop page"*
5. Claude reads the file, extracts styles and layout, and applies them to the real page

`design/` is listed in `.gitignore` — exports won't be committed to git.

---

## Developer Notes
- Run via **VS Code Live Server** (`Alt+L Alt+O` or click "Go Live" in status bar) — `fetch()` requires a server, not `file://`
- All monetary values displayed with `.toFixed(2)` (2 decimal places)
- `price.type` drives card rendering: `range` → "View options", others → "Add to cart"
- Images use `dummyimage.com` placeholders — swap with real URLs or CDN paths
- Bootstrap 5 grid: `row-cols-2 row-cols-md-3 row-cols-xl-4` on `#product-grid`
- Category dropdown uses `data-bs-flip="false"` to always open downward
- Cart uses event delegation on `#catalog` — survives `renderUI()` re-renders
- To test cart: change any product's `action` to `"add-to-cart"` in `products.json`
- `data-id` from HTML is a string — `parseInt()` converts it before comparing to numeric `product.id`
- **Navbar consistency**: all 3 pages share the same nav structure. Brand → `index.html`, Home → `index.html`, About → `#!` (placeholder), Shop > All Products → `index.html`. The active class is only set on the Home link in `index.html`.
