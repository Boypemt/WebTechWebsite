# Shop Homepage — Project Context

## Project Overview
E-commerce shop homepage built on the **Start Bootstrap Shop Homepage** template.
Full-stack project: HTML/CSS/JS frontend + **Node.js/Express** backend + **SQLite** database (backend not yet built).

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Styling | Bootstrap 5.2.3, Bootstrap Icons 1.5.0 |
| Backend | Node.js, Express (planned) |
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
| `css/styles.css` | Unchanged | Bootstrap 5.2.3 compiled CSS + template overrides (10 825 lines — do not edit manually; use Bootstrap utility classes) |

### Features Implemented
- **Dynamic product grid** — `products.json` fetched on load, rendered into `#product-grid` inside `#catalog`
- **Search by name** — fires on spyglass button click or Enter key (not instant/keystroke), case-insensitive partial match against `product.name`
- **Category filter** — custom Bootstrap dropdown (always drops down via `data-bs-flip="false"`, scrollable at `max-height:260px`), populated dynamically from product data
- **Combined filter** — search + category both active at once via `filterProducts(searchTerm, category)`
- **Clear button** — (×) appears when search has text, resets input and re-renders all
- **Result status** — shows `"N products found"` below search bar when any filter is active
- **Empty state** — shows a message when no products match
- **Fetch error state** — shows a helpful error card if `products.json` fails to load (e.g. opened via `file://`)
- **Product detail page** — "View options" links to `product.html?id=X`; detail page fetches product by id, shows image + info + qty selector + "Add to cart"
- **Cart system** — shared `localStorage` key `'cart'` across all pages; navbar badge updates live

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
| `allProducts` | Full array from `products.json`, set once on load |
| `selectedCategory` | Tracks active dropdown choice, default `'All'` |
| `cart` | Array of cart-item objects, starts as `[]`, filled by `loadCart()` |

### Function map
| Function | Role |
|----------|------|
| `requestProducts(path)` | `fetch()` → store `allProducts` → `buildCategoryDropdown()` → `renderUI()` |
| `filterProducts(searchTerm, category)` | Returns filtered subset of `allProducts` using `.filter()` |
| `searchProducts()` | Reads inputs, calls `filterProducts()`, calls `renderUI()` |
| `renderUI(products)` | Injects cards into `#product-grid`, handles empty state |
| `setupSearch()` | Wires search button click, Enter key, and clear button |
| `buildCategoryDropdown(products)` | Builds `<li><a>` items, handles click → updates label + highlight + triggers filter |
| `updateSearchStatus(count)` | Shows/hides result count below search bar |
| `buildProductCard(product)` | Returns Bootstrap card HTML string for one product |
| `buildStars()` | Returns 5-star Bootstrap Icons HTML |
| `formatPrice(price)` | Formats price by `price.type`: fixed / sale / range |
| `addToCart(productID)` | `.find()` checks cart → increment qty or push new item → save + update UI |
| `loadCart()` | On DOMContentLoaded: reads localStorage → parses JSON → calls `updateCartUI()` |
| `saveToLocalStorage()` | `JSON.stringify(cart)` → `localStorage.setItem('cart', ...)` |
| `updateCartUI()` | Sums all `item.quantity` via `.reduce()` → updates navbar badge |

### Data flow
```
DOMContentLoaded
  ├── requestProducts('products.json')
  │     └── fetch() → response.json()
  │           └── allProducts = products
  │                 ├── buildCategoryDropdown()   → populates #category-filter-menu
  │                 └── renderUI(allProducts)     → injects all 20 cards into #product-grid
  │
  ├── setupSearch()
  │     └── binds: #search-btn click  → searchProducts()
  │                Enter on input     → searchProducts()
  │                #search-clear click → reset + searchProducts()
  │
  └── loadCart()
        └── localStorage.getItem('cart')
              ├── null  → cart stays [], updateCartUI() shows 0
              └── JSON  → cart = JSON.parse(data), updateCartUI() restores badge

user clicks 🔍 or presses Enter
  └── searchProducts()
        └── filterProducts(searchTerm, selectedCategory)
              └── allProducts.filter(nameMatches && categoryMatches)
                    └── renderUI(results)

user selects category from dropdown
  └── buildCategoryDropdown click handler
        └── selectedCategory = value → searchProducts()

user clicks "Add to cart" button
  └── #catalog click (event delegation)
        └── e.target.closest('.add-to-cart') → productId = data-id
              └── addToCart(productId)
                    ├── cart.find() → EXISTS   → item.quantity++
                    │             → NOT FOUND → allProducts.find() → cart.push({...})
                    ├── saveToLocalStorage()
                    └── updateCartUI()
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
| `requestProduct()` | Reads `?id` from URL, `fetch('products.json')`, finds product by id |
| `renderProduct(p)` | Injects image, name, category, price, qty selector, add-to-cart button into `#product-detail` |
| `setupProductControls(p)` | Wires –/+ qty buttons and "Add to cart" click after render |
| `renderNotFound()` | Shows friendly message if id missing or not found |
| `addToCart(p, qty)` | `.find()` → increment qty or push new item → `saveToLocalStorage()` + `updateCartBadge()` |

## Planned Backend Structure (Express + SQLite)
```
/server
├── index.js            # Express entry point
├── db.js               # SQLite connection & init
├── routes/
│   └── products.js     # GET /api/products, GET /api/products/:id
└── seed.js             # Load products.json → SQLite
```

## Planned API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List all products (filter by category, badge) |
| GET | `/api/products/:id` | Single product |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| POST | `/api/cart` | Add item to cart |
| GET | `/api/cart` | Get cart items |

## Claude Design Workflow
1. Build a mockup at **claude.ai/design**
2. Export as **HTML**
3. Drop the file into the `design/` folder (e.g. `design/index-mockup.html`)
4. Tell Claude Code: *"I added a mockup at design/index-mockup.html for the shop page"*
5. Claude reads the file, extracts styles and layout, and applies them to the real page

`design/` is listed in `.gitignore` — exports won't be committed to git.

---

## Developer Notes
- Run via **VS Code Live Server** or `npx serve .` — `fetch()` requires a server, not `file://`
- All monetary values displayed with `.toFixed(2)` (2 decimal places)
- `price.type` drives card rendering: `range` → "View options", others → "Add to cart"
- Images use `dummyimage.com` placeholders — swap with real URLs or CDN paths
- Bootstrap 5 grid: `row-cols-2 row-cols-md-3 row-cols-xl-4` on `#product-grid`
- Category dropdown uses `data-bs-flip="false"` to always open downward
- Cart uses event delegation on `#catalog` — survives `renderUI()` re-renders
- To test cart: change any product's `action` to `"add-to-cart"` in `products.json`
- `data-id` from HTML is a string — `parseInt()` converts it before comparing to numeric `product.id`
- **Navbar consistency**: all 3 pages share the same nav structure. Brand → `index.html`, Home → `index.html`, About → `#!` (placeholder), Shop > All Products → `index.html`. The active class is only set on the Home link in `index.html`.
