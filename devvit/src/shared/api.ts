export type PlanetId = 'pluto' | 'mars' | 'europa' | 'kepler';

export interface Planet {
  id: PlanetId;
  name: string;
  tagline: string;
  bg: number;
  ground: number;
  accent: number;
  hazardColor: number;
}

export const PLANETS: Planet[] = [
  { id: 'pluto',  name: 'Pluto',    tagline: 'Frozen frontier',   bg: 0x0a0a1f, ground: 0x1a1030, accent: 0xa855f7, hazardColor: 0x38bdf8 },
  { id: 'mars',   name: 'Mars',     tagline: 'Red wastelands',    bg: 0x1a0a05, ground: 0x4a1c0a, accent: 0xf97316, hazardColor: 0xdc2626 },
  { id: 'europa', name: 'Europa',   tagline: 'Ice ocean moon',    bg: 0x061225, ground: 0x0e2a4d, accent: 0x22d3ee, hazardColor: 0xfbbf24 },
  { id: 'kepler', name: 'Kepler-9', tagline: 'Alien jungle',      bg: 0x05130a, ground: 0x0e3d1f, accent: 0x22c55e, hazardColor: 0xec4899 },
];

export interface InitResponse {
  username: string | null;
  avatarUrl: string | null;
}
