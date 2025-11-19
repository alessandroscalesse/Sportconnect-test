
import { Match, MatchStatus, Player, SportType, LeagueRanking } from "../types";

// --- Seed Data ---
const SEED_USER: Player = {
  id: 'u1',
  name: 'Alessandro Rossi',
  avatar: 'https://picsum.photos/id/64/100/100',
  rating: 8.5,
  roles: ['Striker', 'Winger']
};

const SEED_PLAYERS: Player[] = [
  SEED_USER,
  { id: 'u2', name: 'Marco V.', avatar: 'https://picsum.photos/id/32/100/100', rating: 7.0, roles: ['Defender'] },
  { id: 'u3', name: 'Luca B.', avatar: 'https://picsum.photos/id/55/100/100', rating: 9.0, roles: ['Midfielder'] },
  { id: 'u4', name: 'Giovanni', avatar: 'https://picsum.photos/id/41/100/100', rating: 6.5, roles: ['Goalkeeper'] },
  { id: 'u5', name: 'Stefano', avatar: 'https://picsum.photos/id/33/100/100', rating: 7.5, roles: ['Defender'] },
];

const SEED_MATCHES: Match[] = [
  {
    id: 'm1',
    sport: SportType.SOCCER,
    title: '5v5 Friendly Night',
    date: 'Today',
    time: '20:00',
    location: 'Milano Football Center',
    currentPlayers: 4,
    maxPlayers: 10,
    status: MatchStatus.OPEN,
    price: 7,
    organizer: SEED_USER,
    players: [SEED_USER, SEED_PLAYERS[1], SEED_PLAYERS[2], SEED_PLAYERS[3]],
  },
  {
    id: 'm2',
    sport: SportType.PADEL,
    title: 'Intermediate Padel Match',
    date: 'Tomorrow',
    time: '18:30',
    location: 'Padel Club Roma',
    currentPlayers: 1,
    maxPlayers: 4,
    status: MatchStatus.OPEN,
    price: 12,
    organizer: SEED_PLAYERS[1],
    players: [SEED_PLAYERS[1]],
  }
];

// --- Database Schema ---
interface DbSchema {
  users: Player[];
  matches: Match[];
  rankings: LeagueRanking[];
}

class MockDatabase {
  private data: DbSchema;
  private readonly STORAGE_KEY = 'sportconnect_db_v1';

  constructor() {
    this.data = this.load();
  }

  private load(): DbSchema {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Initialize with seed data if empty
    const initialData: DbSchema = {
      users: SEED_PLAYERS,
      matches: SEED_MATCHES,
      rankings: [] // Mock rankings generated dynamically usually
    };
    this.save(initialData);
    return initialData;
  }

  private save(data: DbSchema) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    this.data = data;
  }

  // --- Table Operations ---

  public async getUsers(): Promise<Player[]> {
    return [...this.data.users];
  }

  public async getUserById(id: string): Promise<Player | undefined> {
    return this.data.users.find(u => u.id === id);
  }

  public async getMatches(): Promise<Match[]> {
    return [...this.data.matches];
  }

  public async createMatch(match: Match): Promise<Match> {
    const newMatches = [match, ...this.data.matches];
    this.save({ ...this.data, matches: newMatches });
    return match;
  }

  public async updateMatch(updatedMatch: Match): Promise<Match> {
    const newMatches = this.data.matches.map(m => m.id === updatedMatch.id ? updatedMatch : m);
    this.save({ ...this.data, matches: newMatches });
    return updatedMatch;
  }

  public async joinMatch(matchId: string, userId: string): Promise<Match> {
    const matchIndex = this.data.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) throw new Error("Match not found");

    const match = this.data.matches[matchIndex];
    const user = this.data.users.find(u => u.id === userId);
    if (!user) throw new Error("User not found");

    const isJoined = match.players.some(p => p.id === userId);

    let updatedMatch: Match;

    if (isJoined) {
      // Leave logic
      const newPlayers = match.players.filter(p => p.id !== userId);
      updatedMatch = {
        ...match,
        players: newPlayers,
        currentPlayers: newPlayers.length,
        status: MatchStatus.OPEN
      };
    } else {
      // Join logic
      if (match.currentPlayers >= match.maxPlayers) throw new Error("Match is full");
      const newPlayers = [...match.players, user];
      updatedMatch = {
        ...match,
        players: newPlayers,
        currentPlayers: newPlayers.length,
        status: newPlayers.length >= match.maxPlayers ? MatchStatus.FULL : MatchStatus.OPEN
      };
    }

    const newMatches = [...this.data.matches];
    newMatches[matchIndex] = updatedMatch;
    this.save({ ...this.data, matches: newMatches });
    
    return updatedMatch;
  }
}

export const db = new MockDatabase();
