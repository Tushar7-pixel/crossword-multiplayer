import { useSettingsStore } from '../store/settingsStore';

class Haptics {
    private isSupported: boolean;

    constructor() {
        this.isSupported = typeof window !== 'undefined' && 'vibrate' in navigator;
    }

    private isEnabled(): boolean {
        return this.isSupported && useSettingsStore.getState().hapticsEnabled;
    }

    tick() {
        if (!this.isEnabled()) return;
        try {
            navigator.vibrate(15);
        } catch { }
    }

    wordFound() {
        if (!this.isEnabled()) return;
        try {
            navigator.vibrate([40, 50, 40]);
        } catch { }
    }

    goldenFound() {
        if (!this.isEnabled()) return;
        try {
            navigator.vibrate([60, 40, 80, 40, 120]);
        } catch { }
    }

    // Sharp, jarring dual-buzz on a short-circuit
    voltageShock() {
        if (!this.isEnabled()) return;
        try {
            navigator.vibrate([90, 40, 120]);
        } catch { }
    }

    // Crisp electric pulse when disarming a hazard tile
    voltageDisarm() {
        if (!this.isEnabled()) return;
        try {
            navigator.vibrate([35, 25, 50]);
        } catch { }
    }

    // Extended celebratory rumble for completing Level 40
    grandVictory() {
        if (!this.isEnabled()) return;
        try {
            navigator.vibrate([100, 60, 100, 60, 200, 60, 350]);
        } catch { }
    }
}

export const haptic = new Haptics();