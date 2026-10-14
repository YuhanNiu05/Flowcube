import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Music, Disc, Headphones, Search, Filter } from "lucide-react";
import { getCurrentUser, getUserMusicDiscs, getUserMusicLibrary, useMusicDisc, unlockSong } from "../lib/supabase";

interface MusicDisc {
  id: string;
  disc_type: 'common' | 'rare' | 'legendary';
  disc_name: string;
  disc_color: string;
  unlocked_at: string;
  is_used: boolean;
}

interface Song {
  id: string;
  song_name: string;
  artist: string;
  genre: string;
  duration: number;
  unlocked_at: string;
  audio_path?: string; // Local audio file path
}

export default function MusicLibrary() {
  const navigate = useNavigate();
  const [musicDiscs, setMusicDiscs] = useState<MusicDisc[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [audio] = useState<HTMLAudioElement>(() => new Audio());

  // Sample songs database with local audio files
  const SONG_DATABASE: Song[] = [
    { id: "1", song_name: "Quiet Starfield", artist: "FlowCube", genre: "ambient", duration: 180, unlocked_at: "", audio_path: "/music/1.mp3" },
    { id: "2", song_name: "Morning Breeze", artist: "FlowCube", genre: "ambient", duration: 200, unlocked_at: "", audio_path: "/music/2.mp3" },
    { id: "3", song_name: "Focus Moments", artist: "FlowCube", genre: "lofi", duration: 165, unlocked_at: "", audio_path: "/music/3.mp3" },
    { id: "4", song_name: "Interstellar Journey", artist: "FlowCube", genre: "electronic", duration: 240, unlocked_at: "", audio_path: "/music/4.mp3" },
    { id: "5", song_name: "Deep Sea Exploration", artist: "FlowCube", genre: "ambient", duration: 220, unlocked_at: "", audio_path: "/music/5.mp3" },
    { id: "6", song_name: "Cosmic Rebirth", artist: "FlowCube", genre: "orchestral", duration: 300, unlocked_at: "", audio_path: "/music/6.mp3" },
    { id: "7", song_name: "End of Time", artist: "FlowCube", genre: "electronic", duration: 280, unlocked_at: "", audio_path: "/music/7.mp3" },
  ];

  useEffect(() => {
    const loadMusicData = async () => {
      const user = await getCurrentUser();
      if (!user) {
        console.log('No user found');
        setLoading(false);
        return;
      }

      console.log('Loading music data for user:', user.id);

      // Load from database
      const discs = await getUserMusicDiscs(user.id);
      const library = await getUserMusicLibrary(user.id);
      
      console.log('Loaded music discs:', discs);
      console.log('Loaded music library:', library);
      
      setMusicDiscs(discs as MusicDisc[]);
      
      // Merge library data with SONG_DATABASE to get audio_path
      const songsWithAudio = library.map((song: any) => {
        const dbSong = SONG_DATABASE.find(s => s.id === song.song_id);
        return {
          ...song,
          audio_path: dbSong?.audio_path || ''
        };
      });
      
      console.log('Songs with audio paths:', songsWithAudio);
      setSongs(songsWithAudio as Song[]);
      
      setLoading(false);
    };

    loadMusicData();
  }, []);

  const handleUseDisc = async (disc: MusicDisc) => {
    if (disc.is_used) return;
    
    // Get random song from database
    const randomSong = SONG_DATABASE[Math.floor(Math.random() * SONG_DATABASE.length)];
    
    // Save to database
    const user = await getCurrentUser();
    if (user) {
      await useMusicDisc(disc.id);
      await unlockSong(user.id, randomSong.id, randomSong.song_name, randomSong.artist, randomSong.genre, randomSong.duration);
    }
    
    // Update local state
    setMusicDiscs(prev => prev.map(d => 
      d.id === disc.id ? { ...d, is_used: true } : d
    ));
    
    setSongs(prev => [...prev, randomSong]);
    
    alert(`🎵 Unlocked! You received: ${randomSong.song_name}`);
  };

  // Audio playback functions
  const playSong = (song: Song) => {
    if (!song.audio_path) {
      alert('⚠️ This song has no audio file yet');
      return;
    }

    if (playingSongId === song.id) {
      // Pause if already playing
      audio.pause();
      setPlayingSongId(null);
    } else {
      // Play new song
      audio.src = song.audio_path;
      audio.play().catch(err => {
        console.error('Playback error:', err);
        alert('⚠️ Audio file missing or failed to load');
      });
      setPlayingSongId(song.id);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audio]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGenreColor = (genre: string) => {
    switch (genre) {
      case 'ambient': return '#3b82f6';
      case 'lofi': return '#f59e0b';
      case 'electronic': return '#8b5cf6';
      case 'orchestral': return '#ec4899';
      default: return '#64748b';
    }
  };

  const filteredSongs = songs.filter(song => {
    const matchesSearch = song.song_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         song.artist.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = selectedGenre === "all" || song.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const genres = ["all", ...Array.from(new Set(songs.map(s => s.genre)))];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">Loading music library...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-bg-deep flex flex-col font-sans overflow-hidden">
      {/* Background Stars */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 100 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 px-10 py-6 elegant-glass border-b border-white/10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/")}
            className="hover:text-accent-blue transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-accent-blue to-accent-purple rounded-xl flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Music Library</h1>
              <p className="text-xs text-text-secondary">Music Library</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 p-10 overflow-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Music Discs Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Disc className="w-6 h-6 text-accent-blue" />
              <h2 className="text-xl font-bold text-white">My Discs</h2>
              <span className="text-text-secondary text-sm">({musicDiscs.length} discs)</span>
            </div>

            {musicDiscs.length === 0 ? (
              <div className="elegant-glass rounded-3xl p-12 text-center border border-white/10">
                <Disc className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-text-secondary">No discs yet</p>
                <p className="text-xs text-text-secondary mt-2">Get them from mystery boxes</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {musicDiscs.map(disc => (
                  <motion.div
                    key={disc.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`elegant-glass rounded-3xl p-6 border border-white/10 relative overflow-hidden group ${
                      disc.is_used ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Vinyl Record Visual */}
                    <div 
                      className="w-32 h-32 mx-auto mb-4 rounded-full flex items-center justify-center relative transition-transform group-hover:rotate-12"
                      style={{ 
                        background: `radial-gradient(circle at 30% 30%, ${disc.disc_color}40, ${disc.disc_color})`,
                        boxShadow: `0 0 30px ${disc.disc_color}60`
                      }}
                    >
                      <div className="w-10 h-10 bg-black/30 rounded-full" />
                      <Music className="w-12 h-12 text-white/80" />
                    </div>

                    <div className="text-center">
                      <div className="text-sm font-bold text-white mb-1">{disc.disc_name}</div>
                      
                      {!disc.is_used ? (
                        <button
                          onClick={() => handleUseDisc(disc)}
                          className="w-full bg-accent-blue hover:bg-blue-400 text-white text-sm font-bold py-2 rounded-xl transition-all"
                        >
                          Use Disc
                        </button>
                      ) : (
                        <div className="text-xs text-accent-green font-bold">Used</div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Songs Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Headphones className="w-6 h-6 text-accent-blue" />
              <h2 className="text-xl font-bold text-white">Unlocked Songs</h2>
              <span className="text-text-secondary text-sm">({songs.length} tracks)</span>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-3 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search songs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-blue"
                />
              </div>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-accent-blue"
              >
                {genres.map(genre => (
                  <option key={genre} value={genre} className="bg-bg-deep">
                    {genre === 'all' ? 'All' : genre}
                  </option>
                ))}
              </select>
            </div>

            {songs.length === 0 ? (
              <div className="elegant-glass rounded-3xl p-12 text-center border border-white/10">
                <Headphones className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-text-secondary">No songs yet</p>
                <p className="text-xs text-text-secondary mt-2">Use discs to unlock songs</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSongs.map(song => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="elegant-glass rounded-2xl p-4 border border-white/10 flex items-center gap-4 group hover:border-accent-blue/50 transition-all"
                  >
                    {/* Album Art Placeholder */}
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ 
                        background: `linear-gradient(135deg, ${getGenreColor(song.genre)}40, ${getGenreColor(song.genre)})`,
                        boxShadow: `0 0 20px ${getGenreColor(song.genre)}40`
                      }}
                    >
                      <Music className="w-8 h-8 text-white/80" />
                    </div>

                    {/* Song Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold truncate">{song.song_name}</div>
                      <div className="text-xs text-text-secondary">{song.artist}</div>
                    </div>

                    {/* Genre Tag */}
                    <div 
                      className="px-3 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: getGenreColor(song.genre) }}
                    >
                      {song.genre}
                    </div>

                    {/* Play Button */}
                    <button 
                      onClick={() => playSong(song)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                        playingSongId === song.id 
                          ? 'bg-accent-blue text-white' 
                          : 'bg-white/5 hover:bg-accent-blue hover:text-white'
                      }`}
                    >
                      {playingSongId === song.id ? (
                        // Pause icon
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                      ) : (
                        // Play icon
                        <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      )}
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
