# QOKAH — Your Avatar Creates History

A Reddit Devvit game built with **Phaser 3** and **TypeScript**.

## Structure

```
src/
  client/
    game.ts              # Phaser bootstrap
    splash.ts
    index.html
    scenes/
      Boot.ts
      Preloader.ts
      MainMenu.ts
      PlanetSelection.ts
      Game.ts
      GameOver.ts
  server/
    index.ts             # Devvit server (profile + menu action)
  shared/
    api.ts               # Shared types & planet data
assets/
  images/  audio/  sprites/
```

## Local development

```bash
cd devvit
npm install
npm run login              # one-time Reddit login
npm run dev -- qokah_dev   # or your test subreddit
```

For AI avatar generation in Reddit playtest/deploy, store `GEMINI_API_KEY` as a Devvit global app setting after uploading the latest config. In Devvit `0.13.7`, `devvit.json` does **not** allow `isSecret`, so the key is kept server-side by reading it only from the Devvit server code, never from Phaser/client code.

PowerShell:

```powershell
npm run build
npx devvit upload
npx devvit settings set GEMINI_API_KEY
npm run dev -- qokah_dev
```

Paste a valid Google AI Studio Gemini API key when prompted. It usually starts with `AIza...`; do not paste Reddit tokens or OAuth tokens. For local-only testing without Devvit settings, you can still set `$env:GEMINI_API_KEY="your_google_gemini_api_key_here"` before `npm run dev`.

If `npx devvit settings set GEMINI_API_KEY` still fails locally, use this temporary local-only fallback instead:

```powershell
$env:GEMINI_API_KEY="your_google_gemini_api_key_here"
npm run dev -- qokah_dev
```

Do **not** put the key in `src/client`, Phaser, React, or any bundled client file. If you absolutely need a temporary hardcoded fallback for testing, put it only in `src/server/index.ts`, then delete it before sharing/publishing the project.

Open the playtest URL Devvit prints (e.g. `https://www.reddit.com/r/qokah_dev/?playtest=qokah`).

## Deploy

```bash
npm run deploy    # upload
npm run launch    # upload + publish
```

## Gameplay

- Pick a planet from the selection screen.
- Move with **WASD** or **Arrow keys**.
- Collect glowing **energy crystals** (💎) to charge your power meter.
- Avoid **aliens** and **hazards**.
- Fill the energy bar to unlock a random **hidden power**.
- Survive as long as you can — score is shown on the Game Over screen.
