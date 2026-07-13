# Deploying TOKAH to Reddit (Devvit Web)

Step-by-step guide to wrap this TanStack web app as a Devvit app so it runs inside a Reddit post.

## Prerequisites

- Node.js 22+
- A Reddit account (create one if needed)
- Access to the Devvit developer portal: <https://developers.reddit.com/>

## 1. Install the Devvit CLI

```bash
npm install -g devvit
devvit login
```

`devvit login` opens a browser to authenticate your Reddit account with the CLI.

## 2. Create a test subreddit

1. Open Reddit → Create a Community.
2. Name it something unique (e.g. `r/tokahgame_test`). Keep it **Public** and under 200 members (hackathon rule).
3. If you don't want it public, install `dr-admin-approve` so hackathon judges can join automatically: <https://developers.reddit.com/apps/dr-admin-approve>.

## 3. Scaffold a Devvit Web app in this repo

From the project root:

```bash
devvit new --template web tokah-devvit
cd tokah-devvit
```

This creates a `tokah-devvit/` folder with the Devvit Web scaffold (a client, a server, a `devvit.json`).

## 4. Point the Devvit client at the built TanStack app

**Option A — Serve the built TanStack app inside the Devvit webview (recommended):**

1. In the project root: `bun run build` — produces `dist/` (static assets + SSR bundle for the client shell).
2. Copy the built client into `tokah-devvit/webroot/`:
   ```bash
   cp -r dist/client/* tokah-devvit/webroot/
   ```
3. In `tokah-devvit/devvit.json`, set the webview entry:
   ```json
   {
     "name": "tokah",
     "web": { "entry": "webroot/index.html" }
   }
   ```

**Option B — Keep the web app hosted separately** and iframe it inside a minimal Devvit webview. Simpler to iterate; Option A is required if your subreddit disallows external iframes.

## 5. Move state to Devvit Redis

Replace localStorage with the Devvit Redis client so streaks, leaderboards, and hidden powers persist per-Reddit-user.

In `tokah-devvit/src/server/index.ts`:

```ts
import { Devvit } from "@devvit/public-api";

Devvit.addCustomPostType({
  name: "TOKAH",
  render: (context) => {
    // ... render the webview ...
  },
});

// Example: save a score
export async function saveScore(context, planet: string, score: number) {
  const key = `tokah:leaderboard:${planet}`;
  await context.redis.zAdd(key, { member: context.userId!, score });
}

export async function topScores(context, planet: string) {
  return context.redis.zRange(`tokah:leaderboard:${planet}`, 0, 9, { reverse: true, by: "rank" });
}
```

Expose these to the webview via `context.ui.webView.postMessage` / `onMessage` — replace the `localStorage.setItem(STORE.scores, ...)` calls in `src/routes/index.tsx` with `postMessage({ type: 'save_score', ... })`.

## 6. Add the "share my warrior" post (user contributions category)

In the Devvit server, add a menu action that turns the player's avatar into a Reddit post:

```ts
Devvit.addMenuItem({
  location: "post",
  label: "Share your TOKAH warrior",
  onPress: async (_, context) => {
    const avatar = await context.redis.get(`tokah:avatar:${context.userId}`);
    await context.reddit.submitPost({
      subredditName: context.subredditName!,
      title: `My ${planet} warrior`,
      preview: <image url={avatar!} />,
    });
  },
});
```

This is what unlocks the **Best Use of User Contributions** sub-prize.

## 7. Upload and install

```bash
cd tokah-devvit
devvit upload
devvit install <your-test-subreddit>
```

Then in your subreddit: click the three-dot menu → **Add TOKAH post**. Play it. Confirm the game boots, the selfie flow works, and scores save.

## 8. Create the demo post

1. Trigger "Add TOKAH post" in your test subreddit.
2. Copy the post URL. That's your **Demo post** submission field.
3. Copy your app URL from `developers.reddit.com/apps/tokah`. That's your **App listing** submission field.

## 9. Record the demo video (≤60 seconds)

See `DEMO_SCRIPT.md`.

## 10. Fill out the Devpost submission

See `DEVPOST.md` for pre-written copy you can paste in.

---

## Troubleshooting

- **`devvit upload` fails with "webview too large"**: the client bundle is over Devvit's cap. Run `bun run build --minify` and remove unused assets under `src/assets/`.
- **Selfie camera doesn't work inside Devvit**: Reddit's webview requires the app to be served over HTTPS (Devvit does this automatically once uploaded). Camera won't work over local dev — test on the deployed app.
- **AI avatar generation fails inside Devvit**: server functions calling external APIs (Gemini) must go through Devvit's `context.http` fetch, not raw `fetch`. Update `src/lib/avatar.functions.ts` handler to accept a `context.http` argument bridged from the Devvit server.
