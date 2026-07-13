# QOKAH — Devvit App

A self-contained [Devvit](https://developers.reddit.com/) app. Wraps the QOKAH cosmic-warrior game as a Reddit experience post using React + Phaser inside a webview, and Hono + Devvit Redis on the server.

## What is inside

- `devvit.json` — app manifest (post entrypoints, menu, triggers)
- `src/client/` — React + Phaser webview (`splash.tsx` for the feed inline view, `game.tsx` for the expanded game)
- `src/server/` — Hono backend with Devvit Redis for per-post state (avatar, streak, leaderboard, power)
- `src/shared/api.ts` — shared request/response types
- `assets/qokah-logo.png` — QOKAH logo

## Prerequisites

- Node.js >= 22.2.0
- A Reddit account
- The `LOVABLE_API_KEY` env var (avatar generation uses the Lovable AI Gateway)

## 1. Install

```bash
cd devvit
npm install
```

## 2. Log in to Reddit

```bash
npm run login
```

This opens a browser to authorize the Devvit CLI.

## 3. Upload the app (first time only)

The app name is `qokah` (from `devvit.json`). Upload once so Reddit knows about it:

```bash
export LOVABLE_API_KEY=your_key_here
npm run deploy
```

`deploy` = `type-check` + `lint` + `devvit upload`. Accept the prompt to create the app under your Reddit account. This is what makes the URL `?playtest=qokah` work.

## 4. Playtest in your subreddit

You already have `r/qokah_dev`. From the `devvit/` folder:

```bash
export LOVABLE_API_KEY=your_key_here
npm run dev -- qokah_dev
```

That runs `devvit playtest qokah_dev`. It watches your source, uploads a dev build on every change, and prints a URL like:

```
https://www.reddit.com/r/qokah_dev/?playtest=qokah
```

Open it in your browser. You'll see the splash post; tap **Tap to Start** to launch the full webview game.

If no post exists yet in the subreddit, the app auto-creates one on install (see `src/server/routes/triggers.ts`). You can also create one manually via the subreddit menu → **Play QOKAH** (moderator only).

## 5. Ship it (public release)

Once you're happy:

```bash
npm run launch
```

That deploys and publishes. Reddit will then review it before it can be installed in subreddits you don't moderate.

## Common issues

- **Playtest URL 404s** — you didn't run `npm run deploy` first. Reddit only knows an app named `qokah` after upload.
- **Avatar generation fails with 401/`Missing LOVABLE_API_KEY`** — export the env var in the shell where you run `npm run dev` or `npm run deploy`. Devvit forwards process env into the server bundle at deploy time.
- **`devvit: command not found`** — run scripts via `npm run …`; they use the locally installed CLI.
- **Nothing changes after edits** — playtest rebuilds on save, but you must refresh the Reddit tab.

## Local build check (no Reddit needed)

```bash
npm run build
```

Produces `dist/client/` and `dist/server/index.cjs`. This is what `devvit upload` ships.
