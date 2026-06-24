### Task 3: PageLayout Skeleton Enhancement

**Files:**
- Modify: `src/app/components/ui/PageLayout.tsx`

**Interfaces:**
- Modifies: `PageLayoutProps` — adds optional `skeleton: { type, rows }`
- Consumes: `Skeleton` from `ui/skeleton.tsx`

- [ ] **Step 1: Add skeleton prop and renderers to PageLayout**

Update `src/app/components/ui/PageLayout.tsx`:

```typescript
import { Skeleton } from './skeleton';

interface SkeletonConfig {
  type: 'table' | 'cards' | 'form' | 'stats' | 'text';
  rows?: number;
}

// Add to PageLayoutProps
interface PageLayoutProps {
  // ... existing props
  skeleton?: SkeletonConfig;
}

// In component destructure skeleton
export function PageLayout({
  // ... existing destructuring
  skeleton,
}: PageLayoutProps) {
  if (isLoading) {
    return (
      <div className={`${maxWidthClasses[maxWidth]} mx-auto space-y-6 ${className}`}>
        <PageHeader title={title} subtitle={subtitle} icon={icon} color={color} action={action} />
        <SkeletonRenderer type={skeleton?.type ?? 'text'} rows={skeleton?.rows} />
      </div>
    );
  }
  // ... rest unchanged
}

function SkeletonRenderer({ type, rows = 5 }: { type: SkeletonConfig['type']; rows?: number }) {
  switch (type) {
    case 'table':
      return (
        <div className="space-y-3">
          <div className="flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 flex-1" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-6 flex-1" />
              ))}
            </div>
          ))}
        </div>
      );
    case 'cards':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4 border rounded-xl space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      );
    case 'form':
      return (
        <div className="space-y-4 max-w-lg">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      );
    case 'stats':
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 border rounded-xl space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </div>
      );
    case 'text':
    default:
      return (
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className={`h-4 ${i === rows - 1 ? 'w-3/4' : 'w-full'}`} />
          ))}
        </div>
      );
  }
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/ui/PageLayout.tsx
git commit -m "feat: add skeleton loading types to PageLayout"
```

---

