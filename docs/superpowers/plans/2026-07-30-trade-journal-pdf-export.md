# Trade Journal PDF Export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-click PDF export button to the Trade Journal that downloads the currently filtered trades as a formatted PDF with summary stats, full trade details, and embedded screenshots.

**Architecture:** Client-side PDF generation using `jspdf` + `jspdf-autotable`. All trade data is already available in `state.filteredTrades`. Screenshots are fetched from Cloudinary URLs and converted to base64 for embedding. No backend changes.

**Tech Stack:** jspdf 2.x, jspdf-autotable, TypeScript, React, lucide-react

## Global Constraints
- No backend changes — all work is frontend-only
- Follow existing code style in `src/app/` (no comments, small functions, meaningful names)
- Use existing `lucide-react` icons for the button
- Button must respect reduced motion (use existing patterns)

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [x] **Step 1: Install jspdf and jspdf-autotable**

```bash
pnpm add -w jspdf jspdf-autotable
```

- [x] **Step 2: Verify installation**

```bash
pnpm ls jspdf jspdf-autotable
```
Expected: Both packages listed in dependencies.

---

### Task 2: Create PDF Export Utility

**Files:**
- Create: `src/app/utils/pdfExport.ts`

**Interfaces:**
- Consumes: `Trade`, `TradingAccount`, `PropFirm` types from `../types/trading`
- Produces: `generateTradePDF(trades, accounts, firms, analysesMap?)` — triggers browser download

- [x] **Step 1: Create the utility file with imports, helpers, and `generateTradePDF` function**

See source file for full implementation.
Helpers: `fetchImageAsBase64`, `getAccountName`, `getFirmColor`, `getRealPL`
Main: `generateTradePDF` — builds PDF document with header, stats, per-trade sections with screenshots.

- [x] **Step 2: Verify file exports only `generateTradePDF`**

---

### Task 3: Integrate Export Button into TradeJournal

**Files:**
- Modify: `src/app/components/TradeJournal.tsx`

**Interfaces:**
- Consumes: `generateTradePDF` from `../utils/pdfExport`, `state.filteredTrades`, `state.accounts`, `state.firms`, `state.analysesMap`, `Download` icon from `lucide-react`
- Produces: PDF download on click

- [x] **Step 1: Add imports** (`Download` icon, `generateTradePDF`)
- [x] **Step 2: Add `handleExportPDF` handler**
- [x] **Step 3: Add export button after Key Level section**

---

### Task 4: Verification

- [x] **Step 1: Build check** — `pnpm build`
- [ ] **Step 2: Manual test** — navigate to Trade Journal, verify button appears, click, verify PDF content