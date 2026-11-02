# StockTrack: Inventory & Order Management

A full-stack inventory and order system built with **ASP.NET Core 8**, **Oracle Database** (PL/SQL), and **Next.js + TypeScript + Material UI**.

Staff search the product catalogue and place orders. Admins manage products and can cancel orders. Stock rules are enforced in a PL/SQL package, so stock can never go negative, even when two people order the last item at the same time.

<!-- Add a screenshot after you run it: ![Dashboard](docs/dashboard.png) -->

## Features

- **Login with JWT** and two roles (`ADMIN`, `STAFF`); passwords hashed with BCrypt
- **Products:** search by name/SKU, filter by category, create / edit / soft-delete (admin only)
- **Orders:** build an order from several products, see the live total, place it in one transaction
- **Stock safety:** `ORDER_PKG.ADD_ITEM` locks the product row (`SELECT … FOR UPDATE`), checks stock and reduces it; if any line fails, the whole order is rolled back
- **Cancel orders:** stock is returned automatically (admin only)
- **Dashboard:** product count, low-stock count, placed orders, revenue, and a reorder list from the `LOW_STOCK_V` view
- **Clean errors:** Oracle errors (`ORA-20002` not enough stock, unique/check constraint violations) become proper HTTP 404 / 409 / 400 responses with a readable message

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, MUI 6 |
| Backend | ASP.NET Core 8 Web API, C#, Dapper, ODP.NET (Oracle.ManagedDataAccess.Core), JWT Bearer auth, Swagger |
| Database | Oracle Database 23ai Free (in Docker), PL/SQL package, view, constraints, identity columns |

## Architecture

```
Next.js (localhost:3000)
   │  fetch + JWT in Authorization header
   ▼
ASP.NET Core API (localhost:5000)
   Controllers ──► Repositories ──► Dapper / ODP.NET
   ErrorHandlingMiddleware maps ORA-200xx → HTTP 4xx
   │
   ▼
Oracle (localhost:1521/FREEPDB1, schema STOCKTRACK)
   Tables: APP_USERS, PRODUCTS, ORDERS, ORDER_ITEMS
   View:   LOW_STOCK_V
   Package ORDER_PKG: CREATE_ORDER, ADD_ITEM, CANCEL_ORDER
```

```
stocktrack/
├── database/
│   ├── init/01_create_schema.sh   # runs the SQL as the app user on first start
│   └── sql/                       # schema, PL/SQL package, seed data
├── backend/StockTrack.Api/
│   ├── Controllers/               # Auth, Products, Orders
│   ├── Data/                      # repositories (SQL lives here)
│   ├── Middleware/                # Oracle error → HTTP mapping
│   ├── Services/TokenService.cs   # JWT creation
│   └── StockTrack.Api.http        # ready-made requests for manual testing
├── frontend/src/
│   ├── app/                       # pages: dashboard, login, products, orders
│   ├── components/                # AppShell (nav + route guard), ProductDialog
│   └── lib/                       # API client, auth context, types
└── docker-compose.yml
```

## Running it locally

**You need:** Docker Desktop, .NET 8 SDK, Node.js 20+.

**1. Start Oracle** (the first start takes 1–3 minutes; it creates the schema and sample products):

```bash
docker compose up -d
docker logs -f stocktrack-oracle     # wait for "DATABASE IS READY TO USE!"
```

**2. Start the API:**

```bash
cd backend/StockTrack.Api
dotnet run
```

Swagger opens at http://localhost:5000/swagger. On first start the API creates two demo users:

| Username | Password | Role |
| --- | --- | --- |
| admin | Admin123! | ADMIN |
| staff | Staff123! | STAFF |

**3. Start the frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 and sign in.

## API endpoints

| Method | Path | Who | What it does |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | anyone | Returns a JWT |
| GET | `/api/products?search=&category=` | logged in | Search products |
| GET | `/api/products/{id}` | logged in | One product |
| GET | `/api/products/low-stock` | logged in | Products at/below reorder level |
| GET | `/api/products/categories` | logged in | Category list |
| POST | `/api/products` | admin | Create product |
| PUT | `/api/products/{id}` | admin | Update product |
| DELETE | `/api/products/{id}` | admin | Soft-delete product |
| GET | `/api/orders?status=` | logged in | Latest 200 orders |
| GET | `/api/orders/{id}` | logged in | Order with its lines |
| GET | `/api/orders/stats` | logged in | Dashboard numbers |
| POST | `/api/orders` | logged in | Place an order (409 if stock is short) |
| POST | `/api/orders/{id}/cancel` | admin | Cancel and return stock |

## Design decisions

- **Business rules in PL/SQL.** Stock checks and totals live in `ORDER_PKG`, so every client (this API, a report, an old Oracle Forms screen) follows the same rules.
- **One transaction per order.** The API calls `CREATE_ORDER` and then `ADD_ITEM` per line on a single connection and commits once. Any error rolls back everything.
- **Row locking.** `SELECT … FOR UPDATE` in `ADD_ITEM` prevents two orders from both taking the last unit.
- **Price snapshot.** `ORDER_ITEMS.UNIT_PRICE` is copied at order time, so changing a product's price doesn't change old orders.
- **Soft delete.** Products are deactivated, not deleted, because past orders still reference them.
- **Dapper over Entity Framework.** The SQL is written by hand and visible, which suits an Oracle-heavy codebase with existing PL/SQL.
- **Bound parameters everywhere.** No SQL is built by string concatenation, which prevents SQL injection.

## Possible next steps

- Unit tests for the repositories (xUnit + Testcontainers for Oracle)
- Pagination on the orders and products lists
- Audit log table filled by a trigger
- Deploy with Docker Compose for all three services
