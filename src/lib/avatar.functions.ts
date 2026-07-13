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
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const style = PLANET_STYLES[data.planet] ?? PLANET_STYLES.Pluto;
    const prompt = `Create a heroic cosmic warrior character illustration for the planet ${data.planet}.

CRITICAL FACE RULE: The warrior's face MUST be an exact photorealistic match of the person in the reference photo — same face shape, same eyes, same nose, same mouth, same skin tone, same hair, same facial hair, same age, same gender, same ethnicity. Do NOT stylize, cartoonify, idealize, beautify, or change the face in any way. Treat the face as a direct photo-composite of the reference onto the warrior body. The face must be clearly visible, unobstructed by helmets or masks, and instantly recognizable as the same person.

Everything ELSE around the face is stylized sci-fi fantasy game art: ${style}. Full-body character portrait, centered composition, dynamic pose holding a glowing sword, dramatic painterly digital illustration, vibrant colors, solid dark cosmic background with stars. No helmet covering the face. No mask.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("Rate limited. Try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
      throw new Error(`Avatar generation failed (${res.status}): ${t.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
    };
    const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) throw new Error("No image returned from AI");
    // url is typically a data: URL — strip prefix
    const base64 = url.startsWith("data:") ? url.split(",")[1] : url;
    return { imageBase64: base64 };
  });
