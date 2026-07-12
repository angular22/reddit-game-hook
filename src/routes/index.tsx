import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getDailyQuiz, type TriviaQuestion } from "@/lib/trivia.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trivia Night — Daily Quiz" },
      {
        name: "description",
        content:
          "A fresh 10-question trivia quiz every day. Test your streak across movies, gaming, science, and general knowledge.",
      },
      { property: "og:title", content: "Trivia Night — Daily Quiz" },
      {
        property: "og:description",
        content: "10 fresh trivia questions daily. Build your streak.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type StoredProgress = {
  date: string;
  answers: (number | null)[];
  finished: boolean;
  score: number;
};

type Streak = {
  count: number;
  lastPlayed: string;
  bestScore: number;
};

const STORAGE_KEY = "trivia_night_progress_v1";
const STREAK_KEY = "trivia_night_streak_v1";
const QUESTION_TIME = 20;

function loadStreak(): Streak {
  if (typeof window === "undefined") return { count: 0, lastPlayed: "", bestScore: 0 };
  try {
    return (
      JSON.parse(localStorage.getItem(STREAK_KEY) ?? "") || {
        count: 0,
        lastPlayed: "",
        bestScore: 0,
      }
    );
  } catch {
    return { count: 0, lastPlayed: "", bestScore: 0 };
  }
}

function yesterday(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function Index() {
  const fetchQuiz = useServerFn(getDailyQuiz);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["daily-quiz"],
    queryFn: () => fetchQuiz(),
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-slate-100">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            🎯 Trivia Night
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Fresh 10-question quiz every day. Same questions for everyone.
          </p>
        </header>

        {isLoading && <LoadingCard />}
        {error && (
          <ErrorCard message={(error as Error).message} onRetry={() => refetch()} />
        )}
        {data && <Quiz date={data.date} questions={data.questions} />}
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
      <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
      <p className="mt-4 text-slate-300">Loading today's quiz…</p>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
      <p className="text-red-200">Couldn't load the quiz.</p>
      <p className="mt-1 text-xs text-red-300/70">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-400"
      >
        Try again
      </button>
    </div>
  );
}

function Quiz({ date, questions }: { date: string; questions: TriviaQuestion[] }) {
  const [progress, setProgress] = useState<StoredProgress>(() => ({
    date,
    answers: Array(questions.length).fill(null),
    finished: false,
    score: 0,
  }));
  const [current, setCurrent] = useState(0);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [streak, setStreak] = useState<Streak>({ count: 0, lastPlayed: "", bestScore: 0 });

  // hydrate from localStorage after mount
  useEffect(() => {
    setStreak(loadStreak());
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p: StoredProgress = JSON.parse(raw);
        if (p.date === date) {
          setProgress(p);
          if (p.finished) return;
          const nextIdx = p.answers.findIndex((a) => a === null);
          setCurrent(nextIdx === -1 ? questions.length - 1 : nextIdx);
        }
      }
    } catch {
      /* ignore */
    }
  }, [date, questions.length]);

  // persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  // timer
  useEffect(() => {
    if (progress.finished || locked) return;
    setTimeLeft(QUESTION_TIME);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          handleAnswer(-1);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, progress.finished]);

  function handleAnswer(choiceIdx: number) {
    if (locked || progress.finished) return;
    setLocked(true);
    const q = questions[current];
    const correct = choiceIdx === q.answer;
    const nextAnswers = [...progress.answers];
    nextAnswers[current] = choiceIdx;
    const nextScore = progress.score + (correct ? 1 : 0);

    setTimeout(() => {
      const isLast = current === questions.length - 1;
      if (isLast) {
        finish(nextAnswers, nextScore);
      } else {
        setProgress({ ...progress, answers: nextAnswers, score: nextScore });
        setCurrent(current + 1);
        setLocked(false);
      }
    }, 1200);
  }

  function finish(answers: (number | null)[], score: number) {
    const finished: StoredProgress = { date, answers, score, finished: true };
    setProgress(finished);
    setLocked(false);

    // Update streak
    const prev = loadStreak();
    let newCount = 1;
    if (prev.lastPlayed === date) newCount = prev.count; // already counted
    else if (prev.lastPlayed === yesterday(date)) newCount = prev.count + 1;
    const next: Streak = {
      count: newCount,
      lastPlayed: date,
      bestScore: Math.max(prev.bestScore, score),
    };
    localStorage.setItem(STREAK_KEY, JSON.stringify(next));
    setStreak(next);
  }

  function reset() {
    const fresh: StoredProgress = {
      date,
      answers: Array(questions.length).fill(null),
      finished: false,
      score: 0,
    };
    setProgress(fresh);
    setCurrent(0);
    setLocked(false);
  }

  if (progress.finished) {
    return (
      <Results
        score={progress.score}
        total={questions.length}
        questions={questions}
        answers={progress.answers}
        streak={streak}
        date={date}
        onReplay={reset}
      />
    );
  }

  const q = questions[current];
  const answered = progress.answers[current];
  const showResult = locked;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
      <div className="mb-4 flex items-center justify-between text-xs">
        <span className="font-mono text-slate-400">
          Q {current + 1} / {questions.length}
        </span>
        <span className="rounded-full bg-indigo-500/20 px-3 py-1 font-semibold text-indigo-200">
          {q.category}
        </span>
        <TimerRing seconds={timeLeft} max={QUESTION_TIME} />
      </div>

      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 transition-all"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>

      <h2 className="mb-6 text-xl font-semibold leading-snug sm:text-2xl">
        {q.question}
      </h2>

      <div className="grid gap-3">
        {q.choices.map((choice, i) => {
          const isSelected = answered === i;
          const isCorrect = i === q.answer;
          let style =
            "border-white/10 bg-white/5 hover:border-indigo-400 hover:bg-indigo-500/10";
          if (showResult) {
            if (isCorrect)
              style = "border-emerald-400 bg-emerald-500/20 text-emerald-100";
            else if (isSelected)
              style = "border-red-400 bg-red-500/20 text-red-100";
            else style = "border-white/5 bg-white/[0.02] opacity-50";
          }
          return (
            <button
              key={i}
              disabled={locked}
              onClick={() => handleAnswer(i)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${style}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-sm font-bold">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-sm sm:text-base">{choice}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
        <span>Score: {progress.score}</span>
        <span>🔥 Streak: {streak.count}</span>
      </div>
    </div>
  );
}

function TimerRing({ seconds, max }: { seconds: number; max: number }) {
  const pct = seconds / max;
  const color =
    pct > 0.5 ? "text-emerald-400" : pct > 0.25 ? "text-amber-400" : "text-red-400";
  return (
    <span
      className={`font-mono text-base font-bold tabular-nums ${color}`}
      aria-label="time remaining"
    >
      {seconds}s
    </span>
  );
}

function Results({
  score,
  total,
  questions,
  answers,
  streak,
  date,
  onReplay,
}: {
  score: number;
  total: number;
  questions: TriviaQuestion[];
  answers: (number | null)[];
  streak: Streak;
  date: string;
  onReplay: () => void;
}) {
  const pct = Math.round((score / total) * 100);
  const grade = useMemo(() => {
    if (pct === 100) return { emoji: "🏆", label: "Perfect!" };
    if (pct >= 80) return { emoji: "🎉", label: "Brilliant" };
    if (pct >= 60) return { emoji: "👏", label: "Solid" };
    if (pct >= 40) return { emoji: "🙂", label: "Not bad" };
    return { emoji: "😅", label: "Try again tomorrow" };
  }, [pct]);

  const [copied, setCopied] = useState(false);
  function share() {
    const grid = answers
      .map((a, i) => (a === questions[i].answer ? "🟩" : "🟥"))
      .join("");
    const text = `Trivia Night ${date}\n${score}/${total} ${grid}\n🔥 Streak: ${streak.count}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="text-center">
        <div className="text-6xl">{grade.emoji}</div>
        <h2 className="mt-2 text-2xl font-bold">{grade.label}</h2>
        <p className="mt-1 text-5xl font-black tabular-nums">
          {score}
          <span className="text-2xl text-slate-500">/{total}</span>
        </p>
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div>
            <div className="text-2xl">🔥 {streak.count}</div>
            <div className="text-xs text-slate-400">day streak</div>
          </div>
          <div>
            <div className="text-2xl">⭐ {streak.bestScore}</div>
            <div className="text-xs text-slate-400">best score</div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={share}
            className="rounded-full bg-indigo-500 px-5 py-2 text-sm font-semibold hover:bg-indigo-400"
          >
            {copied ? "Copied!" : "📋 Share score"}
          </button>
          <button
            onClick={onReplay}
            className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Play again
          </button>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          New quiz drops in {hoursUntilTomorrow()}h. Come back for +1 streak.
        </p>
      </div>

      <div className="mt-8 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Review
        </h3>
        {questions.map((q, i) => {
          const a = answers[i];
          const correct = a === q.answer;
          return (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm"
            >
              <div className="flex gap-2">
                <span>{correct ? "✅" : "❌"}</span>
                <div className="flex-1">
                  <p className="font-medium">{q.question}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Answer: <span className="text-emerald-300">{q.choices[q.answer]}</span>
                    {!correct && a !== null && a >= 0 && (
                      <>
                        {" · "}You said:{" "}
                        <span className="text-red-300">{q.choices[a]}</span>
                      </>
                    )}
                    {a === -1 && <> · Time up</>}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function hoursUntilTomorrow() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));
}
