import { context, reddit, settings } from '@devvit/web/server';
import { createServer } from '@devvit/web/server';
import { Devvit } from '@devvit/public-api';

// Register the Lovable AI Gateway key as a secret App-scoped setting.
// Configure once uploaded via: npx devvit settings set LOVABLE_API_KEY
Devvit.addSettings([
  {
    name: 'LOVABLE_API_KEY',
    label: 'Lovable AI Gateway API Key',
    type: 'string',
    isSecret: true,
    scope: 'app' as never, // SettingScope.App
    helpText: 'From your Lovable workspace. Used server-side only.',
  },
]);

const app = createServer();

// Player profile: returns Reddit username + snoovatar for the current viewer.
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

const PLANET_STYLES: Record<string, string> = {
  pluto: 'shadow guardian of a frozen dwarf world, dark icy armor with glowing purple crystals, heart-shaped chest gem, distant sun halo',
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

// AI avatar generation via Lovable AI Gateway (Gemini Nano Banana model).
app.post('/api/generate-avatar', async (req, res) => {
  try {
    const apiKey = await settings.get('LOVABLE_API_KEY');
    if (!apiKey || typeof apiKey !== 'string') {
      res.status(500).json({
        error: 'LOVABLE_API_KEY not configured. After uploading the app, run: npx devvit settings set LOVABLE_API_KEY',
      });
      return;
    }

    const planetId = String((req.body as { planet?: string } | undefined)?.planet ?? 'pluto').toLowerCase();
    const style = PLANET_STYLES[planetId] ?? PLANET_STYLES.pluto;

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
    const imgDataUrl = `data:${imgMime};base64,${imgB64}`;

    const prompt = `Create a heroic cosmic warrior avatar based on this reference character.
Keep the character's identity clearly recognizable (same body shape, colors, silhouette).
Restyle as: ${style}.
Full-body character, centered, dynamic pose, painterly sci-fi game art, vibrant colors, dark cosmic background with stars. No text, no watermark.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': apiKey,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        modalities: ['image', 'text'],
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imgDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      console.error('[qokah] lovable ai error', aiRes.status, errBody.slice(0, 500));
      res.status(aiRes.status).json({
        error: `Lovable AI error (${aiRes.status}): ${errBody.slice(0, 300)}`,
      });
      return;
    }

    const json = (await aiRes.json()) as {
      choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
    };
    const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) {
      res.status(500).json({ error: 'Lovable AI returned no image' });
      return;
    }

    res.json({ dataUrl: url });
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
