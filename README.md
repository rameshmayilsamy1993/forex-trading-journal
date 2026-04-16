# FX Journal — Trading Journal Application

A comprehensive trading journal system designed to help traders track their trades, analyze losses, and improve their trading performance.

## 📖 Project Overview

FX Journal is a full-stack trading journal application that enables traders to:

- Track executed trades with detailed entry/exit information
- Record missed trading opportunities
- Perform detailed loss analysis with chart images
- Monitor performance across multiple accounts and prop firms

The application is built with a focus on discipline tracking and continuous improvement in trading performance.

## 🚀 Features

### Trade Journal
- Add, edit, and delete trades
- Import trades from CSV/Excel files
- Risk/Reward ratio calculation
- Screenshot attachments (before/after entry)
- Sorted display by latest trades

### Missed Trade Journal
- Track missed trading opportunities independently
- No account dependency required
- Review status tracking (MISSED/REVIEWED)
- Rich text notes with formatting

### Loss Analysis System
- Classify losses as **Mistake** or **Valid** (followed plan)
- Upload chart images with timeframe selection (4HR + 15MIN)
- Discipline score tracking (1-5)
- Checklist system for rule validation
- Tags and filtering capabilities

### Image Analysis
- Chart image upload via Cloudinary
- Lightbox zoom preview
- Side-by-side analysis view
- Multiple image support per analysis

### Dashboard & Filters
- Filter trades by account, status, or SSMT type
- Analytics summary
- Performance metrics
- Date range filtering

### Reports & Analytics
- Win/loss statistics
- Pair performance breakdown
- Monthly performance tracking
- Profit factor analysis

## 🧠 Key Concepts

| Concept | Description |
|---------|-------------|
| **Executed Trade** | A trade that was actually taken in the market |
| **Missed Trade** | A trading opportunity identified but not executed |
| **Mistake Loss** | A loss caused by breaking trading rules or poor discipline |
| **Valid Loss** | A loss that occurred despite following the trading plan correctly |

Understanding the difference between mistake losses and valid losses is crucial for continuous improvement.

## 🛠️ Tech Stack

### Frontend
- **React** (Vite)
- **Tailwind CSS**
- **TypeScript**
- **Shadcn UI Components**

### Backend
- **Node.js**
- **Express.js**
- **MongoDB** (Mongoose ODM)
- **Session-based Authentication**

### Other
- **Cloudinary** — Image upload and storage
- **Multer** — File upload handling
- **ExcelJS** — Excel file parsing
- **Concurrently** — Development server orchestration

## 📁 Project Structure

```
fx-journal/
├── src/                    # Frontend source
│   ├── app/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── lib/
│   └── styles/
├── backend/                # Backend source
│   ├── server.js           # Entry point
│   ├── config/             # Cloudinary config (re-export)
│   └── src/
│       ├── config/         # DB and app configuration
│       ├── middleware/      # Auth and error handling
│       ├── modules/        # Feature modules
│       │   ├── trades/
│       │   ├── missedTrades/
│       │   ├── lossAnalysis/
│       │   ├── users/
│       │   ├── accounts/
│       │   ├── propfirms/
│       │   ├── settings/
│       │   └── masters/
│       └── services/       # Shared business logic
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

### Backend Module Structure

Each module follows a consistent pattern:

```
module/
├── model.js           # Mongoose schema
├── controller.js      # Request handlers
└── routes.js         # Express routes
```

### Modules

| Module | Description |
|--------|-------------|
| `users` | User authentication and management |
| `accounts` | Trading accounts |
| `propfirms` | Prop firm configurations |
| `trades` | Trade journal with import/export |
| `missedTrades` | Missed opportunity tracking |
| `lossAnalysis` | Loss analysis with chart images |
| `masters` | Strategies, sessions, key levels |
| `settings` | Application settings |
| `upload` | Image upload handling |

## ⚙️ Installation

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or pnpm

### Clone the project

```bash
git clone <repository-url>
cd fx-journal
```

### Install dependencies

```bash
# Install all dependencies (root, frontend, backend)
npm install
```

### Environment Variables

Create `backend/.env` based on `.env.example`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_secure_session_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

## ▶️ Run the Project

### Single Command (Recommended)

```bash
npm run dev
```

This starts both:
- **Frontend** — Vite dev server on http://localhost:5173
- **Backend** — Nodemon server on http://localhost:5000

### Manual Start

```bash
# Terminal 1 - Backend
npm run dev --prefix backend

# Terminal 2 - Frontend
npm run dev
```

### Build for Production

```bash
npm run build
```

## 🌐 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/change-password` | Change password |

### Trades
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trades` | List all trades |
| POST | `/api/trades` | Create trade |
| PUT | `/api/trades/:id` | Update trade |
| DELETE | `/api/trades/:id` | Delete trade |
| POST | `/api/trades/import` | Import from Excel |
| POST | `/api/trades/preview` | Preview import |
| POST | `/api/trades/bulk-delete` | Delete multiple trades |

### Missed Trades
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/missed-trades` | List missed trades |
| POST | `/api/missed-trades` | Create missed trade |
| PUT | `/api/missed-trades/:id` | Update missed trade |
| DELETE | `/api/missed-trades/:id` | Delete missed trade |

### Loss Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/loss-analysis/list` | List all analyses |
| POST | `/api/loss-analysis` | Create analysis |
| GET | `/api/loss-analysis/:tradeId` | Get analysis by trade |
| PUT | `/api/loss-analysis/:id` | Update analysis |

### Other Resources
| Resource | Endpoints |
|----------|-----------|
| Accounts | `/api/accounts` (CRUD) |
| Prop Firms | `/api/prop-firms` (CRUD) |
| Settings | `/api/settings`, `/api/settings/pairs` |
| Masters | `/api/masters` (strategies, sessions, key levels) |
| Upload | `/api/upload`, `/api/upload/multiple` |

## 🔐 Security Notes

- **Session-based authentication** with HTTP-only cookies
- **Input validation** on all endpoints
- **File upload restrictions** (image types, size limits)
- **HTML sanitization** for rich text content
- **CORS configuration** for frontend origin

### Default Admin Account

On first startup, an admin account is automatically created:

```
Email: admin@fxjournal.com
Password: admin123
```

**⚠️ Change this password in production!**

## 📊 Data Models

### Trade
```typescript
{
  pair: string;
  type: 'BUY' | 'SELL';
  status: 'OPEN' | 'CLOSED';
  entryPrice: number;
  exitPrice?: number;
  lotSize: number;
  profit?: number;
  realPL?: number;
  commission?: number;
  swap?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskRewardRatio?: number;
  session?: string;
  strategy?: string;
  keyLevel?: string;
  ssmtType?: 'NO' | 'GBPUSD' | 'EURUSD' | 'DXY';
  notes?: string;
  entryDate: Date;
  exitDate?: Date;
}
```

### MissedTrade
```typescript
{
  pair: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  rr: number;
  reason: string;
  missedReason: string;
  emotion?: string;
  status: 'MISSED' | 'REVIEWED';
  profitLoss: number;
  realPL: number;
  commission: number;
  swap: number;
  ssmtType?: string;
}
```

### LossAnalysis
```typescript
{
  tradeId: string;
  reasonType: string;
  isValidTrade: boolean;
  description: string;
  images: Array<{
    url: string;
    timeframe: '4HR' | '15MIN';
    publicId: string;
  }>;
  tags: string[];
  checklist: Array<{ rule: string; broken: boolean }>;
  disciplineScore: number;
}
```

## 📝 Calculations

### Real Profit/Loss
```javascript
const realPL = profit - Math.abs(commission || 0) - Math.abs(swap || 0);
```

### Risk/Reward Ratio
```javascript
const risk = entry - stopLoss;
const reward = takeProfit - entry;
const rr = reward / risk;
```

## 📦 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend |
| `npm run build` | Build frontend for production |
| `npm run preview` | Preview production build |

## 🚧 Future Improvements

- [ ] AI-based trade analysis and recommendations
- [ ] Strategy performance tracking and comparison
- [ ] Advanced analytics dashboard with charts
- [ ] Mobile-responsive improvements
- [ ] Export functionality (PDF reports)
- [ ] Multi-language support

## 📜 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)
- [MongoDB](https://www.mongodb.com/)
- [Cloudinary](https://cloudinary.com/)

---

Built with ❤️ for traders who want to improve their discipline and performance.
