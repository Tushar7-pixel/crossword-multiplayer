import { create } from 'zustand';
import { WORD_COLLECTIONS } from '../lib/wordCollections';
import { generateGrid } from '../lib/gridGenerator';

export interface LevelRecord {
    stars: number;
    bestTime: number;
    completed: boolean;
}

export interface LevelConfig {
    level: number;
    wordsPerRound: number;
    gridSize: number;
    threeStarTime: number;
    twoStarTime: number;
    maxBudget: number; // Total budget representing 100% of the countdown bar
}

const CAMPAIGN_STORAGE_KEY = 'crossword_offline_campaign_v1';
const CAMPAIGN_USED_WORDS_KEY = 'crossword_campaign_used_words_v1';

export const CAMPAIGN_LEVELS: LevelConfig[] = Array.from({ length: 20 }, (_, i) => {
    const level = i + 1;
    const wordsPerRound = level <= 5 ? 4 : level <= 12 ? 5 : 6;
    const gridSize = wordsPerRound > 5 ? 12 : 10;
    const threeStarTime = 40 + level * 5;
    const twoStarTime = threeStarTime + 30;
    const maxBudget = twoStarTime + 35; // Generous budget containing all 3 star tiers

    return { level, wordsPerRound, gridSize, threeStarTime, twoStarTime, maxBudget };
});

const loadSavedProgress = (): Record<number, LevelRecord> => {
    try {
        const raw = localStorage.getItem(CAMPAIGN_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const getCampaignUsedWords = (): Set<string> => {
    try {
        const raw = localStorage.getItem(CAMPAIGN_USED_WORDS_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
};

const saveCampaignUsedWords = (usedSet: Set<string>) => {
    try {
        localStorage.setItem(CAMPAIGN_USED_WORDS_KEY, JSON.stringify(Array.from(usedSet)));
    } catch { }
};

/**
 * Guarantees "Mix Words", "Non-Repeating", and designates 1 Golden Word in the final round
 */
export const generateCampaignRound = (
    wordsCount: number,
    gridSize: number,
    isFinalRound: boolean = false
) => {
    const categoryKeys = Object.keys(WORD_COLLECTIONS);
    const usedWords = getCampaignUsedWords();

    const totalWordsCount = Object.values(WORD_COLLECTIONS).reduce((acc, list) => acc + list.length, 0);
    if (usedWords.size >= totalWordsCount - 30) {
        usedWords.clear();
    }

    const shuffledCategories = [...categoryKeys].sort(() => 0.5 - Math.random());
    const selectedWords: string[] = [];

    let catIndex = 0;
    while (selectedWords.length < wordsCount && catIndex < shuffledCategories.length * 2) {
        const cat = shuffledCategories[catIndex % shuffledCategories.length];
        const pool = WORD_COLLECTIONS[cat] || [];
        const available = pool.filter((w) => !usedWords.has(w) && !selectedWords.includes(w));

        if (available.length > 0) {
            const chosen = available[Math.floor(Math.random() * available.length)];
            selectedWords.push(chosen);
            usedWords.add(chosen);
        }
        catIndex++;
    }

    if (selectedWords.length < wordsCount) {
        const allWords = Object.values(WORD_COLLECTIONS).flat();
        const remaining = allWords.filter((w) => !selectedWords.includes(w));
        while (selectedWords.length < wordsCount && remaining.length > 0) {
            const idx = Math.floor(Math.random() * remaining.length);
            selectedWords.push(remaining.splice(idx, 1)[0]);
        }
    }

    saveCampaignUsedWords(usedWords);

    const { grid, placedWords } = generateGrid(selectedWords, gridSize);

    // Designate 1 word as the Golden Word during Round 3 (Final Round)
    const golden = isFinalRound && placedWords.length > 0
        ? placedWords[Math.floor(Math.random() * placedWords.length)]
        : null;

    return { board: grid, wordsToFind: placedWords, goldenWord: golden };
};

interface CampaignStore {
    progress: Record<number, LevelRecord>;
    activeLevel: number;
    setActiveLevel: (level: number) => void;
    saveLevelResult: (level: number, timeSpent: number) => number;
}

export const useCampaignStore = create<CampaignStore>((set, get) => ({
    progress: loadSavedProgress(),
    activeLevel: 1,

    setActiveLevel: (level) => set({ activeLevel: level }),

    saveLevelResult: (level, timeSpent) => {
        const config = CAMPAIGN_LEVELS.find((l) => l.level === level) || CAMPAIGN_LEVELS[0];
        let stars = 1;
        if (timeSpent <= config.threeStarTime) {
            stars = 3;
        } else if (timeSpent <= config.twoStarTime) {
            stars = 2;
        }

        const current = get().progress[level] || { stars: 0, bestTime: 999999, completed: false };
        const newBestTime = current.completed ? Math.min(current.bestTime, timeSpent) : timeSpent;
        const newStars = Math.max(current.stars, stars);

        const updated = {
            ...get().progress,
            [level]: {
                stars: newStars,
                bestTime: newBestTime,
                completed: true,
            },
        };

        localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(updated));
        set({ progress: updated });

        return stars;
    },
}));