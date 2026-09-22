import React, { useState, useEffect, useMemo } from "react";
import { useGameStore } from "../../store/gameStore";
import {
  useCampaignStore,
  CAMPAIGN_LEVELS,
  generateCampaignRound,
} from "../../store/campaignStore";
import { THEMES, FONTS } from "../../lib/themeStyles";
import type { CellCoord, FontType } from "../../types/game";
// import { generateGrid } from "../../lib/gridGenerator";
// import { WORD_COLLECTIONS } from "../../lib/wordCollections";
import { Star, ArrowLeft, RotateCcw, Play, CheckCircle2 } from "lucide-react";
// const createRoundData = (wordsCount: number, gridSize: number) => {
//   const allWords = Object.values(WORD_COLLECTIONS).flat();
//   const shuffledPool = [...new Set(allWords)].sort(() => 0.5 - Math.random());
//   const roundWords = shuffledPool.slice(0, wordsCount);
//   const { grid, placedWords } = generateGrid(roundWords, gridSize);
//   return { board: grid, wordsToFind: placedWords };
// };

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

  // Round & Board state initialized directly without sync effects
  const [currentRound, setCurrentRound] = useState(1);
  const [{ board, wordsToFind }, setRoundData] = useState(() =>
    generateCampaignRound(levelConfig.wordsPerRound, levelConfig.gridSize),
  );
  const [foundWords, setFoundWords] = useState<Record<string, boolean>>({});
  const [foundCells, setFoundCells] = useState<Record<string, boolean>>({});

  // Selection interaction state
  const [startCell, setStartCell] = useState<CellCoord | null>(null);
  const [selectionCoords, setSelectionCoords] = useState<CellCoord[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Time & Star metrics
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLevelFinished, setIsLevelFinished] = useState(false);
  const [earnedStars, setEarnedStars] = useState(1);

  // Timer interval (only runs asynchronously; no synchronous setState)
  useEffect(() => {
    if (isLevelFinished) return;

    const interval = window.setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isLevelFinished]);

  const currentEligibleStars =
    elapsedTime <= levelConfig.threeStarTime
      ? 3
      : elapsedTime <= levelConfig.twoStarTime
        ? 2
        : 1;

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
      setSelectionCoords(newPath);
    }
  };

  // Event-driven Round Progression & Completion
  const handleSelectEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (wordsToFind.includes(currentWord) && !foundWords[currentWord]) {
      const nextFoundCells = { ...foundCells };
      selectionCoords.forEach((cell) => {
        nextFoundCells[`${cell.y}-${cell.x}`] = true;
      });

      const nextFoundWords = { ...foundWords, [currentWord]: true };
      setFoundCells(nextFoundCells);
      setFoundWords(nextFoundWords);

      // Check if all words in this round are completed
      if (Object.keys(nextFoundWords).length === wordsToFind.length) {
        if (currentRound < 3) {
          setCurrentRound((prev) => prev + 1);
          setRoundData(
            generateCampaignRound(
              levelConfig.wordsPerRound,
              levelConfig.gridSize,
            ),
          );
          setFoundWords({});
          setFoundCells({});
        } else {
          // All 3 rounds cleared — Level Complete
          const stars = saveLevelResult(activeLevel, elapsedTime);
          setEarnedStars(stars);
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
    setIsLevelFinished(false);
    setRoundData(
      generateCampaignRound(levelConfig.wordsPerRound, levelConfig.gridSize),
    );
    setFoundWords({});
    setFoundCells({});
    setSelectionCoords([]);
  };
  const nextLevel = () => {
    if (activeLevel < 20) {
      const nextLvl = activeLevel + 1;
      const nextConfig =
        CAMPAIGN_LEVELS.find((l) => l.level === nextLvl) || CAMPAIGN_LEVELS[0];
      setActiveLevel(nextLvl);
      setCurrentRound(1);
      setElapsedTime(0);
      setIsLevelFinished(false);
      setRoundData(
        generateCampaignRound(nextConfig.wordsPerRound, nextConfig.gridSize),
      );
      setFoundWords({});
      setFoundCells({});
      setSelectionCoords([]);
    } else {
      setGameState({ status: "campaign-select" });
    }
  };

  const progressPercent = Math.min(
    100,
    (elapsedTime / levelConfig.twoStarTime) * 100,
  );

  return (
    <div
      className={`h-[100dvh] max-h-[100dvh] w-full flex flex-col justify-between overflow-hidden ${themeStyle.bg} transition-colors duration-500 px-3 py-2 select-none touch-none ${themeStyle.textColor}`}
      style={{ fontFamily: fontStyle.fontFamily }}
      onMouseUp={handleSelectEnd}
      onMouseLeave={handleSelectEnd}
    >
      {/* SEGMENT 1: Top Bar & Live Star Indicator */}
      <div className="w-full max-w-xl mx-auto flex flex-col items-center shrink-0">
        <div className="w-full flex items-center justify-between mb-1 px-1">
          <button
            onClick={() => setGameState({ status: "campaign-select" })}
            className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/20 transition-all shadow-sm"
          >
            <ArrowLeft size={14} /> Levels
          </button>

          <span className="text-xs uppercase font-black bg-amber-500/20 border border-amber-500/40 text-amber-500 px-3 py-1 rounded-full">
            Level {activeLevel} • Round {currentRound}/3
          </span>

          <button
            onClick={restartCurrentLevel}
            className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 border border-white/20"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        <div className="w-full bg-black/20 rounded-2xl p-2 border border-white/10 mb-1">
          <div className="flex justify-between items-center mb-1 text-xs font-black">
            <span className="flex items-center gap-1 text-amber-400">
              <Star size={14} className="fill-amber-400" />
              {currentEligibleStars} Star Potential
            </span>
            <span className="font-mono text-sm tracking-widest">
              {elapsedTime}s
            </span>
          </div>

          <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden relative">
            <div
              className={`h-full transition-all duration-300 ${
                currentEligibleStars === 3
                  ? "bg-amber-400"
                  : currentEligibleStars === 2
                    ? "bg-sky-400"
                    : "bg-emerald-400"
              }`}
              style={{ width: `${Math.max(5, 100 - progressPercent)}%` }}
            />
          </div>
        </div>

        <div
          className={`h-7 flex items-center justify-center text-lg sm:text-xl font-black tracking-widest ${themeStyle.titleColor}`}
        >
          {currentWord || "FIND THE WORDS"}
        </div>
      </div>

      {/* SEGMENT 2: Grid Board */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center py-1">
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleSelectEnd}
          className={`relative aspect-square w-full max-w-[min(96vw,56vh)] max-h-[min(96vw,56vh)] ${themeStyle.cardBg} p-2 sm:p-3.5 rounded-2xl sm:rounded-3xl border-2 ${themeStyle.border} select-none flex items-center justify-center`}
        >
          <div
            className="grid w-full h-full gap-1 sm:gap-1.5 relative z-10"
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

                let cellClass = `w-full h-full flex items-center justify-center rounded-lg font-black text-[clamp(16px,4.5vw,24px)] uppercase cursor-pointer transition-all duration-150 ${themeStyle.cellDefault} ${themeStyle.cellHover} `;

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

      {/* SEGMENT 3: Word Target Bank */}
      <div className="w-full max-w-xl mx-auto shrink-0 max-h-[17vh] overflow-y-auto px-1 py-1">
        <div className="flex flex-wrap justify-center gap-2">
          {wordsToFind.map((word) => {
            const isFound = foundWords[word];
            return (
              <div
                key={word}
                className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs sm:text-base font-black border tracking-wide transition-all ${
                  isFound
                    ? "bg-emerald-600/30 text-emerald-300 line-through border-emerald-500/30"
                    : "bg-black/30 border-white/20 text-white"
                }`}
              >
                {isFound && (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                )}
                <span>{word}</span>
              </div>
            );
          })}
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
                <span className="block text-[10px] opacity-60">TIME</span>
                <span className="font-mono text-base font-black">
                  {elapsedTime}s
                </span>
              </div>
              <div className="border-r border-black/10" />
              <div>
                <span className="block text-[10px] opacity-60">BEST</span>
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
