/**
 * Real-time Spatial Synthesizer for 3D Interactive Avatars
 * Implemented using Web Audio API with zero external dependencies.
 * Uses lazy initialization to comply with browser autoplay policies.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    // Standard audio context initialization
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play procedural spatial audio triggered by avatar interactions.
 * @param frequency Base pitch frequency of the sound.
 * @param panX Horizontal panning coordinate from -1.0 (left) to +1.0 (right).
 * @param type Sound preset: 'vocal' | 'click' | 'space' | 'success'.
 */
export function playSpatialAvatarSound(
  frequency: number,
  panX: number,
  type: 'vocal' | 'click' | 'space' | 'success' = 'vocal'
) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Create a stereo panner node for genuine spatial 3D placement
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) {
      // Clamp panning to safe bounds
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panX)), now);
    }

    // Master volume control
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.24, now);

    // Node Routing
    let destinationNode: AudioNode = masterGain;
    if (panner) {
      masterGain.connect(panner);
      destinationNode = panner;
    }
    destinationNode.connect(ctx.destination);

    if (type === 'vocal') {
      // Procedural Vocal Formant synthesizer (Disney-style Bitmoji speak)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const vocalGain = ctx.createGain();
      
      // Formant filters to shape vocal sounds ("oo" to "ah" sweep)
      const formantFilter = ctx.createBiquadFilter();
      formantFilter.type = 'bandpass';
      formantFilter.Q.setValueAtTime(4.5, now);
      
      // Sweep filter frequency to mimic mouth shape movement
      formantFilter.frequency.setValueAtTime(440, now);
      formantFilter.frequency.exponentialRampToValueAtTime(1050, now + 0.18);
      formantFilter.frequency.exponentialRampToValueAtTime(700, now + 0.35);

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(frequency, now);
      // Add dynamic micro-pitch drift for organic human vocal qualities
      osc1.frequency.linearRampToValueAtTime(frequency * 1.05, now + 0.12);
      osc1.frequency.linearRampToValueAtTime(frequency * 0.95, now + 0.35);

      // Sub-octave oscillator for depth
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(frequency / 2, now);
      osc2.frequency.linearRampToValueAtTime(frequency * 0.52, now + 0.35);

      vocalGain.gain.setValueAtTime(0, now);
      vocalGain.gain.linearRampToValueAtTime(0.7, now + 0.05);
      vocalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc1.connect(formantFilter);
      osc2.connect(formantFilter);
      formantFilter.connect(vocalGain);
      vocalGain.connect(masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);

    } else if (type === 'click') {
      // Tactile physical click/tick sound for mouse movement sweeping
      const osc = ctx.createOscillator();
      const clickGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, now);
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.1, now + 0.02);

      clickGain.gain.setValueAtTime(0.08, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      osc.connect(clickGain);
      clickGain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.025);

    } else if (type === 'space') {
      // Cosmic ambient chiming sweep for presets & randomizer
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const spaceGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(frequency, now);
      osc.frequency.exponentialRampToValueAtTime(frequency * 2.5, now + 0.5);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(100, now);
      filter.frequency.exponentialRampToValueAtTime(4000, now + 0.25);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.6);

      spaceGain.gain.setValueAtTime(0, now);
      spaceGain.gain.linearRampToValueAtTime(0.4, now + 0.1);
      spaceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(filter);
      filter.connect(spaceGain);
      spaceGain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.7);

    } else if (type === 'success') {
      // Harmonious minor/major chord progression for Save actions
      const notes = [frequency, frequency * 1.25, frequency * 1.5, frequency * 2.0];
      
      notes.forEach((pitch, index) => {
        const osc = ctx.createOscillator();
        const chordGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, now + index * 0.04);
        
        chordGain.gain.setValueAtTime(0, now);
        chordGain.gain.linearRampToValueAtTime(0.18, now + index * 0.04 + 0.06);
        chordGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6 + index * 0.05);

        osc.connect(chordGain);
        chordGain.connect(masterGain);

        osc.start(now + index * 0.04);
        osc.stop(now + 0.85);
      });
    }
  } catch (err) {
    console.warn('Audio synthesis failed, likely due to autoplay constraints:', err);
  }
}
