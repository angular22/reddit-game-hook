import { createServerFn } from "@tanstack/react-start";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export type TriviaQuestion = {
  question: string;
  choices: string[];
  answer: number; // index into choices
  category: string;
};

const QuizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      choices: z.array(z.string()),
      answer: z.number(),
      category: z.string(),
    }),
  ),
});

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export const getDailyQuiz = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ date: string; questions: TriviaQuestion[] }> => {
    const { createClient } = await import("@supabase/supabase-js");
    const date = todayUtc();

    const supabasePublic = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: cached } = await supabasePublic
      .from("daily_quizzes")
      .select("questions")
      .eq("quiz_date", date)
      .maybeSingle();

    if (cached?.questions) {
      return { date, questions: cached.questions as TriviaQuestion[] };
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3.5-flash");

    const prompt = `Generate exactly 10 diverse trivia questions for today (${date}). Mix these categories evenly: General Knowledge, Movies & TV, Gaming (video games/esports), Science & Tech. Increasing difficulty from question 1 (easy) to 10 (hard). Each question must have exactly 4 short choices and one correct answer (index 0-3). Keep questions concise, fun, and factually accurate. Avoid ambiguous questions. Return as JSON: { questions: [{ question, choices, answer, category }, ...] }.`;

    let questions: TriviaQuestion[];
    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: QuizSchema }),
        prompt,
      });
      questions = output.questions as TriviaQuestion[];
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        try {
          const parsed = JSON.parse(error.text ?? "{}");
          questions = parsed.questions as TriviaQuestion[];
        } catch {
          throw new Error("Failed to generate quiz");
        }
      } else {
        throw error;
      }
    }

    // Validate shape
    questions = questions
      .filter(
        (q) =>
          q &&
          typeof q.question === "string" &&
          Array.isArray(q.choices) &&
          q.choices.length === 4 &&
          typeof q.answer === "number" &&
          q.answer >= 0 &&
          q.answer < 4,
      )
      .slice(0, 10);

    if (questions.length < 10) throw new Error("Quiz generation incomplete");

    // Cache via admin
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("daily_quizzes")
      .upsert({ quiz_date: date, questions }, { onConflict: "quiz_date" });

    return { date, questions };
  },
);
