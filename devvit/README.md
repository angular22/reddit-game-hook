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

No Gemini key or external AI setup is required. The app includes a built-in Earth warrior default avatar, and uploaded selfies are placed into an in-game warrior frame locally by the app.

Open the playtest URL Devvit prints (e.g. `https://www.reddit.com/r/qokah_dev/?playtest=qokah`).

## Deploy

```bash
npm run deploy    # upload
npm run launch    # upload + publish
```

PowerShell publish flow:

```powershell
cd devvit
npm install
npm run login
npm run build
npm run dev -- qokah_dev
npm run deploy
npm run launch
```

## Gameplay

- Pick a planet from the selection screen.
- Move with **WASD** or **Arrow keys**.
- Collect glowing **energy crystals** (💎) to charge your power meter.
- Avoid **aliens** and **hazards**.
- Fill the energy bar to unlock a random **hidden power**.
- Survive as long as you can — score is shown on the Game Over screen.
