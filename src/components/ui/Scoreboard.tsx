// import React from "react";
import { useGameStore } from "../../store/gameStore";
import { Trophy, Crown, RotateCcw } from "lucide-react";

export const Scoreboard = ({ network }: { network: any }) => {
  const { players, setGameState } = useGameStore();
  const { isHost, broadcastState } = network;

  // Sort players by score descending
  const rankedPlayers = Object.values(players).sort(
    (a, b) => b.score - a.score,
  );
  const winner = rankedPlayers[0];

  const handlePlayAgain = () => {
    if (!isHost) return;

    // Keep players but reset their scores and game state
    const resetPlayers = { ...players };
    Object.keys(resetPlayers).forEach((id) => {
      resetPlayers[id].score = 0;
    });

    setGameState({
      status: "lobby",
      currentRound: 1,
      foundWords: {},
      foundCells: {},
      players: resetPlayers,
    });

    broadcastState();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
      <div className="bg-slate-800 p-10 rounded-2xl shadow-2xl w-full max-w-lg text-center border border-slate-700">
        <Trophy size={64} className="mx-auto mb-6 text-yellow-400" />
        <h1 className="text-4xl font-black mb-2 tracking-wide text-white">
          GAME OVER
        </h1>
        <p className="text-slate-400 mb-8">Session Complete</p>

        {/* Winner Spotlight */}
        <div
          className="mb-10 p-6 rounded-xl shadow-lg relative overflow-hidden"
          style={{
            backgroundColor: `${winner.color}20`,
            border: `2px solid ${winner.color}`,
          }}
        >
          <Crown
            size={32}
            className="absolute -top-3 -right-3 rotate-12 opacity-50"
            style={{ color: winner.color }}
          />
          <h2 className="text-lg font-bold text-slate-300 mb-1">WINNER</h2>
          <p className="text-3xl font-black" style={{ color: winner.color }}>
            {winner.name}
          </p>
          <p className="text-2xl font-bold mt-2">{winner.score} pts</p>
        </div>

        {/* Leaderboard */}
        <div className="space-y-3 mb-10 text-left">
          {rankedPlayers.map((p, index) => (
            <div
              key={p.id}
              className="flex items-center gap-4 bg-slate-700 p-4 rounded-lg"
            >
              <span className="text-xl font-bold text-slate-400 w-6">
                {index + 1}.
              </span>
              <div
                className="w-4 h-4 rounded-full shadow-sm"
                style={{ backgroundColor: p.color }}
              />
              <span className="font-bold flex-1 text-lg">{p.name}</span>
              <span className="font-bold text-xl" style={{ color: p.color }}>
                {p.score}
              </span>
            </div>
          ))}
        </div>

        {isHost ? (
          <button
            onClick={handlePlayAgain}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/25"
          >
            <RotateCcw size={20} /> Play Again
          </button>
        ) : (
          <p className="text-slate-400 animate-pulse font-medium">
            Waiting for host to start a new game...
          </p>
        )}
      </div>
    </div>
  );
};
