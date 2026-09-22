import React, { useState, useEffect } from "react";
import { useGameStore } from "../../store/gameStore";
import {
  Users,
  Play,
  Copy,
  Link,
  Wifi,
  WifiOff,
  UserMinus,
  Radio,
} from "lucide-react";
import { useRoomDiscovery } from "../../hooks/useRoomDiscovery";

interface LobbyProps {
  network: any;
}

export const Lobby: React.FC<LobbyProps> = ({ network }) => {
  const { peerId, isHost, hostGame, joinGame, broadcastState, kickPlayer } =
    network;
  const { players } = useGameStore();

  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [inWaitingRoom, setInWaitingRoom] = useState(false);
  const [rounds, setRounds] = useState(3);
  const [hasInviteLink, setHasInviteLink] = useState(false);

  // Hook for zero-backend room discovery
  const { activeRooms } = useRoomDiscovery(isHost, peerId, name);

  // 1. Check URL parameters for ?join=ROOM_CODE on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get("join");
    if (joinCode) {
      setRoomCode(joinCode);
      setHasInviteLink(true);
    }
  }, []);

  const handleHost = () => {
    if (!name.trim()) return alert("Please enter your name");
    hostGame(name);
    setInWaitingRoom(true);
  };

  const handleJoin = (targetCode?: string) => {
    const codeToJoin = targetCode || roomCode;
    if (!name.trim() || !codeToJoin.trim()) {
      return alert("Name and Room Code required");
    }
    joinGame(codeToJoin, name);
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
    useGameStore.getState().generateNewRound(1, rounds);
  };

  const handleStartGame = () => {
    useGameStore.getState().generateNewRound(1, rounds);
    broadcastState();
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(peerId);
    alert("Room code copied to clipboard!");
  };

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?join=${peerId}`;
    navigator.clipboard.writeText(inviteUrl);
    alert("One-click invite link copied to clipboard!");
  };

  // Waiting Room View
  if (inWaitingRoom) {
    const playerList = Object.values(players);

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
        <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
          <h2 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2">
            <Users /> Waiting Room
          </h2>

          {isHost ? (
            <div className="mb-6 p-4 bg-slate-700 rounded-lg text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">
                Share Room
              </p>
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-xs font-mono bg-slate-800 px-3 py-2 rounded-md max-w-[200px] truncate text-slate-300">
                  {peerId || "Generating..."}
                </span>
                <button
                  onClick={copyRoomCode}
                  title="Copy Code"
                  className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors"
                >
                  <Copy size={16} />
                </button>
              </div>

              <button
                onClick={copyInviteLink}
                className="w-full bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-sm font-semibold py-2 px-3 rounded-lg border border-indigo-500/30 flex items-center justify-center gap-2 transition-colors"
              >
                <Link size={16} /> Copy Direct Invite Link
              </button>
            </div>
          ) : (
            <div className="mb-6 text-center text-gray-400 animate-pulse">
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
                      onClick={() => kickPlayer && kickPlayer(p.id)}
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
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/30"
            >
              <Play size={20} /> Start Game
            </button>
          )}
        </div>
      </div>
    );
  }

  // Lobby Entry Form
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
        <h1 className="text-3xl font-black text-center mb-6 text-indigo-400 tracking-wide">
          CROSSWORD P2P
        </h1>

        {hasInviteLink && (
          <div className="mb-6 p-3 bg-indigo-950/60 border border-indigo-700/60 rounded-lg text-sm text-indigo-200 text-center">
            You've been invited to join a game! Enter your name below to jump
            in.
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-700 text-white border border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 font-medium"
              placeholder="Enter a unique name"
              maxLength={15}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleHost}
              className="bg-indigo-600 hover:bg-indigo-700 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/20"
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

          {/* Active Rooms Listing */}
          {activeRooms.length > 0 && (
            <div className="pt-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Radio size={14} className="text-green-400 animate-pulse" />{" "}
                Active Rooms Nearby
              </h3>
              <div className="space-y-2">
                {activeRooms.map((room) => (
                  <div
                    key={room.hostId}
                    className="flex items-center justify-between bg-slate-700/70 border border-slate-600/50 p-3 rounded-lg"
                  >
                    <span className="font-medium text-sm text-slate-200">
                      {room.hostName}'s room
                    </span>
                    <button
                      onClick={() => handleJoin(room.hostId)}
                      className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-600"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase tracking-wider font-semibold">
              OR JOIN WITH CODE
            </span>
            <div className="flex-grow border-t border-slate-600"></div>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="flex-1 bg-slate-700 text-white border border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 font-mono text-sm"
              placeholder="Paste Room Code"
            />
            <button
              onClick={() => handleJoin()}
              className="bg-green-600 hover:bg-green-700 px-6 rounded-lg font-semibold transition-colors shadow-lg shadow-green-600/20"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
