import React from "react";
import { useGameStore } from "../../store/gameStore";
import { useCampaignStore, CAMPAIGN_LEVELS } from "../../store/campaignStore";
import { THEMES, FONTS } from "../../lib/themeStyles";
import type { FontType } from "../../types/game";
import { Star, ArrowLeft, Trophy, Play } from "lucide-react";

export const CampaignLevels: React.FC = () => {
  const { setGameState, theme, localTheme, font, localFont } = useGameStore();
  const { progress, setActiveLevel } = useCampaignStore();

  const activeThemeKey = localTheme || theme;
  const themeStyle = THEMES[activeThemeKey] || THEMES.farm;

  const activeFontKey = (localFont || font) as FontType;
  const fontStyle = FONTS[activeFontKey] || FONTS.hand;

  const totalStars = Object.values(progress).reduce(
    (acc, curr) => acc + curr.stars,
    0,
  );

  const startLevel = (levelNum: number) => {
    setActiveLevel(levelNum);
    setGameState({ status: "campaign-play" });
  };

  return (
    <div
      className={`min-h-screen w-full ${themeStyle.bg} ${themeStyle.textColor} p-4 sm:p-6 flex flex-col items-center justify-between select-none`}
      style={{ fontFamily: fontStyle.fontFamily }}
    >
      {/* Top Header */}
      <div className="w-full max-w-xl flex items-center justify-between mb-4">
        <button
          onClick={() => setGameState({ status: "lobby" })}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/20 transition-all shadow-sm"
        >
          <ArrowLeft size={16} /> Lobby
        </button>

        <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 px-3.5 py-1.5 rounded-full shadow-sm backdrop-blur-md">
          <Trophy size={16} className="text-amber-500 fill-amber-500" />
          <span className="text-xs sm:text-sm font-black">
            {totalStars} / 60 Stars
          </span>
        </div>
      </div>

      <div className="w-full max-w-xl text-center mb-4">
        <h1
          className={`text-2xl sm:text-3xl font-black tracking-wider ${themeStyle.titleColor}`}
        >
          OFFLINE CAMPAIGN
        </h1>
        <p
          className={`text-xs sm:text-sm font-bold opacity-80 ${themeStyle.subTextColor}`}
        >
          20 Levels • 3 Rounds Per Level • Unlocked & Ready
        </p>
      </div>

      {/* 20 Level Cards Grid */}
      <div className="w-full max-w-xl flex-1 overflow-y-auto max-h-[72vh] p-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CAMPAIGN_LEVELS.map(({ level, threeStarTime }) => {
          const record = progress[level] || {
            stars: 0,
            bestTime: 0,
            completed: false,
          };

          return (
            <div
              key={level}
              onClick={() => startLevel(level)}
              className={`${themeStyle.cardBg} border-2 ${themeStyle.border} rounded-2xl p-3 flex flex-col items-center justify-between cursor-pointer hover:scale-102 active:scale-95 transition-all shadow-md group`}
            >
              <div className="w-full flex justify-between items-center text-[11px] font-black opacity-75">
                <span>LVL {level}</span>
                <span>≤{threeStarTime}s</span>
              </div>

              {/* Star Rating Display */}
              <div className="flex gap-1 my-2">
                {[1, 2, 3].map((starIndex) => (
                  <Star
                    key={starIndex}
                    size={16}
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
        })}
      </div>

      <div className="text-[11px] text-center font-bold opacity-60 mt-2">
        Scores & Stars are preserved offline in local device storage
      </div>
    </div>
  );
};
