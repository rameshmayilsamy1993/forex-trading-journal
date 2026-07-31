# Trade Journal PDF Export — Design Spec

## Overview
Add a one-click PDF export to the Trade Journal page that downloads the currently filtered trades as a richly formatted PDF document with summary stats, full trade details, and embedded screenshots.

## Architecture
- **Pattern**: Client-side PDF generation using `jspdf` + `jspdf-autotable`
- **Data source**: Already-loaded `state.filteredTrades` — no API call needed
- **Images**: Fetched from Cloudinary URLs as base64 via `fetch` + `FileReader`
- **Trigger**: Button in `TradeJournal.tsx` calls a new `pdfExport.ts` utility

## Files & Changes

### 1. `package.json` (frontend)
Add dependencies:
- `jspdf` — PDF document creation
- `jspdf-autotable` — table rendering (for summary section)

### 2. New file: `src/app/utils/pdfExport.ts`
**Exports**: `generateTradePDF(trades, accounts, firms, analysesMap?)` — no return value, triggers download

**Structure**:
```
generateTradePDF()
├── Create jsPDF document (A4, portrait)
├── Fetch all screenshot URLs as base64 (Promise.all, with error handling)
├── Render header
│   ├── Title: "Trade Journal"
│   ├── Date range / generation timestamp
│   └── Summary stats (Win Rate, Net P/L, Profit Factor, Total Trades)
├── For each trade:
│   ├── Section header: "Trade #N — PAIR TYPE"
│   ├── Field grid: Date, Account, Pair, Type, Entry, Exit, SL, TP, Lot
│   ├── Real P/L with win/loss coloring
│   ├── R:R Ratio, Strategy, Session, Key Level
│   ├── Analysis fields (SMT, Model1, SSMT) if present
│   ├── Loss analysis section if available (reason, discipline score)
│   ├── Notes section
│   ├── Screenshots (Before / After) if URLs exist — embedded at 50mm height
│   └── Horizontal separator
├── Auto page break handling
└── doc.save("trade-journal-YYYY-MM-DD.pdf")
```

### 3. `src/app/components/TradeJournal.tsx`
**Additions**:
- Import `generateTradePDF` from `../utils/pdfExport`
- Import `Download` icon from `lucide-react`
- New handler `handleExportPDF()` that calls `generateTradePDF(state.filteredTrades, state.accounts, state.firms, state.analysesMap)`
- "Export PDF" button placed between stats summary section and `<TradeTable>`

### 4. No backend changes
All trade data is already available on the client.

## Error Handling
- No trades → button hidden
- Screenshot fetch failure → placeholder text
- Large trade sets → jspdf auto page breaks

## Success Criteria
- Click "Export PDF" with 20 filtered trades → downloads a PDF < 2 seconds
- PDF includes summary stats, all trade fields, and screenshots
- Screenshots render at readable size
- Multi-page PDF auto-paginates