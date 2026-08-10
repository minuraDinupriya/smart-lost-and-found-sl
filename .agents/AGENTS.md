# Project Rules for Antigravity IDE

As an AI assistant operating in this workspace, you MUST strictly adhere to the following rules to ensure the codebase remains stable when junior developers (and their AI agents) are contributing:

## 1. Do Not Break Existing Code
- NEVER delete or drastically alter existing core files (like `App.tsx` routing, database connection logic, or existing Mongoose schemas) without explicit permission.
- If you are asked to "fix a bug", only touch the specific component or function causing the issue. Do not rewrite the entire file.

## 2. Strict Coding Standards
- **Frontend**: Use Tailwind CSS for all styling. Do not introduce custom CSS unless absolutely necessary.
- **Backend**: Always validate incoming request data. Never trust client input.
- **Console Logs**: Remove all debugging `console.log()` statements before finalizing a commit.

## 3. Safe Git Workflow
- Always verify which branch you are on before committing. You should be on a feature branch (e.g., `feature/add-new-thing`), NEVER on `main`.
- Write conventional commits (e.g., `feat: ...`, `fix: ...`).

## 4. Testing Before Committing
- Before making a commit, ensure the React app builds without critical errors. Do not commit code that breaks the Vite build process.
