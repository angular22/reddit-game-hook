import { useCallback, useEffect, useState } from 'react';
import type {
  GenerateAvatarRequest,
  GenerateAvatarResponse,
  InitResponse,
  SavePowerRequest,
  SavePowerResponse,
  SaveScoreRequest,
  SaveScoreResponse,
} from '../../shared/api';

export type GameState = {
  loading: boolean;
  error: string | null;
  username: string;
  postId: string | null;
  avatar: string | null;
  planet: string;
  savedPower: string | null;
  powerAvailableToday: boolean;
  streak: { count: number; lastPlayed: string; best: number };
  leaderboard: { name: string; score: number; date: string }[];
};

const initialState: GameState = {
  loading: true,
  error: null,
  username: 'Warrior',
  postId: null,
  avatar: null,
  planet: 'Pluto',
  savedPower: null,
  powerAvailableToday: false,
  streak: { count: 0, lastPlayed: '', best: 0 },
  leaderboard: [],
};

export function useGame() {
  const [state, setState] = useState<GameState>(initialState);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const res = await fetch('/api/init');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as InitResponse;
        if (data.type !== 'init') throw new Error('Unexpected response');
        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            username: data.username,
            postId: data.postId,
            avatar: data.avatar,
            planet: data.planet,
            savedPower: data.savedPower,
            powerAvailableToday: data.powerAvailableToday,
            streak: data.streak,
            leaderboard: data.leaderboard,
          });
        }
      } catch (err) {
        console.error('Failed to init QOKAH', err);
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load game',
          }));
        }
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const generateAvatar = useCallback(async (imageDataUrl: string, planet: string) => {
    const res = await fetch('/api/generate-avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl, planet } as GenerateAvatarRequest),
    });
    if (!res.ok) {
      const data = (await res.json()) as { status?: string; message?: string };
      throw new Error(data.message ?? `HTTP ${res.status}`);
    }
    const data = (await res.json()) as GenerateAvatarResponse;
    const avatarUrl = `data:image/png;base64,${data.imageBase64}`;
    setState((prev) => ({ ...prev, avatar: avatarUrl, planet }));
    return avatarUrl;
  }, []);

  const saveScore = useCallback(async (payload: SaveScoreRequest) => {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = (await res.json()) as { status?: string; message?: string };
      throw new Error(data.message ?? `HTTP ${res.status}`);
    }
    const data = (await res.json()) as SaveScoreResponse;
    setState((prev) => ({ ...prev, leaderboard: data.leaderboard }));
    return data;
  }, []);

  const savePower = useCallback(async (power: string) => {
    const res = await fetch('/api/power', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ power } as SavePowerRequest),
    });
    if (!res.ok) {
      const data = (await res.json()) as { status?: string; message?: string };
      throw new Error(data.message ?? `HTTP ${res.status}`);
    }
    return (await res.json()) as SavePowerResponse;
  }, []);

  const setPlanet = useCallback((planet: string) => {
    setState((prev) => ({ ...prev, planet }));
  }, []);

  const setSelfie = useCallback((_selfie: string | null) => {
    // Selfie is not persisted server-side; only the generated avatar is.
    // This hook keeps the selfie only in memory if needed by the caller.
  }, []);

  return {
    ...state,
    generateAvatar,
    saveScore,
    savePower,
    setPlanet,
    setSelfie,
  };
}
