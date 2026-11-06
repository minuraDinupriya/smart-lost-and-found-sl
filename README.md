# Sri Lanka Smart Lost & Found

A web application for reporting lost and found items in Sri Lanka and coordinating their return. It includes English, Sinhala, and Tamil interfaces, location filtering, maps, real-time chat, and ownership verification workflows.

## Project status

This project is under active development. The source includes AI-assisted image and voice reporting, QR tags, police and admin workflows, handover PDFs, analytics, and reward tips. External integrations require their own configuration.

Finder payouts are currently simulated, including when Stripe checkout is configured. This project should not be presented as a completed production payment system.

## Stack and structure

- `client/`: React, TypeScript, Vite, Tailwind CSS, and Leaflet. Pages are grouped by feature under `src/features/`.
- `server/`: Express, MongoDB/Mongoose, and Socket.IO. Routes call controllers; services contain matching, AI, payment, and document generation logic.
- `.github/`: CI workflow and contribution templates.

The browser calls the Express API and connects to Socket.IO for chat. MongoDB stores users, reports, conversations, and return records. Cloudinary stores uploaded images; Gemini powers image and voice analysis.

## Local development

### Prerequisites

- Node.js 24 and npm. `.nvmrc` records the version used in CI.
- A local MongoDB instance or a separate development database.
- Cloudinary credentials for image uploads. Gemini and Google OAuth credentials are needed only to exercise those integrations.

### Install and configure

From the repository root:

```sh
npm ci --prefix client
npm ci --prefix server
```

Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`, using your editor or file manager. Set a unique `JWT_SECRET` and your development `MONGO_URI`. Keep credentials out of Git.

The examples use API port `5001` and frontend port `5173`. If you change a port, update `PORT`, `CLIENT_URL`, and `VITE_API_URL` consistently. For Google sign-in, use the same OAuth client ID in the server's `GOOGLE_CLIENT_ID` and the client's `VITE_GOOGLE_CLIENT_ID`.

All `VITE_` values are included in browser code: only public configuration belongs there. Never place a private API key in a `VITE_` variable.

Start the server and frontend in separate terminals:

```sh
cd server
npm run dev
```

```sh
cd client
npm run dev
```

Open the local URL printed by Vite. Optional integrations can be left unconfigured while working on unrelated features; their functionality will remain unavailable or use documented development behavior.

## Checks

From the repository root:

```sh
npm run build --prefix client
npm run check:syntax --prefix server
npm test --prefix server
```

The client build runs TypeScript checking, creates a production bundle, and generates the PWA service worker. The server syntax command parses JavaScript without executing it. The server tests run the seed scripts with database, translation, hashing, environment loading, and process exits replaced by test doubles. They verify missing-configuration failures and explicit credential handling without loading `.env`, accessing a database, or contacting external services.

GitHub Actions runs these checks for pull requests and pushes to `main`. Passing them does **not** establish API correctness, integration availability, or production readiness. Frontend linting still needs an ESLint configuration; it is not part of the CI gate yet. Legacy scripts under `server/scripts/test_*.js` remain manual development scripts that may write to the configured database; `npm test` does not run them.

## Development seed scripts

Both `server/scripts/seed.js` and `server/scripts/seedPolice.js` require `MONGO_URI` in `server/.env` or the environment. They exit with an error before connecting if it is missing or blank. There is no embedded remote database fallback.

The item seed script deletes existing reports other than smart tags before creating sample data. Run it only against a disposable development database whose contents you intend to replace.

The police-account seed also requires `SEED_POLICE_PASSWORD`. It creates `national_police` with the supplied password after hashing it; an existing account is left unchanged. Set this value locally and run the script from the `server` directory:

```sh
node scripts/seedPolice.js
```

Changing this setting does not reset an existing account's password. Previously exposed database credentials and the previous default police-account password must be rotated separately if they are still in use. Removing them from source does not invalidate them or remove them from Git history.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, PR examples, testing expectations, and review guidance. The workflow follows [GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow); the CI setup uses GitHub's [Node.js workflow guidance](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs).
