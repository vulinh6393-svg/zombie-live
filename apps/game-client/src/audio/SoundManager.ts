/**
 * SoundManager — Synthesized Web Audio Sound System for Zombie Đại Chiến
 *
 * ARCHITECTURAL DESIGN:
 * 1. Zero External Audio File Dependencies: All sound effects are procedural synthesized
 *    via Web Audio API (Oscillators + Noise Buffers + Gain/BiquadFilter envelopes).
 * 2. Concurrency Throttling: Enforces a maximum limit of concurrent active voices (max 4)
 *    to prevent audio clipping, CPU spikes, and viewer ear fatigue during intense swarms.
 * 3. Default Muted: Complies with browser autoplay policies and user safety.
 *    Sound is disabled by default unless explicitly activated via preview/settings.
 */

export type SoundEffectType =
  | 'GUNSHOT'
  | 'ZOMBIE_ATTACK'
  | 'AIRSTRIKE_WARNING'
  | 'AIRSTRIKE_DETONATION'
  | 'SHIELD_BUZZ'
  | 'BOSS_ROAR'
  | 'ALARM';

export interface SoundManagerConfig {
  masterVolume?: number;
  sfxVolume?: number;
  muted?: boolean;
  maxConcurrentVoices?: number;
}

export class SoundManager {
  private static instance: SoundManager | null = null;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  private masterVolume: number = 0.8;
  private sfxVolume: number = 0.8;
  private isMuted: boolean = true; // Muted by default for safety
  private maxConcurrentVoices: number = 4;
  private activeVoiceCount: number = 0;

  // Sound cooldown tracking to prevent spam
  private lastPlayed: Map<SoundEffectType, number> = new Map();
  private readonly cooldowns: Record<SoundEffectType, number> = {
    GUNSHOT: 80, // min 80ms between shots
    ZOMBIE_ATTACK: 150,
    AIRSTRIKE_WARNING: 2000,
    AIRSTRIKE_DETONATION: 1000,
    SHIELD_BUZZ: 300,
    BOSS_ROAR: 3000,
    ALARM: 1500,
  };

  private constructor(config?: SoundManagerConfig) {
    if (config?.masterVolume !== undefined) this.masterVolume = config.masterVolume;
    if (config?.sfxVolume !== undefined) this.sfxVolume = config.sfxVolume;
    if (config?.muted !== undefined) this.isMuted = config.muted;
    if (config?.maxConcurrentVoices !== undefined) this.maxConcurrentVoices = config.maxConcurrentVoices;
  }

  public static getInstance(config?: SoundManagerConfig): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager(config);
    }
    return SoundManager.instance;
  }

  /**
   * Initializes or resumes the AudioContext upon user gesture.
   */
  public async unlock(): Promise<boolean> {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);

        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      return true;
    } catch (err) {
      console.warn('[SoundManager] Web Audio unlock failed:', err);
      return false;
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  public setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /**
   * Play a procedural synthesized sound effect.
   */
  public play(type: SoundEffectType): void {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    // Check cooldown
    const now = performance.now();
    const last = this.lastPlayed.get(type) || 0;
    if (now - last < this.cooldowns[type]) return;

    // Check voice concurrency
    if (this.activeVoiceCount >= this.maxConcurrentVoices) return;

    this.lastPlayed.set(type, now);
    this.activeVoiceCount++;

    try {
      switch (type) {
        case 'GUNSHOT':
          this.synthGunshot();
          break;
        case 'ZOMBIE_ATTACK':
          this.synthZombieAttack();
          break;
        case 'AIRSTRIKE_WARNING':
          this.synthAirstrikeWarning();
          break;
        case 'AIRSTRIKE_DETONATION':
          this.synthAirstrikeDetonation();
          break;
        case 'SHIELD_BUZZ':
          this.synthShieldBuzz();
          break;
        case 'BOSS_ROAR':
          this.synthBossRoar();
          break;
        case 'ALARM':
          this.synthAlarm();
          break;
      }
    } catch {
      this.activeVoiceCount = Math.max(0, this.activeVoiceCount - 1);
    }
  }

  private releaseVoice(durationMs: number): void {
    setTimeout(() => {
      this.activeVoiceCount = Math.max(0, this.activeVoiceCount - 1);
    }, durationMs);
  }

  // --- PROCEDURAL AUDIO SYNTHESIZERS ---

  private synthGunshot(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t0 = this.ctx.currentTime;

    // 1. Noise burst for gunshot crack
    const bufferSize = this.ctx.sampleRate * 0.12; // 120ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, t0);
    filter.frequency.exponentialRampToValueAtTime(100, t0 + 0.12);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t0);
    this.releaseVoice(130);
  }

  private synthZombieAttack(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t0 = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t0);
    osc.frequency.linearRampToValueAtTime(55, t0 + 0.25);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t0);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t0);
    gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t0);
    osc.stop(t0 + 0.25);
    this.releaseVoice(260);
  }

  private synthAirstrikeWarning(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t0 = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t0);
    osc.frequency.linearRampToValueAtTime(1200, t0 + 0.4);
    osc.frequency.linearRampToValueAtTime(600, t0 + 0.8);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t0);
    gain.gain.linearRampToValueAtTime(0.4, t0 + 0.75);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.85);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t0);
    osc.stop(t0 + 0.85);
    this.releaseVoice(900);
  }

  private synthAirstrikeDetonation(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t0 = this.ctx.currentTime;

    // Sub-bass thump
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t0);
    osc.frequency.exponentialRampToValueAtTime(25, t0 + 0.6);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.9, t0);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + 0.6);

    // Deep noise explosion body
    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t0);
    filter.frequency.exponentialRampToValueAtTime(60, t0 + 0.8);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.8);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(t0);
    this.releaseVoice(850);
  }

  private synthShieldBuzz(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t0 = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(120, t0);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(242, t0); // Slight detune for electrical buzz

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t0);
    gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t0);
    osc2.start(t0);
    osc1.stop(t0 + 0.4);
    osc2.stop(t0 + 0.4);
    this.releaseVoice(450);
  }

  private synthBossRoar(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t0 = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, t0);
    osc.frequency.linearRampToValueAtTime(130, t0 + 0.3);
    osc.frequency.linearRampToValueAtTime(45, t0 + 1.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, t0);
    filter.frequency.linearRampToValueAtTime(700, t0 + 0.4);
    filter.frequency.linearRampToValueAtTime(150, t0 + 1.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, t0);
    gain.gain.exponentialRampToValueAtTime(0.01, t0 + 1.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t0);
    osc.stop(t0 + 1.2);
    this.releaseVoice(1300);
  }

  private synthAlarm(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t0 = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t0);
    osc.frequency.setValueAtTime(659, t0 + 0.25);
    osc.frequency.setValueAtTime(880, t0 + 0.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t0);
    gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.7);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t0);
    osc.stop(t0 + 0.7);
    this.releaseVoice(750);
  }
}
