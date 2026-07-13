import './index.css';

import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useGame } from './hooks/useGame';
import type { GameResult } from './qokah-game';
import qokahLogo from '../../assets/qokah-logo.png';

const PLANETS = [
  { name: 'Mercury', color: '#a89078', emoji: '☿' },
  { name: 'Venus', color: '#e8b562', emoji: '♀' },
  { name: 'Earth', color: '#4b9cd3', emoji: '🌍' },
  { name: 'Mars', color: '#c1440e', emoji: '♂' },
  { name: 'Jupiter', color: '#d8a870', emoji: '♃' },
  { name: 'Saturn', color: '#e0c992', emoji: '♄' },
  { name: 'Uranus', color: '#7fdbe0', emoji: '♅' },
  { name: 'Neptune', color: '#3b5ff0', emoji: '♆' },
  { name: 'Pluto', color: '#8b5cf6', emoji: '🪐', featured: true },
  { name: 'Sun', color: '#fbbf24', emoji: '☀' },
];

type Screen = 'intro' | 'planet' | 'generating' | 'play' | 'result';

function QokahApp() {
  const game = useGame();
  const [screen, setScreen] = useState<Screen>('intro');
  const [selfie, setSelfie] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);

  // If the server already has an avatar, the intro can jump straight to play.
  useEffect(() => {
    if (!game.loading && game.avatar && screen === 'intro') {
      // Stay on intro so the user sees the "Continue" flow; they can tap through.
    }
  }, [game.loading, game.avatar, screen]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError('Image too large (max 5MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSelfie(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(f);
  }

  async function handleGenerate() {
    if (!selfie) return;
    setScreen('generating');
    setError(null);
    try {
      await game.generateAvatar(selfie, game.planet);
      setScreen('play');
    } catch (e) {
      setError((e as Error).message);
      setScreen('planet');
    }
  }

  async function handleFinished(r: GameResult) {
    setResult(r);
    try {
      await game.saveScore({
        score: r.score,
        crystals: r.crystals,
        timeMs: r.timeMs,
        powerUnlocked: r.powerUnlocked,
        won: r.won,
        planet: game.planet,
      });
    } catch (e) {
      console.error('Failed to save score', e);
    }
    setScreen('result');
  }

  if (game.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,#020617_60%)] text-slate-100">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-fuchsia-400 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-400">Loading QOKAH…</p>
        </div>
      </div>
    );
  }

  if (game.error && screen === 'intro') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,#020617_60%)] px-6 text-center text-slate-100">
        <div className="max-w-sm rounded-2xl border border-red-400/30 bg-red-500/10 p-6">
          <p className="text-sm text-red-200">{game.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-full bg-fuchsia-500 px-5 py-2 text-sm font-bold text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,#020617_60%)] text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              QOKAH
            </span>
          </h1>
          <div className="flex gap-4 text-xs text-slate-400">
            <span>🔥 {game.streak.count} day streak</span>
            <span>⭐ {game.streak.best} best</span>
          </div>
        </header>
        <p className="mb-8 text-center text-sm text-slate-400">Your Avatar Creates History.</p>

        {screen === 'intro' && (
          <IntroScreen
            onNext={() => setScreen('planet')}
            avatar={game.avatar}
            savedPower={game.savedPower}
            powerAvailableToday={game.powerAvailableToday}
          />
        )}
        {screen === 'planet' && (
          <PlanetScreen
            selfie={selfie}
            onFile={onFile}
            onSelfie={(d) => {
              setSelfie(d);
              setError(null);
            }}
            planet={game.planet}
            setPlanet={game.setPlanet}
            onGenerate={handleGenerate}
            error={error}
            existingAvatar={game.avatar}
            onSkipGenerate={() => game.avatar && setScreen('play')}
          />
        )}
        {screen === 'generating' && <GeneratingScreen />}
        {screen === 'play' && (
          <PlayScreen
            avatar={game.avatar}
            savedPower={game.powerAvailableToday ? game.savedPower : null}
            onFinished={handleFinished}
          />
        )}
        {screen === 'result' && result && (
          <ResultScreen
            result={result}
            planet={game.planet}
            leaderboard={game.leaderboard}
            savedPower={game.savedPower}
            avatar={game.avatar}
            onReplay={() => {
              setResult(null);
              setScreen('play');
            }}
            onNewAvatar={() => {
              setSelfie(null);
              setResult(null);
              setScreen('planet');
            }}
          />
        )}
      </div>
    </div>
  );
}

function IntroScreen({
  onNext,
  avatar,
  savedPower,
  powerAvailableToday,
}: {
  onNext: () => void;
  avatar: string | null;
  savedPower: string | null;
  powerAvailableToday: boolean;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
      <img
        src={qokahLogo}
        alt="QOKAH"
        width={1152}
        height={576}
        className="mx-auto -mt-2 mb-2 h-auto w-full max-w-sm drop-shadow-[0_0_30px_rgba(217,70,239,0.35)]"
      />
      {avatar ? (
        <img
          src={avatar}
          alt="Your QOKAH avatar"
          className="mx-auto h-40 w-40 rounded-2xl border-2 border-fuchsia-500 object-cover shadow-[0_0_40px_rgba(217,70,239,0.4)]"
        />
      ) : (
        <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-2xl border-2 border-dashed border-white/20 text-5xl">
          👤
        </div>
      )}
      <p className="mt-4 text-sm text-slate-400">
        Snap a selfie → pick your planet → fight aliens, collect crystals, and unlock a{' '}
        <span className="text-fuchsia-300">hidden power</span> only you carry into tomorrow's run.
      </p>
      {powerAvailableToday && savedPower && (
        <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          ⚡ You unlocked <b>{savedPower}</b> yesterday. Press{' '}
          <kbd className="rounded bg-black/30 px-1.5 py-0.5">E</kbd> in-game to use it once today.
        </div>
      )}
      <button
        onClick={onNext}
        className="mt-6 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-8 py-3 font-bold text-white shadow-lg hover:opacity-90"
      >
        {avatar ? 'Continue' : 'Begin'}
      </button>
    </div>
  );
}

function PlanetScreen({
  selfie,
  onFile,
  onSelfie,
  planet,
  setPlanet,
  onGenerate,
  error,
  existingAvatar,
  onSkipGenerate,
}: {
  selfie: string | null;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelfie: (dataUrl: string) => void;
  planet: string;
  setPlanet: (p: string) => void;
  onGenerate: () => void;
  error: string | null;
  existingAvatar: string | null;
  onSkipGenerate: () => void;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-300">
          1. Take a selfie
        </h3>
        <SelfieCapture selfie={selfie} onCapture={onSelfie} />
        {!selfie && (
          <label className="mt-2 block w-full cursor-pointer rounded-lg border border-white/10 py-2 text-center text-xs text-slate-400 hover:bg-white/5">
            or choose from gallery
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
        )}
        {existingAvatar && !selfie && (
          <button
            onClick={onSkipGenerate}
            className="mt-3 w-full rounded-lg border border-white/20 py-2 text-xs text-slate-300 hover:bg-white/5"
          >
            Use existing avatar
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-300">
          2. Choose your planet
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {PLANETS.map((p) => (
            <button
              key={p.name}
              onClick={() => setPlanet(p.name)}
              className={`relative flex flex-col items-center rounded-xl border p-2 text-xs transition ${
                planet === p.name
                  ? 'scale-105 border-fuchsia-400 bg-fuchsia-500/20'
                  : 'border-white/10 bg-white/5 hover:border-white/30'
              }`}
              title={p.name}
            >
              <span className="text-xl" style={{ color: p.color }}>
                {p.emoji}
              </span>
              <span className="mt-0.5">{p.name}</span>
              {p.featured && (
                <span className="absolute -right-1 -top-1 rounded-full bg-fuchsia-500 px-1.5 py-0.5 text-[9px] font-bold">
                  HOT
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">Pluto is today's active battle world.</p>
        <button
          onClick={onGenerate}
          disabled={!selfie}
          className="mt-4 w-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 py-3 font-bold text-white shadow-lg disabled:opacity-40"
        >
          ✨ Generate my {planet} avatar
        </button>
        {error && <p className="mt-2 text-center text-xs text-red-300">{error}</p>}
      </div>
    </div>
  );
}

function GeneratingScreen() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
      <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-fuchsia-400 border-t-transparent" />
      <p className="mt-4 font-bold">Forging your cosmic avatar…</p>
      <p className="mt-1 text-xs text-slate-400">This can take 10–20 seconds.</p>
    </div>
  );
}

function PlayScreen({
  avatar,
  savedPower,
  onFinished,
}: {
  avatar: string | null;
  savedPower: string | null;
  onFinished: (r: GameResult) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<{ destroy: (r: boolean) => void } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!avatar) {
      setReady(true);
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setReady(true);
    };
    img.onerror = () => {
      if (!cancelled) setReady(true);
    };
    img.src = avatar;
    return () => {
      cancelled = true;
    };
  }, [avatar]);

  useEffect(() => {
    if (!ready || !hostRef.current) return;
    let disposed = false;
    let localGame: { destroy: (r: boolean) => void } | null = null;
    const base64 = avatar?.startsWith('data:') ? avatar.split(',')[1] : avatar;
    import('./qokah-game').then(({ createGame }) => {
      if (disposed || !hostRef.current) return;
      const g = createGame(hostRef.current, base64 ?? null, savedPower);
      localGame = g as unknown as { destroy: (r: boolean) => void };
      gameRef.current = localGame;
      setTimeout(() => {
        const scene = g.scene.getScene('game');
        scene.events.once('finished', () => {
          const res = g.registry.get('result') as GameResult;
          onFinished(res);
        });
      }, 50);
    });
    return () => {
      disposed = true;
      localGame?.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <div>
      <div className="relative mx-auto" style={{ maxWidth: 960 }}>
        <div
          ref={hostRef}
          className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl"
          style={{ aspectRatio: '960/540' }}
        />
        {avatar && (
          <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full border border-white/20 bg-black/60 py-1 pl-1 pr-3 backdrop-blur">
            <img src={avatar} alt="you" className="h-8 w-8 rounded-full border border-fuchsia-400 object-cover" />
            <span className="text-xs font-bold text-fuchsia-200">You</span>
          </div>
        )}
      </div>
      <div className="mx-auto mt-3 grid max-w-2xl gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-center text-xs text-slate-300 sm:grid-cols-3">
        <div>
          ⚔️ <b>SPACE</b> attack
        </div>
        <div>
          🕹 <b>WASD / Arrows</b> move + jump
        </div>
        <div>
          💎 Collect crystals → fill <b className="text-fuchsia-300">Hidden Power</b> to 100% → boss spawns → win to unlock a power
        </div>
      </div>
      {savedPower && (
        <p className="mt-2 text-center text-xs text-amber-300">
          ⚡ Press <kbd className="rounded bg-black/30 px-1">E</kbd> to unleash yesterday's{' '}
          <b>{savedPower}</b> (one-time use)
        </p>
      )}
    </div>
  );
}

function ResultScreen({
  result,
  planet,
  leaderboard,
  savedPower,
  avatar,
  onReplay,
  onNewAvatar,
}: {
  result: GameResult;
  planet: string;
  leaderboard: { name: string; score: number; date: string }[];
  savedPower: string | null;
  avatar: string | null;
  onReplay: () => void;
  onNewAvatar: () => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div
        className={`rounded-2xl border p-6 text-center ${
          result.won
            ? 'border-emerald-400/30 bg-emerald-500/10'
            : 'border-red-400/30 bg-red-500/10'
        }`}
      >
        {avatar && (
          <img
            src={avatar}
            alt="Your avatar"
            className={`mx-auto mb-3 h-24 w-24 rounded-full border-2 object-cover ${
              result.won
                ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.5)]'
                : 'border-white/20'
            }`}
          />
        )}
        <div className="text-5xl">{result.won ? '🏆' : '💀'}</div>
        <h2 className="mt-2 text-2xl font-bold">{result.won ? 'Boss Defeated!' : 'You Fell'}</h2>
        <p className="mt-1 text-4xl font-black tabular-nums">{result.score}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-300">
          <div>💎 {result.crystals}</div>
          <div>⏱ {(result.timeMs / 1000).toFixed(1)}s</div>
          <div>🪐 {planet}</div>
        </div>
        {result.won && result.powerUnlocked && (
          <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3">
            <p className="text-xs uppercase tracking-wider text-amber-300">Hidden Power Unlocked</p>
            <p className="mt-1 text-lg font-bold text-amber-100">⚡ {result.powerUnlocked}</p>
            <p className="mt-1 text-xs text-amber-200/80">
              Come back tomorrow — press <kbd className="rounded bg-black/30 px-1">E</kbd> to use it once in your next run.
            </p>
          </div>
        )}
        {!result.won && savedPower && (
          <p className="mt-3 text-xs text-slate-400">
            Tip: use your saved power (<kbd className="rounded bg-black/30 px-1">E</kbd>) to survive longer.
          </p>
        )}
        <div className="mt-5 flex flex-col items-stretch gap-2">
          <button
            onClick={onNewAvatar}
            className="rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-5 py-3 text-sm font-black text-white shadow-lg hover:opacity-90"
          >
            🔄 Restart with a new avatar
          </button>
          <div className="flex justify-center gap-2">
            <button
              onClick={onReplay}
              className="rounded-full border border-white/20 px-5 py-2 text-xs font-bold hover:bg-white/10"
            >
              Play again (same avatar)
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-300">
          🏅 {planet} Leaderboard
        </h3>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-slate-400">No scores yet.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {leaderboard.map((e, i) => (
              <li key={i} className="flex justify-between rounded-lg bg-white/5 px-3 py-2">
                <span className="font-mono text-slate-400">#{i + 1}</span>
                <span className="flex-1 px-2 truncate">{e.name}</span>
                <span className="font-bold tabular-nums text-fuchsia-300">{e.score}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-xs text-slate-500">Scores are saved per Reddit post.</p>
      </div>
    </div>
  );
}

function SelfieCapture({
  selfie,
  onCapture,
}: {
  selfie: string | null;
  onCapture: (dataUrl: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }

  async function startCamera() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch (e) {
      setErr((e as Error).message || 'Camera access denied');
    }
  }

  function snap() {
    const v = videoRef.current;
    if (!v) return;
    const size = Math.min(v.videoWidth, v.videoHeight);
    const sx = (v.videoWidth - size) / 2;
    const sy = (v.videoHeight - size) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, sx, sy, size, size, 0, 0, size, size);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopStream();
    onCapture(dataUrl);
  }

  useEffect(() => () => stopStream(), []);

  if (selfie) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-fuchsia-500/40 bg-black/20">
        <img src={selfie} alt="preview" className="h-full w-full object-cover" />
        <button
          onClick={() => {
            onCapture('');
            startCamera();
          }}
          className="absolute bottom-2 right-2 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white hover:bg-black"
        >
          Retake
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-white/20 bg-black/40">
      <video
        ref={videoRef}
        playsInline
        muted
        className={`h-full w-full object-cover ${streaming ? '' : 'hidden'}`}
        style={{ transform: 'scaleX(-1)' }}
      />
      {!streaming && (
        <button
          onClick={startCamera}
          className="flex flex-col items-center text-center text-sm text-slate-300 hover:text-fuchsia-300"
        >
          <span className="text-3xl">🤳</span>
          <span className="mt-2 font-bold">Start camera</span>
          <span className="text-xs text-slate-500">Front-facing selfie</span>
        </button>
      )}
      {streaming && (
        <button
          onClick={snap}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-fuchsia-500 px-5 py-2 text-sm font-black text-white shadow-lg hover:bg-fuchsia-400"
        >
          📸 Capture
        </button>
      )}
      {err && (
        <div className="absolute inset-x-2 bottom-2 rounded bg-red-500/80 p-2 text-xs text-white">{err}</div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QokahApp />
  </StrictMode>
);
