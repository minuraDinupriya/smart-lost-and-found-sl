# Review and submit this batch

The work is organized into five focused commits and intermediate branches. For a single delivery, open the combined branch `feat/recovery-workflow-hardening` against `main` and review the commits in the order below. No hosted settings are changed by pushing these branches, and no production credentials are stored in them.

## Combined PR

Title:

```text
feat: harden recovery workflows and add a reproducible demo
```

Description:

```markdown
## Problem and resulting behavior

Private chat previously trusted client-supplied room names, authentication had a fallback signing secret, and concurrent return confirmations could award duplicate karma. Ownership identifiers also accepted fuzzy matches, and the two verification forms used inconsistent API fields.

This batch enforces conversation access on the server, requires explicit authentication configuration, makes return completion transactional, and requires exact identifier matches. It also adds real-database integration coverage and a reproducible synthetic demo.

## Approach

- Authorize Socket.IO room joins, message sends, and HTTP history against the authenticated participants and item's creator.
- Require a unique JWT secret and exact frontend origins; check WebSocket handshakes as well as HTTP CORS.
- Share a transaction between direct claims and receipt confirmation, preventing duplicate rewards across retries and competing flows.
- Validate proof submissions, preserve custom labels, and align both verification UIs with the API contract.
- Run isolated and real MongoDB/HTTP/Socket.IO tests in separate CI jobs.
- Add a disposable local demo, screenshots, a captioned 42-second walkthrough, and architecture notes.

## Validation

- npm test --prefix server: 32 isolated tests passed.
- npm run test:integration --prefix server: 16 real-database integration tests passed.
- npm run build --prefix client: TypeScript, Vite, and PWA generation passed.
- Server JavaScript syntax and Git whitespace checks passed.
- Browser demo: message acknowledgement, near-match rejection, exact-match verification, completed handover, and finder score verified.
- Demo HTTP smoke check: 12 concurrent receipt requests awarded 50 points once; a repeat run awarded zero additional points.
- Video inspected and confirmed as 42 seconds, H.264, 1280x720.

## Deployment requirements and limitations

Before deploying, configure Render JWT_SECRET as a unique random value of at least 32 characters and CLIENT_URL as the exact frontend origin(s), comma-separated. Existing sessions are invalidated if the secret changes. Localhost is not automatically allowed in production.

MongoDB must support transactions through a replica set; Atlas is suitable. Review the new Server integration CI job before merging. Local integration tests use MongoDB 8.2.6 and synthetic credentials, never the configured production database.

Finder payouts remain simulated. Live external integrations, production load, and historical duplicate-award reconciliation were not tested or performed. Existing lint configuration and dependency-vulnerability follow-ups remain outside this batch. The video is a captioned screenshot walkthrough, not a continuous screen recording.
```

## Focused review order

1. `fix/chat-and-auth-security` — `fix: authorize private chat and require explicit auth configuration`. Review the authorization boundary, token configuration, CORS, and message acknowledgement behavior.
2. `fix/retry-safe-returns` — `fix: make return completion and karma awards transactional`. Review idempotency, the item contention point, and rollback tests.
3. `fix/exact-ownership-checks` — `fix: require exact ownership identifiers and validate proof submissions`. Review exact versus descriptive comparisons, the schema consolidation, and both UI callers.
4. `test/database-and-socket-integration` — `test: exercise database privacy sockets and return transactions in CI`. Review actual HTTP/JWT/socket tests and their disposable database setup.
5. `docs/recruiter-demo` — `docs: add an isolated recovery demo and engineering walkthrough`. Review the reproducible fixture, screenshots, video, and browser-discovered UI fixes.

The intermediate branches are stacked snapshots, not five independent changes based on main. If you choose to open separate PRs instead, target each branch at the preceding branch, starting the first at main. Squash-merging an earlier PR requires rebasing the remaining stack before merging it; the combined PR avoids that extra coordination for this batch.

## Before merging

- Review the final diff and understand the production configuration changes.
- Confirm the GitHub `Client build`, `Server syntax`, `Server tests`, and `Server integration` jobs pass. Local success does not establish remote CI success.
- Prepare the Render environment values privately; never paste the JWT secret into a PR or screenshot.
- After deployment, use test accounts to verify login, chat, ownership checks, and return confirmation against the hosted database.
