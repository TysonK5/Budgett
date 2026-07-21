# Budgett — Smart Bank Transaction Categorizer

A comprehensive, local-first financial management tool that empowers users to take control of their finances and make informed decisions about their spending.

## Overview

Budgett takes and reads bank transaction files, categorizing them into spending categories such as groceries, utilities, entertainment, and more. The application provides deep insights into spending habits through an intuitive, user-friendly interface.

## Features

### 📁 File Upload & Parsing
- **CSV/TSV Support** — Upload bank statements exported as CSV or TSV files
- **PDF Parsing** (nice-to-have) — Extract transaction data from bank PDF statements
- **Auto-Detection** — Automatically detects delimiters, date formats, and column mappings
- **Format Mapping** — Handles common bank column name variations (e.g., "Date" / "Transaction Date" / "Post Date")

### 🏷️ Smart Categorization
- **Default Rules** — 50+ built-in keyword-to-category mappings (e.g., "WHOLE FOODS" → Groceries, "COMEDY CLUB" → Entertainment)
- **Custom Rules** — Create keyword-based recategorization rules for merchants not covered by defaults
- **Category Management** — Add, edit, delete, and color-code custom categories
- **Auto-Categorize** — One-click categorization of all uncategorized transactions

### 📊 Data Visualization
- **Spending by Category** — Interactive donut/pie chart showing category breakdown
- **Monthly Comparison** — Bar chart comparing spending across months
- **Spending Trends** — Line chart showing spending patterns over time
- **Budget Progress** — Per-category budget tracking with visual progress bars and alerts

### 💰 Budget Management
- **Per-Category Budgets** — Set monthly spending limits for each category
- **Real-Time Tracking** — See how much you've spent vs. your budget
- **Alerts** — Warnings when approaching or exceeding budget limits

### 📈 Reports & Export
- **Summary Reports** — Generate period-specific spending summaries
- **Excel Export** — Export categorized transactions to `.xlsx` files
- **PDF Reports** — Generate professional PDF reports with spending breakdowns

### 🔒 Security & Privacy
- **Local-First Architecture** — All data stored in your browser via IndexedDB
- **No Server Required** — App works fully offline, no data leaves your device
- **Optional Cloud Sync** — Opt-in encrypted cloud backup with JWT authentication
- **Data Wipe** — One-click clear all local data for shared computers
- **Web Crypto API** — AES encryption for cloud-synced data

### ⚙️ Custom Rules Engine
- **Keyword Matching** — Create rules based on merchant names or transaction keywords
- **Priority System** — Custom rules override default categorization
- **Rule Management** — Enable, disable, edit, or delete custom rules

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Routing | React Router v7 |
| Charts | Recharts |
| Local Storage | IndexedDB (via `idb` library) |
| Export | `xlsx`, `jspdf`, `jspdf-autotable` |
| PDF Parsing | `pdf-parse` |
| Backend (Optional) | Express, JSON Web Tokens |

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server (frontend + optional backend)
npm start

# Or start frontend only (local-first mode)
npm run dev
```

### Project Structure

```
Budgett/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── index.html
├── README.md
├── .gitignore
├── src/
│   ├── main.tsx              # App entry point
│   ├── App.tsx               # Root component with routing
│   ├── index.css             # Global styles
│   ├── types/                # TypeScript interfaces
│   ├── lib/                  # Core logic (parsers, categorizer, storage, export)
│   ├── hooks/                # Custom React hooks
│   ├── components/           # Reusable UI components
│   ├── pages/                # Page components
│   └── utils/                # Utility functions
└── server/                   # Optional Express backend
    ├── index.ts
    ├── routes/
    └── utils/
```

## Usage

### 1. Upload a Bank Statement
- Navigate to the **Upload** page
- Drag and drop your CSV/TSV file, or click to browse
- The app auto-detects the format and parses transactions

### 2. Review Categorized Transactions
- View all transactions in a sortable, filterable table
- Transactions are auto-categorized using built-in keyword rules
- Uncategorized transactions are flagged for review

### 3. Create Custom Rules
- Go to the **Rules** page
- Add keyword-based rules (e.g., "Starbucks" → "Dining")
- Rules are applied in priority order

### 4. Set Budgets
- Navigate to the **Dashboard**
- Set monthly budgets for each category
- Track spending against budgets with progress bars

### 5. Generate Reports
- View spending charts and trends on the **Dashboard**
- Export data to Excel or PDF from the **Reports** page

## Default Categories

| Category | Example Keywords |
|----------|-----------------|
| Groceries | WHOLE FOODS, TRADER JOE'S, KROGER, SAFEWAY |
| Utilities | PG&E, COMCAST, AT&T, VERIZON |
| Transportation | SHELL, EXXON, UBER, LYFT, GAS STATION |
| Entertainment | NETFLIX, AMAZON PRIME, COMEDY CLUB, AMC THEATRES |
| Healthcare | CVS, WALGREENS, KOHL'S MEDICAL, URGENT CARE |
| Shopping | AMAZON, TARGET, WALMART, BEST BUY |
| Dining | STARBUCKS, McDONALD'S, CHICK-FIL-A, Olive Garden |
| Subscriptions | SPOTIFY, HULU, DOUBLETAP, NORDTRON |
| Income | PAYROLL, DEPOSIT, TRANSFER IN, REFUND |
| Other | Uncategorized transactions |

## Local-First Architecture

Budgett is designed to work **entirely offline** by default:

- All data is stored in your browser's **IndexedDB**
- No server is required for core functionality
- No data is transmitted to any external service
- Your financial data never leaves your device

### Optional Cloud Sync

For users who want cross-device access:

1. Enable cloud sync in **Settings**
2. Create an account (JWT-based authentication)
3. Your transactions are encrypted using the **Web Crypto API** (AES-256) before being sent to the server
4. Data is decrypted locally when synced to another device

> **Note:** Cloud sync is completely optional. The app works perfectly without it.

## Security Measures

- **Encryption at Rest** — Local data is stored in IndexedDB (browser-native security)
- **Encryption in Transit** — Cloud-synced data uses AES-256 encryption via Web Crypto API
- **JWT Authentication** — Secure token-based authentication for cloud sync
- **No Third-Party Tracking** — No analytics, no tracking, no external API calls (unless cloud sync is enabled)
- **Data Wipe** — One-click clear all local data from Settings

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 15+
- Edge 90+

## Roadmap (Future Enhancements)

- [ ] Multi-currency support
- [ ] Bank API integration (Plaid, Yodlee)
- [ ] Investment tracking
- [ ] Bill reminders & recurring transaction detection
- [ ] Mobile app (React Native)
- [ ] Dark mode theme
- [ ] Multi-language support

## License

MIT

## Acknowledgments

Built with React, TypeScript, Vite, Recharts, and IndexedDB.
