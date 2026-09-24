import { create } from 'zustand';

interface SettingsStore {
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    toggleAllAudio: () => void;
    toggleSound: () => void;
    toggleHaptics: () => void;
}

const STORAGE_KEY = 'crossword_feedback_settings_v1';

const getInitialSettings = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch { }
    return { soundEnabled: true, hapticsEnabled: true };
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
    ...getInitialSettings(),

    toggleAllAudio: () => {
        const nextState = !(get().soundEnabled || get().hapticsEnabled);
        const updated = { soundEnabled: nextState, hapticsEnabled: nextState };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch { }
        set(updated);
    },

    toggleSound: () => {
        const updated = { soundEnabled: !get().soundEnabled };
        set((state) => {
            const merged = { ...state, ...updated };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    soundEnabled: merged.soundEnabled,
                    hapticsEnabled: merged.hapticsEnabled,
                }));
            } catch { }
            return updated;
        });
    },

    toggleHaptics: () => {
        const updated = { hapticsEnabled: !get().hapticsEnabled };
        set((state) => {
            const merged = { ...state, ...updated };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    soundEnabled: merged.soundEnabled,
                    hapticsEnabled: merged.hapticsEnabled,
                }));
            } catch { }
            return updated;
        });
    },
}));