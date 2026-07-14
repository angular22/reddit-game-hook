import { useEffect, useRef, useState } from 'react';
import type { GameResult } from './tokah-game';

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

const DEFAULT_AVATAR = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="space" cx="50%" cy="20%" r="80%"><stop offset="0" stop-color="#38bdf8" stop-opacity="0.45"/><stop offset="0.5" stop-color="#031525"/><stop offset="1" stop-color="#020617"/></radialGradient>
    <linearGradient id="armor" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#86efac"/><stop offset="0.38" stop-color="#38bdf8"/><stop offset="1" stop-color="#052e2b"/></linearGradient>
    <filter id="softGlow"><feGaussianBlur stdDeviation="18" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="1024" height="1024" fill="url(#space)"/>
  <circle cx="512" cy="378" r="268" fill="none" stroke="#38bdf8" stroke-width="18" opacity="0.55" filter="url(#softGlow)"/>
  <circle cx="512" cy="284" r="150" fill="#f1c8a0"/><path d="M360 276c18-118 124-174 238-126 64 28 94 88 72 156-62-54-146-52-214-24-34 14-66 14-96-6Z" fill="#172554"/>
  <circle cx="462" cy="302" r="14" fill="#0f172a"/><circle cx="562" cy="302" r="14" fill="#0f172a"/><path d="M470 384c28 24 58 24 86 0" fill="none" stroke="#7f1d1d" stroke-width="16" stroke-linecap="round"/>
  <path d="M248 914c34-210 150-328 264-328s230 118 264 328H248Z" fill="url(#armor)" stroke="#86efac" stroke-width="10"/>
  <path d="M366 618 512 782l146-164 54 122-94 192H406l-94-192 54-122Z" fill="url(#armor)" stroke="#38bdf8" stroke-width="8"/>
  <path d="M512 624 452 770h120l-60-146Z" fill="#86efac" opacity="0.88" filter="url(#softGlow)"/>
  <path d="M210 846h604" stroke="#86efac" stroke-width="12" opacity="0.75"/><text x="512" y="956" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="#86efac" letter-spacing="4">EARTH WARRIOR</text>
</svg>`)}`;

type Screen = 'intro' | 'planet' | 'generating' | 'play' | 'result';

const STORE = {
  avatar: 'qokah_avatar_v1',
  selfie: 'qokah_selfie_v1',
  planet: 'qokah_planet_v1',
  power: 'qokah_saved_power_v1',
  scores: 'qokah_scores_v1',
  streak: 'qokah_streak_v1',
};

type Streak = { count: number; lastPlayed: string; best: number };

function todayUtc() { return new Date().toISOString().slice(0, 10); }
function yesterday(d: string) {
  const x = new Date(d + 'T00:00:00Z');
  x.setUTCDate(x.getUTCDate() - 1);
  return x.toISOString().slice(0, 10);
}
function loadStreak(): Streak {
  try { return JSON.parse(localStorage.getItem(STORE.streak) ?? '') || { count: 0, lastPlayed: '', best: 0 }; }
  catch { return { count: 0, lastPlayed: '', best: 0 }; }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('intro');
  const [selfie, setSelfie] = useState<string | null>(null);
  const [planet, setPlanet] = useState<string>('Earth');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedPower, setSavedPower] = useState<string | null>(null);
  const [powerAvailableToday, setPowerAvailableToday] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [streak, setStreak] = useState<Streak>({ count: 0, lastPlayed: '', best: 0 });
  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number; date: string }[]>([]);

  useEffect(() => {
    try {
      const a = localStorage.getItem(STORE.avatar);
      const s = localStorage.getItem(STORE.selfie);
      const p = localStorage.getItem(STORE.planet);
      if (a) setAvatar(a);
      if (s) setSelfie(s);
      if (p) setPlanet(p);
      const saved = localStorage.getItem(STORE.power);
      if (saved) {
        const parsed = JSON.parse(saved) as { power: string; date: string };
        setSavedPower(parsed.power);
        setPowerAvailableToday(parsed.date !== todayUtc());
      }
      setStreak(loadStreak());
      setLeaderboard(JSON.parse(localStorage.getItem(STORE.scores) ?? '[]'));
    } catch { /* ignore */ }
  }, []);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('Image too large (max 5MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSelfie(dataUrl);
      try { localStorage.setItem(STORE.selfie, dataUrl); } catch {}
    };
    reader.readAsDataURL(f);
  }

  async function handleGenerate() {
    if (!selfie) {
      useDefaultAvatar();
      return;
    }
    setScreen('generating');
    setError(null);
    try {
      const res = await fetch('/api/generate-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: selfie, planet }),
      });
      const json = await res.json() as { dataUrl?: string; error?: string };
      const dataUrl = json.dataUrl ?? DEFAULT_AVATAR;
      setAvatar(dataUrl);
      try {
        localStorage.setItem(STORE.avatar, dataUrl);
        localStorage.setItem(STORE.planet, planet);
      } catch {}
      setScreen('play');
    } catch (e) {
      setAvatar(DEFAULT_AVATAR);
      try {
        localStorage.setItem(STORE.avatar, DEFAULT_AVATAR);
        localStorage.setItem(STORE.planet, 'Earth');
      } catch {}
      console.warn('Avatar gen failed:', (e as Error).message);
      setScreen('play');
    }
  }

  function useDefaultAvatar() {
    setPlanet('Earth');
    setAvatar(DEFAULT_AVATAR);
    setSelfie(null);
    try {
      localStorage.setItem(STORE.avatar, DEFAULT_AVATAR);
      localStorage.setItem(STORE.planet, 'Earth');
      localStorage.removeItem(STORE.selfie);
    } catch {}
    setScreen('play');
  }

  function handleFinished(r: GameResult) {
    setResult(r);
    const entry = { name: `${planet} Warrior`, score: r.score, date: todayUtc() };
    const next = [...leaderboard, entry].sort((a, b) => b.score - a.score).slice(0, 10);
    setLeaderboard(next);
    localStorage.setItem(STORE.scores, JSON.stringify(next));
    if (r.powerUnlocked && r.won) {
      const payload = { power: r.powerUnlocked, date: todayUtc() };
      localStorage.setItem(STORE.power, JSON.stringify(payload));
      setSavedPower(r.powerUnlocked);
      setPowerAvailableToday(false);
    }
    const prev = loadStreak();
    const t = todayUtc();
    let c = 1;
    if (prev.lastPlayed === t) c = prev.count;
    else if (prev.lastPlayed === yesterday(t)) c = prev.count + 1;
    const s = { count: c, lastPlayed: t, best: Math.max(prev.best, r.score) };
    localStorage.setItem(STORE.streak, JSON.stringify(s));
    setStreak(s);
    setScreen('result');
  }

  return (
    <div className="wrap">
      <header className="header">
        <h1 className="brand">QOKAH</h1>
        <div className="streaks">
          <span>🔥 {streak.count} day streak</span>
          <span>⭐ {streak.best} best</span>
        </div>
      </header>
      <p className="tagline">Your Avatar Creates History.</p>

      {screen === 'intro' && (
        <IntroScreen
          onNext={() => setScreen('planet')}
          avatar={avatar}
          savedPower={savedPower}
          powerAvailableToday={powerAvailableToday}
        />
      )}
      {screen === 'planet' && (
        <PlanetScreen
          selfie={selfie}
          onFile={onFile}
          onSelfie={(d) => {
            setSelfie(d);
            try { d ? localStorage.setItem(STORE.selfie, d) : localStorage.removeItem(STORE.selfie); } catch {}
          }}
          planet={planet}
          setPlanet={setPlanet}
          onGenerate={handleGenerate}
          onDefaultAvatar={useDefaultAvatar}
          error={error}
          existingAvatar={avatar}
          onSkipGenerate={() => avatar && setScreen('play')}
        />
      )}
      {screen === 'generating' && <GeneratingScreen />}
      {screen === 'play' && (
        <PlayScreen
          avatar={avatar}
          savedPower={powerAvailableToday ? savedPower : null}
          onFinished={handleFinished}
        />
      )}
      {screen === 'result' && result && (
        <ResultScreen
          result={result}
          planet={planet}
          leaderboard={leaderboard}
          savedPower={savedPower}
          avatar={avatar}
          onReplay={() => { setResult(null); setScreen('play'); }}
          onNewAvatar={() => {
            setSelfie(null); setAvatar(null);
            try { localStorage.removeItem(STORE.selfie); localStorage.removeItem(STORE.avatar); } catch {}
            setResult(null); setScreen('planet');
          }}
        />
      )}
    </div>
  );
}

function IntroScreen({ onNext, avatar, savedPower, powerAvailableToday }: {
  onNext: () => void; avatar: string | null; savedPower: string | null; powerAvailableToday: boolean;
}) {
  return (
    <div className="card card-lg">
      <img src="/images/tokah-logo.png" alt="QOKAH" style={{ margin: '-8px auto 8px', maxWidth: 320, width: '100%', height: 'auto', filter: 'drop-shadow(0 0 30px rgba(217,70,239,0.35))' }} />
      {avatar
        ? <img src={avatar} alt="Your Qokah avatar" className="avatar-lg" />
        : <div className="avatar-placeholder">👤</div>}
      <p style={{ marginTop: 16, fontSize: 14, color: '#94a3b8' }}>
        Snap a selfie → pick your planet → fight aliens, collect crystals, and unlock a <span style={{ color: '#f0abfc' }}>hidden power</span> only you carry into tomorrow's run.
      </p>
      {powerAvailableToday && savedPower && (
        <div className="hint-power">
          ⚡ You unlocked <b>{savedPower}</b> yesterday. Press <kbd>E</kbd> in-game to use it once today.
        </div>
      )}
      <button onClick={onNext} className="btn-primary" style={{ marginTop: 24 }}>
        {avatar ? 'Continue' : 'Begin'}
      </button>
    </div>
  );
}

function PlanetScreen({
  selfie, onFile, onSelfie, planet, setPlanet, onGenerate, onDefaultAvatar, error, existingAvatar, onSkipGenerate,
}: {
  selfie: string | null;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelfie: (dataUrl: string) => void;
  planet: string;
  setPlanet: (p: string) => void;
  onGenerate: () => void;
  onDefaultAvatar: () => void;
  error: string | null;
  existingAvatar: string | null;
  onSkipGenerate: () => void;
}) {
  return (
    <div className="grid-2">
      <div className="card">
        <h3 className="step-title">1. Take a selfie</h3>
        <SelfieCapture selfie={selfie} onCapture={onSelfie} />
        {!selfie && (
          <label className="file-label">
            or choose from gallery
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
          </label>
        )}
        {existingAvatar && !selfie && (
          <button onClick={onSkipGenerate} className="btn-ghost" style={{ width: '100%', marginTop: 12 }}>
            Use existing avatar
          </button>
        )}
      </div>

      <div className="card">
        <h3 className="step-title">2. Choose your planet</h3>
        <div className="planet-grid">
          {PLANETS.map((p) => (
            <button
              key={p.name}
              onClick={() => setPlanet(p.name)}
              className={`planet-btn ${planet === p.name ? 'active' : ''}`}
              title={p.name}
            >
              <span className="planet-glyph" style={{ color: p.color }}>{p.emoji}</span>
              <span style={{ marginTop: 2 }}>{p.name}</span>
              {p.featured && <span className="hot-badge">HOT</span>}
            </button>
          ))}
        </div>
        <p style={{ marginTop: 12, fontSize: 12, color: '#94a3b8' }}>Pluto is today's active battle world.</p>
        <button
          onClick={onGenerate}
          className="btn-primary block"
          style={{ marginTop: 16 }}
        >
          {selfie ? `Forge my ${planet} avatar` : 'Use default Earth avatar'}
        </button>
        <button onClick={onDefaultAvatar} className="btn-ghost block" style={{ marginTop: 10 }}>
          Select default Earth avatar
        </button>
        {error && <p className="err-msg">{error}</p>}
      </div>
    </div>
  );
}

function GeneratingScreen() {
  return (
    <div className="card" style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center', padding: 40 }}>
      <div className="spinner" />
      <p style={{ marginTop: 16, fontWeight: 700 }}>Forging your cosmic avatar…</p>
      <p style={{ marginTop: 4, fontSize: 12, color: '#94a3b8' }}>This can take 10–20 seconds.</p>
    </div>
  );
}

function PlayScreen({ avatar, savedPower, onFinished }: {
  avatar: string | null; savedPower: string | null; onFinished: (r: GameResult) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<{ destroy: (r: boolean) => void } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!avatar) { setReady(true); return; }
    const img = new Image();
    img.onload = () => { if (!cancelled) setReady(true); };
    img.onerror = () => { if (!cancelled) setReady(true); };
    img.src = avatar;
    return () => { cancelled = true; };
  }, [avatar]);

  useEffect(() => {
    if (!ready || !hostRef.current) return;
    let disposed = false;
    let localGame: { destroy: (r: boolean) => void } | null = null;
    const base64 = avatar?.startsWith('data:') ? avatar.split(',')[1] : avatar;
    import('./tokah-game').then(({ createGame }) => {
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
      <div className="game-host">
        <div ref={hostRef} className="frame" />
        {avatar && (
          <div className="you-badge">
            <img src={avatar} alt="you" />
            <span>You</span>
          </div>
        )}
      </div>
      <div className="controls-row">
        <div>⚔️ <b>SPACE</b> attack</div>
        <div>🕹 <b>WASD / Arrows</b> move + jump</div>
        <div>💎 Fill <b style={{ color: '#f0abfc' }}>Hidden Power</b> → boss</div>
      </div>
      {savedPower && (
        <p style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: '#fbbf24' }}>
          ⚡ Press <kbd>E</kbd> to unleash yesterday's <b>{savedPower}</b> (one-time use)
        </p>
      )}
    </div>
  );
}

function ResultScreen({ result, planet, leaderboard, savedPower, avatar, onReplay, onNewAvatar }: {
  result: GameResult; planet: string; leaderboard: { name: string; score: number; date: string }[];
  savedPower: string | null; avatar: string | null; onReplay: () => void; onNewAvatar: () => void;
}) {
  return (
    <div className="grid-2">
      <div className={`result-panel ${result.won ? 'won' : 'lost'}`}>
        {avatar && (
          <img src={avatar} alt="Your avatar" className={`result-avatar ${result.won ? 'gold' : ''}`} />
        )}
        <div style={{ fontSize: 48 }}>{result.won ? '🏆' : '💀'}</div>
        <h2 style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>{result.won ? 'Boss Defeated!' : 'You Fell'}</h2>
        <p className="big-score">{result.score}</p>
        <div className="stat-row">
          <div>💎 {result.crystals}</div>
          <div>⏱ {(result.timeMs / 1000).toFixed(1)}s</div>
          <div>🪐 {planet}</div>
        </div>
        {result.won && result.powerUnlocked && (
          <div className="power-earned">
            <p className="label">Hidden Power Unlocked</p>
            <p className="name">⚡ {result.powerUnlocked}</p>
            <p style={{ marginTop: 4, fontSize: 12, color: '#fde68a' }}>Come back tomorrow — press <kbd>E</kbd> to use it once in your next run.</p>
          </div>
        )}
        {!result.won && savedPower && (
          <p style={{ marginTop: 12, fontSize: 12, color: '#94a3b8' }}>
            Tip: use your saved power (<kbd>E</kbd>) to survive longer.
          </p>
        )}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onNewAvatar} className="btn-primary" style={{ padding: '12px 20px' }}>
            🔄 Restart with a new avatar
          </button>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            <button onClick={onReplay} className="btn-ghost">Play again (same avatar)</button>
          </div>
        </div>
      </div>

      <div className="card leaderboard">
        <h3 className="step-title">🏅 {planet} Leaderboard</h3>
        {leaderboard.length === 0 ? (
          <p style={{ fontSize: 14, color: '#94a3b8' }}>No scores yet.</p>
        ) : (
          <ol>
            {leaderboard.map((e, i) => (
              <li key={i}>
                <span className="rank">#{i + 1}</span>
                <span className="name">{e.name}</span>
                <span className="score">{e.score}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function SelfieCapture({ selfie, onCapture }: { selfie: string | null; onCapture: (dataUrl: string) => void }) {
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
      <div className="selfie-box filled">
        <img src={selfie} alt="preview" />
        <button onClick={() => { onCapture(''); startCamera(); }} className="retake-btn">Retake</button>
      </div>
    );
  }

  return (
    <div className="selfie-box">
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ display: streaming ? 'block' : 'none', transform: 'scaleX(-1)' }}
      />
      {!streaming && (
        <button onClick={startCamera} className="selfie-start">
          <span style={{ fontSize: 32 }}>🤳</span>
          <span style={{ marginTop: 8, fontWeight: 700 }}>Start camera</span>
          <span style={{ fontSize: 11, color: '#64748b' }}>Front-facing selfie</span>
        </button>
      )}
      {streaming && (
        <button onClick={snap} className="capture-btn">📸 Capture</button>
      )}
      {err && (
        <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8, background: 'rgba(239,68,68,0.85)', padding: 8, borderRadius: 6, fontSize: 11 }}>
          {err}
        </div>
      )}
    </div>
  );
}
