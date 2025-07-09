# Mini Wallet Management System

Welcome to the Mini Wallet Management System! A lightweight fullstack application designed to help agents manage money
transfers and stay alerted when balances fall below a certain threshold.

This system is a monorepo that includes a backend built with **Node.js** and **Express**, and a frontend built with *
*React**. Persistent data is stored in **Postgres**, while **Redis** is used for caching and session management.

It includes the following modules:

1. User Authentication
    - Register and login functionality
    - Authentication with jwt. `jwtId` stored in Redis with a 30 minute expiry
    - Passwords hashed with bcrypt

2. Wallet Management
    - Real time balance updates, cached in Redis
    - View last 50 transactions
    - Supports USD

3. Transaction Management
    - Cash in and cash out, balance stored and updated atomically in Redis

4. Alert Thresholds
    - Exposes route that shows alerts for balance < threshold
    - Shows alerts on dashboard

## Getting Started

Add environment variables in a `.env` file in the root directory.

```env
DATABASE_URL=postgres://<username>:<password>@localhost:5432/<database>

# these are used to create the database when running the backend for the first time
POSTGRES_USER=<your_postgres_user>
POSTGRES_PASSWORD=<your_postgres_password>
POSTGRES_DB=<your_postgres_database>

REDIS_URL=redis://localhost:6379
JWT_SECRET=<your_jwt_secret>
```

## Project Structure

The project is built on a monorepo structure, with the backend following domain-driven design principles, which is
further layered into controller, service, and repository layers. The frontend is a React application.

```
.
├── backend
|         ├── common  // shared utilities and types
|         ├── db     // database connection and migrations
|         ├── dist
|         ├── domain // user-facing features
|         ├── http   // http test files
|         ├── platform // platform-specific code
├── docker
|         ├── docker-compose.yml
|         └── Dockerfile
├── frontend
|         ├── app // Next.js app directory
|         ├── components // shared React components
|         ├── hooks
|         ├── lib  // shared libraries
|         ├── public
└── README.md

```

Run the frontend

```bash
cd frontend && npm install && npm run dev
```

Build the backend and database containers (ensure you have Docker installed and running)

```bash
docker compose -f docker/docker-compose.yml up --build
```

## Tests

To run tests

```bash
cd backend && npm install && npm test
```

## Deployment

The backend can be deployed using docker.

```bash
docker compose -f docker/docker-compose.yml up --build
```

The backend is exposed on port 2450 by default.

The frontend can be deployed separately, as it is a standalone React application. It can be built and served using any
static file server.