import React from "react";
import { useToastStore } from "../../store/toastStore";
import { useGameStore } from "../../store/gameStore";
import { FONTS } from "../../lib/themeStyles";
import type { FontType } from "../../types/game";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();
  const { font, localFont } = useGameStore();

  const activeFontKey = (localFont || font) as FontType;
  const fontStyle = FONTS[activeFontKey] || FONTS.hand;

  if (toasts.length === 0) return null;

  return (
    <div
      style={{ fontFamily: fontStyle.fontFamily }}
      className="fixed top-4 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none"
    >
      {toasts.map((t) => {
        let bgStyle = "bg-slate-900/95 text-slate-100 border-slate-700";
        let Icon = Info;
        let iconColor = "text-cyan-400";

        if (t.type === "success") {
          bgStyle =
            "bg-emerald-950/95 text-emerald-100 border-emerald-500/50 shadow-emerald-900/30";
          Icon = CheckCircle2;
          iconColor = "text-emerald-400";
        } else if (t.type === "error") {
          bgStyle =
            "bg-rose-950/95 text-rose-100 border-rose-500/50 shadow-rose-900/30";
          Icon = AlertCircle;
          iconColor = "text-rose-400";
        } else if (t.type === "warning") {
          bgStyle =
            "bg-amber-950/95 text-amber-100 border-amber-500/50 shadow-amber-900/30";
          Icon = AlertTriangle;
          iconColor = "text-amber-400";
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-3 max-w-sm w-full ${bgStyle}`}
          >
            <Icon size={18} className={`shrink-0 ${iconColor}`} />
            <span className="text-xs sm:text-sm font-bold flex-1 leading-tight">
              {t.message}
            </span>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
