import {
  context,
  reddit,
  settings,
  createServer,
  getServerPort,
} from '@devvit/web/server';
import type { Request, Response } from 'express';

const PLANET_STYLES: Record<string, string> = {
  pluto:
    'shadow guardian of a frozen dwarf world, dark icy armor with glowing purple crystals, heart-shaped chest gem, distant sun halo',
  mars: 'red desert warlord, rust-iron plated armor, dust-storm cape, glowing red eyes, twin moons in background',
  europa: 'cyan ice mage from a frozen ocean moon, crystalline blue armor, frost aura, methane glow',
  kepler: 'alien-jungle ranger, bio-luminescent green armor woven with vines, exotic flora, twin-sun sky',
  mercury: 'molten cratered warrior, bronze and gold armor, heat-forged blades, glowing lava veins',
  venus: 'brass steampunk warrior in thick amber clouds, acid-etched details, volcanic backdrop',
  earth: 'green-blue nature warrior, leaf-and-metal armor, verdant aura',
  jupiter: 'colossal storm-lord, swirling gas giant armor, lightning gauntlets, orange and cream cloak',
  saturn: 'elegant ringed cosmic knight, silver rings orbiting, pale-gold ornate armor',
  uranus: 'cyan crystalline ice mage, tilted-ring diadem, frost armor, methane glow',
  neptune: 'deep-blue oceanic sorcerer, wave-etched armor, trident, storm aura',
  sun: 'solar champion wreathed in golden plasma, radiant crown, molten sword',
};

// createServer() from @devvit/web/server returns an Express app.
const app = createServer();
app.use(require('express').json({ limit: '10mb' }));

// Player profile: returns Reddit username + snoovatar for the current viewer.
app.get('/api/profile', async (_req: Request, res: Response) => {
  try {
    const username = await reddit.getCurrentUsername();
    let avatarUrl: string | null = null;
    if (username) {
      const user = await reddit.getUserByUsername(username);
      avatarUrl = (await user?.getSnoovatarUrl()) ?? null;
    }
    res.status(200).json({ username: username ?? null, avatarUrl });
  } catch (err) {
    console.error('[qokah] /api/profile failed', err);
    res.status(200).json({ username: null, avatarUrl: null });
  }
});

// AI avatar generation via Google Gemini (Nano Banana). Server-side only.
app.post('/api/generate-avatar', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as { imageDataUrl?: string; planet?: string };
    const imageDataUrl = String(body.imageDataUrl ?? '');
    if (!imageDataUrl.startsWith('data:')) {
      res.status(400).json({ error: 'Missing imageDataUrl' });
      return;
    }
    const planetId = String(body.planet ?? 'pluto').toLowerCase();
    const style = PLANET_STYLES[planetId] ?? PLANET_STYLES.pluto;

    const match = /^data:([^;]+);base64,(.+)$/.exec(imageDataUrl);
    if (!match) {
      res.status(400).json({ error: 'Invalid image data URL' });
      return;
    }
    const imgMime = match[1];
    const imgB64 = match[2];
    const fallbackDataUrl = imageDataUrl;

    const apiKey =
      (await settings.get<string>('GEMINI_API_KEY').catch(() => undefined)) ||
      process.env.GEMINI_API_KEY;
    if (!apiKey || typeof apiKey !== 'string') {
      res.status(200).json({
        dataUrl: fallbackDataUrl,
        fallback: true,
        error:
          'Gemini API key not configured. Run: npx devvit settings set GEMINI_API_KEY',
      });
      return;
    }

    const prompt = `Create a heroic cosmic warrior character illustration for the planet ${planetId}.

CRITICAL FACE RULE: The warrior's face MUST be an exact photorealistic match of the person in the reference photo — same face shape, same eyes, same nose, same mouth, same skin tone, same hair, same facial hair, same age, same gender, same ethnicity. Do NOT stylize, cartoonify, idealize, beautify, or change the face in any way. Treat the face as a direct photo-composite of the reference onto the warrior body. The face must be clearly visible, unobstructed by helmets or masks, and instantly recognizable as the same person.

Everything ELSE around the face is stylized sci-fi fantasy game art: ${style}. Full-body character portrait, centered composition, dynamic pose holding a glowing sword, dramatic painterly digital illustration, vibrant colors, solid dark cosmic background with stars. No helmet covering the face. No mask.`;

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
      if (geminiRes.status === 429 || geminiRes.status === 503) {
        res.status(200).json({
          dataUrl: fallbackDataUrl,
          fallback: true,
          error: 'AI avatar service is busy, so the game is using your Reddit avatar instead.',
        });
        return;
      }
      res.status(geminiRes.status).json({
        error: `Gemini error (${geminiRes.status}): ${errBody.slice(0, 300)}`,
      });
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

    res.status(200).json({ dataUrl: `data:${outMime};base64,${outB64}` });
  } catch (err) {
    console.error('[qokah] /api/generate-avatar failed', err);
    res.status(500).json({ error: String(err) });
  }
});

// Menu action: create a new QOKAH post in the current subreddit.
app.post('/internal/menu/post-create', async (_req: Request, res: Response) => {
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
    res.status(200).json({ status: 'success', postId: post.id });
  } catch (err) {
    console.error('[qokah] post-create failed', err);
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

const port = getServerPort();
app.listen(port, () => {
  console.log(`[qokah] server listening on :${port}`);
});
