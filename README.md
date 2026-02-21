# MealFlow

A hospital meal management system that coordinates meal requests between clinical staff, the kitchen, and tray assembly. It tracks patients, their dietary restrictions and allergies, meal requests, recipes, and tray delivery statuses in real time.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| UI | shadcn/ui (Radix UI + Tailwind CSS) |
| Server state | TanStack Query (React Query v5) |
| Routing | React Router DOM v6 |
| Backend | Express + TypeScript |
| Database | PostgreSQL 16 |
| Testing | Vitest + Testing Library |

## Prerequisites

- [Node.js](https://nodejs.org/) v18+ and npm
- [Docker](https://www.docker.com/) and Docker Compose (for the recommended full-stack setup)

## Getting Started

### Option 1 — Full stack with Docker (recommended)

Starts the PostgreSQL database, Express API server, and Vite frontend together with live-reload enabled.

```bash
docker-compose up
```

| Service | URL |
|---|---|
| Frontend | http://localhost:8080 |
| API server | http://localhost:3001 |
| PostgreSQL | localhost:5432 |

The database is automatically seeded from `db/init.sql` on first run.

### Option 2 — Frontend only

Use this if you already have a backend running elsewhere.

```bash
npm install
npm run dev
```

The dev server starts at **http://localhost:8080** and proxies `/api/*` requests to `http://localhost:3001`.

### Option 3 — Backend only

```bash
cd server
npm install
npm run dev
```

The API server starts at **http://localhost:3001**.

You will need a PostgreSQL instance running and the following environment variables set (see `docker-compose.yml` for reference values):

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mealflow
DB_USER=mealflow
DB_PASSWORD=mealflow
PORT=3001
```

## Available Scripts

Run these from the project root:

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite frontend dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |

## Project Structure

```
meal-cycle/
├── src/
│   ├── components/       # Feature and UI components
│   │   └── ui/           # shadcn/ui primitives
│   ├── hooks/            # TanStack Query hooks (one file per domain)
│   ├── lib/
│   │   ├── api.ts        # HTTP client
│   │   ├── types.ts      # Shared TypeScript interfaces
│   │   └── utils.ts      # Utility helpers
│   ├── pages/            # Route-level components
│   └── test/             # Vitest setup and test files
├── server/
│   └── src/
│       ├── routes/       # Express route handlers (one file per resource)
│       ├── db.ts         # PostgreSQL connection pool
│       └── index.ts      # Express app entry point
├── db/
│   └── init.sql          # Database schema and seed data
├── docker-compose.yml
└── Dockerfile
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | *(empty)* | API base URL — leave empty to use the Vite proxy in development |
