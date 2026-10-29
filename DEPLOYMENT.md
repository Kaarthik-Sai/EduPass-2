# EduPass deployment and setup manual

This manual describes the copied project at `Desktop\codex-finaln`. It is prepared to deploy the Vite frontend and Express API together on one Vercel domain using Vercel Services. No live Vercel project or MongoDB Atlas account was connected during this work.

## 1. What is prepared, and the reproduced startup failure

The copied project originally configured Vercel's backend entrypoint as `server.js`. That file is designed for a long-running Node server: it exits when `MONGO_URI` or `JWT_SECRET` is missing and calls `app.listen()` after connecting to MongoDB. Vercel does not receive local `.env` files, so those values must be configured in Vercel. I reproduced the missing-environment failure locally: `node server.js` prints `Missing environment variables: MONGO_URI, JWT_SECRET` and exits with code 1.

The Vercel backend entrypoint now points to `app.js`, which exports the Express app and has a database-readiness gate. Missing database/JWT settings produce an explicit `503` diagnostic instead of a process exit. This is a confirmed failure mode in the code and deployment config. It cannot be confirmed as the exact cause of the reported live HTTP 500 because no Vercel runtime log, deployment URL, or account access was provided.

No runtime log files were present in the project copy. Check Vercel's deployment and function logs to confirm the exact production error before treating the incident as fully resolved.

## 2. Prerequisites

- Node.js 24.x and npm. The project was installed and built with Node 24; Vercel currently defaults new projects to Node 24.x. [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- Git and VS Code.
- MongoDB Community Server for local development, or a MongoDB Atlas cluster for hosting.
- GitHub and Vercel accounts.
- An SMTP account only if password-reset email should work in production.

## 3. Local setup on Windows

### Open the copy

1. Open VS Code.
2. Choose **File → Open Folder**.
3. Open `C:\Users\<your-windows-username>\Desktop\codex-finaln`.
4. Choose **Terminal → New Terminal**. The commands below assume PowerShell at the project root.

### Create local environment files

The copy intentionally does not contain the original `.env` files. Create private local files from the placeholder templates:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Edit `backend\.env` and set at least:

```dotenv
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/edupass
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
PRIVATE_UPLOAD_STORAGE=local
PRIVATE_UPLOAD_DIR=private-storage
```

Generate a local JWT secret in PowerShell:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Paste the generated value into `JWT_SECRET`; do not add it to source code or Git. Leave SMTP values blank unless you have a mail provider. `frontend\.env` should contain `VITE_API_URL=http://localhost:5000/api`.

### Install and run

From the project root, install the dependencies from each lockfile:

```powershell
npm ci --prefix backend
npm ci --prefix frontend
```

Start MongoDB. Then use two terminals:

```powershell
# Terminal 1
Set-Location backend
npm run dev
```

```powershell
# Terminal 2, from the project root
npm --prefix frontend run dev
```

Open the Vite URL shown in the frontend terminal, normally `http://localhost:5173`. Check backend liveness at `http://localhost:5000/api/health`.

### Local tests

```powershell
npm --prefix backend test
npm --prefix frontend run build
```

The optional document-upload integration suite drops and recreates its configured database. Only run it against a disposable database whose name contains `_test`:

```powershell
$env:EDUPASS_TEST_MONGO_URI='mongodb://127.0.0.1:27017/edupass_documents_test'
npm --prefix backend test
Remove-Item Env:EDUPASS_TEST_MONGO_URI
```

The development seed command clears collections before loading sample data. Never run it against production or important data:

```powershell
npm --prefix backend run seed
```

## 4. MongoDB Atlas setup

1. Create an Atlas project and cluster.
2. Create a dedicated database user with read/write access only to the EduPass database. This is separate from your Atlas website login.
3. In **Security → Network Access → IP Access List**, allow the Vercel function egress addresses for the region you deploy to. Atlas accepts connections only from allowed addresses. [Atlas IP access lists](https://www.mongodb.com/docs/atlas/security/ip-access-list/)
4. Vercel Static IPs are available on Pro and Enterprise. Enable them for the function region and add those addresses to the Atlas list. [Vercel static IP setup](https://vercel.com/kb/guide/how-to-allowlist-deployment-ip-address)
5. If your Vercel plan does not provide stable egress IPs, select an account-supported network option before production use. Avoid `0.0.0.0/0` unless you knowingly accept access from anywhere; Atlas warns that broad allowlists can expose the database. [Atlas network-access warning](https://www.mongodb.com/docs/atlas/security/ip-access-list/)
6. In Atlas, select **Connect → Drivers** and copy the Node.js URI. Replace its username/password placeholders, URL-encode special characters in the password, and include a database name such as `edupass`.
7. Store the completed URI only in local `backend\.env` and Vercel's `MONGO_URI` environment variable. Never paste it into source code or a commit.

## 5. Vercel deployment

### Architecture and project settings

The root `vercel.json` defines a Vite frontend service and an Express backend service. `/api/...` routes to Express; other paths go to the React single-page app. Vercel preserves `/api` when forwarding requests, matching the backend's `app.use('/api', ...)` mount. [Vercel Services guide](https://vercel.com/kb/guide/vercel-services)

Vercel Services is a beta feature. In Vercel:

1. Push this copy to a new GitHub repository using the commands below.
2. Import that repository into Vercel.
3. Set the project **Root Directory** to the repository root (`.`), where `vercel.json` lives. Do not select `frontend` or `backend` for this combined setup.
4. In **Settings → Build and Deployment → Framework Preset**, select **Services**. Vercel requires this preset for the `services` configuration to take effect.
5. Initially leave build/install overrides empty. The service roots/frameworks in `vercel.json` allow Vercel to detect each package manifest. Frontend output is Vite's `dist`; backend entrypoint is `app.js`.
6. Select Node.js `24.x` in project settings if it is not already selected. [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)

If Services is unavailable to your account, do not deploy this root config as though it were active. Ask Vercel to enable it, or deliberately switch to separate projects and configure the frontend API URL and backend CORS for that architecture.

### Create a new GitHub repository for this copy

The copy has no `.git` directory, so it is independent of the original repository. Create an empty GitHub repository (do not initialize it with a README), then run these PowerShell commands:

```powershell
Set-Location "$env:USERPROFILE\Desktop\codex-finaln"
git init -b main
git add .
git status --short
git check-ignore backend/.env frontend/.env
git commit -m "Prepare EduPass deployment copy"
git remote add origin https://github.com/<your-account>/<new-repository>.git
git push -u origin main
```

Before committing, confirm neither `.env` file is staged. The root `.gitignore` excludes `.env` and `.env.*` while allowing `.env.example` files.

### Vercel environment variables

Add these under **Project → Settings → Environment Variables** for Production and Preview as needed. Use real values in Vercel's secret fields, never in `vercel.json` or README files.

| Variable | Required | Purpose / value |
| --- | --- | --- |
| `MONGO_URI` | Yes | Atlas Node.js connection string for EduPass. |
| `JWT_SECRET` | Yes | Random secret of at least 32 characters; use a different value from local development. |
| `NODE_ENV` | Yes | `production`. |
| `CLIENT_URL` | Yes | Public app origin, e.g. `https://your-project.vercel.app` or custom domain; no path or trailing slash. |
| `PRIVATE_UPLOAD_STORAGE` | Yes | `gridfs`, so uploads persist in MongoDB. |
| `JWT_EXPIRES_IN` | No | Token lifetime; defaults to `7d`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Optional | SMTP provider values for password-reset email. Without SMTP, production password-reset delivery is unavailable. |

Do not set `VITE_API_URL` for this same-domain deployment: production frontend requests use `/api`. `PORT` and `PRIVATE_UPLOAD_DIR` are not needed on Vercel. The upload backend uses the explicit `PRIVATE_UPLOAD_STORAGE=gridfs` value.

After the first deployment, set `CLIENT_URL` to the actual Vercel production domain and redeploy. If you later add a custom domain, update it to that one canonical origin.

### Supporting documents on Vercel

Vercel Functions limit request bodies to 4.5 MB. EduPass caps Vercel attachments at 4 MB to leave room for multipart overhead. Vercel uploads use MongoDB GridFS instead of function-local disk; local development uses private disk storage. [Vercel request limits](https://vercel.com/docs/functions/limitations)

GridFS requires the Atlas database user to have write access to the configured database. The source copy's `backend/private-storage` folder contained no files; private upload data was not copied. Existing production documents stored outside MongoDB would need a separate migration before changing deployments.

### Deploy and verify

1. Push a commit to GitHub or select **Deploy** in Vercel.
2. Review **Deployments → latest deployment → Build Logs** for both services.
3. Open `https://your-project.vercel.app/api/health`; expected JSON includes `"status":"ok"`.
4. Sign in with a test account and exercise student submission, faculty/HOD review, notifications, and document download.
5. Submit a PDF/JPG/PNG under 4 MB and reopen it to verify GridFS persistence.
6. Check Vercel function logs after these requests. Do not call production ready until sign-in and upload work with Atlas.

For later changes, commit and push to the new repository; Vercel creates a new deployment. Keep the Vercel project root set to the repository root for manual deployments.

## 6. Troubleshooting

- **HTTP 500:** Open **Deployments → deployment → Functions/Runtime Logs** and inspect the failing route. Also inspect **Build Logs** for import/build errors. Confirm the Services preset, backend entrypoint `app.js`, and Vercel values for `MONGO_URI` and `JWT_SECRET`. The backend logs sanitized diagnostics; do not share credentials with logs.
- **HTTP 404:** Check that API calls start with `/api`, that the `/api/(.*)` rewrite precedes the catch-all, and that the Vercel project root contains `vercel.json`. Services routing preserves `/api` for Express.
- **HTTP 401:** The request has no valid token or the token expired. Sign in again and confirm the `Authorization: Bearer ...` header is present.
- **HTTP 403:** The user is authenticated but lacks the required role or faculty/HOD scope. Check the user's role and academic profile in the admin UI.
- **MongoDB connection failure:** Verify `MONGO_URI`, database-user credentials, URL encoding for reserved password characters, cluster status, and Vercel egress allowlisting. Atlas connection troubleshooting: [official guide](https://www.mongodb.com/docs/atlas/troubleshoot-connection/).
- **CORS error:** Same-domain routing should not require browser CORS. For local/separate deployments, set `CLIENT_URL` to the exact frontend origin (scheme, host, optional port). Do not include a path; multiple CORS origins may be comma-separated.
- **Vercel build failure:** Read the service-specific Build Logs. Confirm the repository root, both package lock files, and Services preset. Do not set the combined project root to only `frontend` or `backend`.
- **Missing environment variables:** Local `.env` files are ignored and were not copied. Vercel does not read your local `.env`; add variables in Vercel and redeploy. Backend diagnostics name missing keys without printing values.
- **Broken API URL:** Production frontend uses same-origin `/api`. Local frontend reads `VITE_API_URL` from `frontend/.env`. Do not use `http://localhost:5000/api` in the Vercel build.
- **Frontend build failure:** Run `npm ci --prefix frontend` then `npm --prefix frontend run build`. Start with the first Vite error for a missing import or JSX syntax error.
- **Password-reset email failure:** Configure all SMTP variables and verify the provider accepts the sender in `SMTP_FROM`. This external integration was not live-tested.

Browser console errors appear in Developer Tools → **Console**; failed fetches appear in **Network**. Vercel build output is under **Build Logs**; API runtime output is under **Functions/Runtime Logs** or the project's Logs/Observability view.

## 7. Verification checklist for this copy

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Separate copy created; source preserved | PASS | 65 copied files were SHA-256 verified. Original `.env` files, `.git`, dependencies, build output, caches, and private-storage files were excluded. All edits were made only in the copy. |
| Backend `npm ci` | PASS | Installed from `backend/package-lock.json`. |
| Frontend `npm ci` | PASS | Installed from `frontend/package-lock.json`. |
| Backend syntax checks | PASS | `node --check` over backend JS, including repaired `seedUsers.js`. |
| Backend automated/integration tests | PASS | 16 tests passed, 0 failed, using disposable local MongoDB database `edupass_codex_finaln_audit_test_20261029`. |
| Auth, roles, uploads | PASS | Integration tests cover valid logins, role-scoped reads, review approval, notifications, upload validation, local storage, and GridFS round-trip. |
| Frontend production build | PASS | Vite `npm run build` completed. |
| Vercel config syntax | PASS | `vercel.json` parses as JSON; API rewrite precedes frontend catch-all. No Vercel CLI/schema deployment check was available. |
| Missing-environment failure reproduced | PASS | With `MONGO_URI` and `JWT_SECRET` absent, `node server.js` exits 1 and names both missing variables. |
| Production backend listener smoke test | BLOCKED | Starting a long-lived listener was rejected by the execution sandbox's approval policy. The production-mode API readiness gate is covered by an automated 503 test. |
| Browser console/UI check | BLOCKED | A local preview server could not be started under the same sandbox restriction; the production bundle builds successfully. |
| Atlas production connection | BLOCKED | No Atlas credentials/account access were supplied. Local MongoDB integration passed. |
| Vercel production deployment/logs | BLOCKED | No Vercel account or live deployment URL/logs were available. |

This copy is **prepared for deployment but not deployed**. The exact live HTTP 500 cannot be confirmed without the affected Vercel deployment's runtime logs.
