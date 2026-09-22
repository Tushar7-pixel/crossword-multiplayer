import React, { useState, useRef } from "react";
import { useGameStore } from "../../store/gameStore";
import { CursorOverlay } from "./CursorOverlay";
import type { CellCoord } from "../../types/game";
import { useGameNetwork } from "../../hooks/useGameNetwork";
// import { THEMES } from "../../lib/themeStyles";
import { Sparkles, Palette } from "lucide-react";
import { THEMES, FONTS } from "../../lib/themeStyles";
import type { FontType } from "../../types/game";
import { Type } from "lucide-react";

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
    categories,
  } = useGameStore();
  // Prefer local theme if chosen, otherwise fall back to host's room theme
  const activeThemeKey = localTheme || theme;
  const themeStyle = THEMES[activeThemeKey] || THEMES.neon;

  const activeFontKey = localFont || font;
  const fontStyle = FONTS[activeFontKey] || FONTS.comic;
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

  // const cycleTheme = () => {
  //   const list: (keyof typeof THEMES)[] = ["neon", "farm", "classic"];
  //   const nextTheme = list[(list.indexOf(theme) + 1) % list.length];
  //   network.broadcastSettingsChange({ theme: nextTheme });
  // };
  // Toggles theme ONLY on this player's device
  const cycleMyTheme = () => {
    const list = ["neon", "farm", "classic"] as const;
    const next = list[(list.indexOf(activeThemeKey) + 1) % list.length];
    setLocalTheme(next);
  };

  const cycleMyFont = () => {
    const list: FontType[] = ["comic", "sans", "mono"];
    const next = list[(list.indexOf(activeFontKey) + 1) % list.length];
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

  return (
    <CursorOverlay network={network}>
      <div
        className={`flex flex-col items-center min-h-screen ${themeStyle.bg} transition-colors duration-500 p-4 select-none touch-none ${themeStyle.textColor}`}
        onMouseUp={handleSelectEnd}
        onMouseLeave={handleSelectEnd}
      >
        {/* Top Bar with Theme & Font Quick Switchers */}
        <div className="w-full max-w-2xl flex items-center justify-between mb-2 px-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              Round {currentRound} / {totalRounds}
            </span>
            <span className="text-xs uppercase font-bold text-indigo-300 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-700/50">
              {categories.join(" + ")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cycleMyTheme}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-black/30 hover:bg-black/40 backdrop-blur-md transition-all border border-white/15"
            >
              <Palette size={13} /> {themeStyle.name}
            </button>
            <button
              onClick={cycleMyFont}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-black/30 hover:bg-black/40 backdrop-blur-md transition-all border border-white/15"
            >
              <Type size={13} /> {fontStyle.name}
            </button>
          </div>
        </div>
        {/* Selected Word Display */}
        <div
          className={`mb-3 h-8 flex items-center justify-center text-2xl sm:text-3xl tracking-widest ${themeStyle.titleColor}`}
        >
          {currentWord || "SELECT A WORD"}
        </div>

        {/* Board Container */}
        <div
          ref={gridContainerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleSelectEnd}
          className={`relative ${themeStyle.cardBg} p-4 sm:p-6 rounded-3xl border-2 ${themeStyle.border} mb-5 select-none transition-all duration-300`}
        >
          {/* SVG Layer: Renders Both Active Drag Line and All Found Strikethroughs */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-20 p-4 sm:p-6"
            viewBox={`0 0 ${gridSize * 100} ${gridSize * 100}`}
            preserveAspectRatio="none"
          >
            {/* 1. Persistent Strikethrough Lines for Discovered Words */}
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
                  strokeWidth="28"
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

            {/* 2. Real-Time Active Dragging Line */}
            {selectionCoords.length > 1 && (
              <line
                x1={selectionCoords[0].x * 100 + 50}
                y1={selectionCoords[0].y * 100 + 50}
                x2={selectionCoords[selectionCoords.length - 1].x * 100 + 50}
                y2={selectionCoords[selectionCoords.length - 1].y * 100 + 50}
                stroke={myColor}
                strokeWidth="20"
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

          {/* Letter Grid */}
          <div
            className="grid gap-1.5 sm:gap-2.5 relative z-10"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            }}
          >
            {board.map((row: string[], y: number) =>
              row.map((letter: string, x: number) => {
                const cellKey = `${y}-${x}`;
                const ownerId = foundCells[cellKey];
                const isCurrentlySelected = selectionCoords.some(
                  (c) => c.y === y && c.x === x,
                );

                let cellClass = `w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl text-lg sm:text-2xl font-black cursor-pointer transition-all duration-150 ${themeStyle.cellDefault} ${themeStyle.cellHover} `;

                if (isCurrentlySelected) {
                  cellClass += "scale-110 shadow-lg !border-white z-30";
                } else if (ownerId) {
                  cellClass += "font-black scale-100";
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

        {/* Target Words List with Golden Word Distinction */}
        <div className="w-full max-w-xl mb-4">
          <div className="flex flex-wrap justify-center gap-2.5">
            {wordsToFind.map((word) => {
              const finderId = foundWords[word];
              const finder = finderId ? players[finderId] : null;
              const isGolden = word === goldenWord;

              let badgeStyle = "bg-black/30 border border-white/20 text-white";
              if (isGolden && !finder) {
                badgeStyle =
                  "bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-yellow-200 shadow-[0_0_15px_rgba(245,158,11,0.5)] font-black animate-pulse";
              } else if (finder) {
                badgeStyle =
                  "bg-black/20 text-white/50 line-through border-transparent";
              }

              return (
                <div
                  key={word}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${badgeStyle}`}
                  style={finder ? { borderColor: `${finder.color}80` } : {}}
                >
                  {isGolden && (
                    <Sparkles
                      size={14}
                      className={
                        finder
                          ? "text-gray-400"
                          : "text-amber-950 fill-amber-950"
                      }
                    />
                  )}
                  <span>{word}</span>

                  {isGolden && !finder && (
                    <span className="text-[10px] bg-amber-900/30 text-amber-950 px-1.5 py-0.5 rounded font-black">
                      5 PTS
                    </span>
                  )}

                  {finder && (
                    <span
                      className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full text-white font-extrabold shadow-sm ml-1"
                      style={{ backgroundColor: finder.color }}
                    >
                      {finder.name} {isGolden ? "(+5)" : "(+2)"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Player Scores Podium */}
        <div className="flex flex-wrap gap-2.5 w-full max-w-xl justify-center">
          {playerList.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border-b-4 shadow-md"
              style={{ borderColor: p.color }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full shadow-sm"
                style={{ backgroundColor: p.color }}
              />
              <span className="font-bold text-xs">{p.name}</span>
              <span
                className="text-base font-black ml-1"
                style={{ color: p.color }}
              >
                {p.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </CursorOverlay>
  );
};
