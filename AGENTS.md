# ShopLedger

ShopLedger is a Node.js and Express 4 point-of-sale app for a shop that also sells on credit. It uses CommonJS, `body-parser`, plain browser JavaScript, and a JSON file for persistence.

## Module map

- `server.js` serves `public/`, mounts the API at `/api`, and renders `/orders/:id/invoice`.
- `routes/products.js` serves the catalog and coupons. `routes/orders.js` handles checkout, order history, and cancellations. `routes/customers.js` handles Khata accounts and settlements. `routes/reports.js` serves the dashboard, GST audit, cart preview, and admin export.
- `lib/pricing.js`, `lib/coupons.js`, and `lib/tax.js` calculate checkout totals, discounts, and GST. `lib/invoice.js` provides figures for the GST audit and renders printable invoices.
- `lib/inventory.js` handles stock, `lib/orders.js` manages orders, `lib/ledger.js` tracks customer credit, and `lib/dates.js` handles dates. `lib/reports.js` builds dashboard and reconciliation data.
- `config.js` contains shop details, tax slabs, coupon rules, and server settings. `lib/store.js` reads and writes the tracked `data/db.json`.

## Commands

Run these from the repository root with Node.js 22 or newer for the workshop.

| Command | Purpose |
| --- | --- |
| `npm install` | Install the declared dependencies. Leave the generated `package-lock.json` out of workshop commits. |
| `npm start` | Start the server. The default port is 3000. |
| `node --test` | Run the tests with Node’s built-in runner. The `npm test` script is a placeholder. |

## Working rules

1. Write and run characterization tests before changing behaviour. Prefix tests that capture a known defect with `CURRENT BEHAVIOUR`.
2. Limit production changes to the module covered by the ticket.
3. Use in-memory fixtures for tests. Tests must never read or write `data/db.json`. Use a temporary project copy for manual app reproduction.
4. Use the existing dependencies and Node built-ins. Add no dependencies.
