import { create } from 'zustand';
import type { GameState, Player, CellCoord, FoundLine, GameSettings, ThemeType } from '../types/game';
import { generateGrid } from '../lib/gridGenerator';
import { WORD_COLLECTIONS } from '../lib/wordCollections';

interface GameStore extends GameState {
    setGameState: (state: Partial<GameState>) => void;
    updateSettings: (settings: Partial<GameSettings>) => void;
    setLocalTheme: (theme: ThemeType) => void;
    addPlayer: (player: Player) => void;
    removePlayer: (playerId: string) => void;
    updatePlayerScore: (playerId: string, points: number) => void;
    markWordFound: (word: string, playerId: string, cells: CellCoord[]) => void;
    generateNewRound: (roundNumber: number, settings?: Partial<GameSettings>) => void;
    resetSession: () => void;
}

const initialState: GameState = {
    status: 'lobby',
    currentRound: 1,
    totalRounds: 3,
    categories: ['Animals'],
    wordsPerRound: 5,
    theme: 'neon',
    localTheme: undefined,
    players: {},
    board: [],
    wordsToFind: [],
    goldenWord: null,
    foundWords: {},
    foundCells: {},
    foundLines: [],
};

export const useGameStore = create<GameStore>((set) => ({
    ...initialState,

    // Preserve localTheme when syncing remote state from host
    setGameState: (newState) =>
        set((state) => ({
            ...state,
            ...newState,
            localTheme: state.localTheme,
        })),

    setLocalTheme: (theme) => set({ localTheme: theme }),

    updateSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),

    addPlayer: (player) =>
        set((state) => ({
            players: { ...state.players, [player.id]: player },
        })),

    removePlayer: (playerId) =>
        set((state) => {
            const newPlayers = { ...state.players };
            delete newPlayers[playerId];
            return { players: newPlayers };
        }),

    updatePlayerScore: (playerId, points) =>
        set((state) => {
            const player = state.players[playerId];
            if (!player) return state;
            return {
                players: {
                    ...state.players,
                    [playerId]: { ...player, score: player.score + points },
                },
            };
        }),

    markWordFound: (word, playerId, cells) =>
        set((state) => {
            const newFoundCells = { ...state.foundCells };
            cells.forEach((cell) => {
                newFoundCells[`${cell.y}-${cell.x}`] = playerId;
            });

            const newLine: FoundLine = {
                word,
                start: cells[0],
                end: cells[cells.length - 1],
                playerId,
            };

            return {
                foundWords: { ...state.foundWords, [word]: playerId },
                foundCells: newFoundCells,
                foundLines: [...state.foundLines, newLine],
            };
        }),

    generateNewRound: (roundNumber, customSettings) =>
        set((state) => {
            const activeCategories = customSettings?.categories || state.categories;
            const count = customSettings?.wordsPerRound || state.wordsPerRound;
            const rounds = customSettings?.totalRounds || state.totalRounds;
            const defaultTheme = customSettings?.theme || state.theme;

            // 1. Gather words across ALL selected collections
            const combinedWordPool = Array.from(
                new Set(
                    activeCategories.flatMap((cat) => WORD_COLLECTIONS[cat] || [])
                )
            );

            // Fallback if pool is smaller than requested count
            const pool = combinedWordPool.length > 0 ? combinedWordPool : WORD_COLLECTIONS.Animals;
            const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, count);

            // 2. Dynamic grid sizing (12x12 for 9-15 words, 10x10 for smaller sets)
            const gridSize = count > 8 ? 12 : 10;
            const { grid, placedWords } = generateGrid(shuffled, gridSize);

            const hasGolden = Math.random() > 0.3 || roundNumber === rounds;
            const golden = hasGolden ? placedWords[Math.floor(Math.random() * placedWords.length)] : null;

            return {
                status: 'playing',
                currentRound: roundNumber,
                totalRounds: rounds,
                categories: activeCategories,
                wordsPerRound: count,
                theme: defaultTheme,
                board: grid,
                wordsToFind: placedWords,
                goldenWord: golden,
                foundWords: {},
                foundCells: {},
                foundLines: [],
            };
        }),

    resetSession: () => set(initialState),
}));