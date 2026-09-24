// import React from "react";
import { useGameStore } from "../../store/gameStore";
import { THEMES, FONTS } from "../../lib/themeStyles";
import type { FontType } from "../../types/game";
import { Trophy, RotateCcw, Home } from "lucide-react";

export const Scoreboard = ({ network }: { network: any }) => {
  const {
    players,
    theme,
    localTheme,
    font,
    localFont,
    setGameState,
    resetSession,
  } = useGameStore();
  const { isHost, triggerRematch } = network;

  const activeThemeKey = localTheme || theme;
  const themeStyle = THEMES[activeThemeKey] || THEMES.farm;
  const activeFontKey = (localFont || font) as FontType;
  const fontStyle = FONTS[activeFontKey] || FONTS.hand;

  const rankedPlayers = Object.values(players).sort(
    (a, b) => b.score - a.score,
  );
  const winner = rankedPlayers[0];

  const handleLeave = () => {
    resetSession();
    setGameState({ status: "lobby" });
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-center p-4 ${themeStyle.bg} ${themeStyle.textColor}`}
      style={{ fontFamily: fontStyle.fontFamily }}
    >
      <div
        className={`w-full max-w-md ${themeStyle.cardBg} border-2 ${themeStyle.border} p-6 sm:p-8 rounded-3xl shadow-2xl text-center`}
      >
        <div className="flex justify-center mb-3">
          <div className="p-3 bg-amber-500/20 rounded-full border border-amber-500/40">
            <Trophy
              size={40}
              className="text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
            />
          </div>
        </div>

        <h1
          className={`text-2xl sm:text-3xl font-black mb-1 ${themeStyle.titleColor}`}
        >
          GAME OVER
        </h1>
        <p className="text-xs sm:text-sm font-bold opacity-75 mb-6">
          {winner ? `🏆 ${winner.name} won the match!` : "Match finished!"}
        </p>

        {/* Leaderboard */}
        <div className="space-y-2 mb-6">
          {rankedPlayers.map((p, idx) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 rounded-xl bg-black/15 border border-black/10 text-sm font-bold"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-black opacity-60 w-4">
                  #{idx + 1}
                </span>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span>{p.name}</span>
              </div>
              <span className="font-black text-base" style={{ color: p.color }}>
                {p.score} pts
              </span>
            </div>
          ))}
        </div>

        {/* Rematch Actions */}
        <div className="space-y-2.5">
          {isHost ? (
            <button
              onClick={triggerRematch}
              className={`w-full ${themeStyle.accentBtn} font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base`}
            >
              <RotateCcw size={18} /> Play Rematch (Same Players)
            </button>
          ) : (
            <button
              onClick={triggerRematch}
              className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-black py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm"
            >
              <RotateCcw size={16} /> Request Host for Rematch
            </button>
          )}

          <button
            onClick={handleLeave}
            className="w-full bg-black/15 hover:bg-black/25 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs opacity-75 hover:opacity-100 transition-opacity"
          >
            <Home size={14} /> Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};
