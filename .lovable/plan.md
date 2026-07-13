Convert the existing QOKAH TanStack Start web game into a self-contained Devvit project folder that can be zipped and uploaded to Reddit's Devvit platform.

## What will be built

A new `devvit/` folder at the project root containing a complete, uploadable Devvit app. It wraps the existing QOKAH Phaser game and avatar flow as a Reddit webview game, replacing localStorage persistence with Devvit Redis-backed storage where possible and preserving the current UI/gameplay.

## Project structure inside `devvit/`

```text
devvit/
├── devvit.json              # App manifest (name, post entrypoints, menu, forms, triggers)
├── package.json             # Devvit + React + Vite + Phaser dependencies
├── tsconfig.json            # Project references for client/server/shared
├── vite.config.ts           # Vite + Devvit plugin build config
├── .gitignore
├── README.md                # Devvit upload instructions
├── src/
│   ├── client/
│   │   ├── game.html        # Webview game HTML entry
│   │   ├── game.tsx         # Adapted QOKAH React app + Phaser game
│   │   ├── splash.html      # Feed/splash inline HTML entry
│   │   ├── splash.tsx       # Splash screen with "Tap to Start"
│   │   ├── index.css        # Tailwind styles (copied/adapted from src/styles.css)
│   │   └── hooks/
│   │       └── useGame.ts   # Devvit postMessage bridge for game state
│   ├── server/
│   │   ├── index.ts         # Hono server bootstrap
│   │   └── routes/
│   │       ├── api.ts       # Game endpoints: init, score, power, leaderboard
│   │       ├── menu.ts      # Devvit menu handlers
│   │       └── triggers.ts  # App install trigger
│   └── shared/
│       └── api.ts           # Shared TypeScript message types
├── assets/
│   └── qokah-logo.png       # Copied from src/assets/tokah-logo.png
└── tools/
    ├── tsconfig.base.json
    ├── tsconfig.client.json
    ├── tsconfig.server.json
    ├── tsconfig.shared.json
    └── tsconfig.vite.json
```

## Key adaptations

1. **App shell**: Replace TanStack Start router with a single Vite React app. The existing screen state machine from `src/routes/index.tsx` moves into `src/client/game.tsx`.
2. **Avatar generation**: Keep the existing `src/lib/avatar.functions.ts` logic, but convert it to a Devvit server route (`POST /api/generate-avatar`) because Devvit webview cannot call TanStack `createServerFn`. The Lovable AI gateway call stays the same.
3. **Game scene**: Reuse `src/lib/tokah-game.ts` Phaser code directly in `src/client/game.tsx` (client-only dynamic import).
4. **Persistence**: Replace `localStorage` with Devvit Redis via postMessage:
   - `GET /api/init` returns `postId`, `username`, saved avatar, saved power, streak, best score, leaderboard.
   - `POST /api/score` saves a run result and updates Redis leaderboard.
   - `POST /api/power` records unlocked power and usage day.
5. **Splash → webview**: `splash.tsx` shows the QOKAH logo and a "Tap to Start" button that calls `requestExpandedMode` to launch the full game webview.
6. **Menu item**: Add a subreddit menu item "Play QOKAH" so moderators can create an experience post.
7. **Assets**: Copy the blue space-warrior QOKAH logo into `devvit/assets/` and reference it from splash/game.

## Technical details

- Use `@devvit/start` and `@devvit/web` packages (latest stable 0.13.x).
- Keep React 19, Tailwind v4, Phaser, and the existing component styling.
- Server runs Hono with Devvit Redis plugin for per-post state.
- Client communicates with server through `Devvit` context and postMessage helpers from `@devvit/web/client`.

## Out of scope

- Full Reddit OAuth/user management beyond the username/context Devvit already provides.
- Real-time multiplayer.
- Changing the core game mechanics, art, or color theme.

## Deliverable

A zip-ready `devvit/` folder plus a short README explaining:
- How to install dependencies (`cd devvit && npm install`).
- How to log in (`npm run login`).
- How to playtest (`npm run dev`).
- How to upload (`npm run deploy`).