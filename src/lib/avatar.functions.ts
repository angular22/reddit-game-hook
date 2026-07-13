import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  imageDataUrl: z.string().min(20), // data:image/...;base64,...
  planet: z.string().min(1),
});

const PLANET_STYLES: Record<string, string> = {
  Mercury: "molten cratered surface, bronze and gold armor, heat-forged blades, glowing lava veins",
  Venus: "thick amber clouds, brass steampunk armor, acid-etched details, volcanic backdrop",
  Earth: "green-blue nature warrior, leaf-and-metal armor, verdant aura",
  Mars: "rust-red desert warlord, iron plated armor, dust storm cape, red glowing eyes",
  Jupiter: "colossal storm-lord, swirling gas giant armor, lightning gauntlets, orange and cream cloak",
  Saturn: "elegant ringed cosmic knight, silver rings orbiting, pale-gold ornate armor",
  Uranus: "cyan crystalline ice mage, tilted-ring diadem, frost armor, methane glow",
  Neptune: "deep-blue oceanic sorcerer, wave-etched armor, trident, storm aura",
  Pluto: "shadow guardian of the dwarf realm, dark icy armor, heart-shaped chest crystal, purple-black cloak, distant sun halo",
  Sun: "solar champion wreathed in golden plasma, radiant crown, molten sword",
};

export const generateTokahAvatar = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }): Promise<{ imageBase64: string }> => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY on server");

    const style = PLANET_STYLES[data.planet] ?? PLANET_STYLES.Pluto;
    const prompt = `Create a heroic cosmic warrior character illustration for the planet ${data.planet}.

CRITICAL FACE RULE: The warrior's face MUST be an exact photorealistic match of the person in the reference photo — same face shape, same eyes, same nose, same mouth, same skin tone, same hair, same facial hair, same age, same gender, same ethnicity. Do NOT stylize, cartoonify, idealize, beautify, or change the face in any way. Treat the face as a direct photo-composite of the reference onto the warrior body. The face must be clearly visible, unobstructed by helmets or masks, and instantly recognizable as the same person.

Everything ELSE around the face is stylized sci-fi fantasy game art: ${style}. Full-body character portrait, centered composition, dynamic pose holding a glowing sword, dramatic painterly digital illustration, vibrant colors, solid dark cosmic background with stars. No helmet covering the face. No mask.`;

    // Parse data URL → mime + base64
    const match = /^data:([^;]+);base64,(.+)$/.exec(data.imageDataUrl);
    if (!match) throw new Error("Invalid image data URL");
    const mime = match[1];
    const b64 = match[2];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { inlineData: { mimeType: mime, data: b64 } },
              ],
            },
          ],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      },
    );

    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("Rate limited. Try again in a moment.");
      throw new Error(`Gemini error (${res.status}): ${t.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
      }>;
    };
    const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    const outB64 = part?.inlineData?.data;
    if (!outB64) throw new Error("No image returned from Gemini");
    return { imageBase64: outB64 };
  });
