import React, { useState, useEffect, useMemo, useRef } from "react";
import { useGameStore } from "../../store/gameStore";
import {
  useCampaignStore,
  CAMPAIGN_LEVELS,
  generateCampaignRound,
} from "../../store/campaignStore";
import { THEMES, FONTS } from "../../lib/themeStyles";
import type { CellCoord, FontType } from "../../types/game";
import {
  Star,
  ArrowLeft,
  RotateCcw,
  Play,
  CheckCircle2,
  Sparkles,
  Flame,
} from "lucide-react";

interface BonusNotice {
  id: number;
  text: string;
  type: "base" | "streak" | "golden";
}
import { haptic } from "../../lib/haptics";
import { soundFx } from "../../lib/audioFx";
import { SoundToggle } from "../ui/SoundToggle";

export const CampaignGameBoard: React.FC = () => {
  const { theme, localTheme, font, localFont, setGameState } = useGameStore();
  const { activeLevel, setActiveLevel, saveLevelResult, progress } =
    useCampaignStore();

  const levelConfig = useMemo(
    () =>
      CAMPAIGN_LEVELS.find((l) => l.level === activeLevel) ||
      CAMPAIGN_LEVELS[0],
    [activeLevel],
  );

  const activeThemeKey = localTheme || theme;
  const themeStyle = THEMES[activeThemeKey] || THEMES.farm;

  const activeFontKey = (localFont || font) as FontType;
  const fontStyle = FONTS[activeFontKey] || FONTS.hand;

  // Round & Board state
  const [currentRound, setCurrentRound] = useState(1);
  const [{ board, wordsToFind, goldenWord }, setRoundData] = useState(() =>
    generateCampaignRound(
      levelConfig.wordsPerRound,
      levelConfig.gridSize,
      false,
    ),
  );
  const [foundWords, setFoundWords] = useState<Record<string, boolean>>({});
  const [foundCells, setFoundCells] = useState<Record<string, boolean>>({});

  // Selection interaction
  const [startCell, setStartCell] = useState<CellCoord | null>(null);
  const [selectionCoords, setSelectionCoords] = useState<CellCoord[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Time & Streak metrics
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLevelFinished, setIsLevelFinished] = useState(false);
  const [earnedStars, setEarnedStars] = useState(1);

  // Streak & Notification State
  const [streakCount, setStreakCount] = useState(0);
  const lastFoundTimeRef = useRef<number | null>(null);
  const [bonusNotice, setBonusNotice] = useState<BonusNotice | null>(null);

  // Active Timer
  useEffect(() => {
    if (isLevelFinished) return;

    const interval = window.setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isLevelFinished]);

  // Auto-dismiss bonus notice after 2.2 seconds
  useEffect(() => {
    if (!bonusNotice) return;
    const timer = window.setTimeout(() => {
      setBonusNotice(null);
    }, 2200);
    return () => clearTimeout(timer);
  }, [bonusNotice]);

  // Current eligible star rating based on elapsed time
  const currentEligibleStars =
    elapsedTime <= levelConfig.threeStarTime
      ? 3
      : elapsedTime <= levelConfig.twoStarTime
        ? 2
        : 1;

  // Countdown calculations
  const remainingTime = Math.max(0, levelConfig.maxBudget - elapsedTime);
  const barPercent = Math.min(
    100,
    Math.max(0, (remainingTime / levelConfig.maxBudget) * 100),
  );

  // Threshold markers
  const lossStar3Marker =
    ((levelConfig.maxBudget - levelConfig.threeStarTime) /
      levelConfig.maxBudget) *
    100;
  const lossStar2Marker =
    ((levelConfig.maxBudget - levelConfig.twoStarTime) /
      levelConfig.maxBudget) *
    100;

  const currentWord = selectionCoords
    .map((c) => board[c.y]?.[c.x] || "")
    .join("");

  // Drag Handlers
  const handleSelectStart = (y: number, x: number) => {
    setIsDragging(true);
    const initial = { y, x };
    setStartCell(initial);
    setSelectionCoords([initial]);
  };

  const handleSelectMove = (y: number, x: number) => {
    if (!isDragging || !startCell) return;

    const dy = y - startCell.y;
    const dx = x - startCell.x;
    const absDy = Math.abs(dy);
    const absDx = Math.abs(dx);

    const isHorizontal = dy === 0;
    const isVertical = dx === 0;
    const isDiagonal = absDx === absDy;

    if (isHorizontal || isVertical || isDiagonal) {
      const steps = Math.max(absDx, absDy);
      const stepY = dy === 0 ? 0 : dy / absDy;
      const stepX = dx === 0 ? 0 : dx / absDx;

      const newPath: CellCoord[] = [];
      for (let i = 0; i <= steps; i++) {
        newPath.push({
          y: startCell.y + i * stepY,
          x: startCell.x + i * stepX,
        });
      }
      if (newPath.length !== selectionCoords.length) {
        haptic.tick();
        soundFx.playCellTick(newPath.length);
        setSelectionCoords(newPath);
      }
      setSelectionCoords(newPath);
    }
  };

  const handleSelectEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (wordsToFind.includes(currentWord) && !foundWords[currentWord]) {
      const now = Date.now();
      const isGolden = currentRound === 3 && currentWord === goldenWord;

      // Base 5 seconds credit
      let secondsCredited = 5;

      // Back-to-back streak bonus within 7 seconds
      let currentStreak = 1;
      let streakBonus = 0;
      if (lastFoundTimeRef.current && now - lastFoundTimeRef.current <= 7000) {
        currentStreak = streakCount + 1;
        streakBonus = currentStreak * 3;
        secondsCredited += streakBonus;
      }
      setStreakCount(currentStreak);
      lastFoundTimeRef.current = now;

      // Golden Word adds +15 seconds in the final round
      if (isGolden) {
        secondsCredited += 15;
      }

      setElapsedTime((prev) => Math.max(0, prev - secondsCredited));
      if (isGolden) {
        haptic.goldenFound();
        soundFx.playGoldenFound();
      } else {
        haptic.wordFound();
        soundFx.playWordFound();
      }
      if (isGolden) {
        setBonusNotice({
          id: Date.now(),
          text: `+${secondsCredited}s GOLDEN WORD!`,
          type: "golden",
        });
      } else if (streakBonus > 0) {
        setBonusNotice({
          id: Date.now(),
          text: `+${secondsCredited}s STREAK x${currentStreak}!`,
          type: "streak",
        });
      } else {
        setBonusNotice({
          id: Date.now(),
          text: `+5s Time Added!`,
          type: "base",
        });
      }

      const nextFoundCells = { ...foundCells };
      selectionCoords.forEach((cell) => {
        nextFoundCells[`${cell.y}-${cell.x}`] = true;
      });

      const nextFoundWords = { ...foundWords, [currentWord]: true };
      setFoundCells(nextFoundCells);
      setFoundWords(nextFoundWords);

      if (Object.keys(nextFoundWords).length === wordsToFind.length) {
        if (currentRound < 3) {
          const nextRound = currentRound + 1;
          const isFinal = nextRound === 3;
          setCurrentRound(nextRound);
          setRoundData(
            generateCampaignRound(
              levelConfig.wordsPerRound,
              levelConfig.gridSize,
              isFinal,
            ),
          );
          setFoundWords({});
          setFoundCells({});
          lastFoundTimeRef.current = null;
        } else {
          const stars = saveLevelResult(activeLevel, elapsedTime);
          setEarnedStars(stars);
          soundFx.playLevelComplete();
          setIsLevelFinished(true);
        }
      }
    }

    setStartCell(null);
    setSelectionCoords([]);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const cellEl = target?.closest("[data-cell]");
    if (cellEl) {
      const y = parseInt(cellEl.getAttribute("data-y")!, 10);
      const x = parseInt(cellEl.getAttribute("data-x")!, 10);
      handleSelectStart(y, x);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    if (!touch) return;
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const cellEl = target?.closest("[data-cell]");
    if (cellEl) {
      const y = parseInt(cellEl.getAttribute("data-y")!, 10);
      const x = parseInt(cellEl.getAttribute("data-x")!, 10);
      handleSelectMove(y, x);
    }
  };

  const restartCurrentLevel = () => {
    setCurrentRound(1);
    setElapsedTime(0);
    setStreakCount(0);
    lastFoundTimeRef.current = null;
    setIsLevelFinished(false);
    setRoundData(
      generateCampaignRound(
        levelConfig.wordsPerRound,
        levelConfig.gridSize,
        false,
      ),
    );
    setFoundWords({});
    setFoundCells({});
    setSelectionCoords([]);
    setBonusNotice(null);
  };

  const nextLevel = () => {
    if (activeLevel < 20) {
      const nextLvl = activeLevel + 1;
      const nextConfig =
        CAMPAIGN_LEVELS.find((l) => l.level === nextLvl) || CAMPAIGN_LEVELS[0];
      setActiveLevel(nextLvl);
      setCurrentRound(1);
      setElapsedTime(0);
      setStreakCount(0);
      lastFoundTimeRef.current = null;
      setIsLevelFinished(false);
      setRoundData(
        generateCampaignRound(
          nextConfig.wordsPerRound,
          nextConfig.gridSize,
          false,
        ),
      );
      setFoundWords({});
      setFoundCells({});
      setSelectionCoords([]);
      setBonusNotice(null);
    } else {
      setGameState({ status: "campaign-select" });
    }
  };

  return (
    <div
      className={`h-[100dvh] max-h-[100dvh] w-full flex flex-col justify-evenly items-center overflow-hidden ${themeStyle.bg} transition-colors duration-500 px-3 py-2 select-none touch-none ${themeStyle.textColor}`}
      style={{ fontFamily: fontStyle.fontFamily }}
      onMouseUp={handleSelectEnd}
      onMouseLeave={handleSelectEnd}
    >
      {/* FLOATING PROMINENT TIME BONUS NOTICE */}
      {bonusNotice && (
        <div
          key={bonusNotice.id}
          className={`fixed top-12 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-black shadow-2xl border-2 flex items-center gap-2 z-50 animate-in fade-in zoom-in-90 duration-150 pointer-events-none ${
            bonusNotice.type === "golden"
              ? "bg-amber-400 text-amber-950 border-amber-200 shadow-amber-500/60"
              : bonusNotice.type === "streak"
                ? "bg-orange-500 text-white border-orange-200 shadow-orange-600/50"
                : "bg-emerald-600 text-white border-emerald-300 shadow-emerald-700/50"
          }`}
        >
          {bonusNotice.type === "golden" && (
            <Sparkles size={16} className="fill-amber-950" />
          )}
          {bonusNotice.type === "streak" && (
            <Flame size={16} className="fill-white" />
          )}
          <span>{bonusNotice.text}</span>
        </div>
      )}

      {/* SECTION 1: Header & Live Star Countdown Bar */}
      <div className="w-full max-w-md flex flex-col items-center shrink-0">
        <div className="w-full flex items-center justify-between mb-1.5 px-0.5">
          <button
            onClick={() => setGameState({ status: "campaign-select" })}
            className="flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/20 transition-all shadow-sm"
          >
            <ArrowLeft size={14} /> Levels
          </button>

          <span className="text-xs uppercase font-black bg-amber-500/20 border border-amber-500/40 text-amber-500 px-3.5 py-1 rounded-full">
            Level {activeLevel} • Round {currentRound}/3
          </span>
          <SoundToggle />
          <button
            onClick={restartCurrentLevel}
            className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 border border-white/20"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* Countdown Bar Box */}
        <div className="w-full bg-black/25 rounded-2xl p-2.5 border border-white/15 relative shadow-inner">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[1, 2, 3].map((starIndex) => (
                  <Star
                    key={starIndex}
                    size={16}
                    className={`${
                      starIndex <= currentEligibleStars
                        ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.9)]"
                        : "text-black/30"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-black tracking-wide">
                {currentEligibleStars === 3
                  ? "3 Stars"
                  : currentEligibleStars === 2
                    ? "2 Stars"
                    : "1 Star"}
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-black">
              {streakCount > 1 && (
                <span className="text-orange-400 flex items-center gap-0.5 text-xs font-black animate-pulse">
                  <Flame size={14} className="fill-orange-400" /> x{streakCount}
                </span>
              )}
              <span className="tracking-wider">{elapsedTime}s</span>
            </div>
          </div>

          {/* Draining Progress Bar */}
          <div className="w-full h-3.5 bg-black/50 rounded-full overflow-hidden relative border border-white/20 shadow-inner">
            <div
              className={`h-full transition-all duration-300 ${
                currentEligibleStars === 3
                  ? "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300"
                  : currentEligibleStars === 2
                    ? "bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-300"
                    : "bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300"
              }`}
              style={{ width: `${barPercent}%` }}
            />

            {/* Threshold Line 1: Drop from 3 Stars to 2 Stars */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-rose-500/90 z-20"
              style={{ left: `${lossStar3Marker}%` }}
            />

            {/* Threshold Line 2: Drop from 2 Stars to 1 Star */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-rose-500/90 z-20"
              style={{ left: `${lossStar2Marker}%` }}
            />
          </div>

          {/* Marker Labels */}
          <div className="relative w-full h-3 text-[9px] font-black tracking-tight text-white/70 mt-0.5">
            <span
              className="absolute -translate-x-1/2 flex items-center gap-0.5"
              style={{ left: `${lossStar2Marker}%` }}
            >
              ▲ -1★
            </span>
            <span
              className="absolute -translate-x-1/2 flex items-center gap-0.5"
              style={{ left: `${lossStar3Marker}%` }}
            >
              ▲ -1★
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Current Word Preview + Grid Board */}
      <div className="w-full max-w-md flex flex-col items-center shrink-0">
        <div
          className={`h-7 flex items-center justify-center text-lg sm:text-xl font-black tracking-widest mb-1.5 ${themeStyle.titleColor}`}
        >
          {currentWord || "FIND THE WORDS"}
        </div>

        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleSelectEnd}
          className={`relative aspect-square w-[min(94vw,50vh)] max-w-[420px] ${themeStyle.cardBg} p-2 sm:p-3 rounded-2xl sm:rounded-3xl border-2 ${themeStyle.border} select-none flex items-center justify-center shadow-lg`}
        >
          <div
            className="grid w-full h-full gap-1 relative z-10"
            style={{
              gridTemplateColumns: `repeat(${board.length || 10}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${board.length || 10}, minmax(0, 1fr))`,
            }}
          >
            {board.map((row, y) =>
              row.map((letter, x) => {
                const cellKey = `${y}-${x}`;
                const isFound = foundCells[cellKey];
                const isSelected = selectionCoords.some(
                  (c) => c.y === y && c.x === x,
                );

                let cellClass = `w-full h-full flex items-center justify-center rounded-lg font-black text-[clamp(16px,4.5vw,23px)] uppercase cursor-pointer transition-all duration-150 ${themeStyle.cellDefault} ${themeStyle.cellHover} `;

                if (isSelected) {
                  cellClass +=
                    "scale-105 shadow-md !bg-amber-500 !text-black z-30";
                } else if (isFound) {
                  cellClass +=
                    "!bg-emerald-500/80 !text-white line-through opacity-85";
                }

                return (
                  <div
                    key={cellKey}
                    data-cell="true"
                    data-y={y}
                    data-x={x}
                    onMouseDown={() => handleSelectStart(y, x)}
                    onMouseEnter={() => handleSelectMove(y, x)}
                    className={cellClass}
                  >
                    {letter}
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: Dedicated "Words To Find" Tray Card */}
      <div className="w-full max-w-md shrink-0 px-0.5">
        <div
          className={`${themeStyle.cardBg} border-2 ${themeStyle.border} rounded-2xl p-2.5 sm:p-3 shadow-md`}
        >
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider mb-2 opacity-75">
            <span>Words to Find</span>
            <span>
              {Object.keys(foundWords).length} / {wordsToFind.length} Found
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 max-h-[14vh] overflow-y-auto">
            {wordsToFind.map((word) => {
              const isFound = foundWords[word];
              const isGolden = currentRound === 3 && word === goldenWord;

              let badgeStyle =
                "bg-black/20 border-black/10 text-current hover:bg-black/30";
              if (isGolden && !isFound) {
                badgeStyle =
                  "bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-yellow-200 shadow-[0_0_10px_rgba(245,158,11,0.5)] font-black animate-pulse";
              } else if (isFound) {
                badgeStyle =
                  "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 line-through border-emerald-500/30 opacity-70";
              }

              return (
                <div
                  key={word}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-black border tracking-wide transition-all ${badgeStyle}`}
                >
                  {isFound && (
                    <CheckCircle2
                      size={13}
                      className="text-emerald-500 shrink-0"
                    />
                  )}
                  {isGolden && !isFound && (
                    <Sparkles
                      size={13}
                      className="text-amber-950 fill-amber-950 shrink-0"
                    />
                  )}
                  <span>{word}</span>
                  {isGolden && !isFound && (
                    <span className="text-[9px] bg-amber-950/20 text-amber-950 px-1 rounded font-black">
                      +15s
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Level Complete Modal */}
      {isLevelFinished && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className={`${themeStyle.cardBg} border-2 ${themeStyle.border} p-6 sm:p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95`}
          >
            <h2 className={`text-2xl font-black mb-1 ${themeStyle.titleColor}`}>
              LEVEL {activeLevel} COMPLETE!
            </h2>
            <p className="text-xs font-bold opacity-75 mb-4">
              All 3 rounds cleared
            </p>

            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3].map((starIndex) => (
                <Star
                  key={starIndex}
                  size={36}
                  className={`${
                    starIndex <= earnedStars
                      ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                      : "text-black/30"
                  }`}
                />
              ))}
            </div>

            <div className="bg-black/10 rounded-2xl p-3 mb-5 text-sm font-bold flex justify-around">
              <div>
                <span className="block text-[10px] opacity-60">FINAL TIME</span>
                <span className="font-mono text-base font-black">
                  {elapsedTime}s
                </span>
              </div>
              <div className="border-r border-black/10" />
              <div>
                <span className="block text-[10px] opacity-60">BEST TIME</span>
                <span className="font-mono text-base font-black">
                  {progress[activeLevel]?.bestTime || elapsedTime}s
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={nextLevel}
                className={`w-full ${themeStyle.accentBtn} font-black py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md`}
              >
                <Play size={16} /> Next Level
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={restartCurrentLevel}
                  className="bg-black/20 hover:bg-black/30 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={14} /> Retry
                </button>
                <button
                  onClick={() => setGameState({ status: "campaign-select" })}
                  className="bg-black/20 hover:bg-black/30 font-bold py-2 rounded-xl text-xs"
                >
                  All Levels
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
