# TOKAH — Your Avatar Creates History

A single-player Reddit game where **you** are the hero. Snap a selfie, pick a planet, and your face becomes a cosmic warrior who fights aliens, collects crystals, and unlocks a **hidden power you can only use tomorrow.**

Built with [Phaser 3](https://phaser.io/) for the boss fight, [TanStack Start](https://tanstack.com/start) for the web shell, and AI image generation for the cosmic warrior avatar. Wrapped for Reddit via [Devvit Web](https://developers.reddit.com/docs/web).

> **Reddit demo note:** The live Reddit post uses a **default Earth avatar** so every player can jump straight into the game without waiting on an AI response. Players can still generate a custom warrior when the AI service is available.

---

## How to Play

1. **Take a selfie** — front-facing camera opens right in the browser (laptop or mobile). Gallery upload also works.
2. **Pick a planet** — Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, or the Sun. Each maps to a distinct warrior style (Mars = iron warlord, Uranus = ice mage, Pluto = shadow guardian…).
3. **Become a warrior** — the AI transforms your selfie into a full-body cosmic hero for that planet. On the Reddit demo you can also **select the default Earth avatar** to play instantly.
4. **Fight** — arrow keys / WASD to move, space to shoot. Kill drones, collect the crystals they drop.
5. **Reach 100% power** — your avatar grows, a crown appears, a banner announces the hidden power you unlocked.
6. **Defeat the boss** — beat the giant alien that spawns to *keep* the power.
7. **Come back tomorrow** — press `E` in your next run to trigger that power once. This is the daily hook.

## Retention Loop

| Mechanic | How it brings players back |
| --- | --- |
| **Hidden Powers** | Unlocked today, usable only tomorrow (one-shot). Missing a day = missing your power. |
| **Daily Streaks** | Each new UTC day you play extends the streak; a broken streak resets to 0. |
| **Planet Leaderboards** | Per-planet high scores stored in Devvit Redis, posted to the subreddit. |
| **Shareable Avatar** | Users can post their generated warrior back to the subreddit as user-generated content. |

## Tech Stack

- **Game engine**: Phaser 3 (arcade physics, boss AI, particle FX)
- **Web shell**: TanStack Start + React 19 + Tailwind v4
- **AI avatar**: Lovable AI Gateway (default) or Google Gemini 3.1 Flash Image (selfie-to-warrior with face-preservation prompt)
- **Backend**: Devvit Redis (leaderboards, streaks) + Devvit posts (user-generated warrior cards)
- **Selfie capture**: `navigator.mediaDevices.getUserMedia({ facingMode: "user" })`

## Repository Layout

```
src/
  routes/
    index.tsx              # Main game screens (intro → planet → play → result)
    api/                   # Server routes (webhooks, public endpoints)
  lib/
    tokah-game.ts          # Phaser scene: player, drones, crystals, boss, hidden-power unlock
    avatar.functions.ts    # Server fn: selfie → Gemini → cosmic warrior PNG
    trivia.functions.ts    # (unused — legacy)
  assets/
    tokah-logo.png         # Wordmark
devvit/                    # Devvit Web wrapper (see DEPLOY.md)
```

## Local Development

```bash
bun install
bun dev
```

The web app runs at `http://localhost:8080`. To test the Devvit wrapper on Reddit, see `DEPLOY.md`.

## Credits

- Original selfies belong to the players who upload them; avatars are generated on-device request.
- Warrior style prompts and game design: TOKAH team.
- Built for **Reddit Games with a Hook Hackathon (2026)**.

## License

MIT — see `LICENSE`.
