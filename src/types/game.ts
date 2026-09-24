export type Player = {
    id: string;
    name: string;
    color: string;
    score: number;
    isHost: boolean;
};

export type CellCoord = { x: number; y: number };
export type CursorPosition = { x: number; y: number; userId?: string };

export type FoundLine = {
    word: string;
    start: CellCoord;
    end: CellCoord;
    playerId: string;
};
export const FONTS: Record<FontType, { name: string; class: string }> = {
    fredoka: { name: 'Chunky Bubble', class: 'font-fredoka' },
    comic: { name: 'Playful Comic', class: 'font-comic' },
    hand: { name: 'Classroom Hand', class: 'font-hand' },
    sans: { name: 'Modern Sans', class: 'font-sans-clean' },
    mono: { name: 'Arcade Mono', class: 'font-arcade' },
};
export type ThemeType = 'neon' | 'farm' | 'classic';
export type FontType = 'fredoka' | 'comic' | 'hand' | 'sans' | 'mono';
export type GameSettings = {
    categories: string[];
    wordsPerRound: number;
    totalRounds: number;
    theme: ThemeType;
    font: FontType; // <-- NEW
};

export type GameState = {
    status: 'lobby' | 'playing' | 'scoreboard' | 'campaign-select' | 'campaign-play';
    currentRound: number;
    totalRounds: number;
    categories: string[];
    wordsPerRound: number;
    theme: ThemeType;
    localTheme?: ThemeType;
    font: FontType;
    localFont?: FontType;
    players: Record<string, Player>;
    board: string[][];
    wordsToFind: string[];
    goldenWord: string | null;
    foundWords: Record<string, string>;
    foundCells: Record<string, string>;
    foundLines: FoundLine[];
};

export type SocketAction =
    | { type: 'JOIN_LOBBY'; payload: { name: string } }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<GameSettings> }
    | { type: 'WORD_FOUND'; payload: { word: string; cells: CellCoord[] } }
    | { type: 'CURSOR_MOVE'; payload: { userId?: string; x: number; y: number } }
    | { type: 'SYNC_STATE'; payload: any }
    | { type: 'REMATCH_GAME' }
    | { type: 'EMOJI_TAUNT'; payload: { emoji: string; senderId: string; senderName: string; id: string } };