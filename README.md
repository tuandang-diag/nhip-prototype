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

## Production deployment guide

This guide deploys:

- Database, Auth, Realtime, and Edge Functions to Supabase.
- The React frontend to Vercel.
- OpenAI credentials only to Supabase Edge Function secrets.

Run commands from:

```bash
cd ideas/08_nhip_group_ops/prototype-app
```

### 1. Verify the project before deployment

Install dependencies and run all checks that do not require external services:

```bash
npm ci
npm run type-check
npm test
npm run test:functions
npm run build
```

For full database verification, start Docker Desktop and run:

```bash
npm run supabase:start
npm run supabase:reset
npm run supabase:test
npm run supabase:stop
```

Do not deploy if migration reset or RLS tests fail.

### 2. Create the Supabase project

1. Create a project at [database.new](https://database.new/).
2. Record the project reference shown in the project URL:

   ```text
   https://supabase.com/dashboard/project/<project-ref>
   ```

3. In Supabase, open **Project Settings > API** and record:

   - Project URL, for `VITE_SUPABASE_URL`.
   - Publishable key, for `VITE_SUPABASE_PUBLISHABLE_KEY`.

Do not put the service-role key in Vercel or any variable prefixed with `VITE_`.

### 3. Link the Supabase CLI

Authenticate and link this repository to the new project:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase migration list
```

The initial remote column should be empty before the first deployment. If the
remote database was modified manually, resolve the migration history before
continuing.

### 4. Deploy database migrations

Preview pending database changes:

```bash
npx supabase db push --dry-run
```

Apply the migrations:

```bash
npx supabase db push
npx supabase migration list
```

Group creation uses the authenticated `create_group` RPC. The RPC derives
`created_by` from the organizer JWT; the browser must not send an arbitrary
owner ID.

Do not use `--include-seed` for production. The current seed file is intended
for local development.

After deployment, use the Supabase Table Editor to confirm these tables exist:

```text
profiles
groups
group_organizers
members
member_invites
announcements
member_actions
reminders
activity_log
api_usage_log
rate_limits
```

All public tables should show RLS as enabled.

### 5. Configure Edge Function secrets

Set the OpenAI key and model as Supabase secrets:

```bash
npx supabase secrets set OPENAI_API_KEY=<your-openai-api-key>
npx supabase secrets set OPENAI_MODEL=gpt-5.4-mini
npx supabase secrets list
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
provided automatically to deployed Supabase Edge Functions. Do not add them to
the frontend.

Optionally verify the OpenAI key before deploying:

```bash
OPENAI_API_KEY=<your-openai-api-key> npm run test:openai
```

### 6. Deploy Edge Functions

Deploy all four functions:

```bash
npm run functions:deploy
```

The deployed functions are:

```text
generate-announcement-draft
answer-member-question
member-access
manage-invites
```

Confirm them under **Supabase Dashboard > Edge Functions**. Keep JWT
verification enabled for organizer functions. `member-access` and
`answer-member-question` accept private member tokens and perform their own
token validation.

### 7. Deploy the frontend to Vercel

Push the repository to a Git provider, then import it at
[vercel.com/new](https://vercel.com/new).

Because this application is inside a larger repository, configure:

| Setting | Value |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | `ideas/08_nhip_group_ops/prototype-app` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Add these Vercel environment variables for **Production**, **Preview**, and
**Development**:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-key>
VITE_DEMO_MODE=false
```

Do not add `OPENAI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to Vercel.

Deploy the project. The included `vercel.json` sends client-side routes such as
`/auth/callback` and `/member/...` to `index.html`.

### 8. Configure Supabase Auth URLs

After Vercel provides the production URL, open:

**Supabase Dashboard > Authentication > URL Configuration**

Set:

```text
Site URL:
https://<your-production-domain>

Redirect URLs:
https://<your-production-domain>/auth/callback
```

If Vercel Preview deployments need magic-link login, add a controlled preview
wildcard or specific preview callback URL. Do not use a broad production
wildcard.

If you later add a custom domain, update the Site URL and add:

```text
https://<custom-domain>/auth/callback
```

Redeploying the frontend is not required for Auth URL-only changes.

### 9. Production smoke test

Use a new organizer email and verify this sequence:

1. Open the production URL and request a magic link.
2. Confirm the email returns to `/auth/callback`.
3. Create one group.
4. Import a small CSV roster.
5. Export the generated private member links.
6. Generate an announcement draft and verify the OpenAI response.
7. Correct at least one field and publish.
8. Open one member link in a private browser window.
9. Acknowledge, submit a URL, and report a blocker.
10. Confirm the organizer dashboard updates through Realtime.
11. Regenerate invitations and confirm the old token is rejected.
12. Ask an unsupported FAQ question and confirm the response is
    `Hỏi người tổ chức`.

Also inspect **Supabase Dashboard > Edge Functions > Logs** and confirm there
are no authorization, secret, or OpenAI errors.

### 10. Deploying future updates

Run checks first:

```bash
npm ci
npm run type-check
npm test
npm run test:functions
npm run build
```

If the update contains database migrations or Edge Function changes:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run
npx supabase db push
npm run functions:deploy
```

Push the frontend changes to the branch connected to Vercel. Vercel will build
and deploy them automatically.

Apply database migrations before deploying frontend code that depends on the
new schema. Coordinate deployments so only one person runs `db push` at a time.

### 11. Rollback and recovery

- Frontend: use **Vercel > Deployments > Promote to Production** on a known-good
  deployment.
- Edge Functions: check out the previous source revision and deploy the
  affected function again.
- Database: create a new forward migration that reverses the change. Do not
  delete an applied migration or run a destructive database reset in
  production.
- Secrets: rotate the compromised key, update it with
  `npx supabase secrets set`, and redeploy affected functions if needed.

Useful diagnostics:

```bash
npx supabase migration list
npx supabase functions list
npx supabase secrets list
```

Official references:

- [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase Edge Function deployment](https://supabase.com/docs/guides/functions/deploy)
- [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
- [Supabase Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel monorepo root directories](https://vercel.com/docs/monorepos)

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
