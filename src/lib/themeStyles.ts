import type { ThemeType, FontType } from '../types/game';

export const FONTS: Record<FontType, { name: string; fontFamily: string }> = {
    fredoka: {
        name: 'Chunky Bubble',
        fontFamily: "'Fredoka', cursive, sans-serif"
    },
    comic: {
        name: 'Playful Comic',
        fontFamily: "'Comic Neue', cursive, sans-serif"
    },
    hand: {
        name: 'Classroom Hand',
        fontFamily: "'Patrick Hand', cursive, sans-serif"
    },
    sans: {
        name: 'Modern Sans',
        fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    mono: {
        name: 'Arcade Mono',
        fontFamily: "'Space Mono', monospace"
    },
};

export const THEMES: Record<
    ThemeType,
    {
        name: string;
        bg: string;
        cardBg: string;
        border: string;
        titleColor: string;
        textColor: string;
        subTextColor: string;
        inputBg: string;
        inputBorder: string;
        accentBtn: string;
        cellDefault: string;
        cellHover: string;
        strikethroughOpacity: number;
        glow: boolean;
    }
> = {
    neon: {
        name: 'Arcade Neon',
        bg: 'bg-slate-950',
        cardBg: 'bg-slate-900/95 backdrop-blur-md',
        border: 'border-fuchsia-500/40 shadow-[0_0_25px_rgba(217,70,239,0.2)]',
        titleColor: 'text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]',
        textColor: 'text-white',
        subTextColor: 'text-slate-400',
        inputBg: 'bg-slate-800 text-cyan-200 placeholder-slate-500',
        inputBorder: 'border-slate-700 focus:border-fuchsia-500',
        accentBtn: 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white shadow-fuchsia-600/30',
        cellDefault: 'bg-slate-800/80 text-cyan-200 border border-slate-700/60',
        cellHover: 'hover:bg-slate-700',
        strikethroughOpacity: 0.85,
        glow: true,
    },
    farm: {
        name: 'Farm Sunny',
        bg: 'bg-gradient-to-b from-sky-400 via-sky-200 to-amber-100',
        cardBg: 'bg-amber-50/95 backdrop-blur-sm shadow-xl',
        border: 'border-amber-700/40 shadow-2xl',
        titleColor: 'text-amber-800 drop-shadow-sm font-black',
        textColor: 'text-amber-950',
        subTextColor: 'text-amber-800/70',
        inputBg: 'bg-white text-amber-950 placeholder-amber-900/40',
        inputBorder: 'border-amber-300 focus:border-amber-600',
        accentBtn: 'bg-amber-700 hover:bg-amber-800 text-amber-50 shadow-amber-800/30',
        cellDefault: 'bg-amber-100/90 text-amber-950 font-black border border-amber-300',
        cellHover: 'hover:bg-amber-200',
        strikethroughOpacity: 0.7,
        glow: false,
    },
    classic: {
        name: 'Classroom Paper',
        bg: 'bg-teal-700',
        cardBg: 'bg-white shadow-2xl',
        border: 'border-teal-500 shadow-xl',
        titleColor: 'text-teal-700 font-extrabold',
        textColor: 'text-slate-800',
        subTextColor: 'text-slate-500',
        inputBg: 'bg-teal-50/50 text-slate-800 placeholder-slate-400',
        inputBorder: 'border-teal-300 focus:border-teal-600',
        accentBtn: 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/30',
        cellDefault: 'bg-teal-50/80 text-teal-950 border border-teal-200 font-bold',
        cellHover: 'hover:bg-teal-100',
        strikethroughOpacity: 0.75,
        glow: false,
    },
};