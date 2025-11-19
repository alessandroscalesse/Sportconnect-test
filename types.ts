export enum SportType {
  SOCCER = 'Soccer',
  TENNIS = 'Tennis',
  BASKETBALL = 'Basketball',
  PADEL = 'Padel',
  VOLLEYBALL = 'Volleyball'
}

export enum MatchStatus {
  OPEN = 'Open',
  FULL = 'Full',
  COMPLETED = 'Completed'
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  rating: number; // 1-10
  roles?: string[]; // e.g., "Goalkeeper", "Striker"
}

export interface Match {
  id: string;
  sport: SportType;
  title: string;
  date: string;
  time: string;
  location: string;
  currentPlayers: number;
  maxPlayers: number;
  status: MatchStatus;
  price?: number;
  organizer: Player;
  players: Player[];
}

export interface LeagueRanking {
  rank: number;
  player: Player;
  points: number;
  winRate: number;
}

export interface StatPoint {
  subject: string;
  A: number;
  fullMark: number;
}

export interface Venue {
  title: string;
  uri: string;
  address?: string;
}