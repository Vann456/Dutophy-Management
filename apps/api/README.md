# Dutophy API Backend

Node.js backend using Hono framework for the Dutophy Management System.

## Environment Variables Setup

### Local Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in the required environment variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `GOOGLE_CLIENT_ID`: From Google Cloud Console
   - `GOOGLE_CLIENT_SECRET`: From Google Cloud Console

### Production (Render)

Set these environment variables in Render Dashboard → Environment:

- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `BLOB_READ_WRITE_TOKEN` (optional, for Vercel Blob)

## Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Create **OAuth 2.0 Client ID**
5. Add authorized origins:
   - `http://localhost:5173` (local dev)
   - `https://dutophy.vercel.app` (production)
6. Copy the **Client ID** and **Client Secret** to your `.env` file

## Running Locally

```bash
# From the monorepo root
npm run dev:api

# Or from apps/api directory
npm run dev
```

## Troubleshooting

### "GOOGLE_CLIENT_ID: ❌ NOT SET"

This means the environment variables are not being loaded. Check:

1. The `.env` file exists in `apps/api/.env`
2. The file contains `GOOGLE_CLIENT_ID=...`
3. The server was restarted after adding the variables

### 500 Error on Login

Check the server logs for the exact error. Common causes:

1. Missing environment variables
2. Invalid Google Client ID/Secret
3. Database connection issues
