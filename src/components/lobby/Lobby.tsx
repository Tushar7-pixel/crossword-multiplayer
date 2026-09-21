import React, { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { Users, Play, Copy, Wifi, WifiOff, UserMinus } from "lucide-react";
// We type the props based on the return type of your network hook
interface LobbyProps {
  network: any; // In a strict TS setup, import the ReturnType of useGameNetwork
}

export const Lobby: React.FC<LobbyProps> = ({ network }) => {
  const { peerId, isHost, hostGame, joinGame, broadcastState, kickPlayer } =
    network;
  const { players } = useGameStore();

  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [inWaitingRoom, setInWaitingRoom] = useState(false);
  const [rounds, setRounds] = useState(3);

  const handleHost = () => {
    if (!name.trim()) return alert("Please enter your name");
    hostGame(name);
    setInWaitingRoom(true);
  };

  const handleJoin = () => {
    if (!name.trim() || !roomCode.trim())
      return alert("Name and Room Code required");
    joinGame(roomCode, name);
    setInWaitingRoom(true);
  };

  const handleOffline = () => {
    if (!name.trim()) return alert("Please enter your name");
    useGameStore.getState().addPlayer({
      id: "local-1",
      name,
      color: "#3b82f6",
      score: 0,
      isHost: true,
    });
    // Use the explicit generator for offline mode
    useGameStore.getState().generateNewRound(1, rounds);
  };

  const handleStartGame = () => {
    // The Host explicitly generates Round 1 before broadcasting
    useGameStore.getState().generateNewRound(1, rounds);
    broadcastState();
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(peerId);
    alert("Room code copied to clipboard!");
  };

  // Waiting Room View
  if (inWaitingRoom) {
    const playerList = Object.values(players);

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
        <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2">
            <Users /> Waiting Room
          </h2>

          {isHost ? (
            <div className="mb-6 p-4 bg-slate-700 rounded-lg text-center">
              <p className="text-sm text-gray-400 mb-1">Your Room Code</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl font-mono font-bold tracking-wider">
                  {peerId || "Generating..."}
                </span>
                <button
                  onClick={copyRoomCode}
                  className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors"
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-6 text-center text-gray-400">
              Waiting for host to start the game...
            </div>
          )}

          <div className="space-y-3 mb-8">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Players ({playerList.length}/5)
            </h3>
            {playerList.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 bg-slate-700 p-3 rounded-lg"
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span className="font-medium">{p.name}</span>

                {p.isHost ? (
                  <span className="ml-auto text-xs bg-indigo-500 px-2 py-1 rounded-full">
                    Host
                  </span>
                ) : (
                  isHost && (
                    <button
                      onClick={() => kickPlayer(p.id)}
                      title="Kick player"
                      className="ml-auto text-slate-400 hover:text-red-400 p-1 transition-colors"
                    >
                      <UserMinus size={16} />
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
          {isHost && (
            <div className="mb-6 p-4 bg-slate-700 rounded-lg">
              <label className="flex justify-between text-sm font-semibold text-gray-300 mb-3">
                <span>Number of Rounds</span>
                <span className="text-indigo-400 font-bold">{rounds}</span>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          )}

          {isHost && (
            <button
              onClick={handleStartGame}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Play size={20} /> Start Game
            </button>
          )}
        </div>
      </div>
    );
  }

  // Entry Form View
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 text-indigo-400">
          Crossword P2P
        </h1>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-700 text-white border border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500"
              placeholder="Enter a unique name"
              maxLength={15}
            />
          </div>

          <div className="pt-4 grid grid-cols-2 gap-4">
            <button
              onClick={handleHost}
              className="bg-indigo-600 hover:bg-indigo-700 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Wifi size={18} /> Host Game
            </button>
            <button
              onClick={handleOffline}
              className="bg-slate-600 hover:bg-slate-500 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <WifiOff size={18} /> Play Offline
            </button>
          </div>

          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-slate-600"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">
              OR JOIN EXISTING
            </span>
            <div className="flex-grow border-t border-slate-600"></div>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="flex-1 bg-slate-700 text-white border border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 font-mono"
              placeholder="Paste Room Code"
            />
            <button
              onClick={handleJoin}
              className="bg-green-600 hover:bg-green-700 px-6 rounded-lg font-semibold transition-colors"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
