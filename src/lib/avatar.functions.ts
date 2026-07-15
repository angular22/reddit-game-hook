import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  imageDataUrl: z.string().min(20),
  planet: z.string().optional(),
});

export type AvatarResult =
  | { ok: true; imageBase64: string }
  | { ok: false; fallback: true; reason: string };

const PLANET_PROMPTS: Record<string, string> = {
  Pluto: "Pluto shadow guardian of the dwarf realm, dark icy purple-black armor, heart-shaped cyan chest crystal, purple cloak, frozen dwarf-planet surface, distant sun halo, cyan starlight.",
  Mars: "Mars red-desert warlord, burnt-orange plated armor, dust-red cloak, glowing lava chest core, cracked crimson desert with dust storms, twin moons in the sky.",
  Europa: "Europa ice-ocean champion, translucent cyan crystal armor, frost-white cloak, glowing blue chest core, cracked ice plains with Jupiter huge on the horizon.",
  Kepler: "Kepler-9 jungle exo-hunter, bio-luminescent green armor with vine motifs, emerald cloak, glowing pink chest crystal, alien jungle background with giant glowing flora.",
  Mercury: "Mercury solar-forge knight, molten gold and bronze armor, sun-fire cloak, glowing amber chest core, cratered scorched surface with the sun huge behind.",
  Venus: "Venus storm queen, gold-and-crimson ornate armor, red cloak, glowing yellow chest core, thick swirling yellow cloud background with lightning.",
  Earth: "Earth guardian warrior, blue-and-green plated armor, teal cloak, glowing turquoise chest crystal, planet Earth rising behind, clouds and continents visible.",
  Jupiter: "Jupiter storm titan, bronze-and-orange armor with swirling band motifs, ember cloak, glowing amber chest core, giant red spot storm behind.",
  Saturn: "Saturn ring paladin, pale-gold armor with ring motifs, cream cloak, glowing yellow chest core, Saturn rings arcing across the sky.",
  Uranus: "Uranus ice tilt-knight, cyan-and-teal crystalline armor, mint cloak, glowing pale-blue chest core, tilted icy giant planet behind.",
  Neptune: "Neptune deep-blue tidecaller, midnight-blue armor with wave motifs, indigo cloak, glowing sapphire chest core, dark blue stormy planet backdrop.",
  Sun: "Sun corona sovereign, blazing gold plasma armor, fire cloak, glowing white chest core, solar flares and corona backdrop.",
};

function buildPrompt(planet: string) {
  const style = PLANET_PROMPTS[planet] ?? PLANET_PROMPTS.Earth;
  return `Create exactly one ${planet} warrior avatar from the reference photo.

CRITICAL FACE RULE: The warrior's face MUST be an exact photorealistic match of the person in the reference photo — same face shape, eyes, nose, mouth, skin tone, hair, facial hair, age, gender, ethnicity. Do NOT stylize, cartoonify, idealize, beautify, or change the face. Treat the face as a direct photo-composite onto the warrior body. Face clearly visible, unobstructed, instantly recognizable.

Everything ELSE around the face is stylized sci-fi fantasy game art: ${style} Full-body character portrait, centered composition, dynamic hero pose holding a glowing sword, dramatic painterly digital illustration, vibrant colors. No helmet covering the face. No mask. Return only the final image.`;
}

export const generateTokahAvatar = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }): Promise<AvatarResult> => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return { ok: false, fallback: true, reason: "Missing GEMINI_API_KEY" };

    const [, meta = "image/png", base64 = ""] =
      data.imageDataUrl.match(/^data:([^;]+);base64,(.+)$/) ?? [];
    if (!base64) return { ok: false, fallback: true, reason: "Please upload a valid image." };

    const planet = data.planet && PLANET_PROMPTS[data.planet] ? data.planet : "Earth";

    // Google Gemini image model (native API — uses user-supplied GEMINI_API_KEY).
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(key)}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: buildPrompt(planet) },
                { inlineData: { mimeType: meta, data: base64 } },
              ],
            },
          ],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      });
    } catch (e) {
      return { ok: false, fallback: true, reason: `Network error: ${(e as Error).message}` };
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return {
        ok: false,
        fallback: true,
        reason: `Gemini error (${res.status}): ${errBody.slice(0, 200)}`,
      };
    }

    const json = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { data?: string } }> };
      }>;
    };

    const b64 = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
      ?.inlineData?.data;
    if (!b64) {
      return { ok: false, fallback: true, reason: "No image returned from Gemini" };
    }
    return { ok: true, imageBase64: b64 };
  });
