
import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { MatchCard } from './components/MatchCard';
import { SportType, Match, MatchStatus, Player, LeagueRanking, StatPoint, Venue } from './types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { balanceTeamsAI, analyzePerformanceAI, findVenuesAI, BalancedTeams } from './services/geminiService';
import { api } from './services/api';
import { Loader2, Map as MapIcon, Trophy, Star, TrendingUp, Shield, Users, MapPin, Wifi, WifiOff, Navigation as NavIcon, ExternalLink } from 'lucide-react';

// --- Mock Data (Kept for rankings/stats only as these would be separate API endpoints) ---
const RANKINGS: LeagueRanking[] = [
  { rank: 1, player: { id: 'x1', name: 'Luca B.', avatar: 'https://picsum.photos/id/55/100/100', rating: 9, }, points: 1250, winRate: 78 },
  { rank: 2, player: { id: 'u1', name: 'Alessandro Rossi', avatar: 'https://picsum.photos/id/64/100/100', rating: 8.5 }, points: 1180, winRate: 65 },
  { rank: 3, player: { id: 'x2', name: 'Marco V.', avatar: 'https://picsum.photos/id/32/100/100', rating: 7 }, points: 1050, winRate: 55 },
  { rank: 4, player: { id: 'x3', name: 'Giovanni', avatar: 'https://picsum.photos/id/41/100/100', rating: 6.5 }, points: 980, winRate: 50 },
];

const STATS_DATA: StatPoint[] = [
  { subject: 'Speed', A: 120, fullMark: 150 },
  { subject: 'Power', A: 98, fullMark: 150 },
  { subject: 'Stamina', A: 86, fullMark: 150 },
  { subject: 'Technique', A: 99, fullMark: 150 },
  { subject: 'Tactics', A: 85, fullMark: 150 },
  { subject: 'Spirit', A: 65, fullMark: 150 },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  
  // Application State
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  
  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null); // stores ID of match being modified
  const [error, setError] = useState<string | null>(null);

  // AI State
  const [balancing, setBalancing] = useState(false);
  const [aiTeams, setAiTeams] = useState<BalancedTeams | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);

  // Maps State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [foundVenues, setFoundVenues] = useState<Venue[]>([]);
  const [mapSummary, setMapSummary] = useState<string>("");
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Form State
  const [createForm, setCreateForm] = useState({
    sport: SportType.SOCCER,
    title: '',
    date: '',
    time: '',
    location: '',
    maxPlayers: 10,
    price: 0
  });

  // --- Initialization ---
  useEffect(() => {
    const initApp = async () => {
      try {
        setIsLoading(true);
        // Parallel fetching
        const [user, matchList] = await Promise.all([
          api.auth.me(),
          api.matches.list()
        ]);
        
        setCurrentUser(user);
        setMatches(matchList);
        
        // Get Geolocation
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (err) => console.log("Geo permission denied", err)
            );
        }
      } catch (err) {
        setError("Failed to connect to SportConnect Server.");
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  const handleJoinMatch = async (matchId: string) => {
    if (!currentUser) return;
    setIsActionLoading(matchId);
    try {
      // Optimistic update could go here, but we'll wait for server for accuracy
      const updatedMatch = await api.matches.join(matchId, currentUser.id);
      setMatches(prev => prev.map(m => m.id === matchId ? updatedMatch : m));
    } catch (err) {
      alert("Error joining match: " + err);
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleCreateMatch = async () => {
    if (!currentUser || !createForm.title || !createForm.location) {
      alert("Please fill in at least Title and Location.");
      return;
    }

    const newMatchData: Match = {
      id: 'm' + Date.now(),
      sport: createForm.sport,
      title: createForm.title,
      date: createForm.date || 'Today',
      time: createForm.time || '20:00',
      location: createForm.location,
      currentPlayers: 1,
      maxPlayers: createForm.maxPlayers,
      status: MatchStatus.OPEN,
      price: createForm.price,
      organizer: currentUser,
      players: [currentUser]
    };

    setIsLoading(true); // Show global loading or button loading
    try {
      const createdMatch = await api.matches.create(newMatchData);
      setMatches(prev => [createdMatch, ...prev]);
      
      // Reset and navigate
      setCreateForm({
        sport: SportType.SOCCER,
        title: '',
        date: '',
        time: '',
        location: '',
        maxPlayers: 10,
        price: 0
      });
      setAiTeams(null);
      setActiveTab('home');
    } catch (err) {
      alert("Failed to create match");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBalanceTeams = async () => {
    setBalancing(true);
    try {
        // Use current matches players or seed players for demo if creating new
        const playersToBalance = matches[0]?.players || []; 
        if (playersToBalance.length < 2) {
            const result = await balanceTeamsAI(createForm.sport, [
                currentUser!, 
                { id: 'x', name: 'Player 2', rating: 5, avatar: '' } as Player,
                { id: 'y', name: 'Player 3', rating: 7, avatar: '' } as Player,
                { id: 'z', name: 'Player 4', rating: 6, avatar: '' } as Player
            ]);
            setAiTeams(result);
        } else {
            const result = await balanceTeamsAI(createForm.sport, playersToBalance);
            setAiTeams(result);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setBalancing(false);
    }
  };

  const handleAnalyze = async () => {
      setAnalyzing(true);
      try {
          const res = await analyzePerformanceAI(SportType.SOCCER, { goals: 5, assists: 2, passAccuracy: 88, matchesPlayed: 10 });
          setAiAnalysis(res);
      } catch (e) {
          console.error(e);
      } finally {
          setAnalyzing(false);
      }
  }

  const handleSearchVenues = async () => {
      if (!searchQuery.trim()) return;
      if (!userLocation) {
          alert("Please enable GPS to find courts near you.");
          return;
      }
      
      setIsSearchingMap(true);
      setFoundVenues([]);
      setMapSummary("");

      try {
          const result = await findVenuesAI(searchQuery, userLocation.lat, userLocation.lng);
          setMapSummary(result.summary);
          setFoundVenues(result.venues);
      } catch (e) {
          console.error(e);
          setMapSummary("Failed to search for venues.");
      } finally {
          setIsSearchingMap(false);
      }
  }

  // --- Components ---

  const renderLoadingScreen = () => (
    <div className="h-screen flex flex-col items-center justify-center bg-dark">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-gray-700 rounded-full"></div>
        <div className="w-16 h-16 border-4 border-primary rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
      </div>
      <p className="mt-4 text-primary font-bold tracking-widest animate-pulse">CONNECTING...</p>
    </div>
  );

  const renderHome = () => (
    <div className="pb-24">
      <header className="p-6 pt-12 bg-gradient-to-b from-green-900/40 to-dark">
        <div className="flex justify-between items-center mb-6">
            <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold">Hello, {currentUser?.name.split(' ')[0]}!</h1>
                  <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full border border-green-500/30 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> ONLINE
                  </span>
                </div>
                <p className="text-gray-400 text-sm">Find your next challenge.</p>
            </div>
            {currentUser && (
                 <img src={currentUser.avatar} alt="Profile" className="w-12 h-12 rounded-full border-2 border-primary object-cover" />
            )}
        </div>
        
        {/* Quick Filter Pills */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {Object.values(SportType).map(sport => (
                <button key={sport} className="px-4 py-2 rounded-full bg-gray-800 text-sm font-medium whitespace-nowrap hover:bg-primary hover:text-dark transition-colors border border-gray-700 hover:border-primary">
                    {sport}
                </button>
            ))}
        </div>
      </header>

      <div className="px-4">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Live Matches</h2>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Wifi size={12} />
              Server Connected
            </div>
        </div>
        
        {matches.length === 0 ? (
             <div className="text-center py-10 text-gray-500 bg-card rounded-2xl border border-gray-800 border-dashed">
                No matches found nearby.
                <br/>
                <button onClick={() => setActiveTab('create')} className="text-primary mt-2 font-bold hover:underline">Create one?</button>
             </div>
        ) : (
            matches.map(match => (
                <div key={match.id} className="relative">
                   <MatchCard 
                      match={match} 
                      currentUser={currentUser!}
                      onJoin={handleJoinMatch} 
                  />
                  {isActionLoading === match.id && (
                    <div className="absolute inset-0 bg-dark/80 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center">
                      <Loader2 className="animate-spin text-primary" />
                    </div>
                  )}
                </div>
            ))
        )}
      </div>
    </div>
  );

  const renderSearch = () => (
    <div className="h-screen pb-24 flex flex-col">
        <div className="p-4 pt-12 relative z-20 bg-dark/95 backdrop-blur">
            <h2 className="text-2xl font-bold mb-1">Find Courts</h2>
            <p className="text-xs text-gray-400 mb-4">Powered by Google Maps & Gemini</p>
            
            <div className="bg-card flex items-center p-3 rounded-xl shadow-lg border border-gray-800 focus-within:border-primary transition-colors">
                <MapIcon className="text-gray-400 mr-3" size={20} />
                <input 
                    type="text" 
                    placeholder="E.g., Soccer fields in Milan..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchVenues()}
                    className="bg-transparent outline-none text-white w-full placeholder-gray-500 text-sm" 
                />
                <button 
                    onClick={handleSearchVenues}
                    disabled={isSearchingMap}
                    className="bg-primary text-dark p-2 rounded-lg font-bold text-xs hover:bg-green-400 disabled:opacity-50"
                >
                    {isSearchingMap ? <Loader2 className="animate-spin" size={16}/> : 'Search'}
                </button>
            </div>
            {!userLocation && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                    <NavIcon size={10}/> Enable Location access to find courts nearby.
                </p>
            )}
        </div>
        
        <div className="flex-1 overflow-y-auto px-4">
            {isSearchingMap ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <Loader2 className="animate-spin mb-4" size={32} />
                    <p className="text-sm">Scanning area for sports venues...</p>
                </div>
            ) : foundVenues.length > 0 ? (
                <div className="space-y-4 pb-4">
                    {mapSummary && (
                        <div className="bg-gray-800/50 p-3 rounded-lg text-xs text-gray-300 italic border border-gray-700">
                            {mapSummary}
                        </div>
                    )}
                    {foundVenues.map((venue, idx) => (
                        <div key={idx} className="bg-card rounded-xl border border-gray-800 p-4 shadow-lg flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-white mb-1">{venue.title}</h3>
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                    <MapPin size={12} />
                                    {venue.address || "See map for location"}
                                </p>
                            </div>
                            <a 
                                href={venue.uri} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="bg-gray-700 hover:bg-gray-600 p-3 rounded-full transition-colors"
                            >
                                <ExternalLink size={20} className="text-primary" />
                            </a>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30 mt-[-50px]">
                    <MapIcon size={64} className="mb-4 text-gray-500"/>
                    <p className="text-sm text-gray-400 text-center max-w-xs">
                        Search for sports centers, tennis courts, or gyms to organize your next match.
                    </p>
                </div>
            )}
        </div>
    </div>
  );

  const renderCreate = () => (
    <div className="p-4 pt-12 pb-24 overflow-y-auto h-screen">
        <h2 className="text-2xl font-bold mb-6">Organize Match</h2>
        
        <div className="space-y-6">
            {/* Sport Selection */}
            <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">Select Sport</label>
                <div className="flex gap-3 overflow-x-auto no-scrollbar">
                    {Object.values(SportType).map(s => (
                        <button 
                            key={s} 
                            onClick={() => setCreateForm({...createForm, sport: s})}
                            className={`px-4 py-3 rounded-xl border whitespace-nowrap transition-all ${createForm.sport === s ? 'border-primary bg-primary/20 text-primary font-bold' : 'border-gray-700 bg-card text-gray-400'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Basic Info */}
            <div className="bg-card p-4 rounded-xl border border-gray-800 space-y-4 shadow-lg">
                 <div className="space-y-1">
                    <label className="text-xs text-gray-500 uppercase">Match Title</label>
                    <input 
                        type="text" 
                        value={createForm.title}
                        onChange={(e) => setCreateForm({...createForm, title: e.target.value})}
                        placeholder="Ex: Sunday League Friendly" 
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                 </div>

                 <div className="space-y-1">
                    <label className="text-xs text-gray-500 uppercase">Location</label>
                    <div className="relative">
                        <MapPin size={16} className="absolute left-3 top-3.5 text-gray-500" />
                        <input 
                            type="text"
                            value={createForm.location}
                            onChange={(e) => setCreateForm({...createForm, location: e.target.value})}
                            placeholder="Search venue..." 
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 pl-9 text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 uppercase">Date</label>
                        <input 
                            type="text" 
                            value={createForm.date}
                            onChange={(e) => setCreateForm({...createForm, date: e.target.value})}
                            placeholder="Tomorrow" 
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-primary"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 uppercase">Time</label>
                        <input 
                            type="text" 
                            value={createForm.time}
                            onChange={(e) => setCreateForm({...createForm, time: e.target.value})}
                            placeholder="20:00" 
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-primary"
                        />
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 uppercase">Players Needed</label>
                        <input 
                            type="number" 
                            value={createForm.maxPlayers}
                            onChange={(e) => setCreateForm({...createForm, maxPlayers: parseInt(e.target.value)})}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-primary"
                        />
                    </div>
                     <div className="space-y-1">
                        <label className="text-xs text-gray-500 uppercase">Price (€)</label>
                        <input 
                            type="number" 
                            value={createForm.price}
                            onChange={(e) => setCreateForm({...createForm, price: parseInt(e.target.value)})}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-primary"
                        />
                    </div>
                 </div>
            </div>

            {/* AI Feature */}
            <div className="bg-card p-4 rounded-xl border border-gray-800">
                <div className="flex justify-between items-center mb-2">
                     <h3 className="font-bold flex items-center gap-2">
                        <Star className="text-yellow-400" size={18} /> 
                        AI Team Preview
                    </h3>
                    <span className="bg-primary/20 text-primary text-[10px] px-2 py-1 rounded font-bold border border-primary/30">GEMINI POWERED</span>
                </div>
               
                <p className="text-xs text-gray-400 mb-4">
                    Generate balanced squads based on player stats before publishing.
                </p>
                
                {aiTeams ? (
                    <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-700 animate-in fade-in slide-in-from-bottom-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-secondary font-bold mb-2 text-sm">Team A</h4>
                                <ul className="text-xs text-gray-300 space-y-1">
                                    {aiTeams.teamA.map((p, i) => <li key={i}>• {p}</li>)}
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-primary font-bold mb-2 text-sm">Team B</h4>
                                <ul className="text-xs text-gray-300 space-y-1">
                                    {aiTeams.teamB.map((p, i) => <li key={i}>• {p}</li>)}
                                </ul>
                            </div>
                        </div>
                        <p className="mt-3 text-[10px] text-gray-500 italic border-t border-gray-800 pt-2">{aiTeams.reasoning}</p>
                        <button onClick={() => setAiTeams(null)} className="mt-3 text-xs text-gray-400 hover:text-white underline">Reset AI</button>
                    </div>
                ) : (
                    <button 
                        onClick={handleBalanceTeams}
                        disabled={balancing}
                        className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-bold text-gray-300 flex items-center justify-center gap-2 transition-colors border border-gray-700"
                    >
                        {balancing ? <Loader2 className="animate-spin" size={16} /> : <Shield size={16}/>}
                        Simulate Balance
                    </button>
                )}
            </div>
            
            <button 
                onClick={handleCreateMatch}
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-primary to-green-400 text-dark font-bold rounded-xl text-lg shadow-lg shadow-primary/20 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isLoading ? <Loader2 className="animate-spin" /> : 'Publish Match Event'}
            </button>
        </div>
    </div>
  );

  const renderLeagues = () => (
    <div className="p-4 pt-12 pb-24">
        <div className="flex justify-between items-end mb-6">
            <h2 className="text-2xl font-bold">Leagues</h2>
            <span className="text-primary text-sm font-medium bg-primary/10 px-3 py-1 rounded-full">Season 4</span>
        </div>

        <div className="bg-card rounded-2xl border border-gray-800 overflow-hidden shadow-lg">
            <div className="grid grid-cols-12 gap-2 p-4 border-b border-gray-800 text-xs text-gray-500 font-medium uppercase tracking-wider bg-gray-900/50">
                <div className="col-span-2 text-center">Rank</div>
                <div className="col-span-6">Player</div>
                <div className="col-span-2 text-center">Win%</div>
                <div className="col-span-2 text-center">Pts</div>
            </div>
            {RANKINGS.map((item) => (
                <div key={item.rank} className={`grid grid-cols-12 gap-2 p-4 items-center border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors ${item.rank === 2 ? 'bg-white/5' : ''}`}>
                    <div className="col-span-2 text-center font-bold text-lg">
                        {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : item.rank}
                    </div>
                    <div className="col-span-6 flex items-center gap-3">
                        <img src={item.player.avatar} className="w-8 h-8 rounded-full object-cover" />
                        <span className="font-medium truncate text-sm">{item.player.name}</span>
                    </div>
                    <div className="col-span-2 text-center text-gray-400 text-sm font-mono">{item.winRate}%</div>
                    <div className="col-span-2 text-center font-bold text-primary text-sm font-mono">{item.points}</div>
                </div>
            ))}
        </div>
    </div>
  );

  const renderProfile = () => {
    if (!currentUser) return null;
    return (
        <div className="pb-24 overflow-y-auto h-screen">
            <div className="bg-gradient-to-b from-gray-800 to-dark pt-12 pb-6 px-6 text-center">
                <div className="relative inline-block">
                    <img src={currentUser.avatar} className="w-24 h-24 rounded-full border-4 border-card shadow-2xl mb-4 object-cover" />
                    <div className="absolute bottom-4 right-0 bg-primary text-dark text-[10px] font-bold px-2 py-1 rounded-full border border-dark">PRO</div>
                </div>
                <h2 className="text-2xl font-bold">{currentUser.name}</h2>
                <p className="text-gray-400 text-sm mb-4">Striker • Milan, IT</p>
                
                <div className="flex justify-center gap-8 mt-6">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-white">{currentUser.rating}</div>
                        <div className="text-xs text-gray-500 uppercase">Rating</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-white">124</div>
                        <div className="text-xs text-gray-500 uppercase">Matches</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-white">32</div>
                        <div className="text-xs text-gray-500 uppercase">MVP</div>
                    </div>
                </div>
            </div>

            <div className="p-4">
                <div className="bg-card rounded-2xl p-4 border border-gray-800 mb-6 shadow-lg">
                    <h3 className="font-bold mb-4 flex items-center justify-between">
                        Performance Stats
                        <button className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300">Soccer</button>
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={STATS_DATA}>
                            <PolarGrid stroke="#333" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                            <Radar
                                name={currentUser.name}
                                dataKey="A"
                                stroke="#00E676"
                                strokeWidth={2}
                                fill="#00E676"
                                fillOpacity={0.3}
                            />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-card rounded-2xl p-4 border border-gray-800 relative overflow-hidden shadow-lg">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUp size={100} className="text-secondary"/>
                    </div>
                    <h3 className="font-bold mb-2 relative z-10 flex items-center gap-2">
                        AI Coach Insight
                        <span className="text-[10px] bg-secondary text-white px-1.5 rounded">BETA</span>
                    </h3>
                    <p className="text-xs text-gray-400 mb-4 relative z-10">
                        Get personalized advice based on your recent match data.
                    </p>
                    
                    {aiAnalysis ? (
                        <div className="text-sm text-gray-300 bg-gray-900/80 p-3 rounded-lg border-l-4 border-secondary relative z-10 whitespace-pre-wrap">
                            {aiAnalysis}
                        </div>
                    ) : (
                        <button 
                            onClick={handleAnalyze}
                            disabled={analyzing}
                            className="relative z-10 bg-secondary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors"
                        >
                            {analyzing ? <Loader2 className="animate-spin" size={16}/> : 'Analyze My Game'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-dark text-white font-sans">
      {isLoading ? renderLoadingScreen() : (
        <>
          {error ? (
            <div className="flex h-screen items-center justify-center flex-col text-center p-6">
               <WifiOff size={48} className="text-red-500 mb-4"/>
               <h2 className="text-xl font-bold mb-2">Connection Error</h2>
               <p className="text-gray-400">{error}</p>
               <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-gray-800 rounded-lg">Retry</button>
            </div>
          ) : (
            <>
              {activeTab === 'home' && renderHome()}
              {activeTab === 'search' && renderSearch()}
              {activeTab === 'create' && renderCreate()}
              {activeTab === 'leagues' && renderLeagues()}
              {activeTab === 'profile' && renderProfile()}
              
              <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default App;
