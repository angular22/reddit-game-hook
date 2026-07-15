import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  imageDataUrl: z.string().min(20),
  planet: z.string().optional(),
});

export type AvatarResult =
  | { ok: true; imageBase64: string }
  | { ok: false; fallback: true; reason: string };

export const generateTokahAvatar = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }): Promise<AvatarResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false, fallback: true, reason: "Missing LOVABLE_API_KEY" };

    const [, meta = "", base64 = ""] = data.imageDataUrl.match(/^data:([^;]+);base64,(.+)$/) ?? [];
    if (!base64) return { ok: false, fallback: true, reason: "Please upload a valid image." };

    const prompt = `Create exactly one Pluto warrior avatar from the reference photo.

CRITICAL FACE RULE: The warrior's face MUST be an exact photorealistic match of the person in the reference photo — same face shape, same eyes, same nose, same mouth, same skin tone, same hair, same facial hair, same age, same gender, same ethnicity. Do NOT stylize, cartoonify, idealize, beautify, or change the face in any way. Treat the face as a direct photo-composite of the reference onto the warrior body. The face must be clearly visible, unobstructed by helmets or masks, and instantly recognizable as the same person.

Everything ELSE around the face is stylized sci-fi fantasy game art: Pluto shadow guardian of the dwarf realm, dark icy armor, heart-shaped chest crystal, purple-black cloak, distant sun halo, frozen dwarf-planet surface, cyan starlight. Full-body character portrait, centered composition, dynamic pose holding a glowing sword, dramatic painterly digital illustration, vibrant colors, solid dark cosmic background with stars. No helmet covering the face. No mask. Return only the final image.`;

    // Cost-efficient Lovable AI image edit: one non-streaming Pluto avatar.
    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-lite-image",
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { inlineData: { mimeType: meta || "image/png", data: base64 } },
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
        reason:
          res.status === 429
            ? "AI is busy right now. Please try once more."
            : res.status === 402
              ? "AI credits are exhausted for now."
              : `Gateway error (${res.status}): ${errBody.slice(0, 200)}`,
      };
    }

    const json = (await res.json()) as {
      data?: Array<{ b64_json?: string }>;
    };

    const b64 = json.data?.[0]?.b64_json;
    if (!b64) {
      return { ok: false, fallback: true, reason: "No image returned from Gateway" };
    }
    return { ok: true, imageBase64: b64 };
  });
