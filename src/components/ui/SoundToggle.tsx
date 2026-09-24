import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useSettingsStore } from "../../store/settingsStore";

interface SoundToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const SoundToggle: React.FC<SoundToggleProps> = ({
  className = "",
  showLabel = false,
}) => {
  const { soundEnabled, hapticsEnabled, toggleAllAudio } = useSettingsStore();
  const isActive = soundEnabled || hapticsEnabled;

  return (
    <button
      onClick={toggleAllAudio}
      title={isActive ? "Mute Sounds & Haptics" : "Unmute Sounds & Haptics"}
      aria-label="Toggle Sounds and Haptics"
      className={`flex items-center gap-1.5 rounded-full backdrop-blur-md transition-all shadow-sm ${
        isActive
          ? "bg-black/20 hover:bg-black/30 border border-white/20 text-current"
          : "bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300"
      } ${showLabel ? "px-3 py-1.5 text-xs font-bold" : "p-2"} ${className}`}
    >
      {isActive ? (
        <Volume2 size={15} className="shrink-0" />
      ) : (
        <VolumeX size={15} className="shrink-0 text-rose-400" />
      )}
      {showLabel && <span>{isActive ? "FX On" : "Muted"}</span>}
    </button>
  );
};
