# Shop Homepage

Full-stack e-commerce storefront built on the **Start Bootstrap Shop Homepage** template.
Vanilla JS frontend backed by a Node.js/Express REST API and a SQLite database.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Styling | Bootstrap 5.2.3, Bootstrap Icons 1.5.0 |
| Backend | Node.js, Express 5 |
| Database | SQLite via `sqlite3` (Promise-wrapped) |
| Auth | JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`) |
| Config | `dotenv` |

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and set at minimum `JWT_SECRET` (see [Environment Variables](#environment-variables)).

### 3. Seed the database
Run once after cloning. Safe to re-run (uses `INSERT OR IGNORE`).
```bash
node server/db/seed.js
```

### 4. Start the server
```bash
npm run dev      # development — auto-restarts on file changes (nodemon)
npm start        # production
```

### 5. Open the frontend
Use **VS Code Live Server** (`Alt+L Alt+O`) — `fetch()` does not work on `file://`.
Navigate to `http://127.0.0.1:5500` (use the IP, not `localhost`, to avoid Windows IPv6 issues).

---

## Environment Variables

All variables are loaded from `.env` at startup. The server refuses to start if required variables are missing.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **yes** | — | Secret key for signing JWTs. Generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `PRODUCT_SERVICE_URL` | **yes** | — | Base URL of the Product Service (`http://localhost:3000/api/products` for local dev) |
| `PORT` | no | `3000` | Port the Express server listens on |
| `JWT_EXPIRES` | no | `2h` | JWT lifetime (e.g. `1h`, `7d`) |
| `BCRYPT_ROUNDS` | no | `10` | bcrypt cost factor — higher = slower hash, harder to brute-force |
| `DB_PATH` | no | `store.db` | Path to the SQLite database file |
| `CORS_ORIGINS` | no | localhost:5500 + localhost:3000 | Comma-separated list of allowed CORS origins |

---

## API Endpoints

All responses use a consistent JSON envelope:
```json
{ "success": true,  "count": 20, "data": [ ... ] }   // list
{ "success": true,  "data": { ... } }                  // single item
{ "success": false, "error": "...", "field": "..." }   // error
```

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Server health check |
| GET | `/api/products` | — | All products (optional `?category=` / `?badge=` filters) |
| GET | `/api/products/:id` | — | Single product by id |
| POST | `/api/login` | — | Authenticate — returns JWT |
| POST | `/api/register` | — | Register new user — returns JWT (201) |
| POST | `/api/checkout` | optional | Place order — re-prices server-side, saves to SQLite (201) |

---

## Architecture

```
Route → Controller → Service → Repository → DB
```

| Layer | Location | Responsibility |
|-------|----------|---------------|
| Route | `server/routes/*.js` | URL → handler mapping only |
| Controller | `server/controllers/*.js` | Parse request, validate input, call service, send response |
| Service | `server/services/*.js` | Business rules: pricing, bcrypt, card masking, JWT signing |
| Repository | `server/repositories/*.js` | All SQL — parameterised queries, raw rows in/out |
| DB | `server/db/index.js` | SQLite connection, schema init, Promise helpers |

### Simulated Microservice
`checkoutService` fetches product prices via HTTP (`PRODUCT_SERVICE_URL`) instead of calling `productRepository` directly, simulating a microservice boundary. Change `PRODUCT_SERVICE_URL` in `.env` to point at a real host when extracting to a separate service.

### Key security decisions
- **bcrypt** at configurable cost rounds — makes brute-force impractical even if the DB is leaked
- **Vague 401 messages** — "Invalid email or password" for both "not found" and "wrong password" prevents user enumeration
- **Server-side repricing** — checkout re-fetches prices from the DB; client-supplied prices are ignored
- **PCI-DSS** — only the last 4 digits of the card number are stored

---

## File Structure

```
/
├── index.html              # Main shop page
├── product.html            # Product detail page
├── cart.html               # Cart + checkout form
├── products.json           # Seed data (read once by seed.js)
├── .env                    # Secret config — gitignored
├── .env.example            # Safe-to-commit template
├── js/
│   ├── cart-utils.js       # Shared cart utilities
│   ├── scripts.js          # index.html logic
│   ├── product.js          # product.html logic
│   └── cart.js             # cart.html logic
└── server/
    ├── index.js            # Entry point — loads .env, fail-fast, starts server
    ├── app.js              # Express app — middleware, routes, error handlers
    ├── db/
    │   ├── index.js        # SQLite connection + Promise helpers
    │   ├── schema.sql      # DDL for all 4 tables
    │   └── seed.js         # One-time seeder
    ├── routes/             # URL → controller mapping
    ├── controllers/        # HTTP layer
    ├── services/           # Business logic
    ├── repositories/       # SQL queries
    ├── data/
    │   └── auth_user.json  # User store (bcrypt hashes)
    └── utils/
        └── fileReader.js   # fs.promises JSON helper
```
