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
  Type,
} from "lucide-react";
import { useRoomDiscovery } from "../../hooks/useRoomDiscovery";
import { WORD_COLLECTIONS } from "../../lib/wordCollections";
import { THEMES, FONTS } from "../../lib/themeStyles";
import type { ThemeType, FontType } from "../../types/game";
import { useToastStore } from "../../store/toastStore";

interface LobbyProps {
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
    font,
    localFont,
    setLocalFont,
  } = useGameStore();
  const { showToast } = useToastStore();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState(() => {
    return new URLSearchParams(window.location.search).get("join") || "";
  });
  const hasInviteLink = Boolean(
    new URLSearchParams(window.location.search).get("join"),
  );
  const [inWaitingRoom, setInWaitingRoom] = useState(false);

  const { activeRooms } = useRoomDiscovery(isHost, peerId, name);

  // Active theme and font (local overrides room default)
  const activeThemeKey = localTheme || theme;
  const themeStyle = THEMES[activeThemeKey] || THEMES.neon;

  const activeFontKey = (localFont || font) as FontType;
  const fontStyle = FONTS[activeFontKey] || FONTS.fredoka;

  const handleHost = () => {
    if (!name.trim()) {
      showToast("Please enter your name to host a room", "warning");
      return;
    }
    hostGame(name);
    setInWaitingRoom(true);
  };

  const handleJoin = (targetCode?: string) => {
    const code = targetCode || roomCode;
    if (!name.trim()) {
      showToast("Please enter your name first", "warning");
      return;
    }
    if (!code.trim()) {
      showToast("Room code is required to join", "warning");
      return;
    }
    joinGame(code, name);
    setInWaitingRoom(true);
  };

  const handleOffline = () => {
    if (!name.trim()) {
      showToast("Please enter your name for offline mode", "warning");
      return;
    }
    network.startOfflineGame(name);
  };

  const toggleCategory = (cat: string) => {
    let next: string[];
    if (categories.includes(cat)) {
      if (categories.length === 1) {
        showToast("Keep at least 1 category selected", "info");
        return;
      }
      next = categories.filter((c) => c !== cat);
    } else {
      if (categories.length >= 4) {
        showToast("You can select up to 4 categories maximum", "warning");
        return;
      }
      next = [...categories, cat];
    }
    broadcastSettingsChange({ categories: next });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(peerId);
    showToast("Room code copied to clipboard!", "success");
  };

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?join=${peerId}`;
    navigator.clipboard.writeText(inviteUrl);
    showToast("Invite link copied to clipboard!", "success");
  };

  const handleStartGame = () => {
    useGameStore.getState().generateNewRound(1);
    broadcastState();
  };

  // Inside src/components/lobby/Lobby.tsx:

  // Rule 3: Allow selection of up to 4 categories maximum
  // const toggleCategory = (cat: string) => {
  //   let next: string[];
  //   if (categories.includes(cat)) {
  //     if (categories.length === 1) return; // Keep at least one selected
  //     next = categories.filter((c) => c !== cat);
  //   } else {
  //     if (categories.length >= 4) {
  //       alert("You can select up to 4 categories maximum.");
  //       return;
  //     }
  //     next = [...categories, cat];
  //   }
  //   broadcastSettingsChange({ categories: next });
  // };
  const cycleTheme = () => {
    const list: ThemeType[] = ["neon", "farm", "classic"];
    const next = list[(list.indexOf(activeThemeKey) + 1) % list.length];
    setLocalTheme(next);
    if (isHost) broadcastSettingsChange({ theme: next });
  };

  const cycleFont = () => {
    const list: FontType[] = ["fredoka", "comic", "hand", "sans", "mono"];
    const currentIndex = list.indexOf(activeFontKey);
    const next =
      list[(currentIndex === -1 ? 0 : currentIndex + 1) % list.length];
    setLocalFont(next);
    if (isHost) broadcastSettingsChange({ font: next });
  };

  // const copyRoomCode = () => {
  //   navigator.clipboard.writeText(peerId);
  //   alert("Room code copied to clipboard!");
  // };

  // const copyInviteLink = () => {
  //   const inviteUrl = `${window.location.origin}${window.location.pathname}?join=${peerId}`;
  //   navigator.clipboard.writeText(inviteUrl);
  //   alert("Invite link copied!");
  // };

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen ${themeStyle.bg} ${themeStyle.textColor} transition-colors duration-500 p-4`}
      style={{ fontFamily: fontStyle.fontFamily }}
    >
      {/* Top Floating Bar: Personal Theme & Font Quick Switcher */}
      <div className="w-full max-w-lg flex items-center justify-between mb-4 px-2">
        <button
          onClick={cycleTheme}
          style={{ fontFamily: fontStyle.fontFamily }}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/20 transition-all shadow-sm"
        >
          <Palette size={14} /> Theme: {themeStyle.name}
        </button>

        <button
          onClick={cycleFont}
          style={{ fontFamily: fontStyle.fontFamily }}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/20 transition-all shadow-sm"
        >
          <Type size={14} /> Font: {fontStyle.name}
        </button>
      </div>

      {inWaitingRoom ? (
        /* Waiting Room */
        <div
          className={`${themeStyle.cardBg} p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-lg border-2 ${themeStyle.border} transition-all duration-300`}
        >
          <h2
            className={`text-2xl font-black mb-4 text-center flex items-center justify-center gap-2 ${themeStyle.titleColor}`}
          >
            <Users size={22} /> Waiting Room
          </h2>

          {isHost ? (
            <div className="mb-4 p-3 bg-black/10 rounded-2xl text-center border border-black/10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-xs font-mono px-3 py-1.5 rounded-lg max-w-[200px] truncate bg-black/20 font-bold">
                  {peerId || "Generating..."}
                </span>
                <button
                  onClick={copyRoomCode}
                  className="p-1.5 bg-black/20 hover:bg-black/30 rounded-lg"
                >
                  <Copy size={14} />
                </button>
              </div>
              <button
                onClick={copyInviteLink}
                style={{ fontFamily: fontStyle.fontFamily }}
                className="w-full bg-black/15 hover:bg-black/25 text-xs font-bold py-1.5 px-3 rounded-xl border border-black/20 flex items-center justify-center gap-1.5"
              >
                <Link size={14} /> Copy Direct Invite Link
              </button>
            </div>
          ) : (
            <div
              className={`mb-4 text-center text-xs animate-pulse font-bold ${themeStyle.subTextColor}`}
            >
              Waiting for host to launch the game...
            </div>
          )}

          {/* Roster */}
          <div className="space-y-2 mb-5">
            <h3
              className={`text-xs font-black uppercase tracking-wider ${themeStyle.subTextColor}`}
            >
              Players ({Object.values(players).length}/5)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(players).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 bg-black/10 p-2.5 rounded-xl border border-black/10"
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full shadow-sm"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="font-bold text-xs truncate flex-1">
                    {p.name}
                  </span>
                  {p.isHost ? (
                    <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded font-black">
                      Host
                    </span>
                  ) : (
                    isHost && (
                      <button
                        onClick={() => kickPlayer(p.id)}
                        className="opacity-60 hover:opacity-100 p-0.5"
                      >
                        <UserMinus size={14} />
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Word Collections */}
          <div className="space-y-3.5 bg-black/10 p-4 rounded-2xl border border-black/10 mb-5">
            {/* Word Collections Header */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label
                  className={`text-xs font-black uppercase tracking-wider ${themeStyle.subTextColor}`}
                >
                  Word Collections ({categories.length}/4 Max)
                </label>
                {categories.length >= 4 && (
                  <span className="text-[10px] text-amber-500 font-bold">
                    Max reached
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(WORD_COLLECTIONS).map((cat) => {
                  const isSelected = categories.includes(cat);
                  const isMaxed = !isSelected && categories.length >= 4;

                  return (
                    <button
                      key={cat}
                      disabled={isMaxed}
                      onClick={() => toggleCategory(cat)}
                      style={{ fontFamily: fontStyle.fontFamily }}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all border ${
                        isSelected
                          ? `${themeStyle.accentBtn} border-transparent shadow-sm scale-105`
                          : isMaxed
                            ? "opacity-30 border-black/10 cursor-not-allowed bg-black/5"
                            : "bg-black/10 border-black/15 opacity-70 hover:opacity-100"
                      }`}
                    >
                      {cat} {isSelected && "✓"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Host Game Settings */}
            {isHost && (
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-black/10">
                <div>
                  <label className="flex justify-between text-xs font-bold mb-1">
                    <span>Words / Round</span>
                    <span className="font-black">{wordsPerRound}</span>
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
                    className="w-full accent-current"
                  />
                  <div className="flex justify-between text-[10px] opacity-60">
                    <span>3</span>
                    <span>15</span>
                  </div>
                </div>

                <div>
                  <label className="flex justify-between text-xs font-bold mb-1">
                    <span>Total Rounds</span>
                    <span className="font-black">{totalRounds}</span>
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
                    className="w-full accent-current"
                  />
                  <div className="flex justify-between text-[10px] opacity-60">
                    <span>1</span>
                    <span>5</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-600 dark:text-amber-300 mb-5">
            <Sparkles size={16} className="text-amber-500 shrink-0" />
            <span>
              Regular words: <strong>2 pts</strong>. Golden Word:{" "}
              <strong>5 pts</strong>!
            </span>
          </div>

          {isHost && (
            <button
              onClick={handleStartGame}
              style={{ fontFamily: fontStyle.fontFamily }}
              className={`w-full ${themeStyle.accentBtn} font-black py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg text-sm`}
            >
              <Play size={18} /> Start Game
            </button>
          )}
        </div>
      ) : (
        /* Initial Screen */
        <div
          className={`${themeStyle.cardBg} p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md border-2 ${themeStyle.border} transition-all duration-300`}
        >
          <h1
            className={`text-3xl font-black text-center mb-6 tracking-wider ${themeStyle.titleColor}`}
          >
            CROSSWORD P2P
          </h1>

          {hasInviteLink && (
            <div className="mb-5 p-3 bg-black/10 border border-black/15 rounded-xl text-xs font-bold text-center">
              You've been invited! Enter your name to enter the game lobby.
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                className={`block text-xs font-black uppercase tracking-wider mb-2 ${themeStyle.subTextColor}`}
              >
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ fontFamily: fontStyle.fontFamily }}
                className={`w-full ${themeStyle.inputBg} border ${themeStyle.inputBorder} rounded-xl px-4 py-2.5 font-bold text-sm outline-none`}
                placeholder="Enter unique name"
                maxLength={15}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleHost}
                style={{ fontFamily: fontStyle.fontFamily }}
                className={`${themeStyle.accentBtn} py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md`}
              >
                <Wifi size={16} /> Host Game
              </button>
              <button
                onClick={handleOffline}
                style={{ fontFamily: fontStyle.fontFamily }}
                className="bg-black/15 hover:bg-black/25 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors border border-black/15"
              >
                <WifiOff size={16} /> Offline Mode
              </button>
            </div>

            {activeRooms.length > 0 && (
              <div className="pt-2">
                <h3
                  className={`text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-1.5 ${themeStyle.subTextColor}`}
                >
                  <Radio size={14} className="text-green-500 animate-pulse" />{" "}
                  Active Rooms
                </h3>
                <div className="space-y-1.5">
                  {activeRooms.map((room) => (
                    <div
                      key={room.hostId}
                      className="flex items-center justify-between bg-black/10 border border-black/10 p-2.5 rounded-xl"
                    >
                      <span className="font-bold text-xs">
                        {room.hostName}'s room
                      </span>
                      <button
                        onClick={() => handleJoin(room.hostId)}
                        style={{ fontFamily: fontStyle.fontFamily }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs font-black transition-colors"
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-black/15"></div>
              <span
                className={`flex-shrink-0 mx-3 text-[10px] uppercase font-black tracking-wider ${themeStyle.subTextColor}`}
              >
                OR JOIN WITH CODE
              </span>
              <div className="flex-grow border-t border-black/15"></div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className={`flex-1 ${themeStyle.inputBg} border ${themeStyle.inputBorder} rounded-xl px-3 py-2 font-mono text-xs outline-none`}
                placeholder="Paste Room Code"
              />
              <button
                onClick={() => handleJoin()}
                style={{ fontFamily: fontStyle.fontFamily }}
                className="bg-green-600 hover:bg-green-700 text-white px-5 rounded-xl font-black text-sm transition-colors shadow-md"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
