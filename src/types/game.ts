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

export type ThemeType = 'neon' | 'farm' | 'classic';

export type GameSettings = {
    categories: string[]; // Multiple categories
    wordsPerRound: number;
    totalRounds: number;
    theme: ThemeType;
};

export type GameState = {
    status: 'lobby' | 'playing' | 'scoreboard';
    currentRound: number;
    totalRounds: number;
    categories: string[];
    wordsPerRound: number;
    theme: ThemeType; // Default room theme set by host
    localTheme?: ThemeType; // Player's personal device override
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
    | { type: 'SYNC_STATE'; payload: GameState }
    | { type: 'CURSOR_MOVE'; payload: CursorPosition }
    | { type: 'WORD_FOUND'; payload: { word: string; cells: CellCoord[] } }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<GameSettings> };