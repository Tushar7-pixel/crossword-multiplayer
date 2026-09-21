export type Player = {
    id: string; // PeerJS ID
    name: string;
    color: string;
    score: number;
    isHost: boolean;
};

export type GameState = {
    status: 'lobby' | 'playing' | 'scoreboard';
    currentRound: number;
    totalRounds: number;
    players: Record<string, Player>;
    board: string[][]; // The crossword/word search grid
    wordsToFind: string[];
    foundWords: Record<string, string>; // word -> playerId
    foundCells: Record<string, string>;
}; // ← Removed the stray socket action from here

export type CellCoord = { x: number; y: number };
export type CursorPosition = { x: number; y: number; userId?: string };// Actions sent over the PeerJS DataChannel
export type SocketAction =
    | { type: 'JOIN_LOBBY'; payload: { name: string } }
    | { type: 'SYNC_STATE'; payload: GameState }
    | { type: 'CURSOR_MOVE'; payload: CursorPosition }
    | { type: 'WORD_FOUND'; payload: { word: string; cells: CellCoord[] } };