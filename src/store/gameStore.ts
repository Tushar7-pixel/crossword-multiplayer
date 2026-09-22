import { create } from 'zustand';
import type { GameState, Player, CellCoord, FoundLine, GameSettings, ThemeType, FontType } from '../types/game';
import { generateGrid } from '../lib/gridGenerator';
import { WORD_COLLECTIONS } from '../lib/wordCollections';

interface GameStore extends GameState {
    setGameState: (state: Partial<GameState>) => void;
    updateSettings: (settings: Partial<GameSettings>) => void;
    setLocalTheme: (theme: ThemeType) => void;
    setLocalFont: (font: FontType) => void; // <-- NEW
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
    theme: 'farm',     // <-- Default Theme set to Farm Sunny
    localTheme: undefined,
    font: 'hand',      // <-- Default Font set to Classroom Hand
    localFont: undefined,
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

    setGameState: (newState) =>
        set((state) => ({
            ...state,
            ...newState,
            localTheme: state.localTheme,
            localFont: state.localFont,
        })),

    setLocalTheme: (theme) => set({ localTheme: theme }),
    setLocalFont: (font) => set({ localFont: font }),

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
            const defaultFont = customSettings?.font || state.font;

            const combinedPool = Array.from(
                new Set(activeCategories.flatMap((cat) => WORD_COLLECTIONS[cat] || []))
            );
            const pool = combinedPool.length > 0 ? combinedPool : WORD_COLLECTIONS.Animals;
            const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, count);

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
                font: defaultFont,
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