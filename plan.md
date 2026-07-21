# Plan: Budgett — Bank Transaction Categorizer

**TL;DR** Build a local-first React + TypeScript web app that parses bank statement CSV/PDF files, auto-categorizes transactions, visualizes spending with charts, lets users set budgets and custom rules, and exports reports. Optional cloud sync with lightweight auth.

---

## Steps

### Phase 1: Project Setup & Core Architecture
1. **Scaffold project** using project-setup-info-local skill — React + TypeScript + Vite + Node.js backend
2. **Set up project structure** with clear separation: `src/components/`, `src/lib/`, `src/types/`, `src/hooks/`, `src/pages/`
3. **Configure routing** with React Router (Home, Upload, Dashboard, Rules, Settings pages)
4. **Set up local storage** with IndexedDB (via idb library) for transaction persistence — no server required

### Phase 2: File Upload & Parsing
5. **Build file upload component** — drag-and-drop + file picker supporting CSV, TSV, PDF
6. **Implement CSV parser** — handle common bank formats (header detection, delimiter auto-detection, date parsing)
7. **Implement PDF parser** (nice-to-have) — use `pdf-parse` library to extract transaction tables from bank PDFs
8. **Normalize transaction data** — standardize fields: date, description/merchant, amount, type (debit/credit)

### Phase 3: Auto-Categorization Engine
9. **Build default category rules** — keyword-to-category mapping (e.g., "WHOLE FOODS" → Groceries, "COMEDY CLUB" → Entertainment, "PG&E" → Utilities)
10. **Implement categorization algorithm** — match transaction descriptions against rules, fallback to "Uncategorized"
11. **Create category management** — CRUD for categories (add, edit, delete, color, icon)
12. **Add custom user rules** — UI for users to create keyword-based recategorization rules (e.g., "Starbucks" → Coffee Shops sub-category)

### Phase 4: Dashboard & Data Visualization
13. **Build transaction list view** — sortable/filterable table with search, pagination
14. **Implement spending charts** — use Recharts for:
    - Pie/donut chart: spending by category
    - Bar chart: monthly spending comparison
    - Line chart: spending trends over time
15. **Add budget tracking** — per-category budget input, progress bars showing spend vs. budget, alerts when approaching/exceeding budget

### Phase 5: Reports & Export
16. **Build report generator** — summary page with period selection, category breakdown, top merchants
17. **Implement Excel export** — use `xlsx` library to export categorized transactions
18. **Implement PDF export** — use `jspdf` + `jspdf-autotable` for report PDFs

### Phase 6: Optional Cloud Sync & Security
19. **Set up lightweight Express backend** — only for optional cloud sync feature
20. **Implement optional auth** — JWT-based registration/login (users opt-in, local mode works without it)
21. **Add data encryption** — encrypt stored transactions before cloud sync (use Web Crypto API)
22. **Implement sync logic** — push/pull transactions to cloud, conflict resolution

### Phase 7: Polish & UX
23. **Add onboarding flow** — guided tour for first-time users (upload sample, create first rule)
24. **Implement responsive design** — mobile-friendly layout
25. **Add error handling** — graceful parsing errors, helpful messages for unrecognized formats
26. **Add loading states & animations** — smooth transitions, skeleton loaders

---

## Relevant Files

**To be created:**
- `Budgett/package.json` — dependencies: react, typescript, vite, react-router, recharts, xlsx, pdf-parse, idb, express, jsonwebtoken
- `Budgett/vite.config.ts` — Vite configuration
- `Budgett/tsconfig.json` — TypeScript configuration
- `Budgett/src/main.tsx` — App entry point
- `Budgett/src/App.tsx` — Root component with routing
- `Budgett/src/types/transaction.ts` — Transaction, Category, Rule, Budget interfaces
- `Budgett/src/types/category.ts` — Category type definitions
- `Budgett/src/types/rule.ts` — Custom rule type (keyword, category, isActive)
- `Budgett/src/lib/parser/csvParser.ts` — CSV parsing logic with format detection
- `Budgett/src/lib/parser/pdfParser.ts` — PDF text extraction (optional)
- `Budgett/src/lib/parser/normalizer.ts` — Standardize parsed transactions
- `Budgett/src/lib/categorizer/index.ts` — Auto-categorization engine with default rules
- `Budgett/src/lib/categorizer/defaultRules.ts` — Built-in keyword-to-category mappings
- `Budgett/src/lib/storage/transactions.ts` — IndexedDB CRUD operations
- `Budgett/src/lib/storage/rules.ts` — IndexedDB rule storage
- `Budgett/src/lib/export/excel.ts` — Excel export using xlsx
- `Budgett/src/lib/export/pdf.ts` — PDF report export
- `Budgett/src/hooks/useTransactions.ts` — Transaction state management hook
- `Budgett/src/hooks/useCategories.ts` — Category management hook
- `Budgett/src/hooks/useRules.ts` — Custom rules management hook
- `Budgett/src/hooks/useBudgets.ts` — Budget tracking hook
- `Budgett/src/hooks/useCharts.ts` — Data transformation for chart components
- `Budgett/src/components/UploadZone.tsx` — Drag-and-drop file upload
- `Budgett/src/components/TransactionTable.tsx` — Sortable, filterable transaction list
- `Budgett/src/components/CategoryPieChart.tsx` — Spending by category
- `Budgett/src/components/MonthlyBarChart.tsx` — Monthly spending comparison
- `Budgett/src/components/TrendLineChart.tsx` — Spending trends over time
- `Budgett/src/components/BudgetTracker.tsx` — Per-category budget input + progress bars
- `Budgett/src/components/RuleEditor.tsx` — Create/edit custom categorization rules
- `Budgett/src/components/ReportPage.tsx` — Summary report with export buttons
- `Budgett/src/pages/Home.tsx` — Landing / onboarding page
- `Budgett/src/pages/Dashboard.tsx` — Main dashboard with all charts
- `Budgett/src/pages/Transactions.tsx` — Full transaction list view
- `Budgett/src/pages/Rules.tsx` — Custom rules management
- `Budgett/src/pages/Settings.tsx` — App settings, export, cloud sync toggle
- `Budgett/server/index.ts` — Express server (optional, only if cloud sync enabled)
- `Budgett/server/routes/auth.ts` — Registration/login endpoints
- `Budgett/server/routes/sync.ts` — Cloud sync endpoints with encryption

**Key patterns to reference:**
- IndexedDB pattern from `idb` library for async storage
- Recharts component patterns for chart rendering
- React Router nested routes for page navigation
- Custom hooks pattern for state management (no Redux needed for local-first)

---

## Verification

1. **Upload test** — Upload a sample CSV bank statement, verify transactions parse correctly with dates, merchants, amounts
2. **Categorization test** — Verify default rules categorize known merchants (e.g., "WHOLE FOODS MARKET" → Groceries)
3. **Custom rule test** — Create a rule "AMAZON" → Shopping, verify it overrides default categorization
4. **Chart rendering test** — Verify pie chart, bar chart, and line chart render with uploaded data
5. **Budget test** — Set a $500 grocery budget, add transactions exceeding it, verify progress bar shows over-budget
6. **Export test** — Export to Excel, open file, verify data integrity; export to PDF, verify report formatting
7. **Local-only test** — Run app without server, verify all features work with IndexedDB
8. **Cloud sync test** (optional) — Enable cloud sync, register account, verify encrypted data syncs and decrypts correctly
9. **Responsive test** — Test on mobile viewport, verify layout adapts

---

## Decisions

- **Local-first architecture** — All data stored in browser IndexedDB, no server required. App works fully offline.
- **Optional cloud sync** — Users can opt-in to cloud backup with JWT auth + Web Crypto API encryption. Server is optional.
- **CSV primary, PDF secondary** — CSV/TSV parsing is the priority. PDF parsing is a nice-to-have (bank PDF formats vary widely).
- **No framework overhead** — Custom hooks instead of Redux/Zustand. Simple, maintainable state management.
- **Recharts over Chart.js** — Better React integration, TypeScript support, and bundle size.
- **Default categories** — Groceries, Utilities, Transportation, Entertainment, Healthcare, Shopping, Dining, Subscriptions, Income, Other. Users can add custom categories.

**Excluded from v1:**
- Multi-currency support (can add later)
- Bank API integration (Plaid, etc.)
- Investment tracking
- Bill reminders / recurring transaction detection (can add as Phase 8)

---

## Further Considerations

1. **Bank format diversity** — Different banks export CSVs with wildly different column names. Should we build a format detection system that maps common column name variations (e.g., "Date" / "Transaction Date" / "Post Date") to our standard schema? (Recommended: yes, build a format mapper)

2. **PDF parsing reliability** — Bank PDFs vary enormously in layout. Should we limit PDF support to a few major banks with known templates, or attempt a generic parser? (Recommended: generic text extraction with user-friendly error messages for unsupported formats)

3. **Data privacy** — Since this is local-first, should we add a "data wipe" feature for shared computers? (Recommended: yes, one-click clear all local data)
