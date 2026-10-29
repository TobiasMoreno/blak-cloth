/**
 * Sonido sintetizado del perchero: el roce de las perchas en el riel y un "clink" metálico
 * al sacar una remera. Arranca apagado y solo se activa con un gesto explícito del usuario.
 */
export class RackAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private slideGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private lastClink = 0;
  enabled = false;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) this.start();
    if (!this.context || !this.master) return;
    this.master.gain.setTargetAtTime(enabled ? 0.85 : 0, this.context.currentTime, 0.08);
    if (enabled) {
      void this.context.resume().then(() => this.clink(0.5));
    } else {
      const context = this.context;
      setTimeout(() => {
        if (!this.enabled) void context.suspend().catch(() => undefined);
      }, 300);
    }
  }

  /** Velocidad del riel en unidades por segundo. */
  slide(speed: number): void {
    if (!this.enabled || !this.context || !this.slideGain) return;
    const level = Math.min(0.32, Math.max(0, Math.abs(speed) - 0.05) * 0.09);
    this.slideGain.gain.setTargetAtTime(level, this.context.currentTime, 0.05);
  }

  clink(strength = 1): void {
    if (!this.enabled || !this.context || !this.master || !this.noise) return;
    const now = this.context.currentTime;
    if (now - this.lastClink < 0.06) return;
    this.lastClink = now;

    const ping = this.context.createOscillator();
    ping.type = 'triangle';
    ping.frequency.setValueAtTime(2350 + Math.random() * 500, now);
    const pingGain = this.context.createGain();
    pingGain.gain.setValueAtTime(0.0001, now);
    pingGain.gain.exponentialRampToValueAtTime(0.05 * strength, now + 0.004);
    pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    ping.connect(pingGain).connect(this.master);
    ping.start(now);
    ping.stop(now + 0.25);

    const scrape = this.context.createBufferSource();
    scrape.buffer = this.noise;
    const band = this.context.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 3800;
    band.Q.value = 2.5;
    const scrapeGain = this.context.createGain();
    scrapeGain.gain.setValueAtTime(0.0001, now);
    scrapeGain.gain.exponentialRampToValueAtTime(0.12 * strength, now + 0.01);
    scrapeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    scrape.connect(band).connect(scrapeGain).connect(this.master);
    scrape.start(now, Math.random());
    scrape.stop(now + 0.12);
  }

  dispose(): void {
    void this.context?.close().catch(() => undefined);
    this.context = null;
  }

  private start(): void {
    if (this.context) return;
    const context = new AudioContext();
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = 0;
    this.master.connect(context.destination);

    this.noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = this.noise.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;

    const loop = context.createBufferSource();
    loop.buffer = this.noise;
    loop.loop = true;
    const band = context.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2200;
    band.Q.value = 0.8;
    this.slideGain = context.createGain();
    this.slideGain.gain.value = 0;
    loop.connect(band).connect(this.slideGain).connect(this.master);
    loop.start();
  }
}
