import { create } from 'zustand';
import type { GameState, Player, CellCoord } from '../types/game';
import { generateGrid } from '../lib/gridGenerator';

interface GameStore extends GameState {
    setGameState: (state: Partial<GameState>) => void;
    addPlayer: (player: Player) => void;
    updatePlayerScore: (playerId: string, points: number) => void;
    markWordFound: (word: string, playerId: string, cells: CellCoord[]) => void;
    resetSession: () => void;
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
    wordsToFind: WORD_BANK, // Keep only this one
};

export const useGameStore = create<GameStore>((set) => ({
    ...initialState,

    setGameState: (newState) => set((state) => {
        if (newState.status === 'playing' || (newState.currentRound && newState.currentRound > state.currentRound)) {
            const shuffledWords = [...WORD_BANK].sort(() => 0.5 - Math.random()).slice(0, 4);
            const { grid, placedWords } = generateGrid(shuffledWords, 10);

            return {
                ...state,
                ...newState,
                board: grid,
                wordsToFind: placedWords,
                foundWords: {},
                foundCells: {}
            };
        }
        return { ...state, ...newState };
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

    resetSession: () => set(initialState),
}));