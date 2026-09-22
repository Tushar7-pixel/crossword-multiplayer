import React, { useState, useRef } from "react";
import { useGameStore } from "../../store/gameStore";
import { CursorOverlay } from "./CursorOverlay";
import type { CellCoord } from "../../types/game";
import { useGameNetwork } from "../../hooks/useGameNetwork";

export const GameBoard = ({
  network,
}: {
  network: ReturnType<typeof useGameNetwork>;
}) => {
  const { players, foundCells, wordsToFind, foundWords, board } =
    useGameStore();
  const playerList = Object.values(players);

  // Identify current player's color
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

  // --- Unified Selection Handlers ---

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

    // Validate straight line: horizontal, vertical, or 45-degree diagonal
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

  // --- Mobile Touch Event Handlers ---

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
        className="flex flex-col items-center min-h-screen bg-slate-900 text-white p-4 select-none touch-none"
        onMouseUp={handleSelectEnd}
        onMouseLeave={handleSelectEnd}
      >
        {/* Header / Current Selection */}
        <div className="mb-4 h-10 flex items-center justify-center text-3xl font-black text-indigo-400 tracking-widest">
          {currentWord || "Find a word!"}
        </div>

        {/* Game Grid Container */}
        <div
          ref={gridContainerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleSelectEnd}
          className="relative bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-2xl mb-6 border border-slate-700 select-none"
        >
          {/* Dynamic Thin Connecting Line for Selection */}
          {selectionCoords.length > 1 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-20 p-4 sm:p-6"
              viewBox={`0 0 ${gridSize * 100} ${gridSize * 100}`}
              preserveAspectRatio="none"
            >
              <line
                x1={selectionCoords[0].x * 100 + 50}
                y1={selectionCoords[0].y * 100 + 50}
                x2={selectionCoords[selectionCoords.length - 1].x * 100 + 50}
                y2={selectionCoords[selectionCoords.length - 1].y * 100 + 50}
                stroke={myColor}
                strokeWidth="12"
                strokeLinecap="round"
                opacity="0.85"
              />
            </svg>
          )}

          {/* Grid Cells */}
          <div
            className="grid gap-1.5 sm:gap-2"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            }}
          >
            {board.map((row: string[], y: number) =>
              row.map((letter: string, x: number) => {
                const cellKey = `${y}-${x}`;
                const ownerId = foundCells[cellKey];
                const owner = ownerId ? players[ownerId] : null;
                const isCurrentlySelected = selectionCoords.some(
                  (c) => c.y === y && c.x === x,
                );

                let cellStyle: React.CSSProperties = {};
                let cellClass =
                  "w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center rounded-lg text-lg sm:text-2xl font-bold cursor-pointer transition-all duration-150 ";

                if (owner) {
                  // Cell already claimed by a player
                  cellStyle = {
                    backgroundColor: owner.color,
                    color: "#fff",
                    boxShadow: `0 0 12px ${owner.color}90`,
                  };
                  cellClass += "scale-105 z-10";
                } else if (isCurrentlySelected) {
                  // Currently being dragged: highlighted with user's assigned color
                  cellStyle = {
                    backgroundColor: `${myColor}33`,
                    border: `2px solid ${myColor}`,
                    color: "#fff",
                  };
                  cellClass += "scale-105 z-10";
                } else {
                  // Default available cell
                  cellClass +=
                    "bg-slate-700/80 hover:bg-slate-600 text-slate-200";
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
                    style={cellStyle}
                  >
                    {letter}
                  </div>
                );
              }),
            )}
          </div>
        </div>

        {/* Word Attributions & Word Bank */}
        <div className="w-full max-w-2xl mb-6">
          <p className="text-xs uppercase font-bold text-slate-400 tracking-wider text-center mb-3">
            Target Words
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {wordsToFind.map((word) => {
              const finderId = foundWords[word];
              const finder = finderId ? players[finderId] : null;

              return (
                <div
                  key={word}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all border ${
                    finder
                      ? "bg-slate-800 text-slate-400 shadow-sm"
                      : "bg-indigo-950/40 text-indigo-300 border-indigo-700/50"
                  }`}
                  style={finder ? { borderColor: `${finder.color}80` } : {}}
                >
                  <span className={finder ? "line-through opacity-70" : ""}>
                    {word}
                  </span>

                  {/* Player Attribution Badge */}
                  {finder && (
                    <span
                      className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full text-white font-bold shadow-sm"
                      style={{ backgroundColor: finder.color }}
                    >
                      {finder.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Player Scores */}
        <div className="flex flex-wrap gap-3 w-full max-w-2xl justify-center">
          {playerList.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-800 border-b-4 transition-all shadow-md"
              style={{ borderColor: p.color }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="font-bold text-sm text-slate-200">{p.name}</span>
              <span
                className="text-lg font-black ml-2"
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
