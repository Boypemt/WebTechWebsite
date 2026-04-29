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
| `index.html` | Live | Main shop page — navbar, header, search bar, product grid, footer |
| `products.json` | Live | 20 seed products, single source of truth |
| `js/scripts.js` | Live | All frontend JS — fetch, filter, render |
| `css/styles.css` | Unchanged | Bootstrap custom overrides |

### Features Implemented
- **Dynamic product grid** — `products.json` is fetched on load and rendered into `#product-grid`
- **Search by name** — live filtering on every keystroke, case-insensitive partial match against `product.name`
- **Category filter** — custom Bootstrap dropdown (always drops down, scrollable at `max-height: 260px`), populated dynamically from product data
- **Combined filter** — search + category both active at once via `filterProducts(searchTerm, category)`
- **Clear button** — (×) appears when search has text, resets input and re-renders all
- **Result status** — shows `"N products found"` below search bar when any filter is active
- **Empty state** — shows a message when no products match
- **Fetch error state** — shows a helpful error card if `products.json` fails to load (e.g. opened via `file://`)

### Search & Filter Section (index.html)
```
[ 🔍  Search by product name...  ×]   [ All Categories ▾ ]
           N products found
```
- White background, drop shadow, visible heading — placed between header and product grid
- Category dropdown: Bootstrap custom `<ul>` menu, `data-bs-flip="false"` forces downward direction
- Requires a **local server** (`npx serve .` or VS Code Live Server) — `fetch()` does not work on `file://`

---

## JS Architecture (js/scripts.js)

### Module-level variables
| Variable | Purpose |
|----------|---------|
| `allProducts` | Full array from `products.json`, set once on load |
| `selectedCategory` | Tracks active dropdown choice, default `'All'` |

### Function map
| Function | Role |
|----------|------|
| `requestProducts(path)` | `fetch()` → store `allProducts` → `buildCategoryDropdown()` → `renderUI()` |
| `filterProducts(searchTerm, category)` | Returns filtered subset of `allProducts` using `.filter()` |
| `searchProducts()` | Reads inputs, calls `filterProducts()`, calls `renderUI()` |
| `renderUI(products)` | Injects cards into `#product-grid`, handles empty state |
| `setupSearch()` | Wires `input` event on search box and clear button click |
| `buildCategoryDropdown(products)` | Builds `<li><a>` items, handles click → updates label + highlight + triggers filter |
| `updateSearchStatus(count)` | Shows/hides result count below search bar |
| `buildProductCard(product)` | Returns Bootstrap card HTML string for one product |
| `buildStars()` | Returns 5-star Bootstrap Icons HTML |
| `formatPrice(price)` | Formats price by `price.type`: fixed / sale / range |

### Data flow
```
DOMContentLoaded
  ├── requestProducts('products.json')
  │     └── fetch() → response.json()
  │           └── allProducts = products
  │                 ├── buildCategoryDropdown()   → populates #category-filter-menu
  │                 └── renderUI(allProducts)     → injects all 20 cards
  │
  └── setupSearch()
        └── binds: input → searchProducts()
                  click  → clear + searchProducts()

user types / selects category
  └── searchProducts()
        └── filterProducts(searchTerm, selectedCategory)
              └── allProducts.filter(nameMatches && categoryMatches)
                    └── renderUI(results)
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
| `action` | `"view-options"` | All cards show "View options" |

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
├── products.json       # 20 seed products (single source of truth)
├── css/styles.css      # Custom Bootstrap overrides
├── js/scripts.js       # All frontend JS
├── assets/             # Static assets (favicon etc.)
└── CLAUDE.md           # This file
```

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

## Developer Notes
- Run via **VS Code Live Server** or `npx serve .` — `fetch()` requires a server, not `file://`
- All monetary values displayed with `.toFixed(2)` (2 decimal places)
- `price.type` drives card rendering: `range` → "View options", others → "Add to cart"
- Images use `dummyimage.com` placeholders — swap with real URLs or CDN paths
- Bootstrap 5 grid: `row-cols-2 row-cols-md-3 row-cols-xl-4` on `#product-grid`
- Category dropdown uses `data-bs-flip="false"` to always open downward
