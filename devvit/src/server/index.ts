import { context, reddit, settings } from '@devvit/web/server';
import { createServer } from '@devvit/web/server';

const app = createServer();

// Player profile: returns Reddit username + snoovatar (or default) for the current viewer.
app.get('/api/profile', async (_req, res) => {
  try {
    const username = await reddit.getCurrentUsername();
    let avatarUrl: string | null = null;
    if (username) {
      const user = await reddit.getUserByUsername(username);
      avatarUrl = (await user?.getSnoovatarUrl()) ?? null;
    }
    res.json({ username: username ?? null, avatarUrl });
  } catch (err) {
    console.error('[qokah] /api/profile failed', err);
    res.json({ username: null, avatarUrl: null });
  }
});

// Planet-themed style prompts for AI avatar generation.
const PLANET_STYLES: Record<string, string> = {
  pluto: 'shadow guardian of a frozen dwarf world, dark icy armor with glowing purple crystals, heart-shaped chest gem, distant sun halo',
  mars: 'red desert warlord, rust-iron plated armor, dust-storm cape, glowing red eyes, twin moons in background',
  europa: 'cyan ice mage from a frozen ocean moon, crystalline blue armor, frost aura, methane glow',
  kepler: 'alien-jungle ranger, bio-luminescent green armor woven with vines, exotic flora, twin-sun sky',
};

// AI avatar generation via Google Gemini (Nano Banana).
app.post('/api/generate-avatar', async (req, res) => {
  try {
    const apiKey = await settings.get('GEMINI_API_KEY');
    if (!apiKey || typeof apiKey !== 'string') {
      res.status(500).json({ error: 'GEMINI_API_KEY not configured. Run: npx devvit settings set GEMINI_API_KEY' });
      return;
    }

    const planetId = String((req.body as { planet?: string } | undefined)?.planet ?? 'pluto').toLowerCase();
    const style = PLANET_STYLES[planetId] ?? PLANET_STYLES.pluto;

    // Fetch the current user's Snoovatar to use as face reference.
    const username = await reddit.getCurrentUsername();
    if (!username) {
      res.status(401).json({ error: 'Not signed in' });
      return;
    }
    const user = await reddit.getUserByUsername(username);
    const snoovatarUrl = await user?.getSnoovatarUrl();
    if (!snoovatarUrl) {
      res.status(400).json({ error: 'No Snoovatar found for user' });
      return;
    }

    const imgResp = await fetch(snoovatarUrl);
    if (!imgResp.ok) {
      res.status(500).json({ error: `Failed to fetch snoovatar (${imgResp.status})` });
      return;
    }
    const imgBuf = Buffer.from(await imgResp.arrayBuffer());
    const imgB64 = imgBuf.toString('base64');
    const imgMime = imgResp.headers.get('content-type')?.split(';')[0] ?? 'image/png';

    const prompt = `Create a heroic cosmic warrior avatar based on this reference character.
Keep the character's identity clearly recognizable (same body shape, colors, silhouette).
Restyle as: ${style}.
Full-body character, centered, dynamic pose, painterly sci-fi game art, vibrant colors, dark cosmic background with stars. No text, no watermark.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inlineData: { mimeType: imgMime, data: imgB64 } },
              ],
            },
          ],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error('[qokah] gemini error', geminiRes.status, errBody.slice(0, 500));
      res.status(geminiRes.status).json({ error: `Gemini error (${geminiRes.status}): ${errBody.slice(0, 300)}` });
      return;
    }

    const json = (await geminiRes.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
      }>;
    };
    const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    const outB64 = part?.inlineData?.data;
    const outMime = part?.inlineData?.mimeType ?? 'image/png';
    if (!outB64) {
      res.status(500).json({ error: 'Gemini returned no image' });
      return;
    }

    res.json({ dataUrl: `data:${outMime};base64,${outB64}` });
  } catch (err) {
    console.error('[qokah] /api/generate-avatar failed', err);
    res.status(500).json({ error: String(err) });
  }
});

// Menu action: create a new QOKAH post in the current subreddit.
app.post('/internal/menu/post-create', async (_req, res) => {
  try {
    const subreddit = context.subredditName;
    if (!subreddit) {
      res.status(400).json({ status: 'error', message: 'No subreddit context' });
      return;
    }
    const post = await reddit.submitCustomPost({
      subredditName: subreddit,
      title: 'QOKAH — Your Avatar Creates History',
      splash: { appDisplayName: 'QOKAH' },
    });
    res.json({ status: 'success', postId: post.id });
  } catch (err) {
    console.error('[qokah] post-create failed', err);
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

const port = Number(process.env.WEBBIT_PORT ?? process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`[qokah] server listening on :${port}`);
});
