/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Clock, 
  Compass, 
  BookOpen, 
  Settings, 
  Moon, 
  Sun, 
  ChevronRight, 
  MapPin, 
  RefreshCw,
  Volume2,
  VolumeX,
  Search,
  Bookmark,
  Heart,
  Play,
  Pause,
  RotateCcw,
  Plus
} from 'lucide-react';
import { cn, calculateQibla, PrayerTimings, HijriDate, Surah, Dua, SurahDetail, Ayah } from './types';
import { DUAS } from './data';
import { format, addMinutes, differenceInSeconds } from 'date-fns';

// --- Components ---

const QuranReader = ({ surah, onBack }: { surah: SurahDetail, onBack: () => void }) => {
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [isPlayingSurah, setIsPlayingSurah] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAyah = (ayah: Ayah, isFromSurahSequence = false) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (ayah.audio) {
      audioRef.current = new Audio(ayah.audio);
      audioRef.current.play();
      setPlayingAyah(ayah.number);
      
      audioRef.current.onended = () => {
        setPlayingAyah(null);
        if (isFromSurahSequence) {
          const currentIndex = surah.ayahs.findIndex(a => a.number === ayah.number);
          if (currentIndex < surah.ayahs.length - 1) {
            playAyah(surah.ayahs[currentIndex + 1], true);
          } else {
            setIsPlayingSurah(false);
          }
        }
      };
    }
  };

  const toggleSurahPlayback = () => {
    if (isPlayingSurah) {
      audioRef.current?.pause();
      setIsPlayingSurah(false);
      setPlayingAyah(null);
    } else {
      setIsPlayingSurah(true);
      // Start from the first ayah or the currently selected one
      const startAyah = playingAyah 
        ? surah.ayahs.find(a => a.number === playingAyah) || surah.ayahs[0]
        : surah.ayahs[0];
      playAyah(startAyah, true);
    }
  };

  const toggleAudio = (ayah: Ayah) => {
    setIsPlayingSurah(false); // Stop surah sequence if manual ayah is clicked
    if (playingAyah === ayah.number) {
      audioRef.current?.pause();
      setPlayingAyah(null);
    } else {
      playAyah(ayah);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const currentAyahIndex = playingAyah ? surah.ayahs.findIndex(a => a.number === playingAyah) : -1;
  const progress = surah.ayahs.length > 0 ? ((currentAyahIndex + 1) / surah.ayahs.length) * 100 : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-white z-[60] overflow-y-auto no-scrollbar pb-32"
    >
      {/* Header Info */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 px-6 py-4 flex justify-between items-center border-b border-gray-100">
        <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <div className="text-center">
          <h3 className="font-bold text-gray-900">{surah.englishName}</h3>
          {playingAyah ? (
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest animate-pulse">
              {isPlayingSurah ? 'Playing Surah' : 'Playing Ayah'} {surah.ayahs.find(a => a.number === playingAyah)?.numberInSurah}
            </p>
          ) : (
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">{surah.revelationType} • {surah.numberOfAyahs} Ayahs</p>
          )}
        </div>
        <div className="w-10 h-10 flex items-center justify-center text-emerald-600 font-arabic text-xl">
          {surah.name}
        </div>
      </div>

      <div className="p-4 md:p-8">
        <div className="mushaf-border min-h-[80vh] flex flex-col items-center">
          {/* Surah Header in Mushaf */}
          <div className="w-full flex justify-between items-center mb-8 text-[10px] font-bold text-[#8b8b00] uppercase tracking-tighter">
            <span>Juz {surah.ayahs[0].juz}</span>
            <span className="text-lg font-arabic">{surah.name}</span>
            <span>Page {surah.ayahs[0].page}</span>
          </div>

          {/* Bismillah */}
          {surah.number !== 1 && surah.number !== 9 && (
            <div className="text-center mb-10 w-full">
              <p className="text-4xl font-arabic text-gray-900 border-b-2 border-[#8b8b00]/10 pb-6">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
            </div>
          )}

          {/* Quran Text */}
          <div className="text-right leading-[4.5rem] space-x-reverse space-x-2 w-full text-justify" style={{ textAlignLast: 'right' }}>
            {surah.ayahs.map((ayah) => {
              // Remove Bismillah from the start of the first ayah if it's not Al-Fatihah
              let text = ayah.text;
              if (surah.number !== 1 && ayah.numberInSurah === 1) {
                text = text.replace('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', '').trim();
              }
              const isPlaying = playingAyah === ayah.number;
              return (
                <React.Fragment key={ayah.number}>
                  <span 
                    onClick={() => toggleAudio(ayah)}
                    className={cn(
                      "text-4xl font-arabic transition-all duration-300 cursor-pointer inline leading-relaxed px-1 rounded-lg",
                      isPlaying ? "bg-emerald-100 text-emerald-900" : "text-gray-800 hover:bg-emerald-50"
                    )}
                  >
                    {text}
                  </span>
                  <span className="ayah-marker relative group">
                    {ayah.numberInSurah}
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleAudio(ayah); }}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/80 rounded-full transition-opacity"
                    >
                      {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                    </button>
                  </span>
                </React.Fragment>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className="mt-12 pt-8 border-t border-[#8b8b00]/20 w-full text-center">
            <p className="text-[#8b8b00] font-bold text-xs uppercase tracking-widest">
              Manzil {surah.ayahs[0].manzil}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Audio Controls */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-[70] pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-3xl shadow-2xl p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                  <Play size={24} fill="currentColor" className={isPlayingSurah ? 'animate-pulse' : ''} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Play Full Surah</h4>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">Reciter: Alafasy</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleSurahPlayback}
                  className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
                >
                  {isPlayingSurah ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                </button>
                <button 
                  onClick={() => {
                    audioRef.current?.pause();
                    setIsPlayingSurah(false);
                    setPlayingAyah(null);
                  }}
                  className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
                >
                  <RotateCcw size={20} />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-emerald-600"
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
              <span>Ayah {currentAyahIndex + 1}</span>
              <span>{surah.numberOfAyahs} Ayahs</span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

const BottomNav = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'prayer', icon: Clock, label: 'Prayer' },
    { id: 'tasbeeh', icon: RotateCcw, label: 'Tasbeeh' },
    { id: 'quran', icon: BookOpen, label: 'Quran' },
    { id: 'qibla', icon: Compass, label: 'Qibla' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-emerald-50 px-6 py-3 flex justify-between items-center z-50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300",
            activeTab === tab.id ? "text-emerald-600 scale-110" : "text-gray-400"
          )}
        >
          <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
          <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
          {activeTab === tab.id && (
            <motion.div 
              layoutId="activeTab"
              className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5"
            />
          )}
        </button>
      ))}
    </nav>
  );
};

const Header = ({ hijriDate }: { hijriDate: HijriDate | null }) => {
  return (
    <header className="px-6 pt-8 pb-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assalamu Alaikum</h1>
          <p className="text-emerald-600 font-medium">
            {hijriDate ? `${hijriDate.day} ${hijriDate.month.en} ${hijriDate.year}` : 'Loading date...'}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
          <MapPin size={20} />
        </div>
      </div>
    </header>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [timings, setTimings] = useState<PrayerTimings | null>(null);
  const [hijriDate, setHijriDate] = useState<HijriDate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasbeehCount, setTasbeehCount] = useState(0);
  const [selectedZikr, setSelectedZikr] = useState('SubhanAllah');
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<SurahDetail | null>(null);
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [heading, setHeading] = useState<number | null>(null);

  // Fetch Location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.error(err);
          setError("Please enable location permissions to get accurate prayer times.");
          setLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
    }
  }, []);

  // Fetch Prayer Times
  useEffect(() => {
    if (location) {
      const fetchPrayerTimes = async () => {
        try {
          const response = await fetch(
            `https://api.aladhan.com/v1/timings?latitude=${location.lat}&longitude=${location.lng}&method=2`
          );
          const data = await response.json();
          if (data.code === 200) {
            setTimings(data.data.timings);
            setHijriDate(data.data.date.hijri);
          }
          setLoading(false);
        } catch (err) {
          console.error(err);
          setError("Failed to fetch prayer times. Please check your connection.");
          setLoading(false);
        }
      };
      fetchPrayerTimes();
    }
  }, [location]);

  // Fetch Quran Surahs
  useEffect(() => {
    const fetchSurahs = async () => {
      try {
        const response = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await response.json();
        if (data.code === 200) {
          setSurahs(data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSurahs();
  }, []);

  const fetchSurahDetail = async (surahNumber: number) => {
    setLoadingSurah(true);
    try {
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/ar.alafasy`);
      const data = await response.json();
      if (data.code === 200) {
        setSelectedSurah(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSurah(false);
    }
  };

  // Qibla Heading
  useEffect(() => {
    const handleOrientation = (e: any) => {
      if (e.webkitCompassHeading) {
        setHeading(e.webkitCompassHeading);
      } else if (e.alpha !== null) {
        setHeading(360 - e.alpha);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  const handleTasbeehClick = () => {
    setTasbeehCount(prev => prev + 1);
    if (vibrationEnabled && navigator.vibrate) {
      navigator.vibrate(50);
    }
    if (soundEnabled) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
  };

  const getNextPrayer = () => {
    if (!timings) return null;
    const now = new Date();
    const prayerOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    
    for (const p of prayerOrder) {
      const [hours, minutes] = (timings as any)[p].split(':').map(Number);
      const prayerTime = new Date();
      prayerTime.setHours(hours, minutes, 0);
      
      if (prayerTime > now) {
        return { name: p, time: prayerTime };
      }
    }
    
    // If all prayers passed, next is Fajr tomorrow
    const [hours, minutes] = timings.Fajr.split(':').map(Number);
    const tomorrowFajr = new Date();
    tomorrowFajr.setDate(now.getDate() + 1);
    tomorrowFajr.setHours(hours, minutes, 0);
    return { name: 'Fajr', time: tomorrowFajr };
  };

  const nextPrayer = getNextPrayer();

  const renderHome = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-24"
    >
      <Header hijriDate={hijriDate} />
      
      {/* Next Prayer Card */}
      <div className="px-6">
        <div className="bg-emerald-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-200 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Next Prayer</p>
            <div className="flex justify-between items-end mt-1">
              <h2 className="text-4xl font-bold">{nextPrayer?.name}</h2>
              <p className="text-2xl font-light">{nextPrayer ? format(nextPrayer.time, 'hh:mm a') : '--:--'}</p>
            </div>
            <div className="mt-4 flex items-center gap-2 bg-white/20 w-fit px-3 py-1 rounded-full text-xs backdrop-blur-sm">
              <Clock size={14} />
              <span>Countdown: {nextPrayer ? format(new Date(nextPrayer.time.getTime() - Date.now()), 'HH:mm:ss') : '00:00:00'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="px-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Access</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'tasbeeh', icon: RotateCcw, label: 'Tasbeeh', color: 'bg-orange-50 text-orange-600' },
            { id: 'prayer', icon: Clock, label: 'Prayers', color: 'bg-blue-50 text-blue-600' },
            { id: 'dua', icon: Heart, label: 'Duas', color: 'bg-pink-50 text-pink-600' },
            { id: 'quran', icon: BookOpen, label: 'Quran', color: 'bg-purple-50 text-purple-600' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-3 shadow-sm active:scale-95 transition-transform"
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", item.color)}>
                <item.icon size={20} />
              </div>
              <span className="font-semibold text-gray-700">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Daily Dua */}
      <div className="px-6">
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">Dua of the Day</h3>
            <button className="text-emerald-600 text-sm font-medium">View All</button>
          </div>
          <p className="text-right text-xl font-arabic leading-loose text-gray-800 mb-3">
            {DUAS[0].arabic}
          </p>
          <p className="text-sm text-gray-500 italic mb-2">"{DUAS[0].translation}"</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Bookmark size={12} />
            <span>Source: {DUAS[0].reference}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderPrayerTimes = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-6 pt-8 pb-24 space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Prayer Times</h2>
        <button className="p-2 bg-emerald-50 text-emerald-600 rounded-full">
          <RefreshCw size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <RefreshCw className="animate-spin mb-2" size={32} />
          <p>Fetching prayer times...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center">
          <p>{error}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((p) => {
            const isCurrent = nextPrayer?.name === p;
            return (
              <div 
                key={p}
                className={cn(
                  "flex justify-between items-center p-5 rounded-2xl border transition-all duration-300",
                  isCurrent ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100 scale-[1.02]" : "bg-white border-gray-100 text-gray-700"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("w-2 h-2 rounded-full", isCurrent ? "bg-white animate-pulse" : "bg-emerald-200")} />
                  <span className="font-bold text-lg">{p}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={cn("text-lg font-medium", isCurrent ? "text-emerald-50" : "text-gray-900")}>
                    {(timings as any)[p]}
                  </span>
                  <Volume2 size={18} className={isCurrent ? "text-white" : "text-gray-300"} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );

  const renderTasbeeh = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-6 pt-8 pb-24 flex flex-col items-center justify-between h-[calc(100vh-80px)]"
    >
      <div className="w-full text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Digital Tasbeeh</h2>
        <div className="flex justify-center gap-2">
          {['SubhanAllah', 'Alhamdulillah', 'Allahu Akbar'].map(zikr => (
            <button
              key={zikr}
              onClick={() => { setSelectedZikr(zikr); setTasbeehCount(0); }}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-semibold transition-all",
                selectedZikr === zikr ? "bg-emerald-600 text-white shadow-md" : "bg-emerald-50 text-emerald-600"
              )}
            >
              {zikr}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        {/* Progress Ring */}
        <svg className="w-72 h-72 transform -rotate-90">
          <circle
            cx="144"
            cy="144"
            r="130"
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            className="text-emerald-50"
          />
          <motion.circle
            cx="144"
            cy="144"
            r="130"
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={816}
            strokeDashoffset={816 - (816 * (tasbeehCount % 33)) / 33}
            className="text-emerald-600"
            transition={{ type: 'spring', stiffness: 100 }}
          />
        </svg>

        <button
          onClick={handleTasbeehClick}
          className="absolute w-56 h-56 bg-white rounded-full shadow-2xl shadow-emerald-100 flex flex-col items-center justify-center active:scale-95 transition-transform border-4 border-emerald-50"
        >
          <span className="text-6xl font-black text-emerald-600">{tasbeehCount}</span>
          <span className="text-gray-400 font-medium mt-2 uppercase tracking-widest text-xs">Tap to Count</span>
        </button>
      </div>

      <div className="w-full flex justify-between items-center bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <button 
          onClick={() => setTasbeehCount(0)}
          className="p-4 bg-orange-50 text-orange-600 rounded-2xl active:scale-90 transition-transform"
        >
          <RotateCcw size={24} />
        </button>
        <div className="flex gap-4">
          <button 
            onClick={() => setVibrationEnabled(!vibrationEnabled)}
            className={cn("p-4 rounded-2xl transition-all", vibrationEnabled ? "bg-emerald-600 text-white" : "bg-gray-50 text-gray-400")}
          >
            <RefreshCw size={24} className={vibrationEnabled ? "animate-spin-slow" : ""} />
          </button>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn("p-4 rounded-2xl transition-all", soundEnabled ? "bg-emerald-600 text-white" : "bg-gray-50 text-gray-400")}
          >
            {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderQuran = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-6 pt-8 pb-24 space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">The Holy Quran</h2>
        <button className="p-2 bg-emerald-50 text-emerald-600 rounded-full">
          <Bookmark size={20} />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text"
          placeholder="Search Surah by name or number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-12 text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <RotateCcw size={16} className="rotate-45" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {surahs
          .filter(s => 
            s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) || 
            s.name.includes(searchQuery) ||
            s.number.toString().includes(searchQuery) ||
            s.englishNameTranslation.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((surah) => (
          <button 
            key={surah.number}
            onClick={() => fetchSurahDetail(surah.number)}
            disabled={loadingSurah}
            className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center group active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                {loadingSurah ? <RefreshCw size={16} className="animate-spin" /> : surah.number}
              </div>
              <div className="text-left">
                <h4 className="font-bold text-gray-900">{surah.englishName}</h4>
                <p className="text-xs text-gray-400">{surah.englishNameTranslation} • {surah.numberOfAyahs} Ayahs</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-arabic text-emerald-600 mb-1">{surah.name}</p>
              <div className="flex items-center gap-1 text-[10px] text-gray-300 uppercase font-bold tracking-tighter">
                <span>{surah.revelationType}</span>
                <ChevronRight size={12} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );

  const renderQibla = () => {
    const qiblaAngle = location ? calculateQibla(location.lat, location.lng) : 0;
    const rotation = heading !== null ? (qiblaAngle - heading) : 0;

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="px-6 pt-8 pb-24 flex flex-col items-center justify-center h-[calc(100vh-80px)] space-y-12"
      >
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Qibla Finder</h2>
          <p className="text-gray-400 text-sm">Align your device to find the Kaaba</p>
        </div>

        <div className="relative w-80 h-80 flex items-center justify-center">
          {/* Compass Background */}
          <div className="absolute inset-0 border-4 border-emerald-50 rounded-full" />
          <div className="absolute inset-4 border border-dashed border-emerald-100 rounded-full" />
          
          {/* Compass Markings */}
          {['N', 'E', 'S', 'W'].map((dir, i) => (
            <span 
              key={dir}
              className="absolute font-bold text-gray-300 text-sm"
              style={{ 
                transform: `rotate(${i * 90}deg) translateY(-130px)`,
              }}
            >
              {dir}
            </span>
          ))}

          {/* Qibla Needle */}
          <motion.div 
            animate={{ rotate: rotation }}
            className="relative w-full h-full flex items-center justify-center"
          >
            <div className="absolute top-4 flex flex-col items-center">
              <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 text-white mb-2">
                <Compass size={24} />
              </div>
              <div className="w-1 h-32 bg-gradient-to-b from-emerald-600 to-transparent rounded-full" />
            </div>
          </motion.div>

          {/* Center Point */}
          <div className="w-4 h-4 bg-emerald-600 rounded-full border-4 border-white shadow-md z-10" />
        </div>

        <div className="bg-emerald-50 px-8 py-4 rounded-3xl text-center">
          <p className="text-emerald-600 font-bold text-2xl">{Math.round(qiblaAngle)}°</p>
          <p className="text-emerald-400 text-xs font-medium uppercase tracking-widest">Qibla Angle</p>
        </div>

        {!heading && (
          <p className="text-xs text-orange-500 bg-orange-50 px-4 py-2 rounded-full animate-pulse">
            Compass calibration required. Move your device in a ∞ shape.
          </p>
        )}
      </motion.div>
    );
  };

  const renderDua = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-6 pt-8 pb-24 space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Dua Collection</h2>
        <button className="p-2 bg-pink-50 text-pink-600 rounded-full">
          <Heart size={20} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['All', 'Morning', 'Evening', 'Before Sleep', 'After Prayer', 'Protection'].map(cat => (
          <button
            key={cat}
            className="whitespace-nowrap px-4 py-2 rounded-full bg-gray-50 text-gray-500 text-sm font-medium hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {DUAS.map((dua) => (
          <div key={dua.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {dua.category}
              </span>
              <button className="text-gray-300 hover:text-pink-500 transition-colors">
                <Heart size={20} />
              </button>
            </div>
            <p className="text-right text-2xl font-arabic leading-relaxed text-gray-800">
              {dua.arabic}
            </p>
            <div className="space-y-2">
              <p className="text-sm text-emerald-600/70 font-medium italic">
                {dua.transliteration}
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                {dua.translation}
              </p>
            </div>
            <div className="pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              <span>Ref: {dua.reference}</span>
              <div className="flex gap-3">
                <button className="flex items-center gap-1">
                  <Play size={12} /> Listen
                </button>
                <button className="flex items-center gap-1">
                  <Plus size={12} /> Share
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-emerald-100 selection:text-emerald-900">
      <main className="max-w-md mx-auto min-h-screen relative">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && renderHome()}
          {activeTab === 'prayer' && renderPrayerTimes()}
          {activeTab === 'tasbeeh' && renderTasbeeh()}
          {activeTab === 'quran' && renderQuran()}
          {activeTab === 'qibla' && renderQibla()}
          {activeTab === 'dua' && renderDua()}
        </AnimatePresence>

        <AnimatePresence>
          {loadingSurah && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[70] flex flex-col items-center justify-center text-emerald-600"
            >
              <RefreshCw className="animate-spin mb-4" size={48} />
              <p className="font-bold animate-pulse uppercase tracking-widest text-xs">Opening Surah...</p>
            </motion.div>
          )}
          {selectedSurah && (
            <QuranReader 
              surah={selectedSurah} 
              onBack={() => setSelectedSurah(null)} 
            />
          )}
        </AnimatePresence>

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </main>

      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[-1]">
        <svg width="100%" height="100%">
          <pattern id="islamic-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M50 0 L100 50 L50 100 L0 50 Z" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#islamic-pattern)" />
        </svg>
      </div>
    </div>
  );
}
