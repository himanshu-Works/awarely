/**
 * EmergencySiren — dependency-free synthesized audio siren using Web Audio API.
 * Uses an LFO-modulated dual-oscillator audio graph to produce an authoritative,
 * high-visibility distress siren without any external audio asset dependencies.
 *
 * Requirements:
 * - Starts only from explicit user click/tap.
 * - Handles AudioContext resumption (critical for browser autoplay policies).
 * - Smooth alternating emergency tone pattern (2.2Hz LFO frequency sweep: 500Hz - 1000Hz).
 * - Click-free exponential volume ramping.
 * - Robust cleanup and multiple simultaneous instance prevention.
 * - User-facing error message on playback failure.
 */

type SirenStateListener = (isPlaying: boolean) => void
type SirenErrorListener = (errorMessage: string) => void

export const SIREN_ERROR_MESSAGE =
  'Siren audio could not be started. Check your device volume or browser settings.'

class SirenAudioService {
  private audioCtx: AudioContext | null = null
  private carrierOsc: OscillatorNode | null = null
  private lfoOsc: OscillatorNode | null = null
  private lfoGain: GainNode | null = null
  private masterGain: GainNode | null = null
  private isStarting: boolean = false
  private listeners: Set<SirenStateListener> = new Set()
  private errorListeners: Set<SirenErrorListener> = new Set()

  public isPlaying: boolean = false

  /**
   * Subscribe to siren playback state changes.
   * Immediately notifies the listener with the current state.
   */
  public subscribe(listener: SirenStateListener): () => void {
    this.listeners.add(listener)
    listener(this.isPlaying)
    return () => this.listeners.delete(listener)
  }

  /**
   * Register a custom error listener for when the siren cannot start.
   */
  public onError(listener: SirenErrorListener): () => void {
    this.errorListeners.add(listener)
    return () => this.errorListeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.isPlaying)
      } catch (err) {
        console.error('[Awarely] Error in siren listener:', err)
      }
    })
  }

  private notifyError(message: string) {
    if (this.errorListeners.size > 0) {
      this.errorListeners.forEach((fn) => {
        try {
          fn(message)
        } catch {}
      })
    } else if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(message)
    }
  }

  /**
   * Starts the emergency siren audio graph.
   * Resumes AudioContext if suspended (browser autoplay requirement).
   * Prevents multiple simultaneous siren instances.
   */
  public async start(): Promise<boolean> {
    if (this.isPlaying || this.isStarting) return true

    this.isStarting = true

    try {
      const AudioContextClass =
        (typeof window !== 'undefined' &&
          (window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)) ||
        (typeof globalThis !== 'undefined' && (globalThis as any).AudioContext) ||
        null

      if (!AudioContextClass) {
        throw new Error('Web Audio API is not supported in this browser.')
      }

      // Re-use or instantiate AudioContext
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass()
      }

      const ctx = this.audioCtx
      if (!ctx) {
        throw new Error('Web Audio API AudioContext could not be created.')
      }

      // Explicitly resume AudioContext if suspended (satisfies browser autoplay policies)
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }

      const now = ctx.currentTime

      // Master gain for click-free entry and emergency volume
      const masterGain = ctx.createGain()
      this.masterGain = masterGain
      masterGain.gain.setValueAtTime(0.001, now)
      // Rapid exponential ramp to clear audible distress volume
      masterGain.gain.exponentialRampToValueAtTime(0.45, now + 0.05)
      masterGain.connect(ctx.destination)

      // Carrier Oscillator (primary siren pitch)
      const carrier = ctx.createOscillator()
      this.carrierOsc = carrier
      carrier.type = 'sawtooth'
      carrier.frequency.setValueAtTime(750, now)

      // LFO Modulator Oscillator (alternating emergency wail pattern)
      const lfo = ctx.createOscillator()
      this.lfoOsc = lfo
      lfo.type = 'triangle'
      lfo.frequency.setValueAtTime(2.2, now) // 2.2 sweeps per second

      // LFO Gain (modulation depth: 750Hz ± 250Hz -> 500Hz to 1000Hz sweep)
      const lfoGain = ctx.createGain()
      this.lfoGain = lfoGain
      lfoGain.gain.setValueAtTime(250, now)

      // Connect: LFO -> lfoGain -> carrier.frequency
      lfo.connect(lfoGain)
      lfoGain.connect(carrier.frequency)

      // Connect: carrier -> masterGain -> destination
      carrier.connect(masterGain)

      carrier.start(now)
      lfo.start(now)

      this.isPlaying = true
      this.isStarting = false
      this.notify()
      return true
    } catch (err) {
      console.error('[Awarely] AudioContext could not start siren:', err)
      this.cleanup()
      this.isPlaying = false
      this.isStarting = false
      this.notify()
      this.notifyError(SIREN_ERROR_MESSAGE)
      return false
    }
  }

  /**
   * Stops the siren immediately with a click-free fadeout and releases audio resources.
   */
  public stop(): boolean {
    if (!this.isPlaying && !this.audioCtx) return false

    try {
      if (this.masterGain && this.audioCtx) {
        const now = this.audioCtx.currentTime
        // Click-free exponential fade to silence
        this.masterGain.gain.setValueAtTime(Math.max(this.masterGain.gain.value, 0.001), now)
        this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)
      }

      const stopTime = (this.audioCtx?.currentTime || 0) + 0.06
      if (this.carrierOsc) {
        try {
          this.carrierOsc.stop(stopTime)
        } catch {}
      }
      if (this.lfoOsc) {
        try {
          this.lfoOsc.stop(stopTime)
        } catch {}
      }
    } catch {
      // Disregard stop errors if already stopping
    }

    this.cleanup()
    this.isPlaying = false
    this.isStarting = false
    this.notify()
    return true
  }

  private cleanup() {
    try {
      this.carrierOsc?.disconnect()
      this.lfoOsc?.disconnect()
      this.lfoGain?.disconnect()
      this.masterGain?.disconnect()
    } catch {}

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close().catch(() => {})
      } catch {}
    }

    this.audioCtx = null
    this.carrierOsc = null
    this.lfoOsc = null
    this.lfoGain = null
    this.masterGain = null
  }

  /**
   * Toggles the siren on or off upon explicit user interaction.
   * Returns a promise resolving to the new playback state (true = playing, false = stopped).
   */
  public async toggle(): Promise<boolean> {
    if (this.isPlaying) {
      this.stop()
      return false
    } else {
      return await this.start()
    }
  }
}

export const sirenService = new SirenAudioService()
