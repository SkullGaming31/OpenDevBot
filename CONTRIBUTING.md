# Contributing to OpenDevBot

Thank you for considering contributing to OpenDevBot! This document outlines the development workflow, testing expectations, and a few conventions to keep the codebase consistent and easy to review.

Getting started
- Fork the repository and create a feature branch from `main` or `develop` (branch name: `feature/<short-description>` or `fix/<short-description>`).
- Install dependencies:

```powershell
npm ci
```

Local checks
- Run tests before opening a PR:

```powershell
npm test --silent -- -i
```

- Type-check the code:

```powershell
npm run typecheck
```

- Run the linter and auto-fixable problems:

```powershell
npm run lint
```

Tests and CI
- The repository uses GitHub Actions to run lint, typecheck and tests on push and pull requests. Ensure your branch passes the workflow before requesting a review.
- If you add long-running integration tests or services, mark them with the `integration` tag and document how to run them locally.

Coding style
- Use TypeScript, prefer small, focused PRs, and add tests for new behavior.
- Keep exports stable: avoid adding test-only exports to production code. Tests should use dependency injection or module mocks.

Commit messages & versioning
- Use conventional commit style for feature, fix, chore, and docs (e.g., `feat(...)`, `fix(...)`, `chore(...)`).
- Version bumps and releases are done by maintainer merge and tagging; include a changelog entry for notable changes.

Reporting issues
- Open an issue if you find a bug or want to propose a feature. Include steps to reproduce and relevant logs.

Thank you for helping improve OpenDevBot!
