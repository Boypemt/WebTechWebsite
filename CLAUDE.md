# Shop Homepage — Project Context

## Project Overview
E-commerce shop homepage built on the **Start Bootstrap Shop Homepage** template.
Full-stack project: HTML/CSS/JS frontend + **Node.js/Express** backend + **SQLite** database.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Styling | Bootstrap 5.2.3, Bootstrap Icons 1.5.0 |
| Backend | Node.js, Express |
| Database | SQLite (via `better-sqlite3` or `sqlite3`) |

## Product Data Schema
Products are stored in `products.json` (seed data) and mirrored in the SQLite `products` table.

### JSON / DB Field Reference
| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Primary key |
| `name` | string | Product display name |
| `category` | string | e.g. Electronics, Clothing, Kitchen |
| `image` | string | Image URL (450×300) |
| `badge` | string \| null | `"Sale"` or `null` |
| `rating` | number \| null | 1–5 star rating, or `null` if unrated |
| `reviewCount` | integer | Number of reviews (0 if unrated) |
| `price.type` | string | `"fixed"`, `"sale"`, or `"range"` |
| `price.original` | number \| null | Struck-through original price (sale items) |
| `price.current` | number | Current/main price (or range min) |
| `price.max` | number \| null | Range max price (range items only) |
| `action` | string | `"add-to-cart"` or `"view-options"` |

### Product Card Types (mapped from HTML)
1. **Fixed + Popular** — no badge, has rating/reviews, single price, "Add to cart"
2. **Sale + Special** — Sale badge, has rating/reviews, original + sale price, "Add to cart"
3. **Sale Item** — Sale badge, no reviews, original + sale price, "Add to cart"
4. **Fancy/Range** — no badge, no reviews, price range, "View options"

## File Structure
```
/
├── index.html          # Main shop page (Bootstrap template)
├── products.json       # 20 seed products (matches DB schema)
├── css/styles.css      # Custom styles
├── js/scripts.js       # Frontend JS
├── assets/             # Static assets
└── CLAUDE.md           # This file
```

## Planned Backend Structure (Express + SQLite)
```
/server
├── index.js            # Express entry point
├── db.js               # SQLite connection & init
├── routes/
│   └── products.js     # GET /api/products, GET /api/products/:id
└── seed.js             # Load products.json into SQLite
```

## API Endpoints (planned)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List all products (filter by category, badge, etc.) |
| GET | `/api/products/:id` | Single product |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| POST | `/api/cart` | Add item to cart |
| GET | `/api/cart` | Get cart items |

## Categories in Use
Electronics, Clothing, Footwear, Accessories, Kitchen, Furniture, Home Decor, Sports, Outdoors, Bags, Beauty

## Developer Notes
- All monetary values are stored as `REAL` in SQLite, displayed with 2 decimal places.
- `price.type` drives which HTML card variant to render (range → "View options", others → "Add to cart").
- Images currently use `dummyimage.com` placeholders — swap with real asset URLs or a CDN path.
- Bootstrap 5 grid uses `row-cols-2 row-cols-md-3 row-cols-xl-4` for the product grid.
