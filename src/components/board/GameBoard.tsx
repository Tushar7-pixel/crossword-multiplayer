import { useState } from "react";
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

  // const [selectionCoords, setSelectionCoords] = useState<CellCoord[]>([]);
  // const [isDragging, setIsDragging] = useState(false);

  // Derive the current word string from the selected coordinates

  // const handleMouseDown = (y: number, x: number) => {
  //   setIsDragging(true);
  //   setSelectionCoords([{ y, x }]);
  // };

  // const handleMouseEnter = (y: number, x: number) => {
  //   if (!isDragging) return;
  //   if (!selectionCoords.some((c) => c.y === y && c.x === x)) {
  //     setSelectionCoords((prev) => [...prev, { y, x }]);
  //   }
  // };

  // const handleMouseUp = () => {
  //   setIsDragging(false);
  //   if (wordsToFind.includes(currentWord) && !foundWords[currentWord]) {
  //     network.sendToHost({
  //       type: "WORD_FOUND",
  //       payload: { word: currentWord, cells: selectionCoords },
  //     });
  //   }
  //   setSelectionCoords([]);
  // };
  // /--------------------------------------
  const [startCell, setStartCell] = useState<CellCoord | null>(null);
  const [selectionCoords, setSelectionCoords] = useState<CellCoord[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const currentWord = selectionCoords.map((c) => board[c.y][c.x]).join("");

  const handleMouseDown = (y: number, x: number) => {
    setIsDragging(true);
    const initial = { y, x };
    setStartCell(initial);
    setSelectionCoords([initial]);
  };

  const handleMouseEnter = (y: number, x: number) => {
    if (!isDragging || !startCell) return;

    const dy = y - startCell.y;
    const dx = x - startCell.x;

    const absDy = Math.abs(dy);
    const absDx = Math.abs(dx);

    // Check if target cell lies on a valid straight path (horizontal, vertical, or 45° diagonal)
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

  const handleMouseUp = () => {
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
  return (
    <CursorOverlay network={network}>
      <div
        className="flex flex-col items-center min-h-screen bg-slate-900 text-white p-6 select-none touch-none"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="mb-6 h-10 flex items-center justify-center text-3xl font-bold text-indigo-400 tracking-widest">
          {currentWord || "Find a word!"}
        </div>

        <div className="bg-slate-800 p-8 rounded-xl shadow-2xl mb-8 border border-slate-700">
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${board.length || 10}, minmax(0, 1fr))`,
            }}
          >
            {/* Added explicit types here to fix implicit any errors */}
            {board.map((row: string[], y: number) =>
              row.map((letter: string, x: number) => {
                const cellKey = `${y}-${x}`;
                const ownerId = foundCells[cellKey];
                const owner = ownerId ? players[ownerId] : null;
                const isCurrentlySelected = selectionCoords.some(
                  (c) => c.y === y && c.x === x,
                );

                let cellStyle = {};
                let cellClass =
                  "w-12 h-12 flex items-center justify-center rounded-md text-2xl font-bold cursor-pointer transition-colors duration-200 ";

                if (owner) {
                  cellStyle = {
                    backgroundColor: owner.color,
                    color: "#fff",
                    boxShadow: `0 0 10px ${owner.color}80`,
                  };
                  cellClass += "scale-105 z-10";
                } else if (isCurrentlySelected) {
                  cellClass += "bg-indigo-500 text-white scale-110 shadow-lg";
                } else {
                  cellClass += "bg-slate-700 hover:bg-slate-600 text-slate-300";
                }

                return (
                  <div
                    key={cellKey}
                    onMouseDown={() => handleMouseDown(y, x)}
                    onMouseEnter={() => handleMouseEnter(y, x)}
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

        <div className="flex gap-4 mb-8">
          {wordsToFind.map((word) => (
            <span
              key={word}
              className={`px-4 py-2 rounded-full font-semibold transition-all ${
                foundWords[word]
                  ? "bg-slate-800 text-slate-500 line-through"
                  : "bg-indigo-900/50 text-indigo-300 border border-indigo-700"
              }`}
            >
              {word}
            </span>
          ))}
        </div>

        <div className="flex gap-4 w-full max-w-4xl justify-center">
          {playerList.map((p) => (
            <div
              key={p.id}
              className="flex flex-col items-center px-6 py-3 rounded-lg bg-slate-800 shadow-md border-b-4 transition-all"
              style={{ borderColor: p.color }}
            >
              <span className="font-bold text-lg text-slate-200">{p.name}</span>
              <span
                className="text-3xl font-black mt-1"
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
