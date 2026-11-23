# DANNY'STHENICS Coach Pro

## Run locally

**Prerequisites:** Node.js 20.19+ or 22.12+.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set your MySQL connection details and a
   `JWT_SECRET` of at least 16 characters.
3. Start the app with `npm run dev`.

When `MYSQL_HOST` is empty, the app uses local preview data. That data is
in-memory and is not suitable for a deployed environment.

## Deploy to Vercel

Import the repository into Vercel with the project root as the **Root
Directory**. The included `vercel.json` builds the Vite frontend into `dist`,
serves the Express API from `api/index.ts`, and routes frontend paths to the
single-page app.

Add these variables in **Vercel Project Settings → Environment Variables** for
each environment you plan to deploy (Production, Preview, and/or Development):

| Variable | Required | Notes |
| --- | --- | --- |
| `MYSQL_HOST` | Yes | Reachable MySQL/TiDB host |
| `MYSQL_PORT` | No | Defaults to `3306` for MySQL; use `4000` for the TiDB Cloud endpoint configured for this project |
| `MYSQL_USER` | Yes | Database user |
| `MYSQL_PASSWORD` | As required by your database | Never add credentials to source control |
| `MYSQL_DATABASE` | No | Defaults to `dannysthenics` |
| `MYSQL_SSL` | No | Set to `true` when the database requires TLS; required for TiDB Cloud Starter/Essential |
| `JWT_SECRET` | Yes | Use a unique random value of at least 16 characters |
| `COACH_ADMIN_PASSWORD` | No | Optional server-side admin passcode override |

Vercel API startup checks for `MYSQL_HOST`, `MYSQL_USER`, and a valid
`JWT_SECRET`. This prevents a deployment from silently using temporary preview
storage or nonpersistent per-instance signing keys. Redeploy after changing
environment variables.

The local `.env` file is ignored by Git. Configure deployment secrets in
Vercel's environment settings rather than committing them.

## Validate before deployment

Run `npm run lint` and `npm run build`.
