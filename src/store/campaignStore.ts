import { create } from 'zustand';
import { WORD_COLLECTIONS } from '../lib/wordCollections';
import { generateGrid } from '../lib/gridGenerator';

export type LevelModifier = 'none' | 'anagram' | 'fog' | 'hazard' | 'hybrid';

export interface LevelRecord {
    stars: number;
    bestTime: number;
    completed: boolean;
}
interface CampaignStore {
    progress: Record<number, LevelRecord>;
    activeLevel: number;
    setActiveLevel: (level: number) => void;
    saveLevelResult: (level: number, timeSpent: number, starsOverride?: number) => number;
}

export interface LevelConfig {
    level: number;
    wordsPerRound: number;
    gridSize: number;
    threeStarTime: number;
    twoStarTime: number;
    maxBudget: number;
    phase: 1 | 2;
    modifier: LevelModifier;
    chapterTitle?: string;
}

export const PHASE_2_UNLOCK_STARS = 10;
const CAMPAIGN_STORAGE_KEY = 'crossword_offline_campaign_v1';
const CAMPAIGN_USED_WORDS_KEY = 'crossword_campaign_used_words_v1';

// 40 Progressive Campaign Levels (Phase 1: 1-20, Phase 2: 21-40)
export const CAMPAIGN_LEVELS: LevelConfig[] = Array.from({ length: 40 }, (_, i) => {
    const level = i + 1;
    const isPhase2 = level > 20;
    const phase: 1 | 2 = isPhase2 ? 2 : 1;

    // Words per round and grid sizing
    const wordsPerRound = level <= 5 ? 4 : level <= 20 ? 5 : level <= 30 ? 5 : 6;
    const gridSize = wordsPerRound > 5 ? 12 : 10;

    // 1.5x scaled times for comfortable 3-round completions
    const baseTime = 40 + level * 5;
    const threeStarTime = Math.round(baseTime * 1.5);
    const twoStarTime = Math.round((baseTime + 30) * 1.5);
    const maxBudget = Math.round((baseTime + 65) * 1.5);

    // Phase 2 Themed Chapters (5 levels each)
    let modifier: LevelModifier = 'none';
    let chapterTitle: string | undefined;

    if (level >= 21 && level <= 25) {
        modifier = 'anagram';
        chapterTitle = 'Cipher Protocol';
    } else if (level >= 26 && level <= 30) {
        modifier = 'fog';
        chapterTitle = 'Eclipse Horizon';
    } else if (level >= 31 && level <= 35) {
        modifier = 'hazard';
        chapterTitle = 'Voltage Overload';
    } else if (level >= 36 && level <= 40) {
        modifier = 'hybrid';
        chapterTitle = 'The Gauntlet';
    }

    return {
        level,
        wordsPerRound,
        gridSize,
        threeStarTime,
        twoStarTime,
        maxBudget,
        phase,
        modifier,
        chapterTitle,
    };
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

    const golden = isFinalRound && placedWords.length > 0
        ? placedWords[Math.floor(Math.random() * placedWords.length)]
        : null;

    return { board: grid, wordsToFind: placedWords, goldenWord: golden };
};



// In src/store/campaignStore.ts:

export const useCampaignStore = create<CampaignStore>((set, get) => ({
    progress: loadSavedProgress(),
    activeLevel: 1,

    setActiveLevel: (level) => set({ activeLevel: level }),

    saveLevelResult: (level, timeSpent, starsOverride?: number) => {
        const config = CAMPAIGN_LEVELS.find((l) => l.level === level) || CAMPAIGN_LEVELS[0];
        let stars = 1;

        if (starsOverride !== undefined) {
            stars = starsOverride;
        } else if (config.phase === 2) {
            stars = 3;
        } else if (timeSpent <= config.threeStarTime) {
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