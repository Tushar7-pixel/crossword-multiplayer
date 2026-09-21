import { create } from 'zustand';
import type { GameState, Player, CellCoord } from '../types/game';
import { generateGrid } from '../lib/gridGenerator';

interface GameStore extends GameState {
    setGameState: (state: Partial<GameState>) => void;
    addPlayer: (player: Player) => void;
    updatePlayerScore: (playerId: string, points: number) => void;
    markWordFound: (word: string, playerId: string, cells: CellCoord[]) => void;
    resetSession: () => void;
    generateNewRound: (roundNumber: number, totalRounds?: number) => void; // <--- NEW
    removePlayer: (playerId: string) => void;
}

const WORD_BANK = ['REACT', 'WEBRTC', 'ZUSTAND', 'VITE', 'PEERJS', 'SOCKET', 'NODE', 'TYPESCRIPT'];

const initialState: GameState = {
    status: 'lobby',
    currentRound: 1,
    totalRounds: 3,
    players: {},
    board: [],
    foundWords: {},
    foundCells: {},
    wordsToFind: WORD_BANK,
};

export const useGameStore = create<GameStore>((set) => ({
    ...initialState,

    // 1. Dumb state merger (Peers use this to sync)
    setGameState: (newState) => set((state) => ({ ...state, ...newState })),

    // 2. Explicit round generator (Only Host calls this)
    generateNewRound: (roundNumber, totalRounds) => set((state) => {
        const shuffledWords = [...WORD_BANK].sort(() => 0.5 - Math.random()).slice(0, 4);
        const { grid, placedWords } = generateGrid(shuffledWords, 10);

        return {
            status: 'playing',
            currentRound: roundNumber,
            totalRounds: totalRounds || state.totalRounds,
            board: grid,
            wordsToFind: placedWords,
            foundWords: {},
            foundCells: {}
        };
    }),

    addPlayer: (player) => set((state) => ({
        players: { ...state.players, [player.id]: player }
    })),

    updatePlayerScore: (playerId, points) => set((state) => {
        const player = state.players[playerId];
        if (!player) return state;
        return {
            players: {
                ...state.players,
                [playerId]: { ...player, score: player.score + points }
            }
        };
    }),

    markWordFound: (word, playerId, cells) => set((state) => {
        const newFoundCells = { ...state.foundCells };
        cells.forEach(cell => {
            newFoundCells[`${cell.y}-${cell.x}`] = playerId;
        });

        return {
            foundWords: { ...state.foundWords, [word]: playerId },
            foundCells: newFoundCells
        };
    }),

    removePlayer: (playerId) => set((state) => {
        const newPlayers = { ...state.players };
        delete newPlayers[playerId];
        return { players: newPlayers };
    }),
    resetSession: () => set(initialState),
}));