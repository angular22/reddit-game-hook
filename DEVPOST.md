# Devpost submission copy — TOKAH

Paste each section into the matching field on the Devpost submission form.

---

## Tagline (max 200 chars)

Snap a selfie → become a cosmic warrior → fight aliens across the solar system → unlock a hidden power you can only use tomorrow. Your face. Your streak. Your legend.

---

## Inspiration

Reddit games get the deepest engagement when the player *is* the content. We wanted a game where every player's hero is literally their own face — no avatar picker, no character creator, just a selfie and a planet. Then we asked: what makes them come back tomorrow? Answer: a power they unlock today that they can only *use* tomorrow.

## What it does

TOKAH is a single-player, session-based action game with a daily hook:

1. **Selfie capture** — front camera opens right in the Reddit post (laptop or mobile).
2. **Planet pick** — 10 planets, each with a distinct warrior style (Mars warlord, Uranus ice mage, Pluto shadow guardian, etc.).
3. **AI transformation** — the AI turns your selfie into a full-body cosmic warrior for that planet, preserving your face. For the public Reddit demo, players can also **select the default Earth avatar** to play instantly when the AI service is not responding for external users.
4. **Play** — arcade twin-stick action inside Phaser. Kill drones, collect the crystals they drop, hit 100% power.
5. **Hidden Power unlock** — at 100% your avatar grows, a crown appears, and a hidden power (Phase Shift, Chrono Slow, Meteor Call…) is revealed.
6. **Boss fight** — a giant alien spawns. Beat it to *keep* the power.
7. **The hook** — that power is only usable **tomorrow**, once. Press `E` in your next run to trigger it. Miss a day = miss your power.

Plus: per-planet leaderboards in Devvit Redis, daily streaks, and a "Share your warrior" menu action that posts your generated hero to the subreddit.

## How we built it

- **Phaser 3** for the action scene (arcade physics, tweens, particle FX, boss AI).
- **TanStack Start + React 19** for the web shell and screen flow.
- **Lovable AI Gateway** for the selfie-to-warrior transformation, with a face-preservation prompt that treats the face as a photo-composite onto a stylized body. The project also supports **Google Gemini 3.1 Flash Image** as an alternative provider.
- **`navigator.mediaDevices.getUserMedia`** for in-browser front-camera capture — no file picker needed.
- **Devvit Web** to wrap the TanStack app as a Reddit post.
- **Devvit Redis** for leaderboards, streaks, and per-user unlocked-power storage.
- **Devvit `submitPost`** for the "share your warrior" user-contribution flow.

## Challenges we ran into

- **Face fidelity.** The first prompt happily stylized faces beyond recognition. We rewrote the prompt to treat the face as a strict photo-composite ("do not stylize, cartoonify, idealize, or beautify — same face shape, eyes, nose, mouth, skin tone, hair, age, gender, ethnicity") and switched to higher-quality image models for better likeness.
- **AI availability for external users.** Lovable AI Gateway responses can be limited by credits, so the public Reddit demo includes a **default Earth avatar** players can select to keep the game playable for everyone. The backend can also fall back to Google Gemini when configured.
- **Live camera in a Reddit webview.** `getUserMedia` requires HTTPS, so local dev couldn't test it — we tested inside a deployed Devvit sandbox.
- **Making the boss fight feel earned.** The "you win a power" moment now grows the avatar to 2.8×, drops a crown on the head, and shows a persistent banner — visual payoff you don't forget.

## Accomplishments we're proud of

- The AI avatar actually looks like the player.
- The daily-hook loop is real (not just a leaderboard) — a specific power unlocked today, usable tomorrow, one-shot.
- The game loads in a Reddit post and plays end-to-end in under 90 seconds from selfie to boss.

## What we learned

- Devvit Redis is the right primitive for per-user daily state.
- Face-preservation in generative image models is 90% prompt engineering.
- Reddit engagement isn't about depth — it's about "why do I open this tomorrow?"

## What's next for TOKAH

- **Community bosses** — subreddit users vote on the next boss design; winning design goes live on Sunday.
- **Comment-driven power hints** — the hidden power description hides in the comment thread; reading comments = getting hints.
- **Multi-day arcs** — chain multiple hidden powers across a week for a bigger reward.

## Built With

phaser, tanstack, react, typescript, tailwindcss, devvit, redis, google-gemini, vite

---

## Submission form fields

- **App listing URL**: `https://developers.reddit.com/apps/tokah` *(fill after `devvit upload`)*
- **Demo post URL**: `https://www.reddit.com/r/<your_test_sub>/comments/<post-id>/` *(fill after posting)*
- **Public repo URL**: `https://github.com/<you>/tokah`
- **Demo video URL**: `https://youtube.com/watch?v=<id>` *(upload after recording per `DEMO_SCRIPT.md`)*
- **Categories entered**: Best Experience That Will Keep People Coming Back, Best Use of Phaser, Best Use of Retention Mechanics, Best Use of User Contributions

---

## Category pitches

**Best Use of Phaser**: The entire action layer — player movement, drone AI, projectile pooling, crystal drops, particle FX, screen shake, boss AI patterns, and the 2.8× avatar-scale winning animation — is a Phaser 3 arcade scene rendered inside a TanStack shell. The player texture is a live-uploaded AI image loaded via `textures.addBase64`.

**Best Use of Retention Mechanics**: Three stacked hooks — (1) a **daily-locked power** unlocked today that can only be used tomorrow, (2) **UTC-day streaks** that break on missed days, (3) **per-planet leaderboards** in Devvit Redis. The mechanic isn't "come back for points"; it's "come back or lose the power you earned."

**Best Use of User Contributions**: The "Share your warrior" menu action posts each player's AI-generated hero back to the subreddit as a real post — turning every play session into subreddit content that other players see, comment on, and get inspired by.
