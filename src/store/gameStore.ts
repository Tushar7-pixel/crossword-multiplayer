import { create } from 'zustand';
import type { GameState, Player, CellCoord, FoundLine, GameSettings, ThemeType, FontType } from '../types/game';
import { generateGrid } from '../lib/gridGenerator';
import { WORD_COLLECTIONS } from '../lib/wordCollections';

const HISTORY_KEY = 'crossword_online_session_history_v1';

// Retrieves words from the past 3 completed sessions
const getStoredSessionHistory = (): string[][] => {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

// Archives a completed session's words into the rolling 3-session buffer
const archiveSessionWords = (words: string[]) => {
    if (!words || words.length === 0) return;
    try {
        const history = getStoredSessionHistory();
        const updated = [words, ...history].slice(0, 3);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch { }
};

interface GameStore extends GameState {
    currentSessionUsedWords: string[]; // Tracks all words used in the active match
    setGameState: (state: Partial<GameState>) => void;
    updateSettings: (settings: Partial<GameSettings>) => void;
    setLocalTheme: (theme: ThemeType) => void;
    setLocalFont: (font: FontType) => void;
    addPlayer: (player: Player) => void;
    removePlayer: (playerId: string) => void;
    updatePlayerScore: (playerId: string, points: number) => void;
    markWordFound: (word: string, playerId: string, cells: CellCoord[]) => void;
    generateNewRound: (roundNumber: number, settings?: Partial<GameSettings>) => void;
    resetSession: () => void;
    startRematch: () => void;
}

const initialState: GameState = {
    status: 'lobby',
    currentRound: 1,
    totalRounds: 3,
    categories: ['Animals'],
    wordsPerRound: 5,
    theme: 'farm',
    localTheme: undefined,
    font: 'hand',
    localFont: undefined,
    players: {},
    board: [],
    wordsToFind: [],
    goldenWord: null,
    foundWords: {},
    foundCells: {},
    foundLines: [],
};

export const useGameStore = create<GameStore>((set, get) => ({
    ...initialState,
    currentSessionUsedWords: [],

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
    // Inside useGameStore definition in src/store/gameStore.ts:
    startRematch: () => {
        const state = get();
        // Reset each player's score to 0
        const resetPlayers: Record<string, Player> = {};
        Object.values(state.players).forEach((p) => {
            resetPlayers[p.id] = { ...p, score: 0 };
        });

        set({ players: resetPlayers });
        get().generateNewRound(1);
    },
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

    generateNewRound: (roundNumber, customSettings) => {
        const state = get();
        const activeCategories = customSettings?.categories || state.categories;
        const count = customSettings?.wordsPerRound || state.wordsPerRound;
        const rounds = customSettings?.totalRounds || state.totalRounds;
        const defaultTheme = customSettings?.theme || state.theme;
        const defaultFont = customSettings?.font || state.font;

        // Reset or carry forward intra-session tracking
        let sessionWords = roundNumber === 1 ? [] : [...state.currentSessionUsedWords];

        // If starting a fresh session, archive the previous session's words into localStorage
        if (roundNumber === 1 && state.currentSessionUsedWords.length > 0) {
            archiveSessionWords(state.currentSessionUsedWords);
        }

        const pastSessions = getStoredSessionHistory();
        const pastSessionsWords = new Set(pastSessions.flat());
        const sessionWordSet = new Set(sessionWords);

        const chosenRoundWords: string[] = [];

        // Distribute quota evenly across active categories (Mix Words)
        const basePerCat = Math.floor(count / activeCategories.length);
        let remainder = count % activeCategories.length;

        for (const cat of activeCategories) {
            const catTarget = basePerCat + (remainder > 0 ? 1 : 0);
            if (remainder > 0) remainder--;

            const catPool = WORD_COLLECTIONS[cat] || [];

            // 1. Strictly exclude current session's words AND past 3 sessions' words
            let candidates = catPool.filter(
                (w) => !sessionWordSet.has(w) && !pastSessionsWords.has(w) && !chosenRoundWords.includes(w)
            );

            // 2. If pool exhausted (e.g. single small category like F1), relax past sessions (oldest first)
            if (candidates.length < catTarget) {
                const relaxedPast = new Set(pastSessions.slice(0, 1).flat());
                candidates = catPool.filter(
                    (w) => !sessionWordSet.has(w) && !relaxedPast.has(w) && !chosenRoundWords.includes(w)
                );
            }

            // 3. Fallback: Allow any word from category NOT used in the current session
            if (candidates.length < catTarget) {
                candidates = catPool.filter(
                    (w) => !sessionWordSet.has(w) && !chosenRoundWords.includes(w)
                );
            }

            // 4. Absolute fallback (only if wordsPerRound * totalRounds exceeds total category size)
            if (candidates.length < catTarget) {
                candidates = catPool.filter((w) => !chosenRoundWords.includes(w));
            }

            const shuffled = [...candidates].sort(() => 0.5 - Math.random());
            chosenRoundWords.push(...shuffled.slice(0, catTarget));
        }

        // Top-up if any category fell short of its portion
        if (chosenRoundWords.length < count) {
            const allActiveWords = activeCategories.flatMap((cat) => WORD_COLLECTIONS[cat] || []);
            const remaining = allActiveWords.filter(
                (w) => !chosenRoundWords.includes(w) && !sessionWordSet.has(w)
            );
            const shuffledRem = remaining.sort(() => 0.5 - Math.random());
            chosenRoundWords.push(...shuffledRem.slice(0, count - chosenRoundWords.length));
        }

        // Register newly placed words
        sessionWords = [...sessionWords, ...chosenRoundWords];

        // Grid sizing: 12x12 for >8 words, else 10x10
        const gridSize = count > 8 ? 12 : 10;
        const { grid, placedWords } = generateGrid(chosenRoundWords, gridSize);

        // Pick 1 Golden Word (worth 5 pts)
        const hasGolden = Math.random() > 0.3 || roundNumber === rounds;
        const golden = hasGolden ? placedWords[Math.floor(Math.random() * placedWords.length)] : null;

        set({
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
            currentSessionUsedWords: sessionWords,
        });
    },

    resetSession: () => {
        const current = get().currentSessionUsedWords;
        if (current.length > 0) {
            archiveSessionWords(current);
        }
        set({ ...initialState, currentSessionUsedWords: [] });
    },
}));