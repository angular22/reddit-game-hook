# QOKAH — Devvit Upload Guide

This folder is a self-contained [Devvit](https://developers.reddit.com/) app. It wraps the QOKAH cosmic-warrior game as a Reddit webview experience post.

## What is inside

- `devvit.json` — app manifest (name, post entrypoints, menu, triggers)
- `src/client/` — the React + Phaser webview game
- `src/server/` — Hono backend that talks to Devvit Redis
- `src/shared/` — shared TypeScript types
- `assets/qokah-logo.png` — the QOKAH logo

## Prerequisites

- Node.js >= 22.2.0
- A Reddit account with [Reddit Developer Platform](https://developers.reddit.com/) access
- The `LOVABLE_API_KEY` environment variable set where you run Devvit playtest/deploy (this is the same key used by the main QOKAH app)

## Install

```bash
cd devvit
npm install
```

## Log in

```bash
npm run login
```

This opens a browser to authorize the Devvit CLI with your Reddit account.

## Playtest locally

```bash
npm run dev
```

Then open the playtest URL shown in the terminal. You will need a subreddit where you are a moderator to create the experience post.

## Build

```bash
npm run build
```

## Upload to Reddit

```bash
npm run deploy
```

This type-checks, lints, and uploads the app to your Reddit developer account. After upload, use the Devvit CLI or Reddit developer dashboard to launch/publish the app.

## Create a post

Once the app is installed in a subreddit:

1. Go to the subreddit.
2. Open the community menu (three dots).
3. Select **Play QOKAH**.
4. This creates an experience post. Open it to play the game inside Reddit.

## Notes

- Avatar generation still uses the Lovable AI Gateway (`LOVABLE_API_KEY`).
- Scores, streaks, and unlocked powers are stored per post in Devvit Redis.
- The splash screen launches the full game in expanded webview mode.
