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

If Devvit settings keep failing, you can still show the Reddit demo: the server now has a built-in no-key demo avatar generator. It takes the player's selfie, places it into a planet warrior frame, and lets the game continue without any Gemini key.

PowerShell:

```powershell
npm run build
npx devvit upload
npx devvit settings set GEMINI_API_KEY
npm run dev -- qokah_dev
```

Paste a valid Google AI Studio Gemini API key when prompted. It usually starts with `AIza...`; do not paste Reddit tokens or OAuth tokens. For local-only testing without Devvit settings, you can still set `$env:GEMINI_API_KEY="your_google_gemini_api_key_here"` before `npm run dev`.

If `npx devvit settings set GEMINI_API_KEY` still fails locally, either skip the setting completely and use the built-in demo avatar, or use this temporary local-only fallback instead:

```powershell
$env:GEMINI_API_KEY="your_google_gemini_api_key_here"
npm run dev -- qokah_dev
```

Do **not** put the key in `src/client`, Phaser, React, or any bundled client file. Do not hardcode it for Reddit submission; use the built-in demo avatar fallback if settings are blocked.

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
