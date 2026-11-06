# Contributing

Use one branch and one pull request for a focused problem. Keep behavior fixes separate from unrelated formatting or refactoring so a reviewer can understand and verify each change.

## Start with the problem

For a bug, record reproduction steps, expected behavior, actual behavior, and the affected user. For an improvement, state the user problem and observable acceptance criteria. Use the issue templates for work that benefits from tracking; a typo does not need a separate issue.

Do not include passwords, tokens, private ownership proofs, or personal bank details in issues, screenshots, logs, or PRs.

## Branches and commits

Start from an up-to-date `main` with a clean working tree:

```sh
git switch main
git pull --ff-only origin main
git switch -c fix/ownership-proof-verification
```

Use short, descriptive names such as `fix/chat-room-authorization`, `feat/report-location-filter`, or `chore/ci-build-checks`. If an issue exists, you can include its number. Do not commit directly to `main`.

Commit an understandable unit of work using a conventional title:

```text
fix: load private proofs during ownership verification
test: reject chat subscriptions from unrelated users
docs: explain local integration configuration
```

Review `git diff` and `git diff --cached` before committing. Stage explicit paths rather than everything in the working tree. Keep generated bundles, credentials, and unrelated changes out of the commit.

## Implementation and validation

- Keep changes within the affected feature or function. Follow existing React/TypeScript and Tailwind conventions.
- Validate requests and enforce permissions on the server. A hidden button is not an authorization check.
- For a behavior bug, add a test that fails before the fix and passes afterward when practical. Prefer tests of observable behavior over tests that copy the implementation.
- Use a disposable database for automated integration tests. Do not point test or seed scripts at a shared or production database.
- Run the checks in the README. Add manual steps for changed UI behavior, including a narrow screen when the change affects layout.
- Record what you actually ran and any checks you could not run. Do not describe a successful build as a passing application test suite.

The npm scripts invoke tool entry points through Node directly to avoid Windows command-shim failures when a checkout path contains an ampersand, such as `lost & found`.

## Comments that help maintainers

Explain a constraint, reason, or non-obvious tradeoff. Avoid comments that narrate obvious assignments or promise security the code does not enforce. Remove temporary debug output before committing; operational errors should retain useful context without private data.

A useful comment explains a rule such as: "Ownership values are excluded from normal queries to keep item responses private; verification must explicitly select them."

## Open and review a PR

Push your branch and open a draft PR when early feedback would help. Use the PR template to explain the user-visible problem, resulting behavior, validation, and remaining limitations. Link the issue when one exists; use `Closes #123` only when the PR fully resolves it. Include screenshots for visible UI changes.

A useful title names the result: `fix: prevent unrelated users from joining private chat rooms`. In the description, give a concrete before/after example and explain why the server enforces the rule.

Self-review the final diff. When another person is available, ask them to review the change. If you are working alone, record your own review and keep that distinct from independent review. Be accurate about your contribution, collaboration, and use of development tools.

Review comments should identify a specific concern and consequence, then suggest a direction. For example: "Could we verify room membership before joining? Authentication alone still allows an unrelated user to subscribe. Please add a rejection test."

Respond with the decision and evidence: "Added a participant check and a test for an unrelated user." If you disagree, explain the tradeoff. Do not invent discussions or approvals.

Merge after checks pass and relevant review concerns are addressed. A squash merge works well for a single focused change; retain a descriptive final commit title. Delete a merged branch when it is no longer needed.

## Repository settings

The repository owner can protect `main` with a ruleset requiring pull requests and the `Client build` and `Server syntax` status checks. Configure these after the workflow has run so the check names are available. This file describes the intended policy; it does not enable GitHub enforcement.

Require an independent approving review when an actual reviewer is available. Do not configure a solo repository so that its only contributor cannot merge their own work.
