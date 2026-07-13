import { Hono } from 'hono';
import { context, redis } from '@devvit/web/server';
import { z } from 'zod';
import type {
  GenerateAvatarRequest,
  GenerateAvatarResponse,
  InitResponse,
  SavePowerRequest,
  SavePowerResponse,
  SaveScoreRequest,
  SaveScoreResponse,
} from '../../shared/api';

type ErrorResponse = {
  status: 'error';
  message: string;
};

const PLANET_STYLES: Record<string, string> = {
  Mercury: 'molten cratered surface, bronze and gold armor, heat-forged blades, glowing lava veins',
  Venus: 'thick amber clouds, brass steampunk armor, acid-etched details, volcanic backdrop',
  Earth: 'green-blue nature warrior, leaf-and-metal armor, verdant aura',
  Mars: 'rust-red desert warlord, iron plated armor, dust storm cape, red glowing eyes',
  Jupiter: 'colossal storm-lord, swirling gas giant armor, lightning gauntlets, orange and cream cloak',
  Saturn: 'elegant ringed cosmic knight, silver rings orbiting, pale-gold ornate armor',
  Uranus: 'cyan crystalline ice mage, tilted-ring diadem, frost armor, methane glow',
  Neptune: 'deep-blue oceanic sorcerer, wave-etched armor, trident, storm aura',
  Pluto:
    'shadow guardian of the dwarf realm, dark icy armor, heart-shaped chest crystal, purple-black cloak, distant sun halo',
  Sun: 'solar champion wreathed in golden plasma, radiant crown, molten sword',
};

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function userKey(postId: string, userId: string, suffix: string) {
  return `post:${postId}:user:${userId}:${suffix}`;
}

function postKey(postId: string, suffix: string) {
  return `post:${postId}:${suffix}`;
}

export const api = new Hono();

api.get('/init', async (c) => {
  const { postId, userId, username } = context;

  if (!postId) {
    console.error('API Init Error: postId not found in devvit context');
    return c.json(
      {
        status: 'error',
        message: 'postId is required but missing from context',
      } as ErrorResponse,
      400
    );
  }

  if (!userId) {
    console.error('API Init Error: userId not found in devvit context');
    return c.json(
      {
        status: 'error',
        message: 'userId is required but missing from context',
      } as ErrorResponse,
      400
    );
  }

  try {
    const [avatar, planet, powerRaw, streakRaw, scoresRaw] = await Promise.all([
      redis.get(userKey(postId, userId, 'avatar')),
      redis.get(userKey(postId, userId, 'planet')),
      redis.get(userKey(postId, userId, 'power')),
      redis.get(userKey(postId, userId, 'streak')),
      redis.get(postKey(postId, 'scores')),
    ]);

    let savedPower: { power: string; date: string } | null = null;
    try {
      savedPower = powerRaw ? (JSON.parse(powerRaw) as { power: string; date: string }) : null;
    } catch {
      savedPower = null;
    }

    let streak = { count: 0, lastPlayed: '', best: 0 };
    try {
      streak = streakRaw
        ? (JSON.parse(streakRaw) as { count: number; lastPlayed: string; best: number })
        : streak;
    } catch {
      streak = { count: 0, lastPlayed: '', best: 0 };
    }

    let leaderboard: { name: string; score: number; date: string }[] = [];
    try {
      leaderboard = scoresRaw ? (JSON.parse(scoresRaw) as typeof leaderboard) : [];
    } catch {
      leaderboard = [];
    }

    return c.json({
      type: 'init',
      postId,
      username: username ?? 'Warrior',
      avatar: avatar ?? null,
      planet: planet ?? 'Pluto',
      savedPower: savedPower?.power ?? null,
      powerAvailableToday: savedPower ? savedPower.date !== todayUtc() : false,
      streak,
      leaderboard,
    } as InitResponse);
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    let errorMessage = 'Unknown error during initialization';
    if (error instanceof Error) {
      errorMessage = `Initialization failed: ${error.message}`;
    }
    return c.json({ status: 'error', message: errorMessage } as ErrorResponse, 400);
  }
});

api.post('/generate-avatar', async (c) => {
  const { postId, userId } = context;
  if (!postId || !userId) {
    return c.json(
      { status: 'error', message: 'postId and userId are required' } as ErrorResponse,
      400
    );
  }

  const body = (await c.req.json()) as GenerateAvatarRequest;
  const Input = z.object({
    imageDataUrl: z.string().min(20),
    planet: z.string().min(1),
  });

  let data: { imageDataUrl: string; planet: string };
  try {
    data = Input.parse(body);
  } catch (e) {
    return c.json({ status: 'error', message: 'Invalid request body' } as ErrorResponse, 400);
  }

  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    return c.json(
      { status: 'error', message: 'Missing LOVABLE_API_KEY on server' } as ErrorResponse,
      500
    );
  }

  try {
    const style = PLANET_STYLES[data.planet] ?? PLANET_STYLES.Pluto;
    const prompt = `Create a heroic cosmic warrior character illustration for the planet ${data.planet}.

CRITICAL FACE RULE: The warrior's face MUST be an exact photorealistic match of the person in the reference photo — same face shape, same eyes, same nose, same mouth, same skin tone, same hair, same facial hair, same age, same gender, same ethnicity. Do NOT stylize, cartoonify, idealize, beautify, or change the face in any way. Treat the face as a direct photo-composite of the reference onto the warrior body. The face must be clearly visible, unobstructed by helmets or masks, and instantly recognizable as the same person.

Everything ELSE around the face is stylized sci-fi fantasy game art: ${style}. Full-body character portrait, centered composition, dynamic pose holding a glowing sword, dramatic painterly digital illustration, vibrant colors, solid dark cosmic background with stars. No helmet covering the face. No mask.`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': key,
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image',
        modalities: ['image', 'text'],
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) {
        return c.json({ status: 'error', message: 'Rate limited. Try again in a moment.' } as ErrorResponse, 429);
      }
      if (res.status === 402) {
        return c.json(
          { status: 'error', message: 'AI credits exhausted for this workspace.' } as ErrorResponse,
          402
        );
      }
      return c.json(
        { status: 'error', message: `Avatar generation failed (${res.status}): ${t.slice(0, 200)}` } as ErrorResponse,
        500
      );
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
    };
    const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) {
      return c.json({ status: 'error', message: 'No image returned from AI' } as ErrorResponse, 500);
    }

    const base64 = url.startsWith('data:') ? url.split(',')[1] : url;
    const dataUrl = `data:image/png;base64,${base64}`;

    await Promise.all([
      redis.set(userKey(postId, userId, 'avatar'), dataUrl),
      redis.set(userKey(postId, userId, 'planet'), data.planet),
    ]);

    return c.json({ type: 'avatar', imageBase64: base64 } as GenerateAvatarResponse);
  } catch (error) {
    console.error('Avatar generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown avatar generation error';
    return c.json({ status: 'error', message } as ErrorResponse, 500);
  }
});

api.post('/score', async (c) => {
  const { postId, userId } = context;
  if (!postId || !userId) {
    return c.json(
      { status: 'error', message: 'postId and userId are required' } as ErrorResponse,
      400
    );
  }

  const body = (await c.req.json()) as SaveScoreRequest;

  try {
    const [powerRaw, streakRaw, scoresRaw] = await Promise.all([
      redis.get(userKey(postId, userId, 'power')),
      redis.get(userKey(postId, userId, 'streak')),
      redis.get(postKey(postId, 'scores')),
    ]);

    let savedPower: { power: string; date: string } | null = null;
    try {
      savedPower = powerRaw ? (JSON.parse(powerRaw) as typeof savedPower) : null;
    } catch {
      savedPower = null;
    }

    let streak = { count: 0, lastPlayed: '', best: 0 };
    try {
      streak = streakRaw
        ? (JSON.parse(streakRaw) as { count: number; lastPlayed: string; best: number })
        : streak;
    } catch {
      streak = { count: 0, lastPlayed: '', best: 0 };
    }

    let leaderboard: { name: string; score: number; date: string }[] = [];
    try {
      leaderboard = scoresRaw ? (JSON.parse(scoresRaw) as typeof leaderboard) : [];
    } catch {
      leaderboard = [];
    }

    const entry = { name: `${body.planet} Warrior`, score: body.score, date: todayUtc() };
    const next = [...leaderboard, entry].sort((a, b) => b.score - a.score).slice(0, 10);

    const t = todayUtc();
    let count = 1;
    if (streak.lastPlayed === t) count = streak.count;
    else {
      const y = new Date(t + 'T00:00:00Z');
      y.setUTCDate(y.getUTCDate() - 1);
      if (streak.lastPlayed === y.toISOString().slice(0, 10)) count = streak.count + 1;
    }
    const updatedStreak = { count, lastPlayed: t, best: Math.max(streak.best, body.score) };

    await Promise.all([
      redis.set(postKey(postId, 'scores'), JSON.stringify(next)),
      redis.set(userKey(postId, userId, 'streak'), JSON.stringify(updatedStreak)),
    ]);

    if (body.won && body.powerUnlocked) {
      await redis.set(
        userKey(postId, userId, 'power'),
        JSON.stringify({ power: body.powerUnlocked, date: todayUtc() })
      );
    }

    return c.json({ type: 'score', saved: true, leaderboard: next } as SaveScoreResponse);
  } catch (error) {
    console.error('Save score error:', error);
    const message = error instanceof Error ? error.message : 'Unknown save score error';
    return c.json({ status: 'error', message } as ErrorResponse, 500);
  }
});

api.post('/power', async (c) => {
  const { postId, userId } = context;
  if (!postId || !userId) {
    return c.json(
      { status: 'error', message: 'postId and userId are required' } as ErrorResponse,
      400
    );
  }

  const body = (await c.req.json()) as SavePowerRequest;

  try {
    await redis.set(
      userKey(postId, userId, 'power'),
      JSON.stringify({ power: body.power, date: todayUtc() })
    );
    return c.json({ type: 'power', saved: true } as SavePowerResponse);
  } catch (error) {
    console.error('Save power error:', error);
    const message = error instanceof Error ? error.message : 'Unknown save power error';
    return c.json({ status: 'error', message } as ErrorResponse, 500);
  }
});
