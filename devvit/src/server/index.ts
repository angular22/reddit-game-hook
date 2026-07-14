import {
  context,
  reddit,
  settings,
  createServer,
  getServerPort,
} from '@devvit/web/server';
import express, { type Request, type Response } from 'express';


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

const PLANET_DEMO_STYLES: Record<string, { accent: string; glow: string; armor: string; bg: string }> = {
  pluto: { accent: '#a855f7', glow: '#38bdf8', armor: '#241039', bg: '#09091f' },
  mars: { accent: '#f97316', glow: '#f43f5e', armor: '#3b1208', bg: '#170805' },
  europa: { accent: '#22d3ee', glow: '#bae6fd', armor: '#083344', bg: '#041423' },
  kepler: { accent: '#22c55e', glow: '#ec4899', armor: '#052e16', bg: '#03130a' },
  mercury: { accent: '#f59e0b', glow: '#fef3c7', armor: '#3d2a10', bg: '#140f08' },
  venus: { accent: '#fbbf24', glow: '#fb7185', armor: '#422006', bg: '#1c1205' },
  earth: { accent: '#38bdf8', glow: '#86efac', armor: '#052e2b', bg: '#031525' },
  jupiter: { accent: '#fb923c', glow: '#fde68a', armor: '#3b2614', bg: '#160f09' },
  saturn: { accent: '#fde68a', glow: '#c4b5fd', armor: '#39321a', bg: '#14120b' },
  uranus: { accent: '#67e8f9', glow: '#d9f99d', armor: '#083344', bg: '#04161d' },
  neptune: { accent: '#60a5fa', glow: '#a78bfa', armor: '#0b1b4d', bg: '#04091d' },
  sun: { accent: '#facc15', glow: '#fb7185', armor: '#451a03', bg: '#190b04' },
};

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

function createDemoWarriorAvatar(imageDataUrl: string, planetId: string) {
  const style = PLANET_DEMO_STYLES[planetId] ?? PLANET_DEMO_STYLES.pluto;
  const planetLabel = planetId.toUpperCase();
  return svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="space" cx="50%" cy="20%" r="80%">
      <stop offset="0" stop-color="${style.accent}" stop-opacity="0.45"/>
      <stop offset="0.48" stop-color="${style.bg}"/>
      <stop offset="1" stop-color="#020617"/>
    </radialGradient>
    <linearGradient id="armor" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${style.glow}"/>
      <stop offset="0.35" stop-color="${style.accent}"/>
      <stop offset="1" stop-color="${style.armor}"/>
    </linearGradient>
    <clipPath id="faceClip"><ellipse cx="512" cy="314" rx="142" ry="164"/></clipPath>
    <filter id="softGlow"><feGaussianBlur stdDeviation="18" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="1024" height="1024" fill="url(#space)"/>
  <g opacity="0.9">
    <circle cx="136" cy="142" r="3" fill="#fff"/><circle cx="812" cy="96" r="2" fill="#fff"/><circle cx="892" cy="296" r="3" fill="#fff"/>
    <circle cx="214" cy="358" r="2" fill="#fff"/><circle cx="724" cy="440" r="2" fill="#fff"/><circle cx="438" cy="104" r="2" fill="#fff"/>
  </g>
  <circle cx="512" cy="378" r="268" fill="none" stroke="${style.accent}" stroke-width="18" opacity="0.55" filter="url(#softGlow)"/>
  <path d="M248 914c34-210 150-328 264-328s230 118 264 328H248Z" fill="url(#armor)" stroke="${style.glow}" stroke-width="10"/>
  <path d="M282 832 512 664l230 168-54 94H336l-54-94Z" fill="#020617" opacity="0.42"/>
  <path d="M366 618 512 782l146-164 54 122-94 192H406l-94-192 54-122Z" fill="url(#armor)" stroke="${style.accent}" stroke-width="8"/>
  <path d="M512 624 452 770h120l-60-146Z" fill="${style.glow}" opacity="0.88" filter="url(#softGlow)"/>
  <path d="M312 538c-54 36-102 92-136 166l102 18 88-96-54-88Zm400 0c54 36 102 92 136 166l-102 18-88-96 54-88Z" fill="${style.armor}" stroke="${style.accent}" stroke-width="8"/>
  <path d="M360 234c18-122 286-122 304 0l-42 54c-34-70-186-70-220 0l-42-54Z" fill="url(#armor)" stroke="${style.glow}" stroke-width="8"/>
  <image href="${imageDataUrl}" x="332" y="122" width="360" height="360" preserveAspectRatio="xMidYMid slice" clip-path="url(#faceClip)"/>
  <ellipse cx="512" cy="314" rx="144" ry="166" fill="none" stroke="${style.glow}" stroke-width="10"/>
  <path d="M362 438c48 72 252 72 300 0l-40 120H402l-40-120Z" fill="url(#armor)" stroke="${style.accent}" stroke-width="8"/>
  <path d="M210 846h604" stroke="${style.glow}" stroke-width="12" opacity="0.75"/>
  <text x="512" y="956" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="${style.glow}" letter-spacing="4">${planetLabel} WARRIOR</text>
</svg>`);
}

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
    const fallbackDataUrl = createDemoWarriorAvatar(imageDataUrl, planetId);

    // ⚠️ LOCAL DEMO ONLY — hardcoded Gemini API key. Delete before publishing publicly.
    const HARDCODED_GEMINI_API_KEY = 'AQ.Ab8RN6LPji_H7My1-QQpKV8xNjR1LlARlrDLXixQnE7cWkoIag';

    const apiKey =
      (await settings.get<string>('GEMINI_API_KEY').catch(() => undefined)) ||
      process.env.GEMINI_API_KEY ||
      HARDCODED_GEMINI_API_KEY;
    if (!apiKey || typeof apiKey !== 'string') {
      res.status(200).json({
        dataUrl: fallbackDataUrl,
        fallback: true,
        error:
          'AI key not configured. Using built-in Reddit demo avatar.',
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
      res.status(200).json({
        dataUrl: fallbackDataUrl,
        fallback: true,
        error: `AI avatar service rejected the key (${geminiRes.status}), so the game is using built-in demo avatar.`,
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
      res.status(200).json({
        dataUrl: fallbackDataUrl,
        fallback: true,
        error: 'AI returned no image, so the game is using built-in demo avatar.',
      });
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
