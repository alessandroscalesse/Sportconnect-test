
import React from 'react';
import { MapPin, Calendar, Clock } from 'lucide-react';
import { Match, SportType, Player } from '../types';

interface MatchCardProps {
  match: Match;
  currentUser: Player;
  onJoin: (id: string) => void;
}

const sportColors: Record<SportType, string> = {
  [SportType.SOCCER]: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  [SportType.TENNIS]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  [SportType.BASKETBALL]: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  [SportType.PADEL]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  [SportType.VOLLEYBALL]: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

export const MatchCard: React.FC<MatchCardProps> = ({ match, currentUser, onJoin }) => {
  const isJoined = match.players.some(p => p.id === currentUser.id);

  return (
    <div className="bg-card rounded-2xl p-4 border border-gray-800 shadow-md mb-4">
      <div className="flex justify-between items-start mb-3">
        <div>
            <span className={`px-2 py-1 rounded-md text-xs font-bold border ${sportColors[match.sport]}`}>
                {match.sport}
            </span>
            <h3 className="text-lg font-bold text-white mt-2">{match.title}</h3>
        </div>
        {match.price ? (
             <div className="bg-gray-800 px-3 py-1 rounded-full text-sm font-semibold">
                €{match.price}
             </div>
        ) : (
            <div className="bg-gray-800 px-3 py-1 rounded-full text-sm font-semibold text-green-400">
                Free
             </div>
        )}
      </div>

      <div className="space-y-2 text-gray-400 text-sm mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={16} />
          <span>{match.date}</span>
          <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
          <Clock size={16} />
          <span>{match.time}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={16} />
          <span className="truncate">{match.location}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
        <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
                {match.players.slice(0,3).map((p, i) => (
                    <img key={i} src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full border-2 border-card object-cover" />
                ))}
            </div>
            <div className="text-xs text-gray-400 ml-1">
                <span className="text-white font-bold">{match.currentPlayers}/{match.maxPlayers}</span> Players
            </div>
        </div>
        
        <button 
            onClick={() => onJoin(match.id)}
            disabled={match.status === 'Full' && !isJoined}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                isJoined 
                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
                : match.status === 'Full' 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-secondary text-white hover:bg-blue-600'
            }`}
        >
            {isJoined ? 'Leave' : match.status === 'Full' ? 'Full' : 'Join'}
        </button>
      </div>
    </div>
  );
};
