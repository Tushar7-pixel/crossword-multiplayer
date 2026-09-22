import { create } from 'zustand';

export interface LevelRecord {
    stars: number;       // 0 to 3
    bestTime: number;    // In seconds (0 if not completed)
    completed: boolean;
}

export interface LevelConfig {
    level: number;
    wordsPerRound: number;
    gridSize: number;
    threeStarTime: number; // In seconds for all 3 rounds combined
    twoStarTime: number;
}

const CAMPAIGN_STORAGE_KEY = 'crossword_offline_campaign_v1';

// 20 Progressive Campaign Levels
export const CAMPAIGN_LEVELS: LevelConfig[] = Array.from({ length: 20 }, (_, i) => {
    const level = i + 1;
    const wordsPerRound = level <= 5 ? 4 : level <= 12 ? 5 : 6;
    const gridSize = wordsPerRound > 5 ? 12 : 10;

    // Target completion times (seconds for all 3 rounds combined)
    const threeStarTime = 40 + level * 5;
    const twoStarTime = threeStarTime + 30;

    return { level, wordsPerRound, gridSize, threeStarTime, twoStarTime };
});

const loadSavedProgress = (): Record<number, LevelRecord> => {
    try {
        const raw = localStorage.getItem(CAMPAIGN_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

interface CampaignStore {
    progress: Record<number, LevelRecord>;
    activeLevel: number;
    setActiveLevel: (level: number) => void;
    saveLevelResult: (level: number, timeSpent: number) => number; // returns stars earned
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