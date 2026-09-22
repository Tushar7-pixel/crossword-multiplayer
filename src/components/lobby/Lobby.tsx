import React, { useState } from "react";
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
  Sparkles,
  Palette,
} from "lucide-react";
import { useRoomDiscovery } from "../../hooks/useRoomDiscovery";
import { WORD_COLLECTIONS } from "../../lib/wordCollections";
import { THEMES } from "../../lib/themeStyles";
import type { ThemeType } from "../../types/game";

interface LobbyProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  network: any;
}

export const Lobby: React.FC<LobbyProps> = ({ network }) => {
  const {
    peerId,
    isHost,
    hostGame,
    joinGame,
    broadcastState,
    broadcastSettingsChange,
    kickPlayer,
  } = network;
  const {
    players,
    categories,
    wordsPerRound,
    totalRounds,
    theme,
    localTheme,
    setLocalTheme,
  } = useGameStore();

  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState(() => {
    return new URLSearchParams(window.location.search).get("join") || "";
  });
  const hasInviteLink = Boolean(
    new URLSearchParams(window.location.search).get("join"),
  );
  const [inWaitingRoom, setInWaitingRoom] = useState(false);

  const { activeRooms } = useRoomDiscovery(isHost, peerId, name);

  const activeTheme = localTheme || theme;

  const handleHost = () => {
    if (!name.trim()) return alert("Please enter your name");
    hostGame(name);
    setInWaitingRoom(true);
  };

  const handleJoin = (targetCode?: string) => {
    const code = targetCode || roomCode;
    if (!name.trim() || !code.trim())
      return alert("Name and Room Code required");
    joinGame(code, name);
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
    useGameStore.getState().generateNewRound(1);
  };

  const handleStartGame = () => {
    useGameStore.getState().generateNewRound(1);
    broadcastState();
  };

  // Toggle category on/off (ensuring at least 1 remains selected)
  const toggleCategory = (cat: string) => {
    let next: string[];
    if (categories.includes(cat)) {
      if (categories.length === 1) return; // Keep at least one category selected
      next = categories.filter((c) => c !== cat);
    } else {
      next = [...categories, cat];
    }
    broadcastSettingsChange({ categories: next });
  };

  // Theme selection: Host updates the room default, players set their personal theme
  const handleSelectTheme = (t: ThemeType) => {
    setLocalTheme(t);
    if (isHost) {
      broadcastSettingsChange({ theme: t });
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(peerId);
    alert("Room code copied to clipboard!");
  };

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?join=${peerId}`;
    navigator.clipboard.writeText(inviteUrl);
    alert("Invite link copied!");
  };

  if (inWaitingRoom) {
    const playerList = Object.values(players);

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
        <div className="bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-700">
          <h2 className="text-xl font-bold mb-4 text-center flex items-center justify-center gap-2">
            <Users size={20} /> Waiting Room
          </h2>

          {isHost ? (
            <div className="mb-4 p-3 bg-slate-700/80 rounded-xl text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-xs font-mono bg-slate-800 px-3 py-1.5 rounded-md max-w-[200px] truncate text-slate-300">
                  {peerId || "Generating..."}
                </span>
                <button
                  onClick={copyRoomCode}
                  className="p-1.5 bg-slate-600 hover:bg-slate-500 rounded-md"
                >
                  <Copy size={14} />
                </button>
              </div>
              <button
                onClick={copyInviteLink}
                className="w-full bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-semibold py-1.5 px-3 rounded-lg border border-indigo-500/30 flex items-center justify-center gap-1.5"
              >
                <Link size={14} /> Copy Direct Invite Link
              </button>
            </div>
          ) : (
            <div className="mb-4 text-center text-xs text-slate-400 animate-pulse">
              Waiting for host to launch the game...
            </div>
          )}

          {/* Roster */}
          <div className="space-y-2 mb-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Players ({playerList.length}/5)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {playerList.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 bg-slate-700/60 p-2.5 rounded-lg border border-slate-600/40"
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="font-medium text-xs truncate flex-1">
                    {p.name}
                  </span>
                  {p.isHost ? (
                    <span className="text-[10px] bg-indigo-500 px-1.5 py-0.5 rounded font-bold">
                      Host
                    </span>
                  ) : (
                    isHost && (
                      <button
                        onClick={() => kickPlayer(p.id)}
                        className="text-slate-400 hover:text-red-400 p-0.5"
                      >
                        <UserMinus size={14} />
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Settings Section */}
          <div className="space-y-4 bg-slate-700/40 p-4 rounded-xl border border-slate-600/50 mb-5">
            {/* Multi-Collection Selection */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Word Collections (Select Multiple)
                </label>
                <span className="text-[11px] text-indigo-400 font-semibold">
                  {categories.length} Selected
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(WORD_COLLECTIONS).map((cat) => {
                  const isSelected = categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`text-xs px-2.5 py-1 rounded-md font-bold transition-all border ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-400 text-white shadow-sm"
                          : "bg-slate-700 border-slate-600 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {cat} {isSelected && "✓"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Device-Specific Theme Picker */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <Palette size={14} /> Theme (Personal to your device)
                </label>
                {isHost && (
                  <span className="text-[10px] text-slate-400">
                    (Sets Room Default)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["neon", "farm", "classic"] as ThemeType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleSelectTheme(t)}
                    className={`text-xs py-1.5 rounded-md font-bold border transition-all ${
                      activeTheme === t
                        ? "border-indigo-400 bg-indigo-500/20 text-white"
                        : "border-slate-600 bg-slate-700/50 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {THEMES[t].name}
                  </button>
                ))}
              </div>
            </div>

            {/* Host-Only Game Length Configurations */}
            {isHost && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-600/50">
                <div>
                  <label className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                    <span>Words / Round</span>
                    <span className="text-indigo-400 font-bold">
                      {wordsPerRound}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={wordsPerRound}
                    onChange={(e) =>
                      broadcastSettingsChange({
                        wordsPerRound: Number(e.target.value),
                      })
                    }
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
                    <span>3</span>
                    <span>15</span>
                  </div>
                </div>

                <div>
                  <label className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                    <span>Total Rounds</span>
                    <span className="text-indigo-400 font-bold">
                      {totalRounds}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={totalRounds}
                    onChange={(e) =>
                      broadcastSettingsChange({
                        totalRounds: Number(e.target.value),
                      })
                    }
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
                    <span>1</span>
                    <span>5</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Golden Word Rule */}
          <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200 mb-5">
            <Sparkles size={16} className="text-amber-400 shrink-0" />
            <span>
              Regular words: <strong>2 pts</strong>. Golden Word:{" "}
              <strong>5 pts</strong>!
            </span>
          </div>

          {isHost && (
            <button
              onClick={handleStartGame}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/30"
            >
              <Play size={18} /> Start Game
            </button>
          )}
        </div>
      </div>
    );
  }

  // Initial Form View
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
        <h1 className="text-2xl sm:text-3xl font-black text-center mb-6 text-indigo-400 tracking-wide">
          CROSSWORD P2P
        </h1>

        {hasInviteLink && (
          <div className="mb-5 p-3 bg-indigo-950/60 border border-indigo-700/60 rounded-lg text-xs text-indigo-200 text-center">
            You've been invited to join a game! Enter your name to enter the
            waiting room.
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-300">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-700 text-white border border-slate-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500 font-medium text-sm"
              placeholder="Enter unique name"
              maxLength={15}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleHost}
              className="bg-indigo-600 hover:bg-indigo-700 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-md"
            >
              <Wifi size={16} /> Host Game
            </button>
            <button
              onClick={handleOffline}
              className="bg-slate-600 hover:bg-slate-500 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <WifiOff size={16} /> Offline Mode
            </button>
          </div>

          {activeRooms.length > 0 && (
            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Radio size={14} className="text-green-400 animate-pulse" />{" "}
                Active Rooms Nearby
              </h3>
              <div className="space-y-1.5">
                {activeRooms.map((room) => (
                  <div
                    key={room.hostId}
                    className="flex items-center justify-between bg-slate-700/70 border border-slate-600/50 p-2.5 rounded-lg"
                  >
                    <span className="font-semibold text-xs text-slate-200">
                      {room.hostName}'s room
                    </span>
                    <button
                      onClick={() => handleJoin(room.hostId)}
                      className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs font-bold transition-colors"
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-600"></div>
            <span className="flex-shrink-0 mx-3 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
              OR JOIN CODE
            </span>
            <div className="flex-grow border-t border-slate-600"></div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="flex-1 bg-slate-700 text-white border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 font-mono text-xs"
              placeholder="Paste Room Code"
            />
            <button
              onClick={() => handleJoin()}
              className="bg-green-600 hover:bg-green-700 px-5 rounded-lg font-bold text-sm transition-colors"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
