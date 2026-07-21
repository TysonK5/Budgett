# Budgett — Smart Bank Transaction Categorizer

Local-first web app that imports bank statements, auto-categorizes transactions with layered rules, tracks budgets, and visualizes spending — all stored in your browser.

**Repo:** [github.com/TysonK5/Budgett](https://github.com/TysonK5/Budgett)

---

## Overview

Budgett parses CSV/TSV (and experimental PDF) bank exports, assigns parent/child household categories via built-in keywords and custom IF/AND/OR rules, and surfaces insights on a dashboard. No account is required for core use.

---

## Features

### File upload & parsing
- Drag-and-drop or file picker for **CSV / TSV / TXT** (primary)
- Experimental **PDF** text extraction (prefer bank CSV export)
- Auto-detect delimiter (`,`, tab, `;`, `|`)
- Header / column mapping for common bank labels (`Date`, `Transaction Date`, `Description`, `Memo`, `Amount`, `Debit`/`Credit`, etc.)
- Flexible date parsing (ISO, US, day-month-year variants)
- Duplicate skip (same date + description + amount + type)
- Import preview before commit
- Sample file: `public/sample-statement.csv`

### Categories (2-level hierarchy)
- **Parent → child** taxonomy (e.g. Loans is not used; **Financial › Loans**, **Housing › Mortgage / Rent**)
- Full **household classification** set with fixed color palette
- **Settings**: add / edit / delete parents and subcategories
- Inline edit by stable **category id** — renames/colors apply retroactively to all transactions using that id
- Parent color cascade to children that still share the old color
- Delete reassigns transactions and rules to **Other › Uncategorized**
- **Uncategorized** is protected (cannot delete)
- Custom categories persist across taxonomy migrations when ids match

### Built-in auto-categorization
- Large keyword library mapping merchants to leaf categories (groceries, fuel, streaming, payroll, etc.)
- Fallback: **Other › Uncategorized**
- Custom rules always take priority over defaults

### Custom rules (IF / AND / OR)
- **Layered rules**: first layer is **IF**; additional layers join with **AND** or **OR**
- Inside a layer: **ALL (AND)** or **ANY (OR)** conditions
- Condition fields:
  - **Description** — contains, not contains, equals, starts with, ends with
  - **Amount** — `=`, `>`, `≥`, `<`, `≤`
  - **Type** — debit / credit
  - **Date** — on, before, after
- Live match preview while building (similarity-grouped transactions + counts)
- Edit existing rules; enable/disable; priority order
- Save options:
  - **Save — future only** — rule stored for new imports only
  - **Save — apply to all** — re-categorize every existing transaction immediately
- **Re-apply all rules** button for bulk recategorization
- Legacy keyword-only rules normalize to a single IF layer

### Transactions table
- Search, filter by category (parent expands to children) and type
- Sort by date, description, amount, category
- Inline category change and delete
- Pagination
- **Resizable columns** — drag header edges; widths saved in `localStorage` (`budgett-col-widths:transactions`)
- Reset columns button; double-click handle to reset one column

### Dashboard & charts
- Stats: total spending, income, net, transaction count
- **Pie**: spending by parent (rollup) and by subcategory when applicable
- **Bar**: monthly spending vs income
- **Spending trends** (line):
  - Parent category toggles (one or many)
  - **Grouped** (line per category) vs **Aggregate** (single combined line)
  - **Weekly** (Mon–Sun) vs **Monthly** (1st–last day of month)
- Top merchants list
- Budget tracker (parent budgets roll up children; over-budget alerts)

### Budgets
- Per-category monthly limits (parent or child)
- Progress bars: OK / warning (≥80%) / over budget (≥100%)
- Period-aware (current month by default)

### Reports & export
- Period filter (all time or by month)
- Category breakdown + top merchants
- **Excel** export (`.xlsx`) with parent/subcategory columns
- **PDF** report (summary + transaction table)

### Settings & privacy
- Category tree management
- Export all to Excel
- **Wipe all local data**
- Optional cloud-sync preference toggle (server optional)
- Fully offline-capable without any backend

---

## Default category taxonomy

| Parent | Color | Example subcategories |
|--------|--------|------------------------|
| Housing | `#4f46e5` | Mortgage / Rent, HOA, utilities (electric, gas, water…), home insurance |
| Transportation | `#0891b2` | Auto payment, fuel, rideshare, parking, tolls, maintenance |
| Groceries | `#16a34a` | Grocery stores, bulk, online grocery, farmers markets |
| Food & Dining | `#ea580c` | Fast food, casual, coffee, bars |
| Healthcare | `#dc2626` | Medical, dental, pharmacy, fitness, insurance |
| Shopping | `#9333ea` | Clothing, electronics, online, department stores, hardware |
| Entertainment | `#e11d48` | Streaming, movies, hobbies, airlines, hotels, theme parks |
| Education | `#2563eb` | Tuition, books, courses, childcare, supplies |
| Financial | `#6b7280` | Bank fees, investments, loans, credit card payments, taxes |
| Family | `#d97706` | Childcare, kids’ activities, baby supplies |
| Communications | `#0d9488` | Mobile phone, home internet |
| Pets | `#c2410c` | Vet, pet food, grooming, insurance |
| Other / Uncategorized | `#64748b` | Misc, Uncategorized, refunds, ATM, transfers |
| Income | `#15803d` | Salary, freelance, investments, benefits, other income |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| UI | React 19, TypeScript, Vite 6 |
| Routing | React Router 7 |
| Charts | Recharts |
| Local DB | IndexedDB via `idb` |
| Export | `xlsx`, `jspdf`, `jspdf-autotable` |
| Optional API | Express, JWT (`jsonwebtoken`), `bcryptjs` |

---

## Requirements

### Runtime
- **Node.js 18+**
- **npm** (or compatible package manager)
- Modern browser: Chrome 90+, Firefox 88+, Safari 15+, Edge 90+ (IndexedDB required)

### Install & run

```bash
# Clone
git clone https://github.com/TysonK5/Budgett.git
cd Budgett

# Install dependencies
npm install

# Frontend only (local-first — recommended)
npm run dev
# → http://localhost:3000

# Optional: API for cloud sync (port 4000)
npm run server

# Frontend + optional API together
npm start

# Production build
npm run build
npm run preview
```

### npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server on port **3000** |
| `npm run build` | Typecheck (`tsc`) + production bundle |
| `npm run preview` | Serve production build |
| `npm run server` | Optional Express API on port **4000** |
| `npm start` | Dev frontend + server via `concurrently` |

Vite proxies `/api/*` → `http://localhost:4000` when the server is running.

### Optional API endpoints
- `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`
- `GET|PUT|DELETE /api/sync` (Bearer JWT; payload is client-encrypted string)

In-memory stores only — not production-ready.

---

## Project structure

```
Budgett/
├── package.json
├── vite.config.ts          # port 3000, @ alias, /api proxy
├── tsconfig.json
├── index.html
├── public/
│   └── sample-statement.csv
├── src/
│   ├── main.tsx
│   ├── App.tsx             # routes
│   ├── index.css
│   ├── types/transaction.ts
│   ├── pages/              # Home, Upload, Dashboard, Transactions, Rules, Reports, Settings
│   ├── components/         # UI (tables, charts, rule builder, upload, …)
│   ├── hooks/              # IndexedDB-backed state hooks
│   └── lib/
│       ├── parser/         # CSV + PDF + normalizer
│       ├── categorizer/    # default keywords + engine
│       ├── rules/          # layered IF/AND/OR evaluation
│       ├── storage/        # IndexedDB CRUD
│       ├── export/         # Excel + PDF
│       └── constants.ts    # default category tree
└── server/                 # optional Express auth + sync
    ├── index.ts
    └── routes/
```

---

## App pages

| Route | Purpose |
|-------|---------|
| `/` | Home / onboarding |
| `/upload` | Import statements |
| `/dashboard` | Charts, trends, budgets |
| `/transactions` | Full table, filters, resizable columns |
| `/rules` | Layered rule builder |
| `/reports` | Summaries + Excel/PDF export |
| `/settings` | Categories, wipe data, cloud preference |

---

## Data model (local)

Stored in IndexedDB (`budgett-db`):

- **transactions** — `id`, `date`, `description`, `amount`, `type`, `categoryId`, …
- **categories** — `id`, `name`, `color`, `icon`, `isSystem`, `parentId`
- **rules** — layered conditions, `categoryId`, `priority`, `isActive`
- **budgets** — `categoryId`, `monthlyAmount`, `period` (`YYYY-MM`)
- **settings** — e.g. taxonomy version

Column widths: `localStorage` key `budgett-col-widths:transactions`.

---

## Usage workflow

1. **Upload** a bank CSV (or try `public/sample-statement.csv`).
2. **Review** on Transactions; fix categories inline if needed.
3. **Rules** — build IF/AND/OR rules; choose *future only* or *apply to all*.
4. **Dashboard** — charts, weekly/monthly trends, budgets.
5. **Reports** — export Excel or PDF.
6. **Settings** — manage category tree or wipe local data.

---

## Architecture decisions

- **Local-first** — core features work offline; server is optional.
- **Stable category ids** — display names can change without rewriting every transaction row.
- **Custom rules before defaults** — priority-sorted layered evaluation.
- **CSV first** — PDF support is best-effort only.
- **No Redux** — custom hooks + IndexedDB.

---

## Roadmap (not in v1)

- [ ] Multi-currency
- [ ] Bank APIs (Plaid, etc.)
- [ ] Investment tracking
- [ ] Recurring transaction / bill detection
- [ ] Dark mode
- [ ] Production-grade cloud DB + stronger auth

---

## License

MIT

## Acknowledgments

Built with React, TypeScript, Vite, Recharts, and IndexedDB.
