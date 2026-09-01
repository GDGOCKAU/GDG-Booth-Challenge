# GDG Booth Challenge

A compact booth challenge platform with a live leaderboard, anonymous visitor sessions, reusable questions, configurable scoring, and a password-protected organizer dashboard.

## Local setup

1. Copy `backend/.env.example` to `backend/.env` and fill in `DATABASE_URL`, `ADMIN_PASSWORD`, and `SESSION_SECRET`. When using a direct Supabase URL on an IPv4-only network, set `SUPABASE_DB_REGION` (for this project: `ap-southeast-1`) and the backend will use Supabase's transaction pooler automatically.
2. Optionally copy `frontend/.env.example` to `frontend/.env` when the API is not running on `http://localhost:4001`.
3. Install dependencies in both folders:

   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. Initialize the database once:

   ```bash
   cd backend
   npm run db:init
   ```

5. Run the API and web app in separate terminals:

   ```bash
   cd backend
   npm run dev
   ```

   ```bash
   cd frontend
   npm run dev
   ```

Open `http://localhost:5173`. Organizer access is at `http://localhost:5173/admin` and is validated by the backend using `ADMIN_PASSWORD`.

## Production on rocks.quest

For a simple deployment, serve the frontend and proxy `/api` to the backend under the same HTTPS origin. Build the frontend with `VITE_API_URL` empty (the production fallback uses same-origin requests), set the backend `FRONTEND_URL=https://rocks.quest`, `NODE_ENV=production`, and provide a long random `SESSION_SECRET`. Run `npm run db:init` once against the production database before starting the API. If the API must live on another site, set `VITE_API_URL` to that HTTPS URL and configure cross-site cookies plus CSRF protection before using the admin dashboard.

## Supported questions

- Multiple choice
- Multiple select
- True / false
- Short answer
- Code output
- Safe code-fix text comparison
- Image questions by URL

Code-fix questions intentionally do not execute visitor code. The evaluator is isolated in `backend/src/scoring.js` so a sandboxed runner can replace the predefined-answer comparison later.
