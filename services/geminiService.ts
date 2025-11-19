import { GoogleGenAI, Type } from "@google/genai";
import { Player, SportType, Venue } from "../types";

const apiKey = process.env.API_KEY || '';
// Initialize assuming API_KEY is present. In a real app, handle missing keys gracefully.
const ai = new GoogleGenAI({ apiKey });

const MODEL_ID = 'gemini-2.5-flash';

export interface BalancedTeams {
  teamA: string[];
  teamB: string[];
  reasoning: string;
}

/**
 * Balances a list of players into two teams based on skill level and roles.
 */
export const balanceTeamsAI = async (sport: SportType, players: Player[]): Promise<BalancedTeams> => {
  if (!apiKey) {
    // Mock response if no API key for demo purposes
    const half = Math.ceil(players.length / 2);
    return {
      teamA: players.slice(0, half).map(p => p.name),
      teamB: players.slice(half).map(p => p.name),
      reasoning: "Demo Mode: Split sequentially."
    };
  }

  const playerListString = players.map(p => `${p.name} (Rating: ${p.rating}, Roles: ${p.roles?.join(', ') || 'Any'})`).join('\n');

  const prompt = `
    As an expert sports coach, divide these players into two perfectly balanced teams for a ${sport} match.
    Consider their rating and specific roles if applicable.
    
    Players:
    ${playerListString}
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            teamA: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of player names for Team A"
            },
            teamB: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of player names for Team B"
            },
            reasoning: {
              type: Type.STRING,
              description: "Brief explanation of why this balance is optimal"
            }
          },
          required: ["teamA", "teamB", "reasoning"]
        }
      }
    });

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText) as BalancedTeams;
  } catch (error) {
    console.error("AI Balancing Error:", error);
    throw error;
  }
};

/**
 * Analyzes player stats to give improvement tips.
 */
export const analyzePerformanceAI = async (sport: SportType, recentStats: Record<string, number>): Promise<string> => {
  if (!apiKey) return "Connect API Key for personalized coaching advice.";

  const statsStr = JSON.stringify(recentStats);
  
  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: `Act as a professional ${sport} coach. Analyze these recent stats for a player and give 3 concise, actionable bullet points to improve. Stats: ${statsStr}`,
  });

  return response.text || "Analysis unavailable.";
};

/**
 * Finds sports venues using Google Maps Grounding.
 */
export const findVenuesAI = async (query: string, lat: number, lng: number): Promise<{ summary: string, venues: Venue[] }> => {
  if (!apiKey) return { summary: "API Key required for live maps.", venues: [] };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: `Find the best sports venues for this request: "${query}". Provide a short summary recommendation.`,
      config: {
        // @ts-ignore - Suppress TS error for googleMaps tool in this SDK version
        tools: [{ googleMaps: {} } as any],
        toolConfig: {
          // @ts-ignore - Suppress TS error for retrievalConfig in this SDK version
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        } as any
      },
    });

    const summary = response.text || "Here are some places I found.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Extract Google Maps grounding data
    const venues: Venue[] = chunks
      .filter((c: any) => c.web?.uri || c.web?.title) // The grounding chunk structure varies, checking for web/maps data
      .map((c: any) => ({
        title: c.web?.title || "Unknown Venue",
        uri: c.web?.uri || "#",
        address: "View on map for details"
      }));

    return { summary, venues };
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    throw new Error("Failed to fetch locations from Google Maps.");
  }
};