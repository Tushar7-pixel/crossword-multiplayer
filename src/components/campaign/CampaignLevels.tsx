import React, { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import {
  useCampaignStore,
  CAMPAIGN_LEVELS,
  PHASE_2_UNLOCK_STARS,
} from "../../store/campaignStore";
import { THEMES, FONTS } from "../../lib/themeStyles";
import type { FontType } from "../../types/game";
import {
  Star,
  ArrowLeft,
  Trophy,
  Play,
  Lock,
  Binary,
  Moon,
  Zap,
  ShieldAlert,
} from "lucide-react";

export const CampaignLevels: React.FC = () => {
  const { setGameState, theme, localTheme, font, localFont } = useGameStore();
  const { progress, setActiveLevel } = useCampaignStore();
  const [selectedPhase, setSelectedPhase] = useState<1 | 2>(1);

  const activeThemeKey = localTheme || theme;
  const themeStyle = THEMES[activeThemeKey] || THEMES.farm;

  const activeFontKey = (localFont || font) as FontType;
  const fontStyle = FONTS[activeFontKey] || FONTS.hand;

  // Calculate Phase 1 stars specifically for the gate check
  const phase1Stars = CAMPAIGN_LEVELS.filter((l) => l.phase === 1).reduce(
    (sum, l) => sum + (progress[l.level]?.stars || 0),
    0,
  );
  const totalStars = Object.values(progress).reduce(
    (acc, curr) => acc + curr.stars,
    0,
  );
  const isPhase2Unlocked = phase1Stars >= PHASE_2_UNLOCK_STARS;

  const startLevel = (levelNum: number) => {
    setActiveLevel(levelNum);
    setGameState({ status: "campaign-play" });
  };

  const displayedLevels = CAMPAIGN_LEVELS.filter(
    (l) => l.phase === selectedPhase,
  );

  const getChapterIcon = (modifier: string) => {
    switch (modifier) {
      case "anagram":
        return <Binary size={12} className="text-amber-400" />;
      case "fog":
        return <Moon size={12} className="text-indigo-400" />;
      case "hazard":
        return <Zap size={12} className="text-rose-400" />;
      case "hybrid":
        return <ShieldAlert size={12} className="text-fuchsia-400" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`min-h-screen w-full ${themeStyle.bg} ${themeStyle.textColor} p-4 sm:p-6 flex flex-col items-center justify-between select-none`}
      style={{ fontFamily: fontStyle.fontFamily }}
    >
      {/* Top Header */}
      <div className="w-full max-w-xl flex items-center justify-between mb-3">
        <button
          onClick={() => setGameState({ status: "lobby" })}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/20 transition-all shadow-sm"
        >
          <ArrowLeft size={16} /> Lobby
        </button>

        <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 px-3.5 py-1.5 rounded-full shadow-sm backdrop-blur-md">
          <Trophy size={16} className="text-amber-500 fill-amber-500" />
          <span className="text-xs sm:text-sm font-black">
            {totalStars} / 120 Stars
          </span>
        </div>
      </div>

      <div className="w-full max-w-xl text-center mb-3">
        <h1
          className={`text-2xl sm:text-3xl font-black tracking-wider ${themeStyle.titleColor}`}
        >
          OFFLINE CAMPAIGN
        </h1>
        <p
          className={`text-xs font-bold opacity-80 ${themeStyle.subTextColor}`}
        >
          {selectedPhase === 1
            ? "Phase 1: Classic Word Hunt (Levels 1–20)"
            : "Phase 2: Tactical Modifiers (Levels 21–40)"}
        </p>
      </div>

      {/* Phase 1 / Phase 2 Tab Pill Selector */}
      <div className="w-full max-w-xl flex p-1 rounded-2xl bg-black/30 border border-white/10 mb-4 shadow-inner">
        <button
          onClick={() => setSelectedPhase(1)}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${
            selectedPhase === 1
              ? `${themeStyle.accentBtn} shadow-md`
              : "opacity-70 hover:opacity-100"
          }`}
        >
          <span>Phase 1 (1–20)</span>
          <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-md font-mono">
            {phase1Stars}/60★
          </span>
        </button>

        <button
          onClick={() => setSelectedPhase(2)}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${
            selectedPhase === 2
              ? `${themeStyle.accentBtn} shadow-md`
              : "opacity-70 hover:opacity-100"
          }`}
        >
          {!isPhase2Unlocked && <Lock size={14} className="text-rose-400" />}
          <span>Phase 2 (21–40)</span>
          {!isPhase2Unlocked && (
            <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded-md font-mono">
              {phase1Stars}/{PHASE_2_UNLOCK_STARS}★
            </span>
          )}
        </button>
      </div>

      {/* Phase 2 Lock Wall */}
      {selectedPhase === 2 && !isPhase2Unlocked ? (
        <div className="w-full max-w-xl flex-1 flex flex-col items-center justify-center p-6 bg-black/20 border-2 border-white/10 rounded-3xl text-center shadow-xl">
          <div className="p-4 bg-rose-500/20 rounded-full border border-rose-500/40 mb-3 text-rose-400">
            <Lock size={36} />
          </div>
          <h2 className="text-xl font-black mb-1">Phase 2 Locked</h2>
          <p className="text-xs font-bold opacity-75 max-w-xs mb-4">
            Earn at least <strong>{PHASE_2_UNLOCK_STARS} Stars</strong> in Phase
            1 to unlock advanced chapters (Anagrams, Fog of War, and Voltage).
          </p>

          <div className="w-full max-w-xs bg-black/40 rounded-full h-3 border border-white/10 overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
              style={{
                width: `${Math.min(100, (phase1Stars / PHASE_2_UNLOCK_STARS) * 100)}%`,
              }}
            />
          </div>
          <span className="text-xs font-mono font-black text-amber-400">
            {phase1Stars} / {PHASE_2_UNLOCK_STARS} Stars Collected
          </span>
        </div>
      ) : (
        /* Level Cards Grid */
        <div className="w-full max-w-xl flex-1 overflow-y-auto max-h-[64vh] p-1 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {displayedLevels.map(
            ({ level, threeStarTime, chapterTitle, modifier }) => {
              const record = progress[level] || {
                stars: 0,
                bestTime: 0,
                completed: false,
              };

              return (
                <div
                  key={level}
                  onClick={() => startLevel(level)}
                  className={`${themeStyle.cardBg} border-2 ${themeStyle.border} rounded-2xl p-2.5 flex flex-col items-center justify-between cursor-pointer hover:scale-102 active:scale-95 transition-all shadow-md group`}
                >
                  <div className="w-full flex justify-between items-center text-[10px] font-black opacity-75">
                    <span className="flex items-center gap-1">
                      {getChapterIcon(modifier)}
                      LVL {level}
                    </span>
                    <span>
                      {selectedPhase === 2 ? "Untimed" : `≤${threeStarTime}s`}
                    </span>{" "}
                  </div>

                  {chapterTitle && (
                    <div className="text-[9px] font-black uppercase tracking-wider text-amber-500 truncate max-w-full my-0.5">
                      {chapterTitle}
                    </div>
                  )}

                  {/* Star Rating Display */}
                  <div className="flex gap-1 my-1.5">
                    {[1, 2, 3].map((starIndex) => (
                      <Star
                        key={starIndex}
                        size={15}
                        className={`${
                          starIndex <= record.stars
                            ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]"
                            : "text-black/20 fill-black/10"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="w-full flex items-center justify-between pt-1 border-t border-black/10 text-[10px] font-bold">
                    <span className="truncate">
                      {record.completed ? `${record.bestTime}s` : "Not run"}
                    </span>
                    <span className="bg-black/10 group-hover:bg-amber-600 group-hover:text-white p-1 rounded-lg transition-colors">
                      <Play size={10} className="fill-current" />
                    </span>
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}

      <div className="text-[11px] text-center font-bold opacity-60 mt-2">
        {selectedPhase === 1
          ? "Phase 1: Complete levels to earn stars for Phase 2"
          : "Phase 2: Master Decryption, Eclipse, and Hazard rules"}
      </div>
    </div>
  );
};
