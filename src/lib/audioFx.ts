import { useSettingsStore } from '../store/settingsStore';

class SoundSynthesizer {
    private ctx: AudioContext | null = null;

    private isEnabled(): boolean {
        return useSettingsStore.getState().soundEnabled;
    }

    private initCtx() {
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playCellTick(stepIndex: number = 0) {
        if (!this.isEnabled()) return;
        this.initCtx();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const freq = 440 + Math.min(stepIndex * 40, 400);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playWordFound() {
        if (!this.isEnabled()) return;
        this.initCtx();
        if (!this.ctx) return;

        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.06);

            gain.gain.setValueAtTime(0, this.ctx!.currentTime);
            gain.gain.setValueAtTime(0.12, this.ctx!.currentTime + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.06 + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx!.destination);

            osc.start(this.ctx!.currentTime + idx * 0.06);
            osc.stop(this.ctx!.currentTime + idx * 0.06 + 0.35);
        });
    }

    playGoldenFound() {
        if (!this.isEnabled()) return;
        this.initCtx();
        if (!this.ctx) return;

        const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51];
        fanfare.forEach((freq, idx) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.07);

            gain.gain.setValueAtTime(0.18, this.ctx!.currentTime + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.07 + 0.45);

            osc.connect(gain);
            gain.connect(this.ctx!.destination);

            osc.start(this.ctx!.currentTime + idx * 0.07);
            osc.stop(this.ctx!.currentTime + idx * 0.07 + 0.5);
        });
    }

    // Short-circuit electric shock on touching a hazard tile with an invalid word
    playVoltageShock() {
        if (!this.isEnabled()) return;
        this.initCtx();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    // High-frequency resonant pulse when safely routing a word through a voltage tile
    playVoltageDisarm() {
        if (!this.isEnabled()) return;
        this.initCtx();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.28);
    }

    playLevelComplete() {
        if (!this.isEnabled()) return;
        this.initCtx();
        if (!this.ctx) return;

        [440, 554.37, 659.25, 880].forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + i * 0.1);
            gain.gain.setValueAtTime(0.15, this.ctx!.currentTime + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + i * 0.1 + 0.5);
            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(this.ctx!.currentTime + i * 0.1);
            osc.stop(this.ctx!.currentTime + i * 0.1 + 0.55);
        });
    }

    // Grand celebratory orchestration for conquering all 40 levels
    playGrandVictory() {
        if (!this.isEnabled()) return;
        this.initCtx();
        if (!this.ctx) return;

        const melody = [523.25, 659.25, 783.99, 1046.5, 880, 1046.5, 1318.51];
        melody.forEach((freq, idx) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.12);

            gain.gain.setValueAtTime(0.2, this.ctx!.currentTime + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.12 + 0.6);

            osc.connect(gain);
            gain.connect(this.ctx!.destination);

            osc.start(this.ctx!.currentTime + idx * 0.12);
            osc.stop(this.ctx!.currentTime + idx * 0.12 + 0.65);
        });
    }
}

export const soundFx = new SoundSynthesizer();