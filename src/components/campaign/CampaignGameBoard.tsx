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
  Eye,
  EyeOff,
  Timer,
  Zap,
  Trophy,
  Award,
  Search,
  Pencil,
} from "lucide-react";
import { haptic } from "../../lib/haptics";
import { soundFx } from "../../lib/audioFx";
import { SoundToggle } from "../ui/SoundToggle";
import { scrambleWord } from "../../lib/wordModifiers";

interface BonusNotice {
  id: number;
  text: string;
  type: "base" | "streak" | "golden" | "hazard" | "disarm";
}

const createHazardsForRound = (
  gridSize: number,
  count: number = 3,
): Record<string, boolean> => {
  const hazards: Record<string, boolean> = {};
  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < 60) {
    attempts++;
    const y = Math.floor(Math.random() * gridSize);
    const x = Math.floor(Math.random() * gridSize);
    const key = `${y}-${x}`;
    if (!hazards[key]) {
      hazards[key] = true;
      placed++;
    }
  }
  return hazards;
};

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

  const isPhase2 = levelConfig.phase === 2;
  const isHybrid = levelConfig.modifier === "hybrid";

  const isAnagramActive =
    levelConfig.modifier === "anagram" ||
    (isHybrid &&
      (activeLevel === 36 || activeLevel === 37 || activeLevel === 40));

  const isFogActive =
    levelConfig.modifier === "fog" ||
    (isHybrid && activeLevel >= 36 && activeLevel <= 40);

  const isHazardActive =
    levelConfig.modifier === "hazard" ||
    (isHybrid &&
      (activeLevel === 38 || activeLevel === 39 || activeLevel === 40));

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

  // Hazard / Voltage state & Shock Counter
  const [hazardCells, setHazardCells] = useState<Record<string, boolean>>(() =>
    isHazardActive
      ? createHazardsForRound(levelConfig.gridSize, activeLevel >= 34 ? 3 : 2)
      : {},
  );
  const [disarmedHazards, setDisarmedHazards] = useState<
    Record<string, boolean>
  >({});
  const [isShocked, setIsShocked] = useState(false);
  const [shockCount, setShockCount] = useState(0);

  // Fog of War States & Scout Mode
  const [isFogEngaged, setIsFogEngaged] = useState(false);
  const [isInspectMode, setIsInspectMode] = useState(false);
  const [activeTouchCell, setActiveTouchCell] = useState<CellCoord | null>(
    null,
  );

  // Default to Flashlight Scout mode when starting a Fog round
  useEffect(() => {
    if (!isFogActive) {
      setIsFogEngaged(false);
      setIsInspectMode(false);
      return;
    }
    setIsFogEngaged(false);
    setIsInspectMode(true);
    const timer = setTimeout(() => {
      setIsFogEngaged(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, [currentRound, activeLevel, isFogActive]);

  // Anagram Scrambled Words Map
  const scrambledMap = useMemo(() => {
    if (!isAnagramActive) return {};
    const map: Record<string, string> = {};
    const keepEnds = activeLevel <= 23;
    wordsToFind.forEach((word) => {
      map[word] = scrambleWord(word, keepEnds);
    });
    return map;
  }, [wordsToFind, isAnagramActive, activeLevel]);

  // Selection interaction
  const [startCell, setStartCell] = useState<CellCoord | null>(null);
  const [selectionCoords, setSelectionCoords] = useState<CellCoord[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Time & Metrics
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLevelFinished, setIsLevelFinished] = useState(false);
  const [earnedStars, setEarnedStars] = useState(1);
  const [streakCount, setStreakCount] = useState(0);
  const lastFoundTimeRef = useRef<number | null>(null);
  const [bonusNotice, setBonusNotice] = useState<BonusNotice | null>(null);

  useEffect(() => {
    if (isLevelFinished) return;
    const interval = window.setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLevelFinished]);

  useEffect(() => {
    if (!bonusNotice) return;
    const timer = window.setTimeout(() => setBonusNotice(null), 2200);
    return () => clearTimeout(timer);
  }, [bonusNotice]);

  const currentEligibleStars = isPhase2
    ? isHazardActive
      ? Math.max(1, 3 - shockCount)
      : 3
    : elapsedTime <= levelConfig.threeStarTime
      ? 3
      : elapsedTime <= levelConfig.twoStarTime
        ? 2
        : 1;

  const remainingTime = Math.max(0, levelConfig.maxBudget - elapsedTime);
  const barPercent = Math.min(
    100,
    Math.max(0, (remainingTime / levelConfig.maxBudget) * 100),
  );
  const lossStar3Marker =
    ((levelConfig.maxBudget - levelConfig.threeStarTime) /
      levelConfig.maxBudget) *
    100;
  const lossStar2Marker =
    ((levelConfig.maxBudget - levelConfig.twoStarTime) /
      levelConfig.maxBudget) *
    100;

  const wordsFoundCount = Object.keys(foundWords).length;
  const roundProgressPercent = Math.round(
    ((currentRound - 1) / 3) * 100 +
      (wordsFoundCount / Math.max(1, wordsToFind.length)) * (100 / 3),
  );

  const currentWord = selectionCoords
    .map((c) => board[c.y]?.[c.x] || "")
    .join("");

  // Projects the light focal point ABOVE the finger so letters are never hidden
  const getFlashlightFocalPoint = (cell: CellCoord) => {
    if (cell.y <= 1) {
      return { y: cell.y, x: cell.x };
    }
    return { y: cell.y - 1.65, x: cell.x };
  };

  const checkCellVisibility = (y: number, x: number) => {
    if (!isFogActive || !isFogEngaged) return true;
    if (foundCells[`${y}-${x}`]) return true;
    if (selectionCoords.some((c) => c.y === y && c.x === x)) return true;

    if (activeTouchCell) {
      if (isInspectMode) {
        const focal = getFlashlightFocalPoint(activeTouchCell);
        const dist = Math.hypot(x - focal.x, y - focal.y);
        return dist <= (activeLevel >= 29 ? 1.45 : 1.85);
      } else {
        const dist = Math.hypot(x - activeTouchCell.x, y - activeTouchCell.y);
        return dist <= (activeLevel >= 29 ? 1.3 : 1.85);
      }
    }
    return false;
  };

  const scoutedLetters = useMemo(() => {
    if (!isFogActive || !isInspectMode || !activeTouchCell) return [];
    const focal = getFlashlightFocalPoint(activeTouchCell);
    const letters: string[] = [];

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const py = Math.round(focal.y) + dy;
        const px = Math.round(focal.x) + dx;
        if (board[py]?.[px]) {
          letters.push(board[py][px]);
        }
      }
    }
    return letters.slice(0, 5);
  }, [isFogActive, isInspectMode, activeTouchCell, board]);

  const getCellFromPoint = (
    clientX: number,
    clientY: number,
  ): CellCoord | null => {
    const target = document.elementFromPoint(clientX, clientY);
    const cellEl = target?.closest("[data-cell]");
    if (cellEl) {
      const y = parseInt(cellEl.getAttribute("data-y")!, 10);
      const x = parseInt(cellEl.getAttribute("data-x")!, 10);
      return { y, x };
    }
    return null;
  };

  const handleSelectStart = (y: number, x: number) => {
    if (isFogActive && isInspectMode) return;
    setIsDragging(true);
    const initial = { y, x };
    setStartCell(initial);
    setActiveTouchCell(initial);
    setSelectionCoords([initial]);
  };

  const handleSelectMove = (y: number, x: number) => {
    if (isFogActive && isInspectMode) {
      setActiveTouchCell({ y, x });
      return;
    }

    setActiveTouchCell({ y, x });
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
      }
      setSelectionCoords(newPath);
    }
  };

  const handleSelectEnd = () => {
    if (isFogActive && isInspectMode) {
      setActiveTouchCell(null);
      return;
    }

    setActiveTouchCell(null);
    if (!isDragging) return;
    setIsDragging(false);

    const isMatch =
      wordsToFind.includes(currentWord) && !foundWords[currentWord];

    const touchedActiveHazards = selectionCoords
      .map((c) => `${c.y}-${c.x}`)
      .filter((k) => hazardCells[k] && !disarmedHazards[k]);

    if (isMatch) {
      const now = Date.now();
      const isGolden = currentRound === 3 && currentWord === goldenWord;

      let currentStreak = 1;
      let streakBonus = 0;
      if (lastFoundTimeRef.current && now - lastFoundTimeRef.current <= 7000) {
        currentStreak = streakCount + 1;
        streakBonus = currentStreak * 3;
      }
      setStreakCount(currentStreak);
      lastFoundTimeRef.current = now;

      if (touchedActiveHazards.length > 0) {
        const updated = { ...disarmedHazards };
        touchedActiveHazards.forEach((k) => {
          updated[k] = true;
        });
        setDisarmedHazards(updated);
        haptic.voltageDisarm();
        soundFx.playVoltageDisarm();
      }

      if (!isPhase2) {
        const secondsCredited = 5 + streakBonus + (isGolden ? 15 : 0);
        setElapsedTime((prev) => Math.max(0, prev - secondsCredited));
      }

      if (isGolden) {
        haptic.goldenFound();
        soundFx.playGoldenFound();
      } else if (touchedActiveHazards.length === 0) {
        haptic.wordFound();
        soundFx.playWordFound();
      }

      if (touchedActiveHazards.length > 0) {
        setBonusNotice({
          id: Date.now(),
          text: "VOLTAGE TILE DISARMED!",
          type: "disarm",
        });
      } else if (isGolden) {
        setBonusNotice({
          id: Date.now(),
          text: isPhase2
            ? "GOLDEN WORD SOLVED!"
            : `+${20 + streakBonus}s GOLDEN WORD!`,
          type: "golden",
        });
      } else if (currentStreak > 1) {
        setBonusNotice({
          id: Date.now(),
          text: isPhase2
            ? `STREAK x${currentStreak}!`
            : `+${5 + streakBonus}s STREAK x${currentStreak}!`,
          type: "streak",
        });
      } else {
        setBonusNotice({
          id: Date.now(),
          text: isPhase2 ? "WORD SOLVED!" : "+5s Time Added!",
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
          if (isHazardActive) {
            setHazardCells(
              createHazardsForRound(
                levelConfig.gridSize,
                activeLevel >= 34 ? 3 : 2,
              ),
            );
            setDisarmedHazards({});
          }
          setFoundWords({});
          setFoundCells({});
          lastFoundTimeRef.current = null;
        } else {
          const stars = saveLevelResult(
            activeLevel,
            elapsedTime,
            currentEligibleStars,
          );
          setEarnedStars(stars);
          if (activeLevel === 40) {
            haptic.grandVictory();
            soundFx.playGrandVictory();
          } else {
            soundFx.playLevelComplete();
          }
          setIsLevelFinished(true);
        }
      }
    } else if (touchedActiveHazards.length > 0) {
      const newShockCount = shockCount + 1;
      setStreakCount(0);
      setShockCount(newShockCount);
      haptic.voltageShock();
      soundFx.playVoltageShock();
      setIsShocked(true);
      setTimeout(() => setIsShocked(false), 450);

      const remainingStarsAfterShock = Math.max(1, 3 - newShockCount);

      setBonusNotice({
        id: Date.now(),
        text:
          remainingStarsAfterShock < currentEligibleStars
            ? "VOLTAGE SHOCK! -1★"
            : "VOLTAGE SHOCK! Streak Lost",
        type: "hazard",
      });
    }

    setStartCell(null);
    setSelectionCoords([]);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const directCell = getCellFromPoint(touch.clientX, touch.clientY);
    if (!directCell) return;

    if (isFogActive && isInspectMode) {
      setActiveTouchCell(directCell);
      haptic.tick();
      return;
    }

    handleSelectStart(directCell.y, directCell.x);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const directCell = getCellFromPoint(touch.clientX, touch.clientY);
    if (!directCell) return;

    if (isFogActive && isInspectMode) {
      if (
        directCell.y !== activeTouchCell?.y ||
        directCell.x !== activeTouchCell?.x
      ) {
        setActiveTouchCell(directCell);
        haptic.tick();
      }
      return;
    }

    if (!isDragging) return;
    handleSelectMove(directCell.y, directCell.x);
  };

  const restartCurrentLevel = () => {
    setCurrentRound(1);
    setElapsedTime(0);
    setStreakCount(0);
    setShockCount(0);
    lastFoundTimeRef.current = null;
    setIsLevelFinished(false);
    setActiveTouchCell(null);
    if (isHazardActive) {
      setHazardCells(
        createHazardsForRound(levelConfig.gridSize, activeLevel >= 34 ? 3 : 2),
      );
      setDisarmedHazards({});
    }
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
    if (activeLevel < 40) {
      const nextLvl = activeLevel + 1;
      const nextConfig =
        CAMPAIGN_LEVELS.find((l) => l.level === nextLvl) || CAMPAIGN_LEVELS[0];
      const nextHasHazard =
        nextConfig.modifier === "hazard" ||
        (nextConfig.modifier === "hybrid" &&
          (nextLvl === 38 || nextLvl === 39 || nextLvl === 40));

      setActiveLevel(nextLvl);
      setCurrentRound(1);
      setElapsedTime(0);
      setStreakCount(0);
      setShockCount(0);
      lastFoundTimeRef.current = null;
      setIsLevelFinished(false);
      setActiveTouchCell(null);

      if (nextHasHazard) {
        setHazardCells(
          createHazardsForRound(nextConfig.gridSize, nextLvl >= 34 ? 3 : 2),
        );
        setDisarmedHazards({});
      } else {
        setHazardCells({});
        setDisarmedHazards({});
      }

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

  const focalPoint =
    activeTouchCell && isInspectMode
      ? getFlashlightFocalPoint(activeTouchCell)
      : null;
  const boardSize = board.length || 10;

  return (
    <div
      className={`h-[100dvh] max-h-[100dvh] w-full flex flex-col justify-evenly items-center overflow-hidden ${
        isShocked ? "bg-rose-950/80 animate-pulse" : themeStyle.bg
      } transition-colors duration-300 px-3 py-2 select-none touch-none ${themeStyle.textColor}`}
      style={{ fontFamily: fontStyle.fontFamily }}
      onMouseUp={handleSelectEnd}
      onMouseLeave={handleSelectEnd}
    >
      {/* BONUS NOTIFICATION BANNER */}
      {bonusNotice && (
        <div
          key={bonusNotice.id}
          className={`fixed top-12 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-black shadow-2xl border-2 flex items-center gap-2 z-50 animate-in fade-in zoom-in-90 duration-150 pointer-events-none ${
            bonusNotice.type === "golden"
              ? "bg-amber-400 text-amber-950 border-amber-200 shadow-amber-500/60"
              : bonusNotice.type === "streak"
                ? "bg-orange-500 text-white border-orange-200 shadow-orange-600/50"
                : bonusNotice.type === "hazard"
                  ? "bg-rose-600 text-white border-rose-300 shadow-rose-700/60 animate-bounce"
                  : bonusNotice.type === "disarm"
                    ? "bg-cyan-400 text-slate-950 border-cyan-100 shadow-cyan-500/60"
                    : "bg-emerald-600 text-white border-emerald-300 shadow-emerald-700/50"
          }`}
        >
          {bonusNotice.type === "golden" && (
            <Sparkles size={16} className="fill-amber-950" />
          )}
          {bonusNotice.type === "streak" && (
            <Flame size={16} className="fill-white" />
          )}
          {(bonusNotice.type === "hazard" || bonusNotice.type === "disarm") && (
            <Zap size={16} className="fill-current" />
          )}
          <span>{bonusNotice.text}</span>
        </div>
      )}

      {/* SECTION 1: Top Navigation & Status */}
      <div className="w-full max-w-md flex flex-col items-center shrink-0">
        <div className="w-full flex items-center justify-between mb-1.5 px-0.5">
          <button
            onClick={() => setGameState({ status: "campaign-select" })}
            className="flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/20 transition-all shadow-sm"
          >
            <ArrowLeft size={14} /> Levels
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-xs uppercase font-black bg-amber-500/20 border border-amber-500/40 text-amber-500 px-3.5 py-1 rounded-full">
              Level {activeLevel} • Round {currentRound}/3
            </span>
            {isFogActive && (
              <span
                title={isFogEngaged ? "Fog Active" : "Briefing Phase"}
                className={`flex items-center p-1 rounded-full border text-[10px] ${
                  isFogEngaged
                    ? "bg-indigo-900/40 border-indigo-500/40 text-indigo-300"
                    : "bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse"
                }`}
              >
                {isFogEngaged ? <EyeOff size={13} /> : <Eye size={13} />}
              </span>
            )}
            {isHazardActive && (
              <span
                title="Voltage Hazard Active"
                className="flex items-center p-1 rounded-full border border-amber-500/40 bg-amber-500/20 text-amber-400 animate-pulse text-[10px]"
              >
                <Zap size={13} />
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <SoundToggle />
            <button
              onClick={restartCurrentLevel}
              className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 border border-white/20"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Top Status Card */}
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
                {isPhase2
                  ? isHazardActive
                    ? `${currentEligibleStars}★ (Shocks: ${shockCount})`
                    : "Untimed Puzzle Mode"
                  : `${currentEligibleStars} Stars Active`}
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-black">
              {streakCount > 1 && (
                <span className="text-orange-400 flex items-center gap-0.5 text-xs font-black animate-pulse">
                  <Flame size={14} className="fill-orange-400" /> x{streakCount}
                </span>
              )}
              <span className="tracking-wider flex items-center gap-1">
                {isPhase2 && <Timer size={13} className="opacity-60" />}
                {elapsedTime}s
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          {isPhase2 ? (
            <div className="w-full h-3.5 bg-black/50 rounded-full overflow-hidden relative border border-white/20 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${roundProgressPercent}%` }}
              />
            </div>
          ) : (
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
              <div
                className="absolute top-0 bottom-0 w-1 bg-rose-500/90 z-20"
                style={{ left: `${lossStar3Marker}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-1 bg-rose-500/90 z-20"
                style={{ left: `${lossStar2Marker}%` }}
              />
            </div>
          )}

          <div className="relative w-full h-3 text-[9px] font-black tracking-tight text-white/70 mt-0.5">
            {isPhase2 ? (
              <div className="flex justify-between px-1">
                <span>R1</span>
                <span>R2</span>
                <span>R3 Complete: {currentEligibleStars}★</span>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: Board & Flashlight Controls */}
      <div className="w-full max-w-md flex flex-col items-center shrink-0">
        {isFogActive ? (
          <div className="w-full flex items-center justify-between gap-2 mb-1 px-1">
            <div className="flex p-0.5 rounded-xl bg-black/40 border border-white/10 shadow-inner">
              <button
                onClick={() => {
                  setIsInspectMode(true);
                  setActiveTouchCell(null);
                  setSelectionCoords([]);
                  haptic.tick();
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all ${
                  isInspectMode
                    ? "bg-amber-400 text-slate-950 shadow-md scale-102"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Search size={13} />
                <span>🔦 Scout</span>
              </button>

              <button
                onClick={() => {
                  setIsInspectMode(false);
                  setActiveTouchCell(null);
                  haptic.tick();
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all ${
                  !isInspectMode
                    ? "bg-emerald-500 text-slate-950 shadow-md scale-102"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Pencil size={13} />
                <span>✏️ Draw</span>
              </button>
            </div>

            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 truncate">
              {isInspectMode
                ? "Spotlight illuminates ahead"
                : "Swipe to connect"}
            </span>
          </div>
        ) : (
          <div
            className={`h-7 flex items-center justify-center text-lg sm:text-xl font-black tracking-widest mb-1 ${themeStyle.titleColor}`}
          >
            {currentWord ||
              (isHazardActive ? "AVOID VOLTAGE SHOCKS" : "FIND THE WORDS")}
          </div>
        )}

        {/* Live Scout Readout HUD */}
        {isFogActive && (
          <div className="h-6 flex items-center justify-center text-xs sm:text-sm font-black tracking-widest mb-1 text-center">
            {isInspectMode ? (
              activeTouchCell && scoutedLetters.length > 0 ? (
                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/20 px-3.5 py-0.5 rounded-full text-current animate-in fade-in shadow-md">
                  <Search size={12} className="text-amber-400" />
                  <span className="text-[11px] opacity-75 font-bold uppercase tracking-wider">
                    BEAM:
                  </span>
                  <span className="font-mono tracking-widest font-black text-sm text-amber-300">
                    {scoutedLetters.join(" ")}
                  </span>
                </div>
              ) : (
                <span className="opacity-60 text-[11px] uppercase tracking-wider">
                  Drag across grid to illuminate dark tiles
                </span>
              )
            ) : (
              <span className={`font-mono text-base ${themeStyle.titleColor}`}>
                {currentWord || "DRAG TO SELECT WORD"}
              </span>
            )}
          </div>
        )}

        {/* Board Container: Pitch-Dark in Fog Mode */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleSelectEnd}
          className={`relative aspect-square w-[min(94vw,48vh)] max-w-[420px] ${
            isFogActive && isFogEngaged
              ? "bg-[#070b14] border-slate-800/90 shadow-2xl"
              : `${themeStyle.cardBg} border-2${themeStyle.border} shadow-lg`
          } p-2 sm:p-3 rounded-2xl sm:rounded-3xl border-2 select-none flex items-center justify-center transition-colors duration-500 overflow-hidden`}
        >
          {/* Luminous Spotlight SVG Overlay */}
          {isFogActive && isInspectMode && activeTouchCell && focalPoint && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-20"
              viewBox={`0 0 ${boardSize * 100} ${boardSize * 100}`}
            >
              <defs>
                <radialGradient id="spotlightGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                  <stop offset="60%" stopColor="#ffffff" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Upward beam cone projecting from touch to spotlight */}
              <polygon
                points={`
                  ${activeTouchCell.x * 100 + 50},${activeTouchCell.y * 100 + 50} 
                  ${focalPoint.x * 100 - 80},${focalPoint.y * 100 + 20} 
                  ${focalPoint.x * 100 + 180},${focalPoint.y * 100 + 20}
                `}
                fill="url(#spotlightGlow)"
              />

              {/* Radiant Circular Spotlight Halo */}
              <circle
                cx={focalPoint.x * 100 + 50}
                cy={focalPoint.y * 100 + 50}
                r="135"
                fill="url(#spotlightGlow)"
              />
            </svg>
          )}

          {/* Board Grid Cells */}
          <div
            className="grid w-full h-full gap-1 relative z-10"
            style={{
              gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${boardSize}, minmax(0, 1fr))`,
            }}
          >
            {board.map((row, y) =>
              row.map((letter, x) => {
                const cellKey = `${y}-${x}`;
                const isFound = foundCells[cellKey];
                const isSelected = selectionCoords.some(
                  (c) => c.y === y && c.x === x,
                );
                const isVisible = checkCellVisibility(y, x);

                const isHazard = hazardCells[cellKey];
                const isDisarmed = disarmedHazards[cellKey];

                const isFocalCenter =
                  isInspectMode &&
                  focalPoint &&
                  Math.round(focalPoint.y) === y &&
                  Math.round(focalPoint.x) === x;

                let cellClass = `relative w-full h-full flex items-center justify-center rounded-lg font-black text-[clamp(16px,4.5vw,23px)] uppercase cursor-pointer transition-all duration-150 `;

                if (isSelected) {
                  cellClass +=
                    "scale-105 shadow-md !bg-amber-500 !text-black z-30 ring-2 ring-white ";
                } else if (isFound) {
                  cellClass +=
                    "!bg-emerald-500/80 !text-white line-through opacity-90 shadow-[0_0_8px_rgba(16,185,129,0.5)] ";
                } else if (!isVisible) {
                  // Cloaked in Dark Night: pitch-dark rounded square
                  cellClass +=
                    "!bg-slate-900/90 !border-slate-800/50 text-transparent opacity-20 select-none shadow-none ";
                } else if (isHazard && !isDisarmed) {
                  cellClass +=
                    "bg-amber-500/20 border-2 border-amber-400 text-amber-500 dark:text-amber-300 animate-pulse ";
                } else if (isHazard && isDisarmed) {
                  cellClass +=
                    "bg-cyan-500/15 border border-cyan-400/50 text-cyan-600 dark:text-cyan-300 opacity-80 ";
                } else {
                  // BRIGHT SPOTLIGHT TILE: Normal vibrant theme tile!
                  cellClass += `${themeStyle.cellDefault} ${themeStyle.cellHover} `;
                  if (isFogActive && isFogEngaged) {
                    if (isFocalCenter) {
                      cellClass +=
                        "ring-2 ring-white shadow-[0_0_15px_rgba(255,255,255,0.7)] scale-105 z-20 ";
                    } else {
                      cellClass +=
                        "ring-1 ring-white/50 shadow-[0_0_8px_rgba(255,255,255,0.3)] ";
                    }
                  }
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
                    {isVisible && isHazard && !isDisarmed && (
                      <Zap
                        size={10}
                        className="absolute top-0.5 right-0.5 text-amber-400 fill-amber-400 animate-pulse pointer-events-none"
                      />
                    )}
                    {isVisible ? letter : "•"}
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
            <span>
              {isAnagramActive
                ? "Decipher the Words"
                : isFogActive
                  ? "Scout & Reveal Words"
                  : isHazardActive
                    ? "Disarm & Find Words"
                    : "Words to Find"}
            </span>
            <span>
              {wordsFoundCount} / {wordsToFind.length} Found
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 max-h-[14vh] overflow-y-auto">
            {wordsToFind.map((word) => {
              const isFound = foundWords[word];
              const isGolden = currentRound === 3 && word === goldenWord;
              const displayWord =
                isFound || !isAnagramActive ? word : scrambledMap[word] || word;

              let badgeStyle =
                "bg-black/20 border-black/10 text-current hover:bg-black/30";
              if (isGolden && !isFound) {
                badgeStyle =
                  "bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-yellow-200 shadow-[0_0_10px_rgba(245,158,11,0.5)] font-black animate-pulse";
              } else if (isFound) {
                badgeStyle =
                  "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 line-through border-emerald-500/30 opacity-70";
              } else if (isAnagramActive) {
                badgeStyle =
                  "bg-amber-500/15 border-amber-500/35 text-amber-300 tracking-wider";
              } else if (isFogActive) {
                badgeStyle =
                  "bg-black/20 border-white/10 text-current opacity-85";
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
                  <span
                    className={!isFound && isAnagramActive ? "font-mono" : ""}
                  >
                    {displayWord}
                  </span>
                  {isGolden && !isFound && (
                    <span className="text-[9px] bg-amber-950/20 text-amber-950 px-1 rounded font-black">
                      {isPhase2 ? "GOLDEN" : "+15s"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Level Complete / Grand Finale Modal */}
      {isLevelFinished && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className={`${themeStyle.cardBg} border-2 ${
              activeLevel === 40
                ? "border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.6)]"
                : themeStyle.border
            } p-6 sm:p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95`}
          >
            {activeLevel === 40 ? (
              <>
                <div className="flex justify-center mb-2">
                  <div className="p-3 bg-amber-500/20 rounded-full border-2 border-amber-400 animate-bounce">
                    <Trophy
                      size={48}
                      className="text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]"
                    />
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black mb-1 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
                  CAMPAIGN CONQUERED!
                </h2>
                <p className="text-xs font-bold text-amber-300 mb-4 flex items-center justify-center gap-1">
                  <Award size={14} /> Grand Master of Crossword P2P
                </p>

                <div className="bg-black/30 rounded-2xl p-3 mb-4 text-xs font-bold border border-white/10 space-y-1">
                  <p className="opacity-90">All 40 Tactical Levels Cleared!</p>
                  <p className="text-amber-400 font-black">
                    120 / 120 Total Stars Unlocked
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setGameState({ status: "campaign-select" })}
                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg text-sm hover:scale-102 active:scale-95 transition-all"
                  >
                    <Trophy size={16} /> Return to Hall of Fame
                  </button>
                  <button
                    onClick={restartCurrentLevel}
                    className="w-full bg-black/20 hover:bg-black/30 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw size={14} /> Replay Finale
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2
                  className={`text-2xl font-black mb-1 ${themeStyle.titleColor}`}
                >
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
                    <span className="block text-[10px] opacity-60">
                      TIME ELAPSED
                    </span>
                    <span className="font-mono text-base font-black">
                      {elapsedTime}s
                    </span>
                  </div>
                  <div className="border-r border-black/10" />
                  <div>
                    <span className="block text-[10px] opacity-60">
                      BEST RECORD
                    </span>
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
                      onClick={() =>
                        setGameState({ status: "campaign-select" })
                      }
                      className="bg-black/20 hover:bg-black/30 font-bold py-2 rounded-xl text-xs"
                    >
                      All Levels
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
