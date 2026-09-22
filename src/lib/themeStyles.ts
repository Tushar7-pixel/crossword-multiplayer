import type { ThemeType } from '../types/game';

export const THEMES: Record<ThemeType, {
    name: string;
    bg: string;
    cardBg: string;
    border: string;
    titleColor: string;
    cellDefault: string;
    cellHover: string;
    textColor: string;
    strikethroughOpacity: number;
    glow: boolean;
}> = {
    neon: {
        name: 'Arcade Neon',
        bg: 'bg-slate-950',
        cardBg: 'bg-slate-900/95',
        border: 'border-fuchsia-500/40 shadow-[0_0_25px_rgba(217,70,239,0.2)]',
        titleColor: 'text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]',
        cellDefault: 'bg-slate-800/80 text-cyan-200 border border-slate-700/60',
        cellHover: 'hover:bg-slate-700',
        textColor: 'text-white',
        strikethroughOpacity: 0.85,
        glow: true,
    },
    farm: {
        name: 'Farm Sunny',
        bg: 'bg-gradient-to-b from-sky-400 via-sky-200 to-amber-100',
        cardBg: 'bg-amber-50/95 shadow-xl',
        border: 'border-amber-700/50 shadow-2xl',
        titleColor: 'text-amber-800 drop-shadow-sm font-extrabold',
        cellDefault: 'bg-amber-100/90 text-amber-950 font-black border border-amber-300',
        cellHover: 'hover:bg-amber-200',
        textColor: 'text-slate-800',
        strikethroughOpacity: 0.7,
        glow: false,
    },
    classic: {
        name: 'Classroom Paper',
        bg: 'bg-teal-700',
        cardBg: 'bg-white shadow-2xl',
        border: 'border-teal-500 shadow-xl',
        titleColor: 'text-teal-700 font-extrabold',
        cellDefault: 'bg-teal-50/80 text-teal-950 border border-teal-200 font-bold',
        cellHover: 'hover:bg-teal-100',
        textColor: 'text-slate-900',
        strikethroughOpacity: 0.75,
        glow: false,
    },
};