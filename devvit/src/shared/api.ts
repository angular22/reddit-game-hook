export type InitResponse = {
  type: 'init';
  postId: string;
  username: string;
  avatar: string | null;
  planet: string;
  savedPower: string | null;
  powerAvailableToday: boolean;
  streak: { count: number; lastPlayed: string; best: number };
  leaderboard: { name: string; score: number; date: string }[];
};

export type GenerateAvatarRequest = {
  imageDataUrl: string;
  planet: string;
};

export type GenerateAvatarResponse = {
  type: 'avatar';
  imageBase64: string;
};

export type SaveScoreRequest = {
  score: number;
  crystals: number;
  timeMs: number;
  powerUnlocked: string | null;
  won: boolean;
  planet: string;
};

export type SaveScoreResponse = {
  type: 'score';
  saved: boolean;
  leaderboard: { name: string; score: number; date: string }[];
};

export type SavePowerRequest = {
  power: string;
};

export type SavePowerResponse = {
  type: 'power';
  saved: boolean;
};
