class Haptics {
    private isSupported: boolean;

    constructor() {
        this.isSupported = typeof window !== 'undefined' && 'vibrate' in navigator;
    }

    // Subtle tap when dragging over each letter
    tick() {
        if (!this.isSupported) return;
        try {
            navigator.vibrate(15);
        } catch { }
    }

    // Firm pulse when finding a correct word
    wordFound() {
        if (!this.isSupported) return;
        try {
            navigator.vibrate([40, 50, 40]);
        } catch { }
    }

    // High-energy rumble on streaks & golden words
    goldenFound() {
        if (!this.isSupported) return;
        try {
            navigator.vibrate([60, 40, 80, 40, 120]);
        } catch { }
    }
}

export const haptic = new Haptics();