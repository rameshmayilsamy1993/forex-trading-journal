# Phase 1 Critical Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 8 critical issues identified in the audit: missing tsconfig, missing DB indexes, no code splitting, no auth context, missing aria-labels, useSafeState bug, checklist duplicate push, and biasHistory derivation bug.

**Architecture:** Each fix is self-contained — modify one file or add one config. No cross-task dependencies.

**Tech Stack:** React 18 + Vite + Tailwind v4, Node.js/Express/MongoDB, Mongoose

**Global Constraints:**
- Follow existing code style for each file
- No new dependencies
- Backend changes must preserve existing API response shapes
- All changes are backward-compatible

---

### Task 1: Add `tsconfig.json` with strict mode

**Files:**
- Create: `tsconfig.json`

**Interfaces:**
- Consumes: existing Vite config at `vite.config.ts`
- Produces: TypeScript strict mode project config

- [ ] **Step 1: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Verify dev server still works**

Run: `pnpm dev` (from project root)
Expected: Vite dev server starts successfully, no errors

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: add tsconfig.json with strict mode"
```

---

### Task 2: Add DB indexes on `userId` for all models

**Files:**
- Modify: `backend/src/modules/trades/trade.model.js`
- Modify: `backend/src/modules/accounts/account.model.js`
- Modify: `backend/src/modules/checklists/checklist.model.js`
- Modify: `backend/src/modules/missedTrades/missedTrade.model.js`
- Modify: `backend/src/modules/propfirms/propfirm.model.js`
- Modify: `backend/src/modules/masters/master.model.js`

**Interfaces:**
- Consumes: existing Mongoose schemas
- Produces: indexed `userId` fields for all query-heavy models

- [ ] **Step 1: Add userId index to Trade model**

Edit `trade.model.js` — add after schema definition, before export:

```javascript
tradeSchema.index({ userId: 1, createdAt: -1 });
tradeSchema.index({ userId: 1, accountId: 1 });
```

- [ ] **Step 2: Add userId index to Account model**

Edit `account.model.js` — add after schema definition, before export:

```javascript
accountSchema.index({ userId: 1 });
```

- [ ] **Step 3: Add userId index to ChecklistSession model**

Edit `checklist.model.js` — add after schema definition, before export:

```javascript
checklistSessionSchema.index({ userId: 1, createdAt: -1 });
checklistSessionSchema.index({ userId: 1, status: 1 });
```

- [ ] **Step 4: Add userId index to MissedTrade model**

Edit `missedTrade.model.js` — add after schema definition, before export:

```javascript
missedTradeSchema.index({ userId: 1, date: -1 });
```

- [ ] **Step 5: Add userId index to PropFirm model**

Edit `propfirm.model.js` — add after schema definition, before export:

```javascript
propFirmSchema.index({ userId: 1 });
```

- [ ] **Step 6: Add userId index to Master model**

Edit `master.model.js` — add after schema definition, before export:

```javascript
masterSchema.index({ userId: 1, type: 1 });
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/trades/trade.model.js backend/src/modules/accounts/account.model.js backend/src/modules/checklists/checklist.model.js backend/src/modules/missedTrades/missedTrade.model.js backend/src/modules/propfirms/propfirm.model.js backend/src/modules/masters/master.model.js
git commit -m "fix: add userId indexes to all models for query performance"
```

---

### Task 3: Create AuthContext (extract auth from main.tsx)

**Files:**
- Create: `src/app/context/AuthContext.tsx`
- Modify: `src/main.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Produces: `AuthProvider`, `useAuthContext()` hook
- Consumes: replaces `useAuth()` in main.tsx and direct `apiService.auth.getStoredUser()` in App.tsx

- [ ] **Step 1: Create AuthContext**

```typescript
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import apiService, { User } from '../services/apiService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await apiService.auth.getCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(null);
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const logout = useCallback(async () => {
    await apiService.auth.logout();
    setUser(null);
    window.location.href = '/login';
  }, []);

  const refreshUser = useCallback(async () => {
    const freshUser = await apiService.auth.getCurrentUser();
    setUser(freshUser);
    return freshUser;
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
```

- [ ] **Step 2: Update main.tsx — wrap App with AuthProvider, remove inline ProtectedRoute**

Replace entire content of `main.tsx`:

```typescript
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./app/context/AuthContext";
import App from "./app/App.tsx";
import Login from "./app/components/Login";
import "./styles/index.css";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

import { useAuthContext } from "./app/context/AuthContext";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>
);
```

Wait, this won't work because `ProtectedRoute` is defined inside the same module but uses `useAuthContext` which must be below the Provider. Let me restructure properly.

</parameter>
