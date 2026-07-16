# Graph Report - .  (2026-07-11)

## Corpus Check
- 253 files · ~160,711 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1838 nodes · 3397 edges · 171 communities (91 shown, 80 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 201 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- UI Components & Forms
- Backend Models & Schemas
- Account Management
- Loss Analysis Module
- shadcn/ui Layout Components
- CRT History Module
- Backend Dependencies
- Dashboard & Analytics
- Bias & Daily Review UI
- Breached Trades & H4
- Trade Journal & Table
- User & Auth Module
- Settings & Prop Firms
- Monthly Review Module
- Weekly Review Module
- Daily Review Module
- Missed Trades & Calendar
- Reports & Export
- Reminders & Scheduler
- Market Statistics
- Liquidity Analysis
- Trade Import
- Upload & Image Handling
- Notification System
- Error Handling
- UI Design System
- Documentation & Plans
- Auth & Login
- Settings & Config
- Prop Firm Management
- Bias Event Tracking
- CRT Event Tracking
- H4 Event Tracking
- Liquidity Event Tracking
- Missed Trade Journal
- Trade Card & Mobile
- Trade Table & Pagination
- Trade Import
- Upload & Image
- Reports Service
- Reminder Scheduler
- Seed Service
- Sanitize Service
- Pagination Service
- Trade Service
- Report Service
- Market Stats Module
- Prop Firm Module
- Settings Module
- Bias Module
- Bias Event Module
- Bias History Module
- Checklist Module
- CRT Event Module
- H4 Module
- Liquidity Module
- Missed Trade Module
- Upload Module
- User Module
- Auth Middleware
- Error Middleware
- DB Config
- Cloudinary Config
- Schema Options
- Trade Service
- Report Service
- Cloudinary Utils
- Date Utils
- Calculation Utils
- Storage Utils
- Logger Utils
- HTML Utils
- API Service
- Trading Types
- Notification Context
- Auth Context
- useAsync Hook
- useCursorPagination Hook
- useTradeState Hook
- useToast Hook
- App Entry
- Vite Config
- TS Config
- PostCSS Config
- CSS Styles
- Index HTML
- PNPM Workspace
- Package Root
- OpenCode Package
- Trade Import Module
- Upload Module
- Market Stats Routes
- Reports Routes
- Settings Module
- Bias Module
- Bias Event Module
- Bias History Module
- Checklist Module
- CRT Event Module
- H4 Module
- Liquidity Module
- Missed Trade Module
- Trade Module
- User Module
- Account Module
- Daily Review Module
- Weekly Review Module
- Monthly Review Module
- Loss Analysis Module
- Market Stats Module
- Reports Module
- Settings Module
- Prop Firm Module
- Upload Module
- Reminder Module
- Trade Import Module
- Daily Review Entry Module
- Weekly Review Entry Module
- Monthly Review Entry Module
- Bias Event Module
- Bias History Module
- CRT Event Module
- H4 Module
- Liquidity Module
- Missed Trade Module
- Trade Module
- User Module
- Account Module
- Settings Module
- Prop Firm Module
- Upload Module
- Reports Module
- Market Stats Module
- Reminder Module
- Trade Import Module
- Daily Review Entry Module
- Weekly Review Entry Module
- Monthly Review Entry Module
- Bias Event Module
- Bias History Module
- CRT Event Module
- H4 Module
- Liquidity Module
- Missed Trade Module
- Trade Module
- User Module
- Account Module
- Settings Module
- Prop Firm Module
- Upload Module
- Reports Module
- Market Stats Module
- Reminder Module
- Trade Import Module
- Daily Review Entry Module
- Weekly Review Entry Module
- Monthly Review Entry Module
- Bias Event Module
- H4 Module
- Missed Trade Module
- Trade Module
- User Module
- Account Module
- Settings Module
- Upload Module

## God Nodes (most connected - your core abstractions)
1. `cn()` - 306 edges
2. `apiService` - 44 edges
3. `Button` - 33 edges
4. `FX Journal Application` - 31 edges
5. `SelectTrigger()` - 27 edges
6. `SelectContent()` - 27 edges
7. `SelectItem()` - 27 edges
8. `Select()` - 26 edges
9. `SelectValue()` - 26 edges
10. `schemaOptions` - 23 edges

## Surprising Connections (you probably didn't know these)
- `MissedTradesCalendar()` --references--> `dompurify`  [EXTRACTED]
  src/app/components/MissedTradesCalendar.tsx → package.json
- `Carousel()` --references--> `react`  [EXTRACTED]
  src/app/components/ui/carousel.tsx → package.json
- `useCarousel()` --references--> `react`  [EXTRACTED]
  src/app/components/ui/carousel.tsx → package.json
- `FormItem()` --references--> `react`  [EXTRACTED]
  src/app/components/ui/form.tsx → package.json
- `useFormField()` --references--> `react`  [EXTRACTED]
  src/app/components/ui/form.tsx → package.json

## Import Cycles
- None detected.

## Communities (171 total, 80 thin omitted)

### Community 0 - "UI Components & Forms"
Cohesion: 0.04
Nodes (52): BiasHistory(), ChecklistBuilder(), ChecklistExecutionPage(), ChecklistPage(), H4Input(), MasterStrategyPage(), QuarterBadge(), StrategyChecklist() (+44 more)

### Community 1 - "Backend Models & Schemas"
Cohesion: 0.06
Nodes (52): checklistItemSchema, masterSchema, mongoose, { schemaOptions }, strategyChecklistSchema, getAll(), { getCachedPairs, invalidatePairCache }, getPairs() (+44 more)

### Community 2 - "Account Management"
Cohesion: 0.06
Nodes (43): { Account, ACCOUNT_STATUS }, create(), getAll(), getPaginated(), { paginate }, remove(), update(), ACCOUNT_STATUS (+35 more)

### Community 3 - "Loss Analysis Module"
Cohesion: 0.06
Nodes (41): create(), getByTrade(), getList(), { LossAnalysis, VALID_LOSS_REASONS }, { Trade }, update(), ALL_LOSS_REASONS, LOSS_REASON_TYPES (+33 more)

### Community 4 - "shadcn/ui Layout Components"
Cohesion: 0.06
Nodes (40): Separator(), Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetTitle() (+32 more)

### Community 5 - "CRT History Module"
Cohesion: 0.05
Nodes (44): CRT_DIRECTIONS, CRT_RANGE_RESPECTED, CRT_STATUSES, CRTDataResponse, CRTEventData, CRTHistory(), DIRECTION_COLORS, EditCRTModal() (+36 more)

### Community 6 - "Backend Dependencies"
Cohesion: 0.05
Nodes (43): dependencies, bcryptjs, cloudinary, cors, docx, dotenv, exceljs, express (+35 more)

### Community 7 - "Dashboard & Analytics"
Cohesion: 0.06
Nodes (30): AccountSparkline(), Dashboard(), formatMoney(), getAccountFirmId(), getPropFirmId(), getRealPL(), getTradeAccountId(), KpiCardProps (+22 more)

### Community 8 - "Bias & Daily Review UI"
Cohesion: 0.09
Nodes (27): BiasEventEntry, PAIRS, BIAS_OPTIONS, DEFAULT_PAIRS, DayData, QUARTER_STYLES, BIAS_OPTIONS, DEFAULT_PAIRS (+19 more)

### Community 9 - "Breached Trades & H4"
Cohesion: 0.09
Nodes (27): getDirectionColor(), getLiquidityLabel(), H4_TIMES, H4Entry, H4History(), PAIRS, getLiquidityColor(), getLiquidityInsight() (+19 more)

### Community 10 - "Trade Journal & Table"
Cohesion: 0.06
Nodes (36): accountRoutes, app, biasEventRoutes, biasHistoryRoutes, biasRoutes, checklistRoutes, { connectWithRetry }, { convertMT5 } (+28 more)

### Community 11 - "User & Auth Module"
Cohesion: 0.05
Nodes (35): Accounts, BiasHistory, BiasInput, BiasMapping, BreachedTrades, ChecklistExecutionPage, ConvertCsv, CRTHistory (+27 more)

### Community 12 - "Settings & Prop Firms"
Cohesion: 0.11
Nodes (32): create(), getAll(), getById(), getPendingNotifications(), getUpcoming(), markNotificationRead(), markTriggered(), mongoose (+24 more)

### Community 13 - "Monthly Review Module"
Cohesion: 0.06
Nodes (24): deleteImage(), DailyReview, DailyReviewEntry, { deleteImage }, mongoose, remove(), dailyReviewSchema, mongoose (+16 more)

### Community 14 - "Weekly Review Module"
Cohesion: 0.07
Nodes (26): schemaOptions, biasEventSchema, CISD_VALUES, mongoose, { schemaOptions }, biasHistorySchema, CISD_VALUES, mongoose (+18 more)

### Community 15 - "Daily Review Module"
Cohesion: 0.10
Nodes (28): FormFieldsProps, STATUS_COLORS, STATUS_LABELS, STATUS_WATERMARK, TradeCardProps, TradeFormProps, TradeTableProps, DayData (+20 more)

### Community 16 - "Missed Trades & Calendar"
Cohesion: 0.09
Nodes (33): AuthContext Provider, Cloudinary Image Optimization, Cursor-Based Pagination, Daily Market Review Module, Database Indexes on userId, FX Journal Application, Market Statistics Tool, Mobile Trade Cards (+25 more)

### Community 17 - "Reports & Export"
Cohesion: 0.07
Nodes (20): { deleteImage }, mongoose, remove(), WeeklyReview, WeeklyReviewEntry, mongoose, { schemaOptions }, weeklyReviewSchema (+12 more)

### Community 18 - "Reminders & Scheduler"
Cohesion: 0.07
Nodes (19): { deleteImage }, mongoose, MonthlyReview, MonthlyReviewEntry, mongoose, monthlyReviewSchema, { schemaOptions }, entryController (+11 more)

### Community 19 - "Market Statistics"
Cohesion: 0.08
Nodes (26): DOM, DOM.Iterable, ES2020, ./src/*, compilerOptions, allowImportingTsExtensions, baseUrl, forceConsistentCasingInFileNames (+18 more)

### Community 20 - "Liquidity Analysis"
Cohesion: 0.17
Nodes (13): ChecklistBuilderProps, ChecklistDetailsModalProps, BIAS_OPTIONS, DailyReviewForm(), DAY_OPTIONS, DEFAULT_PAIRS, ImageItem, ToolbarButton() (+5 more)

### Community 21 - "Trade Import"
Cohesion: 0.08
Nodes (24): concurrently, devDependencies, concurrently, tailwindcss, @tailwindcss/vite, @types/react, @types/react-dom, vite (+16 more)

### Community 22 - "Upload & Image Handling"
Cohesion: 0.10
Nodes (17): AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay(), AlertDialogTitle() (+9 more)

### Community 23 - "Notification System"
Cohesion: 0.13
Nodes (19): EntryTimeBadge(), extractDateFromISO(), extractTimeFromISO(), formatTimeDisplay(), MissedTradeJournal(), MODEL1_CONFIRMATION_OPTIONS, QUARTER_STYLES, QuarterBadge() (+11 more)

### Community 24 - "Error Handling"
Cohesion: 0.10
Nodes (15): BIAS_OPTIONS, CURRENT_YEAR, DEFAULT_PAIRS, ImageItem, MonthlyReviewForm(), MONTHS, ToolbarButton(), Label() (+7 more)

### Community 25 - "UI Design System"
Cohesion: 0.12
Nodes (16): react, react, ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent() (+8 more)

### Community 26 - "Documentation & Plans"
Cohesion: 0.12
Nodes (14): Command(), CommandGroup(), CommandInput(), CommandItem(), CommandList(), CommandSeparator(), CommandShortcut(), Dialog() (+6 more)

### Community 27 - "Auth & Login"
Cohesion: 0.14
Nodes (15): biasConfig, DailyReviewCard(), DailyReviewCardProps, rrBadgeColor(), TradeIdeaCard(), TradeIdeaCardProps, biasConfig, ReviewCard() (+7 more)

### Community 28 - "Settings & Config"
Cohesion: 0.18
Nodes (16): ChecklistSession, createChecklist(), deleteChecklist(), generateSessionId(), getActiveChecklists(), getActiveSessions(), getChecklistById(), getChecklists() (+8 more)

### Community 29 - "Prop Firm Management"
Cohesion: 0.18
Nodes (13): BiasFormData, BiasInput(), CISD_OPTIONS, PAIRS, CandleData, DEFAULT_CANDLE, DIRECTION_OPTIONS, H4_TIMES (+5 more)

### Community 30 - "Bias Event Tracking"
Cohesion: 0.15
Nodes (10): BIAS_OPTIONS, BiasEntry, DEFAULT_BIASES, PAIRS, Notification, PAIR_OPTIONS, SOUND_OPTIONS, Checkbox() (+2 more)

### Community 31 - "CRT Event Tracking"
Cohesion: 0.14
Nodes (17): ACCEPTED_TYPES, AddEntryDialog(), AddEntryDialogProps, BIAS_OPTIONS, CHECKLIST_OPTIONS, ChecklistItem, countWords(), EditorToolbar() (+9 more)

### Community 32 - "H4 Event Tracking"
Cohesion: 0.23
Nodes (17): ConvertCsv(), convertCTrader(), ConvertedTrade, convertFundingPips(), convertFundingPipsSimple(), convertMT5(), convertMT5Simple(), detectFormat() (+9 more)

### Community 33 - "Liquidity Event Tracking"
Cohesion: 0.12
Nodes (17): canvas-confetti, @emotion/styled, lucide-react, dependencies, canvas-confetti, @emotion/styled, lucide-react, @radix-ui/react-toggle-group (+9 more)

### Community 34 - "Missed Trade Journal"
Cohesion: 0.17
Nodes (12): { CloudinaryStorage }, multer, storage, upload, removeImage(), { upload, deleteImage }, uploadMultiple(), uploadSingle() (+4 more)

### Community 35 - "Trade Card & Mobile"
Cohesion: 0.18
Nodes (13): isAuthenticated(), User, create(), CRTEvent, express, getAll(), getOne(), getSummary() (+5 more)

### Community 36 - "Trade Table & Pagination"
Cohesion: 0.15
Nodes (14): dompurify, dompurify, ImageData, LossReasonModal(), LossReasonModalProps, MISTAKE_REASONS, TIMEFRAMES, VALID_LOSS_REASONS (+6 more)

### Community 37 - "Trade Import"
Cohesion: 0.13
Nodes (12): biasVariant, containerVariants, dailyBiasFields, itemVariants, planFields, prevDayFields, statCards, statItemVariants (+4 more)

### Community 38 - "Upload & Image"
Cohesion: 0.16
Nodes (15): ACCEPTED_TYPES, AddEntryDialog(), AddEntryDialogProps, BIAS_OPTIONS, countWords(), EditorToolbar(), estimateReadingTime(), genId() (+7 more)

### Community 39 - "Reports Service"
Cohesion: 0.12
Nodes (9): ContextMenuCheckboxItem(), ContextMenuContent(), ContextMenuItem(), ContextMenuLabel(), ContextMenuRadioItem(), ContextMenuSeparator(), ContextMenuShortcut(), ContextMenuSubContent() (+1 more)

### Community 40 - "Reminder Scheduler"
Cohesion: 0.12
Nodes (9): DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator(), DropdownMenuShortcut(), DropdownMenuSubContent() (+1 more)

### Community 41 - "Seed Service"
Cohesion: 0.15
Nodes (8): ColorTheme, ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState, EmptyState(), maxWidthClasses, PageLayoutProps, SkeletonConfig

### Community 42 - "Sanitize Service"
Cohesion: 0.21
Nodes (11): Bias, getAll(), remove(), upsert(), BIAS_OPTIONS, biasSchema, mongoose, { schemaOptions } (+3 more)

### Community 43 - "Pagination Service"
Cohesion: 0.21
Nodes (11): create(), getAll(), Master, remove(), { seedMasters }, update(), express, { getAll, create, update, remove } (+3 more)

### Community 44 - "Trade Service"
Cohesion: 0.25
Nodes (12): Accounts(), PropFirms(), loadHiddenTabs(), saveHiddenTabs(), Settings(), showConfirm(), showError(), showSuccess() (+4 more)

### Community 45 - "Report Service"
Cohesion: 0.21
Nodes (11): formatTime(), getNotificationTypeLabel(), NotificationDropdown(), NotificationDropdownProps, NotificationItem(), NotificationItemProps, Reminders(), NotificationContext (+3 more)

### Community 46 - "Market Stats Module"
Cohesion: 0.25
Nodes (12): MissedTradesCalendar(), getAccountName(), TradeCard(), TradeImport(), TradingCalendar(), TradeStats, calculateTradeStats(), formatMoney() (+4 more)

### Community 47 - "Prop Firm Module"
Cohesion: 0.15
Nodes (6): ConfirmDeleteModalProps, LinkChecklistModalProps, LossAnalysisModal(), LossAnalysisModalProps, ViewChecklistModalProps, PageLayout()

### Community 48 - "Settings Module"
Cohesion: 0.24
Nodes (12): getAccountName(), getFirmColor(), getTradeRealPL(), TradeTable(), Table(), TableBody(), TableCaption(), TableCell() (+4 more)

### Community 49 - "Bias Module"
Cohesion: 0.20
Nodes (13): Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext(), CarouselOptions (+5 more)

### Community 50 - "Bias Event Module"
Cohesion: 0.22
Nodes (11): analyze(), exportResults(), path, PYTHON_SCRIPT, runPython(), { spawn }, TIMEFRAMES, validateParams() (+3 more)

### Community 51 - "Bias History Module"
Cohesion: 0.22
Nodes (11): bcrypt, changePassword(), getMe(), login(), logout(), register(), { seedMasters }, User (+3 more)

### Community 52 - "Checklist Module"
Cohesion: 0.35
Nodes (10): BiasEvent, createEvent(), getEvents(), getEventsByPair(), getLatestEvents(), getTimeline(), remove(), { createEvent, getEvents, getEventsByPair, getLatestEvents, getTimeline, remove } (+2 more)

### Community 53 - "CRT Event Module"
Cohesion: 0.23
Nodes (10): App(), Login(), SidebarProps, TradeJournal(), AuthContext, AuthContextType, AuthProvider(), useAuthContext() (+2 more)

### Community 54 - "H4 Module"
Cohesion: 0.18
Nodes (10): ExportMenu(), ExportMenuProps, ExportPeriod, ExportType, api, apiDelete(), apiGet(), apiPost() (+2 more)

### Community 55 - "Liquidity Module"
Cohesion: 0.18
Nodes (8): biasVariant, containerVariants, itemVariants, MONTH_NAMES, statCards, statItemVariants, TimelineEntry(), TimelineEntryProps

### Community 56 - "Missed Trade Module"
Cohesion: 0.23
Nodes (10): FormControl(), FormDescription(), FormFieldContext, FormFieldContextValue, FormItem(), FormItemContext, FormItemContextValue, FormLabel() (+2 more)

### Community 57 - "Upload Module"
Cohesion: 0.27
Nodes (9): BiasHistory, getByDate(), getHistory(), getLatest(), remove(), saveBias(), express, router (+1 more)

### Community 58 - "User Module"
Cohesion: 0.18
Nodes (10): CRT_DIRECTIONS, CRT_OUTCOMES, CRT_RANGE_RESPECTED, CRT_STATUSES, crtEventSchema, KEY_LEVEL_TYPES, mongoose, REACTIONS (+2 more)

### Community 59 - "Auth Middleware"
Cohesion: 0.35
Nodes (9): createOrUpdate(), getAll(), getInsight(), getLatest(), Liquidity, remove(), { createOrUpdate, getAll, getLatest, remove }, express (+1 more)

### Community 60 - "Error Middleware"
Cohesion: 0.18
Nodes (8): biasVariant, containerVariants, itemVariants, keyLevels, objectives, sessions, statCards, statItemVariants

### Community 61 - "DB Config"
Cohesion: 0.38
Nodes (8): getAll(), getByDate(), H4, remove(), save(), express, router, { save, getAll, getByDate, remove }

### Community 62 - "Cloudinary Config"
Cohesion: 0.22
Nodes (8): missedTradeSchema, mongoose, { schemaOptions }, { SSMT_TYPES }, mongoose, { schemaOptions }, SSMT_TYPES, tradeSchema

### Community 63 - "Schema Options"
Cohesion: 0.22
Nodes (9): NavigationMenu(), NavigationMenuContent(), NavigationMenuIndicator(), NavigationMenuItem(), NavigationMenuLink(), NavigationMenuList(), NavigationMenuTrigger(), navigationMenuTriggerStyle (+1 more)

### Community 64 - "Trade Service"
Cohesion: 0.22
Nodes (3): ErrorBoundary, Props, State

### Community 65 - "Report Service"
Cohesion: 0.28
Nodes (8): DEFAULT_HIDDEN, loadHiddenTabs(), NavGroup, navigationGroups, NavItem, saveHiddenTabs(), Sidebar(), Tab

### Community 66 - "Cloudinary Utils"
Cohesion: 0.28
Nodes (3): formatDateForInput(), getDateKey(), isSameDay()

### Community 67 - "Date Utils"
Cohesion: 0.25
Nodes (6): PairConfig, PAIRS, QUICK_REFERENCE_SL, RISK_AMOUNTS, RR_COLORS, RR_RATIOS

### Community 68 - "Calculation Utils"
Cohesion: 0.29
Nodes (6): candleSchema, DIRECTION_OPTIONS, H4_CANDLE_TIMES, h4Schema, mongoose, { schemaOptions }

### Community 69 - "Storage Utils"
Cohesion: 0.43
Nodes (6): getLiquidityBadge(), getLiquidityMeta(), LiquidityEntry, LiquidityHistory(), LiquidityMeta, PAIRS

### Community 70 - "Logger Utils"
Cohesion: 0.29
Nodes (5): DateTimePickerProps, HOURS_12, MINUTES, MONTHS, PERIODS

### Community 71 - "HTML Utils"
Cohesion: 0.43
Nodes (5): ToggleGroup(), ToggleGroupContext, ToggleGroupItem(), Toggle(), toggleVariants

### Community 72 - "API Service"
Cohesion: 0.29
Nodes (5): QUICK_REFERENCE_SL, RISK_AMOUNTS, RR_COLORS, RR_RATIOS, SL_EXAMPLES

### Community 73 - "Trading Types"
Cohesion: 0.33
Nodes (5): startServer(), connectWithRetry(), mongoOptions, mongoose, seedAdminUser()

### Community 74 - "Notification Context"
Cohesion: 0.33
Nodes (5): containerVariants, GalleryImage, ImageGallery(), ImageGalleryProps, itemVariants

### Community 75 - "Auth Context"
Cohesion: 0.33
Nodes (4): HOURS_12, MINUTES, PERIODS, TimePickerProps

### Community 77 - "useCursorPagination Hook"
Cohesion: 0.33
Nodes (5): deleteImage(), uploadImage(), uploadMultiple(), UploadProgressCallback, UploadResult

### Community 78 - "useTradeState Hook"
Cohesion: 0.40
Nodes (3): MissedTrade, missedTradeSchema, mongoose

### Community 79 - "useToast Hook"
Cohesion: 0.40
Nodes (3): AccordionContent(), AccordionItem(), AccordionTrigger()

### Community 80 - "App Entry"
Cohesion: 0.50
Nodes (4): Alert(), AlertDescription(), AlertTitle(), alertVariants

### Community 81 - "Vite Config"
Cohesion: 0.40
Nodes (4): LayoutWrapper(), LayoutWrapperProps, maxWidthClasses, PageContent()

### Community 82 - "TS Config"
Cohesion: 0.40
Nodes (4): Modal(), ModalProps, ModalSize, sizeClasses

### Community 85 - "Index HTML"
Cohesion: 0.50
Nodes (3): @opencode-ai/plugin, dependencies, @opencode-ai/plugin

### Community 86 - "PNPM Workspace"
Cohesion: 0.67
Nodes (3): getISTTime(), ISTTime, LiveISTClock()

### Community 92 - "Market Stats Routes"
Cohesion: 0.67
Nodes (3): 2026 06 24 Fx Journal Ui Redesign, 2026 06 24 Fx Journal Ui Redesign Design, 2026 06 24 Ui Redesign

## Knowledge Gaps
- **757 isolated node(s):** `@opencode-ai/plugin`, `mongoose`, `missedTradeSchema`, `MissedTrade`, `mongoose` (+752 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **80 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Reminder` connect `Settings & Prop Firms` to `Bias Event Tracking`?**
  _High betweenness centrality (0.377) - this node is a cross-community bridge._
- **Why does `cn()` connect `UI Components & Forms` to `shadcn/ui Layout Components`, `CRT History Module`, `Dashboard & Analytics`, `Bias & Daily Review UI`, `Breached Trades & H4`, `Daily Review Module`, `Liquidity Analysis`, `Upload & Image Handling`, `Notification System`, `Error Handling`, `UI Design System`, `Documentation & Plans`, `Auth & Login`, `Prop Firm Management`, `Bias Event Tracking`, `CRT Event Tracking`, `Trade Table & Pagination`, `Upload & Image`, `Reports Service`, `Reminder Scheduler`, `Report Service`, `Settings Module`, `Bias Module`, `H4 Module`, `Liquidity Module`, `Missed Trade Module`, `Schema Options`, `Report Service`, `Storage Utils`, `HTML Utils`, `Notification Context`, `useToast Hook`, `App Entry`, `Vite Config`, `TS Config`, `OpenCode Package`?**
  _High betweenness centrality (0.357) - this node is a cross-community bridge._
- **Why does `schemaOptions` connect `Weekly Review Module` to `Backend Models & Schemas`, `Account Management`, `Loss Analysis Module`, `Calculation Utils`, `Sanitize Service`, `Settings & Prop Firms`, `Monthly Review Module`, `Reports & Export`, `Reminders & Scheduler`, `User Module`, `Cloudinary Config`?**
  _High betweenness centrality (0.198) - this node is a cross-community bridge._
- **Are the 31 inferred relationships involving `FX Journal Application` (e.g. with `AuthContext Provider` and `Cloudinary Image Optimization`) actually correct?**
  _`FX Journal Application` has 31 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@opencode-ai/plugin`, `mongoose`, `missedTradeSchema` to the rest of the system?**
  _757 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Components & Forms` be split into smaller, more focused modules?**
  _Cohesion score 0.04265593561368209 - nodes in this community are weakly interconnected._
- **Should `Backend Models & Schemas` be split into smaller, more focused modules?**
  _Cohesion score 0.05961426066627703 - nodes in this community are weakly interconnected._