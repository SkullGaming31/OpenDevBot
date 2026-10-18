# AgentOS Idea Plan — OpenDevBot

An implementation plan for adding [Agent OS](https://buildermethods.com/agent-os) (v3) to this repo, so GitHub Copilot in VS Code works from structured product docs, per-domain standards, and formal feature specs instead of re-discovering conventions every session.

## What Agent OS is

A lightweight set of markdown-based workflows you install into a project: it discovers and documents your coding standards, shapes feature specs through a shape → spec → tasks workflow, and injects relevant standards into the AI's context when you ask it to plan or build. It is designed primarily for Claude Code, but per the official docs it works with *"any AI coding assistant that can read files"* — you just reference the `agent-os/` files directly.

## Why it fits this repo

- **New chatbot commands** are the most repetitive Copilot task. A persisted standard prevents broken command-loader conventions and wrong economy-layer usage (the exact mix-ups listed as remaining work in TODO.md).
- **EventSub / subscription work** is the highest-risk area (Twitch rate limits, duplicate subscriptions, token refresh). A documented standard beats re-discovering gotchas each session.
- **Spec shaping matches how features already get designed here** — `src/ideas/*.idea.md` files (e.g. `heist.idea.md`) are already halfway to formal specs. Agent OS just gives them a consistent shape → spec → tasks pipeline.

## Repo facts this plan assumes

- Single-package TypeScript project (one `package.json`, one root `tsconfig.json`) — **install Agent OS once at the repo root**, not per-app, since Electron boots the same backend code rather than being a separate package.
- Bot uses **better-sqlite3** for its database now (Docker/MongoDB were dropped). **Mongoose is only used for dev tooling.**
- `.github/copilot-instructions.md` is the existing canonical AI-instruction file (architecture map, command-module template, the intentional `ENVIRONMENT` env-var misspelling, hard-coded-ID warnings, secrets hygiene, test strategy). It is excellent — don't duplicate it.

## Implementation steps

1. **Get access.** Sign up at buildermethods.com/agent-os/installation (free, open source, email-gated). Run the install script from the repo root and choose the closest option for a non-Claude-Code setup. Verify what directory the installer actually created — v3 docs say `agent-os/`, older references say `.agent-os/`; follow what the installer makes.
2. **Wire it into Copilot.** Add one line to `.github/copilot-instructions.md` (which Copilot auto-reads):
   > Before planning or building a feature, read `agent-os/standards/` for conventions and `agent-os/product/` for context; new features should go through the shape → spec → tasks workflow in `agent-os/specs/`.
3. **Seed standards — don't start from zero.** Run the `discover` workflow, but hand-feed it the tribal knowledge already in `copilot-instructions.md`: command-module shape, the dynamic loader's `.ts`/`.js` duality, the `ENVIRONMENT` misspelling, hard-coded ID warnings, the better-sqlite3 production / Mongoose dev-tooling split, secrets masking, and the Electron Chromium flags (no-sandbox, GPU disabled) so Copilot doesn't "fix" them away. Keep `copilot-instructions.md` as the pointer/overview and `agent-os/standards/` as the per-domain detail — **one canonical source each, no duplication**, or Copilot gets conflicting instructions.
4. **Write `agent-os/product/` docs:** `mission.md` (multi-channel Twitch bot with admin dashboard), `tech-stack.md` (Node.js/TypeScript, Twurple, Electron, better-sqlite3, Mongoose for dev tooling), `roadmap.md` (migrate remaining TODO.md items here, e.g. SQLite migration hardening).
5. **Promote feature specs into `agent-os/specs/`.** Convert `src/ideas/*.idea.md` files — start with `heist.idea.md` as the template (spec.md → plan.md → tasks.md). This is the highest-value part.
6. **Standards per domain:** `bot-commands.md` (command template + loader rules), `electron.md` (main/renderer IPC, no remote content, GPU/sandbox flags), `database.md` (better-sqlite3 conventions for production code, Mongoose for dev tooling), `testing.md` (existing test strategy from copilot-instructions.md).

## Trial proposal

Install, run `discover` against the three riskiest areas (bot commands, EventSub, database layer), write one full spec for the next feature, then decide whether it earns its keep. The spec workflow is real overhead for one-off tweaks — this pays off on multi-feature planning work, not quick edits.

## Gotchas

- **Installer may create `.claude/` files or touch `copilot-instructions.md`** — check the diff after installing and keep your instructions file canonical.
- **Email-gated, interactive install** — pick whatever option means "generic / other AI tool".
- **Don't present Copilot with two versions of the same rule** — conflicting standards files produce worse output than none.
