import {
  context,
  reddit,
  createServer,
  getServerPort,
  settings,
} from '@devvit/web/server';
import type { IncomingMessage, ServerResponse } from 'node:http';


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

const DEFAULT_AVATAR_FACE = `data:image/svg+xml;base64,${Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 720 720">
  <defs>
    <linearGradient id="skin" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#f8d3aa"/><stop offset="1" stop-color="#b9784f"/>
    </linearGradient>
  </defs>
  <rect width="720" height="720" fill="#052e2b"/>
  <circle cx="360" cy="360" r="250" fill="#38bdf8" opacity="0.16"/>
  <circle cx="360" cy="300" r="152" fill="url(#skin)"/>
  <path d="M206 296c22-120 112-176 210-156 84 18 132 78 118 170-54-52-136-50-188-30-38 14-88 20-140 16Z" fill="#172554"/>
  <circle cx="306" cy="318" r="15" fill="#0f172a"/><circle cx="414" cy="318" r="15" fill="#0f172a"/>
  <path d="M318 402c30 28 62 28 92 0" fill="none" stroke="#7f1d1d" stroke-width="18" stroke-linecap="round"/>
  <path d="M170 720c38-150 116-228 190-228s152 78 190 228H170Z" fill="#0f766e"/>
</svg>`, 'utf8').toString('base64')}`;

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

function normalizePlanet(planet: unknown) {
  const requested = String(planet ?? 'pluto').toLowerCase();
  return requested === 'pluto' ? 'pluto' : 'pluto';
}

function splitDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

async function createLovablePlutoAvatar(imageDataUrl: string) {
  const parsed = splitDataUrl(imageDataUrl);
  if (!parsed) throw new Error('Please upload a valid image.');

  const keyFromSettings = await settings.get('LOVABLE_API_KEY');
  const key = String(keyFromSettings || process.env.LOVABLE_API_KEY || '').trim();
  if (!key) throw new Error('LOVABLE_API_KEY is not configured.');

  const prompt = `Create exactly one Pluto warrior avatar from the reference photo.

CRITICAL FACE RULE: The warrior's face MUST be an exact photorealistic match of the person in the reference photo — same face shape, same eyes, same nose, same mouth, same skin tone, same hair, same facial hair, same age, same gender, same ethnicity. Do NOT stylize, cartoonify, idealize, beautify, or change the face in any way. Treat the face as a direct photo-composite of the reference onto the warrior body. The face must be clearly visible, unobstructed by helmets or masks, and instantly recognizable as the same person.

Everything ELSE around the face is stylized sci-fi fantasy game art: Pluto shadow guardian of the dwarf realm, dark icy armor, heart-shaped chest crystal, purple-black cloak, distant sun halo, frozen dwarf-planet surface, cyan starlight. Full-body character portrait, centered composition, dynamic pose holding a glowing sword, dramatic painterly digital illustration, vibrant colors, solid dark cosmic background with stars. No helmet covering the face. No mask. Return only the final image.`;

  const upstream = await fetch('https://ai.gateway.lovable.dev/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3.1-flash-lite-image',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: parsed.mimeType || 'image/png', data: parsed.base64 } },
          ],
        },
      ],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '');
    throw new Error(upstream.status === 402 ? 'AI credits are exhausted for now.' : `AI Gateway error ${upstream.status}: ${text.slice(0, 180)}`);
  }

  const json = await upstream.json() as { data?: Array<{ b64_json?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image returned from AI Gateway.');
  return `data:image/png;base64,${b64}`;
}

function createDemoWarriorAvatar(imageDataUrl: string | null | undefined, planetId: string) {
  const style = PLANET_DEMO_STYLES[planetId] ?? PLANET_DEMO_STYLES.earth;
  const planetLabel = planetId.toUpperCase();
  const faceDataUrl = imageDataUrl?.startsWith('data:') ? imageDataUrl : DEFAULT_AVATAR_FACE;
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
  <image href="${faceDataUrl}" x="332" y="122" width="360" height="360" preserveAspectRatio="xMidYMid slice" clip-path="url(#faceClip)"/>
  <ellipse cx="512" cy="314" rx="144" ry="166" fill="none" stroke="${style.glow}" stroke-width="10"/>
  <path d="M362 438c48 72 252 72 300 0l-40 120H402l-40-120Z" fill="url(#armor)" stroke="${style.accent}" stroke-width="8"/>
  <path d="M210 846h604" stroke="${style.glow}" stroke-width="12" opacity="0.75"/>
  <text x="512" y="956" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="${style.glow}" letter-spacing="4">${planetLabel} WARRIOR</text>
</svg>`);
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req: IncomingMessage, limitBytes = 10 * 1024 * 1024) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > limitBytes) throw new Error('Request body too large');
  }
  return body ? JSON.parse(body) : {};
}

// Player profile: returns Reddit username + snoovatar for the current viewer.
async function handleProfile(_req: IncomingMessage, res: ServerResponse) {
  try {
    const username = await reddit.getCurrentUsername();
    let avatarUrl: string | null = null;
    if (username) {
      const user = await reddit.getUserByUsername(username);
      avatarUrl = (await user?.getSnoovatarUrl()) ?? null;
    }
    sendJson(res, 200, { username: username ?? null, avatarUrl });
  } catch (err) {
    console.error('[qokah] /api/profile failed', err);
    sendJson(res, 200, { username: null, avatarUrl: null });
  }
}

// Lovable AI avatar generation: one Pluto avatar only.
async function handleGenerateAvatar(req: IncomingMessage, res: ServerResponse) {
  try {
    const body = (await readJsonBody(req)) as { imageDataUrl?: string; planet?: string };
    const imageDataUrl = String(body.imageDataUrl ?? '');
    const planetId = normalizePlanet(body.planet);
    const dataUrl = await createLovablePlutoAvatar(imageDataUrl);
    sendJson(res, 200, { dataUrl, planet: planetId });
  } catch (err) {
    console.warn('[qokah] /api/generate-avatar using default Pluto avatar', err);
    sendJson(res, 200, {
      dataUrl: createDemoWarriorAvatar(DEFAULT_AVATAR_FACE, 'pluto'),
      fallback: true,
      error: err instanceof Error ? err.message : 'Using default Pluto avatar.',
    });
  }
}

// Menu action: create a new QOKAH post in the current subreddit.
async function handleCreatePost(_req: IncomingMessage, res: ServerResponse) {
  try {
    const subreddit = context.subredditName;
    if (!subreddit) {
      sendJson(res, 400, { status: 'error', message: 'No subreddit context' });
      return;
    }
    const post = await reddit.submitCustomPost({
      subredditName: subreddit,
      title: 'QOKAH — Your Avatar Creates History',
    });
    sendJson(res, 200, { status: 'success', postId: post.id });
  } catch (err) {
    console.error('[qokah] post-create failed', err);
    sendJson(res, 500, { status: 'error', message: String(err) });
  }
}

const app = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/api/profile') {
    await handleProfile(req, res);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/generate-avatar') {
    await handleGenerateAvatar(req, res);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/internal/menu/post-create') {
    await handleCreatePost(req, res);
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

const port = getServerPort();
app.listen(port, () => {
  console.log(`[qokah] server listening on :${port}`);
});
