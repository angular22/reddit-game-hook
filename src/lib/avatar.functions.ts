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
  return `Create ONE epic cosmic warrior character portrait using the person in the reference photo as the face.

FACE (non-negotiable): Photorealistic face-swap of the reference photo — exact same face shape, eyes, nose, mouth, skin tone, hair, facial hair, age, gender, ethnicity. Do NOT stylize, cartoonify, beautify, age, or change the face in ANY way. Face must be clearly visible, front-facing, no helmet, no mask, no goggles covering it. Instantly recognizable as the same person.

BODY & ARMOR (fully stylized sci-fi fantasy game art, this is a WARRIOR, not a portrait):
- Full-body hero shot, feet to head, centered, heroic power stance.
- Ornate battle armor: shoulder pauldrons, chest plate with glowing energy core, gauntlets, greaves, layered cloak/cape flowing behind.
- Holding a large glowing weapon (sword, spear, or war-hammer) — weapon fully visible with visible energy trails.
- Rim lighting, dramatic god-rays, particle effects, lens flare.
- Painterly high-detail digital illustration, ArtStation quality, cinematic vibrant colors, comic-book / video-game key-art style.

THEME: ${style}

COMPOSITION: Vertical 1:1, subject fills the frame, background is planet-themed environment with stars. No text, no logos, no watermark. Return only the finished character image.`;
}

export const generateTokahAvatar = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }): Promise<AvatarResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false, fallback: true, reason: "Missing LOVABLE_API_KEY" };

    const match = data.imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return { ok: false, fallback: true, reason: "Please upload a valid image." };
    const dataUrl = data.imageDataUrl;

    const planet = data.planet && PLANET_PROMPTS[data.planet] ? data.planet : "Earth";

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: buildPrompt(planet) },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          modalities: ["image", "text"],
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
        reason: `Lovable AI error (${res.status}): ${errBody.slice(0, 200)}`,
      };
    }

    const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) {
      return { ok: false, fallback: true, reason: "No image returned" };
    }
    return { ok: true, imageBase64: b64 };
  });

