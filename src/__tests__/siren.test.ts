import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sirenService, SIREN_ERROR_MESSAGE } from '@/services/siren.service'

if (typeof (globalThis as any).window === 'undefined') {
  ;(globalThis as any).window = globalThis
}

describe('Issue 2: Emergency Siren Audio Service Suite', () => {
  let mockResume: any
  let mockClose: any
  let mockCarrierOsc: any
  let mockLfoOsc: any
  let mockGainNode: any
  let mockAudioContextInstance: any
  let originalAudioContext: any

  beforeEach(() => {
    vi.restoreAllMocks()
    sirenService.stop()

    mockResume = vi.fn().mockResolvedValue(undefined)
    mockClose = vi.fn().mockResolvedValue(undefined)

    mockCarrierOsc = {
      type: '',
      frequency: {
        setValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    }

    mockLfoOsc = {
      type: '',
      frequency: {
        setValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    }

    let oscCallCount = 0

    mockGainNode = {
      gain: {
        value: 0.45,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }

    mockAudioContextInstance = {
      state: 'suspended',
      currentTime: 0,
      destination: {},
      resume: mockResume,
      close: mockClose,
      createOscillator: vi.fn().mockImplementation(() => {
        oscCallCount++
        return oscCallCount % 2 === 1 ? mockCarrierOsc : mockLfoOsc
      }),
      createGain: vi.fn().mockImplementation(() => ({
        ...mockGainNode,
        gain: { ...mockGainNode.gain },
      })),
    }

    originalAudioContext = (globalThis as any).AudioContext
    function MockAudioContext(this: any) {
      return mockAudioContextInstance
    }
    ;(globalThis as any).AudioContext = MockAudioContext
    if (typeof (globalThis as any).window !== 'undefined') {
      ;(globalThis as any).window.AudioContext = MockAudioContext
    }
  })

  afterEach(() => {
    sirenService.stop()
    ;(globalThis as any).AudioContext = originalAudioContext
    if (typeof (globalThis as any).window !== 'undefined') {
      ;(globalThis as any).window.AudioContext = originalAudioContext
    }
  })

  // ── 1. EXPLICIT TRIGGER & RESUME ─────────────────────────────────────
  it('initializes and resumes AudioContext upon explicit trigger', async () => {
    expect(sirenService.isPlaying).toBe(false)

    const success = await sirenService.start()
    expect(success).toBe(true)
    expect(sirenService.isPlaying).toBe(true)
    // Critical browser autoplay requirement
    expect(mockResume).toHaveBeenCalled()
    expect(mockCarrierOsc.start).toHaveBeenCalled()
    expect(mockLfoOsc.start).toHaveBeenCalled()
  })

  // ── 2. CARRIER & LFO AUDIO GRAPH CONNECTION ──────────────────────────
  it('constructs LFO-modulated siren tone audio graph with audible volume', async () => {
    await sirenService.start()

    expect(mockCarrierOsc.type).toBe('sawtooth')
    expect(mockLfoOsc.type).toBe('triangle')

    // LFO frequency set to ~2.2Hz emergency wail
    expect(mockLfoOsc.frequency.setValueAtTime).toHaveBeenCalledWith(2.2, expect.any(Number))
    // Carrier base frequency set to 750Hz
    expect(mockCarrierOsc.frequency.setValueAtTime).toHaveBeenCalledWith(750, expect.any(Number))

    // Modulator connects to carrier frequency AudioParam
    expect(mockLfoOsc.connect).toHaveBeenCalled()
  })

  // ── 3. DUPLICATE ACTIVATION PREVENTION ───────────────────────────────
  it('prevents multiple simultaneous siren instances', async () => {
    await sirenService.start()
    const firstCallCount = mockAudioContextInstance.createOscillator.mock.calls.length

    // Attempt second start while already playing
    const secondSuccess = await sirenService.start()
    expect(secondSuccess).toBe(true)
    // No new oscillators created
    expect(mockAudioContextInstance.createOscillator.mock.calls.length).toBe(firstCallCount)
  })

  // ── 4. STOPPING & RESOURCE CLEANUP ───────────────────────────────────
  it('stops oscillators and resets playback state on stop()', async () => {
    await sirenService.start()
    expect(sirenService.isPlaying).toBe(true)

    const stopped = sirenService.stop()
    expect(stopped).toBe(true)
    expect(sirenService.isPlaying).toBe(false)
    expect(mockCarrierOsc.stop).toHaveBeenCalled()
    expect(mockLfoOsc.stop).toHaveBeenCalled()
  })

  // ── 5. TOGGLE FUNCTIONALITY ──────────────────────────────────────────
  it('toggles playback state accurately between active and inactive', async () => {
    expect(sirenService.isPlaying).toBe(false)

    const activeState = await sirenService.toggle()
    expect(activeState).toBe(true)
    expect(sirenService.isPlaying).toBe(true)

    const inactiveState = await sirenService.toggle()
    expect(inactiveState).toBe(false)
    expect(sirenService.isPlaying).toBe(false)
  })

  // ── 6. STATE SUBSCRIPTIONS ───────────────────────────────────────────
  it('notifies subscribers immediately and upon state transitions', async () => {
    const subscriber = vi.fn()
    const unsubscribe = sirenService.subscribe(subscriber)

    // Initial notification
    expect(subscriber).toHaveBeenCalledWith(false)

    await sirenService.start()
    expect(subscriber).toHaveBeenCalledWith(true)

    sirenService.stop()
    expect(subscriber).toHaveBeenCalledWith(false)

    unsubscribe()
  })

  // ── 7. GRACEFUL FAILURE HANDLING ─────────────────────────────────────
  it('handles AudioContext failure gracefully with user-facing message', async () => {
    // Simulate audio failure (e.g. user blocked audio or driver error)
    mockResume.mockRejectedValueOnce(new Error('Autoplay blocked'))

    const errorHandler = vi.fn()
    sirenService.onError(errorHandler)

    const result = await sirenService.start()
    expect(result).toBe(false)
    expect(sirenService.isPlaying).toBe(false)

    expect(errorHandler).toHaveBeenCalledWith(SIREN_ERROR_MESSAGE)
  })

  // ── 8. USER CONTROL PRINCIPLE ────────────────────────────────────────
  it('does NOT automatically trigger on initialization or import', () => {
    expect(sirenService.isPlaying).toBe(false)
  })
})
