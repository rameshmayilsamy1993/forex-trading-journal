# Forex Trading Journal

A modern, full-stack trading journal application for tracking forex trades, analyzing performance, and managing prop firm accounts.

## Features

### Dashboard
- Real-time overview of your trading performance
- Total balance and P/L tracking
- Win rate statistics
- Performance summary with profit/loss breakdown
- Recent trades activity feed

### Trade Journal
- Record and manage all your trades
- Track entry/exit prices, lot sizes, and P/L
- Associate trades with specific accounts
- Filter by account and status (Open/Closed)
- Screenshot upload for trade documentation
- Auto Risk/Reward ratio calculation

### Trading Calendar
- Visual calendar view of daily trading activity
- Color-coded P/L visualization (green = profit, red = loss)
- Weekly summary panel
- Click on any day to see detailed trade breakdown
- Filter by Prop Firm and Account

### Reports
- Comprehensive performance analytics
- Win/loss statistics
- Pair performance breakdown
- Monthly performance tracking
- Profit factor analysis

### Missed Trades Journal
- Track missed trading opportunities
- Record reason for missing trades (Late Entry, Fear, Overthinking, etc.)
- Mark trades as Reviewed
- Analyze patterns in missed opportunities

### Account Management
- Multiple trading account support
- Prop firm association
- Balance and P/L tracking per account
- Initial vs current balance comparison

## Tech Stack

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Vite** - Build tool
- **Lucide React** - Icons
- **Radix UI** - Accessible components
- **date-fns** - Date manipulation

### Backend
- **Node.js** - Server runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - MongoDB ODM

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB instance (local or Atlas)
- npm or pnpm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd fx-journal
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cd backend
cp .env.example .env
```

Update `backend/.env` with your MongoDB connection string:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fx-journal
```

4. Create frontend environment file:
```bash
echo "VITE_API_BASE_URL=http://localhost:5000/api" > .env
```

5. Start the development servers:

Frontend (port 5173):
```bash
npm run dev
```

Backend (port 5000):
```bash
cd backend && node server.js
```

6. Build for production:
```bash
npm run build
```

## Project Structure

```
fx-journal/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── ui/           # Reusable UI components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── TradeJournal.tsx
│   │   │   ├── TradingCalendar.tsx
│   │   │   ├── MissedTradeJournal.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── Accounts.tsx
│   │   │   └── PropFirms.tsx
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── styles/
├── backend/
│   └── server.js
├── dist/
├── package.json
└── README.md
```

## API Endpoints

### Prop Firms
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/prop-firms` | Get all prop firms |
| POST | `/api/prop-firms` | Create a prop firm |
| PUT | `/api/prop-firms/:id` | Update a prop firm |
| DELETE | `/api/prop-firms/:id` | Delete a prop firm |

### Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | Get all accounts |
| POST | `/api/accounts` | Create an account |
| PUT | `/api/accounts/:id` | Update an account |
| DELETE | `/api/accounts/:id` | Delete an account |

### Trades
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trades` | Get all trades |
| POST | `/api/trades` | Create a trade |
| PUT | `/api/trades/:id` | Update a trade |
| DELETE | `/api/trades/:id` | Delete a trade |

### Missed Trades
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/missed-trades` | Get all missed trades |
| POST | `/api/missed-trades` | Create a missed trade |
| PUT | `/api/missed-trades/:id` | Update a missed trade |
| DELETE | `/api/missed-trades/:id` | Delete a missed trade |

### Masters
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/masters` | Get master data |
| POST | `/api/masters` | Create master entry |
| DELETE | `/api/masters/:id` | Delete master entry |

## Data Models

### Trade
```typescript
{
  id: string;
  accountId: string;
  propFirmId: string;
  pair: string;
  type: 'BUY' | 'SELL';
  status: 'OPEN' | 'CLOSED';
  entryPrice: number;
  exitPrice?: number;
  lotSize: number;
  entryDate: string;
  profit?: number;
  stopLoss?: number;
  takeProfit?: number;
  session?: string;
  strategy?: string;
  keyLevel?: string;
  notes?: string;
}
```

### MissedTrade
```typescript
{
  id: string;
  accountId: string;
  pair: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  rr: number;
  date: string;
  reason: string;
  emotion?: string;
  status: 'MISSED' | 'REVIEWED';
}
```

### TradingAccount
```typescript
{
  id: string;
  name: string;
  propFirmId: string;
  initialBalance: number;
  currentBalance: number;
  currency: string;
}
```

### PropFirm
```typescript
{
  id: string;
  name: string;
  color: string;
}
```

## Calculations

### Profit/Loss
```typescript
const profit = (exitPrice - entryPrice) * lotSize * pipValue;
```

### Risk/Reward Ratio
```typescript
const rr = (takeProfit - entryPrice) / (entryPrice - stopLoss);
```

### Win Rate
```typescript
const winRate = (winningTrades / totalTrades) * 100;
```

### Profit Factor
```typescript
const profitFactor = totalProfit / Math.abs(totalLoss);
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## Environment Variables

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fx-journal
```

## Features

### Dashboard
- [x] Overview cards (Prop Firms, Accounts, Total Trades, Win Rate)
- [x] Balance & Performance section
- [x] Accounts overview with P/L
- [x] Recent closed trades list

### Trade Journal
- [x] Add/Edit/Delete trades
- [x] Form validation
- [x] Auto RR calculation
- [x] Screenshot uploads
- [x] Filter by account and status

### Calendar
- [x] Monthly calendar grid
- [x] Daily P/L visualization
- [x] Color coding (green/red)
- [x] Week summary panel
- [x] Filter by Prop Firm and Account

### Reports
- [x] Total trades statistics
- [x] Win rate calculation
- [x] Net profit breakdown
- [x] Pair performance
- [x] Monthly performance

### Missed Trades
- [x] Track missed opportunities
- [x] Reason categorization
- [x] Review status
- [x] Statistics dashboard

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- [TailwindCSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)
- [MongoDB](https://www.mongodb.com/)
- [Figma Design](https://www.figma.com/design/yo7ZkNoUneD36sM1iHGVFr/Forex-Trading-Journal)
