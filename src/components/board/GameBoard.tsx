import React, { useState, useRef } from "react";
import { useGameStore } from "../../store/gameStore";
import { CursorOverlay } from "./CursorOverlay";
import type { CellCoord, FontType } from "../../types/game";
import { useGameNetwork } from "../../hooks/useGameNetwork";
import { THEMES, FONTS } from "../../lib/themeStyles";
import { Sparkles, Palette, Type, CheckCircle2 } from "lucide-react";
import { haptic } from "../../lib/haptics";
import { soundFx } from "../../lib/audioFx";
import { SoundToggle } from "../ui/SoundToggle";
export const GameBoard = ({
  network,
}: {
  network: ReturnType<typeof useGameNetwork>;
}) => {
  const {
    players,
    foundCells,
    wordsToFind,
    goldenWord,
    foundWords,
    foundLines,
    board,
    theme,
    localTheme,
    setLocalTheme,
    font,
    localFont,
    setLocalFont,
    currentRound,
    totalRounds,
  } = useGameStore();

  const activeThemeKey = localTheme || theme;
  const themeStyle = THEMES[activeThemeKey] || THEMES.farm;

  const activeFontKey = (localFont || font) as FontType;
  const fontStyle = FONTS[activeFontKey] || FONTS.hand;

  const playerList = Object.values(players);
  const myPlayer =
    players[network.peerId] ||
    Object.values(players).find((p) => p.isHost && network.isHost) ||
    playerList[0];

  const myColor = myPlayer?.color || "#6366f1";

  const [startCell, setStartCell] = useState<CellCoord | null>(null);
  const [selectionCoords, setSelectionCoords] = useState<CellCoord[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const gridSize = board.length || 10;
  const currentWord = selectionCoords
    .map((c) => board[c.y]?.[c.x] || "")
    .join("");

  const cycleMyTheme = () => {
    const list = ["neon", "farm", "classic"] as const;
    const next = list[(list.indexOf(activeThemeKey) + 1) % list.length];
    setLocalTheme(next);
  };

  const cycleMyFont = () => {
    const list: FontType[] = ["fredoka", "comic", "hand", "sans", "mono"];
    const currentIndex = list.indexOf(activeFontKey);
    const next =
      list[(currentIndex === -1 ? 0 : currentIndex + 1) % list.length];
    setLocalFont(next);
  };

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
      network.sendToHost({
        type: "WORD_FOUND",
        payload: { word: currentWord, cells: selectionCoords },
      });
    }
    const isGolden = currentWord === goldenWord;

    if (isGolden) {
      haptic.goldenFound();
      soundFx.playGoldenFound();
    } else {
      haptic.wordFound();
      soundFx.playWordFound();
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

  const foundCount = Object.keys(foundWords).length;

  return (
    <CursorOverlay network={network}>
      <div
        className={`h-[100dvh] max-h-[100dvh] w-full flex flex-col justify-evenly items-center overflow-hidden ${themeStyle.bg} transition-colors duration-500 px-3 py-2 select-none touch-none ${themeStyle.textColor}`}
        style={{ fontFamily: fontStyle.fontFamily }}
        onMouseUp={handleSelectEnd}
        onMouseLeave={handleSelectEnd}
      >
        {/* SECTION 1: Top Bar & Quick Switchers */}
        <div className="w-full max-w-md flex items-center justify-between px-0.5 shrink-0">
          <span className="text-xs sm:text-sm uppercase font-black bg-black/25 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-sm">
            Round {currentRound}/{totalRounds}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={cycleMyTheme}
              style={{ fontFamily: fontStyle.fontFamily }}
              className="flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/15 transition-all shadow-sm"
            >
              <Palette size={13} /> {themeStyle.name}
            </button>
            <button
              onClick={cycleMyFont}
              style={{ fontFamily: fontStyle.fontFamily }}
              className="flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/15 transition-all shadow-sm"
            >
              <Type size={13} /> {fontStyle.name}
            </button>
            <SoundToggle />
          </div>
        </div>

        {/* SECTION 2: Current Word Selection & Game Board */}
        <div className="w-full max-w-md flex flex-col items-center shrink-0">
          <div
            className={`h-7 flex items-center justify-center text-lg sm:text-xl font-black tracking-widest mb-1 ${themeStyle.titleColor}`}
          >
            {currentWord || "SELECT A WORD"}
          </div>

          <div
            ref={gridContainerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleSelectEnd}
            className={`relative aspect-square w-[min(94vw,48vh)] max-w-[420px] ${themeStyle.cardBg} p-2 sm:p-3 rounded-2xl sm:rounded-3xl border-2 ${themeStyle.border} select-none flex items-center justify-center shadow-lg`}
          >
            {/* SVG Strikethrough & Selection Layer */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-20 p-2 sm:p-3"
              viewBox={`0 0 ${gridSize * 100} ${gridSize * 100}`}
              preserveAspectRatio="none"
            >
              {foundLines.map((line) => {
                const finder = players[line.playerId];
                const lineColor = finder?.color || "#3b82f6";
                return (
                  <line
                    key={line.word}
                    x1={line.start.x * 100 + 50}
                    y1={line.start.y * 100 + 50}
                    x2={line.end.x * 100 + 50}
                    y2={line.end.y * 100 + 50}
                    stroke={lineColor}
                    strokeWidth="32"
                    strokeLinecap="round"
                    opacity={themeStyle.strikethroughOpacity}
                    style={
                      themeStyle.glow
                        ? {
                            filter: `drop-shadow(0 0 8px ${lineColor}) drop-shadow(0 0 16px ${lineColor})`,
                          }
                        : { filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.25))` }
                    }
                  />
                );
              })}

              {selectionCoords.length > 1 && (
                <line
                  x1={selectionCoords[0].x * 100 + 50}
                  y1={selectionCoords[0].y * 100 + 50}
                  x2={selectionCoords[selectionCoords.length - 1].x * 100 + 50}
                  y2={selectionCoords[selectionCoords.length - 1].y * 100 + 50}
                  stroke={myColor}
                  strokeWidth="24"
                  strokeLinecap="round"
                  opacity="0.8"
                  style={
                    themeStyle.glow
                      ? { filter: `drop-shadow(0 0 10px ${myColor})` }
                      : {}
                  }
                />
              )}
            </svg>

            {/* Matrix Cells */}
            <div
              className="grid w-full h-full gap-1 relative z-10"
              style={{
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
              }}
            >
              {board.map((row: string[], y: number) =>
                row.map((letter: string, x: number) => {
                  const cellKey = `${y}-${x}`;
                  const ownerId = foundCells[cellKey];
                  const isCurrentlySelected = selectionCoords.some(
                    (c) => c.y === y && c.x === x,
                  );

                  let cellClass = `w-full h-full flex items-center justify-center rounded-lg sm:rounded-xl font-black text-[clamp(17px,4.8vw,24px)] uppercase tracking-tight cursor-pointer transition-all duration-150 ${themeStyle.cellDefault} ${themeStyle.cellHover} `;

                  if (isCurrentlySelected) {
                    cellClass += "scale-105 shadow-md !border-white z-30";
                  } else if (ownerId) {
                    cellClass += "font-black";
                  }

                  return (
                    <div
                      key={cellKey}
                      data-cell="true"
                      data-y={y}
                      data-x={x}
                      style={{ fontFamily: fontStyle.fontFamily }}
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

        {/* SECTION 3: Dedicated Words to Find Tray */}
        <div className="w-full max-w-md shrink-0 px-0.5">
          <div
            className={`${themeStyle.cardBg} border-2 ${themeStyle.border} rounded-2xl p-2.5 sm:p-3 shadow-md`}
          >
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider mb-2 opacity-75">
              <span>Words to Find</span>
              <span>
                {foundCount} / {wordsToFind.length} Found
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 max-h-[14vh] overflow-y-auto scrollbar-thin">
              {wordsToFind.map((word) => {
                const finderId = foundWords[word];
                const finder = finderId ? players[finderId] : null;
                const isGolden = word === goldenWord;

                let badgeStyle =
                  "bg-black/20 border-black/10 text-current hover:bg-black/30";
                if (isGolden && !finder) {
                  badgeStyle =
                    "bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-yellow-200 shadow-[0_0_12px_rgba(245,158,11,0.5)] font-black animate-pulse";
                } else if (finder) {
                  badgeStyle =
                    "bg-black/15 text-white/40 line-through border-transparent";
                }

                return (
                  <div
                    key={word}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-black border tracking-wide transition-all ${badgeStyle}`}
                    style={finder ? { borderColor: `${finder.color}80` } : {}}
                  >
                    {isGolden && !finder && (
                      <Sparkles
                        size={13}
                        className="text-amber-950 fill-amber-950 shrink-0"
                      />
                    )}
                    {finder && (
                      <CheckCircle2
                        size={13}
                        className="text-emerald-400 shrink-0"
                      />
                    )}
                    <span>{word}</span>

                    {isGolden && !finder && (
                      <span className="text-[9px] bg-amber-950/20 text-amber-950 px-1 rounded font-black">
                        5P
                      </span>
                    )}

                    {finder && (
                      <span
                        className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md text-white font-extrabold ml-0.5 shadow-sm"
                        style={{ backgroundColor: finder.color }}
                      >
                        {finder.name} {isGolden ? "+5" : "+2"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION 4: Enlarged Players Scoreboard HUD */}
        <div className="w-full max-w-md shrink-0 px-0.5">
          <div className="flex flex-wrap gap-2 justify-center w-full">
            {playerList.map((p) => {
              const isMe = p.id === myPlayer?.id;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/30 backdrop-blur-md border-b-2 shadow-sm transition-all ${
                    isMe ? "ring-1 ring-white/30" : ""
                  }`}
                  style={{ borderColor: p.color }}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="font-extrabold text-xs sm:text-sm truncate max-w-[110px]">
                    {p.name} {isMe && "(You)"}
                  </span>
                  <span
                    className="text-sm sm:text-base font-black ml-0.5"
                    style={{ color: p.color }}
                  >
                    {p.score}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </CursorOverlay>
  );
};
