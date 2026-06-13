# Nhịp

Vietnamese group-operations application for turning chat announcements into
reviewed action cards, private member responses, and organizer dashboards.

## Architecture

- React 19 + Vite frontend, deployable to Vercel.
- Supabase Auth, Postgres, Row Level Security, Realtime, and Edge Functions.
- OpenAI Responses API called only from Supabase Edge Functions.
- Organizer: email magic-link authentication.
- Member: revocable private token, no account required.

The frontend never receives the OpenAI key or Supabase service-role key.

## Local setup

Prerequisites: Node.js, Docker Desktop, and an OpenAI API key.

```bash
npm install
npm run supabase:start
cp .env.example .env.local
cp supabase/functions/.env.example supabase/functions/.env.local
```

Use the values printed by `supabase start` for:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
VITE_DEMO_MODE=false
```

Add `OPENAI_API_KEY` to `supabase/functions/.env.local`, then run:

```bash
npm run supabase:reset
npm run functions:serve
npm run dev
```

For UI-only work without Docker or API calls, set `VITE_DEMO_MODE=true`.
Production does not fall back to demo data when Supabase variables are missing.

## Supabase production deployment

1. Create and link a Supabase project:

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

2. Set the Auth Site URL to the production Vercel URL and add
   `<vercel-url>/auth/callback` as a redirect URL.

3. Add server secrets and deploy functions:

   ```bash
   npx supabase secrets set OPENAI_API_KEY=sk-proj-...
   npx supabase secrets set OPENAI_MODEL=gpt-5.4-mini
   npm run functions:deploy
   ```

4. In Vercel, set `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_DEMO_MODE=false`.

The included `vercel.json` rewrites client-side routes to `index.html`.

## Product flow

1. Organizer signs in with a magic link.
2. Organizer creates a group and imports a CSV roster.
3. Nhịp generates revocable per-member tokens.
4. OpenAI returns structured announcement fields, evidence, and warnings.
5. Organizer reviews and publishes.
6. Private member URLs persist acknowledgements, submissions, and blockers.
7. Supabase Realtime updates the organizer dashboard.
8. Unsupported questions return `Hỏi người tổ chức`.

Roster CSV columns:

```csv
name,student_id,team,email
Nguyễn Minh Anh,SV001,Nhóm 1,minhanh@example.com
```

## Verification

```bash
npm run type-check
npm test
npm run build
npm run test:functions
npm run supabase:reset
npm run supabase:test
```

The function tests require Deno. The final two commands require Docker.
Automated tests do not call OpenAI.

Run the opt-in live Structured Outputs check only when needed:

```bash
OPENAI_API_KEY=<key> npm run test:openai
```
