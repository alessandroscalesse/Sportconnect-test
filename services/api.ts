
import { Match, Player } from "../types";
import { db } from "./database";

/**
 * SIMULATED SERVER API
 * This layer mimics a real backend with network latency, async operations,
 * and standard REST-like responses.
 */

// Network simulation constants
const MIN_LATENCY = 400;
const MAX_LATENCY = 800;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const randomLatency = () => delay(Math.floor(Math.random() * (MAX_LATENCY - MIN_LATENCY + 1) + MIN_LATENCY));

export const api = {
  auth: {
    me: async (): Promise<Player> => {
      await randomLatency();
      // Simulating getting the logged in user from session/token
      const user = await db.getUserById('u1'); 
      if (!user) throw new Error("Unauthorized");
      return user;
    }
  },
  
  matches: {
    list: async (): Promise<Match[]> => {
      await randomLatency(); // Network lag
      return db.getMatches();
    },

    create: async (matchData: Match): Promise<Match> => {
      await randomLatency();
      // In a real app, server validates data here
      if (!matchData.title || !matchData.location) {
        throw new Error("Validation Error: Missing fields");
      }
      return db.createMatch(matchData);
    },

    join: async (matchId: string, userId: string): Promise<Match> => {
      await randomLatency();
      try {
        return await db.joinMatch(matchId, userId);
      } catch (error: any) {
        throw new Error(error.message || "Failed to join match");
      }
    }
  }
};
