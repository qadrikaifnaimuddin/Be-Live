/**
 * Web Audio API Voice Pitch and Timbre Changer Engine
 * Supports real microphone stream processing and procedurally synthesized voice previews.
 */

let activeOscillators: any[] = [];
let voiceTestCtx: AudioContext | null = null;

function getVoiceContext(): AudioContext {
  if (!voiceTestCtx) {
    voiceTestCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (voiceTestCtx.state === 'suspended') {
    voiceTestCtx.resume();
  }
  return voiceTestCtx;
}

export const VOICE_PROFILES = {
  normal: {
    name: 'Standard Voice',
    emoji: '👥',
    desc: 'Unfiltered, natural vocal signal.'
  },
  high: {
    name: 'Filter: High',
    emoji: '🧚‍♀️',
    desc: 'Crisp, elevated pitch. Fun and unrecognizable.'
  },
  low: {
    name: 'Filter: Deep',
    emoji: '🧌',
    desc: 'Ultra-low, deep frequency. Slow and commanding.'
  },
  bold: {
    name: 'Radio Broadcaster',
    emoji: '🎙️',
    desc: 'Warm, boosted mid-range with elegant rich bass.'
  },
  light: {
    name: 'Airy Breeze',
    emoji: '🍃',
    desc: 'Soft, whisper-like vocal tone with light definition.'
  },
  robot: {
    name: 'Cyborg Synth',
    emoji: '🤖',
    desc: 'Metallic ring-modulated robotic synthesizer.'
  },
  helium: {
    name: 'Helium Balloon',
    emoji: '🎈',
    desc: 'Super high-pitch squeak. Highly amusing.'
  }
};

/**
 * Stop any active procedural previews.
 */
export function stopProceduralPreview() {
  activeOscillators.forEach(osc => {
    try { osc.stop(); } catch (e) {}
  });
  activeOscillators = [];
}

/**
 * Synthesize a highly customized vocal pattern to preview the selected voice pitch.
 */
export function speakProceduralVocal(pitchType: keyof typeof VOICE_PROFILES | string) {
  try {
    stopProceduralPreview();
    const ctx = getVoiceContext();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.2, now);
    masterGain.connect(ctx.destination);

    // Filter to shape formants (mouth vowels "Oo-Ah-Ee")
    const vowelFilter = ctx.createBiquadFilter();
    vowelFilter.type = 'bandpass';
    vowelFilter.Q.setValueAtTime(5, now);
    vowelFilter.connect(masterGain);

    if (pitchType === 'high') {
      // High pitch pixie: rapid vibrato, 600Hz frequency, high filter sweep
      const osc = ctx.createOscillator();
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(580, now);
      
      vibrato.frequency.setValueAtTime(9, now); // fast vibrato
      vibratoGain.gain.setValueAtTime(25, now); // vibrato depth

      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      
      vowelFilter.frequency.setValueAtTime(1400, now);
      vowelFilter.frequency.exponentialRampToValueAtTime(2400, now + 0.15);
      vowelFilter.frequency.exponentialRampToValueAtTime(1600, now + 0.4);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.8, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(vowelFilter);

      vibrato.start(now);
      osc.start(now);
      vibrato.stop(now + 0.5);
      osc.stop(now + 0.5);

      activeOscillators.push(osc, vibrato);

    } else if (pitchType === 'low') {
      // Deep low rumble: 85Hz base, sawtooth sub-oscillator for grit, low filter
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(80, now);
      osc1.frequency.linearRampToValueAtTime(75, now + 0.4);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(40, now); // Sub-bass

      vowelFilter.frequency.setValueAtTime(320, now);
      vowelFilter.frequency.linearRampToValueAtTime(450, now + 0.2);
      vowelFilter.frequency.linearRampToValueAtTime(280, now + 0.4);
      vowelFilter.Q.setValueAtTime(8, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(vowelFilter);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);

      activeOscillators.push(osc1, osc2);

    } else if (pitchType === 'bold') {
      // Radio broadcast speaker: 125Hz pitch, resonant bandpass for that warm chest compression
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(125, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.35);

      sub.type = 'sine';
      sub.frequency.setValueAtTime(62.5, now); // warm sub harmonic

      vowelFilter.frequency.setValueAtTime(700, now);
      vowelFilter.frequency.exponentialRampToValueAtTime(1100, now + 0.15);
      vowelFilter.frequency.exponentialRampToValueAtTime(800, now + 0.4);
      vowelFilter.Q.setValueAtTime(3, now); // wider bandpass for realistic vocal

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1.0, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      sub.connect(gain);
      gain.connect(vowelFilter);

      osc.start(now);
      sub.start(now);
      osc.stop(now + 0.55);
      sub.stop(now + 0.55);

      activeOscillators.push(osc, sub);

    } else if (pitchType === 'light') {
      // Whisper air: highpass noise + soft triangle oscillator at 190Hz
      const osc = ctx.createOscillator();
      
      // Noise buffer for airy/whisper quality
      const bufferSize = ctx.sampleRate * 0.5; // 0.5 seconds
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(1500, now);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(195, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.06, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.12, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      noiseNode.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      noiseNode.start(now);
      osc.start(now);
      osc.stop(now + 0.5);

      activeOscillators.push(osc, noiseNode);

    } else if (pitchType === 'robot') {
      // Metallic cyborg synth: ring modulator with low-frequency square wave
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();

      carrier.type = 'sawtooth';
      carrier.frequency.setValueAtTime(110, now);

      modulator.type = 'square';
      modulator.frequency.setValueAtTime(45, now); // metallic metallic ring pitch

      const ringGain = ctx.createGain();
      ringGain.gain.setValueAtTime(0.6, now);

      vowelFilter.type = 'bandpass';
      vowelFilter.frequency.setValueAtTime(950, now);
      vowelFilter.Q.setValueAtTime(6, now);

      // Web Audio ring modulation: multiply carrier by modulator
      // We can simulate this using a GainNode where the gain is modulated by an oscillator
      carrier.connect(ringGain);
      modulator.connect(ringGain.gain); // Modulate ringGain by the oscillator
      ringGain.connect(vowelFilter);

      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(0, now);
      mainGain.gain.linearRampToValueAtTime(0.8, now + 0.05);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      vowelFilter.connect(mainGain);
      mainGain.connect(masterGain);

      carrier.start(now);
      modulator.start(now);
      carrier.stop(now + 0.55);
      modulator.stop(now + 0.55);

      activeOscillators.push(carrier, modulator);

    } else if (pitchType === 'helium') {
      // Extreme squeak helium pitch
      const osc = ctx.createOscillator();
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1050, now);
      
      vibrato.frequency.setValueAtTime(12, now); // fast rapid vibrato
      vibratoGain.gain.setValueAtTime(50, now);

      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);

      vowelFilter.type = 'highpass';
      vowelFilter.frequency.setValueAtTime(1800, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.6, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(vowelFilter);

      vibrato.start(now);
      osc.start(now);
      vibrato.stop(now + 0.45);
      osc.stop(now + 0.45);

      activeOscillators.push(osc, vibrato);
    } else {
      // Standard vocal simulation
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(200, now + 0.4);

      vowelFilter.frequency.setValueAtTime(800, now);
      vowelFilter.frequency.linearRampToValueAtTime(1200, now + 0.2);
      vowelFilter.frequency.linearRampToValueAtTime(900, now + 0.4);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.8, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(vowelFilter);

      osc.start(now);
      osc.stop(now + 0.5);

      activeOscillators.push(osc);
    }
  } catch (err) {
    console.warn("Vocal preview synthesis block failed: ", err);
  }
}

/**
 * Configure real microphone Web Audio API filter routing.
 * Shakes, filters, and modulates real mic input.
 */
export function applyLiveVoiceChanger(
  stream: MediaStream, 
  audioCtx: AudioContext, 
  pitchType: keyof typeof VOICE_PROFILES | string
): { source: MediaStreamAudioSourceNode; outputNode: AudioNode } {
  
  const source = audioCtx.createMediaStreamSource(stream);
  let finalNode: AudioNode = source;

  // 1. Pre-amp Gain
  const preGain = audioCtx.createGain();
  preGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
  source.connect(preGain);
  finalNode = preGain;

  // 2. Timbre shaping and Pitch effects routing based on selected mode
  if (pitchType === 'high') {
    // Model a high pitch formant filter (boost 2kHz to 3kHz, high-pass)
    const formFilter = audioCtx.createBiquadFilter();
    formFilter.type = 'peaking';
    formFilter.frequency.setValueAtTime(2200, audioCtx.currentTime);
    formFilter.Q.setValueAtTime(2.0, audioCtx.currentTime);
    formFilter.gain.setValueAtTime(12, audioCtx.currentTime);

    const hiPass = audioCtx.createBiquadFilter();
    hiPass.type = 'highpass';
    hiPass.frequency.setValueAtTime(450, audioCtx.currentTime);

    finalNode.connect(formFilter);
    formFilter.connect(hiPass);
    finalNode = hiPass;

  } else if (pitchType === 'low') {
    // Model a deep bass rumble (boost low end 80Hz - 150Hz, cut high frequencies above 1kHz)
    const lowFilter = audioCtx.createBiquadFilter();
    lowFilter.type = 'lowpass';
    lowFilter.frequency.setValueAtTime(750, audioCtx.currentTime);

    const bassBoost = audioCtx.createBiquadFilter();
    bassBoost.type = 'peaking';
    bassBoost.frequency.setValueAtTime(110, audioCtx.currentTime);
    bassBoost.Q.setValueAtTime(1.5, audioCtx.currentTime);
    bassBoost.gain.setValueAtTime(15, audioCtx.currentTime);

    finalNode.connect(lowFilter);
    lowFilter.connect(bassBoost);
    finalNode = bassBoost;

  } else if (pitchType === 'bold') {
    // Radio Broadcaster compression & warmth
    const highShelf = audioCtx.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.setValueAtTime(4500, audioCtx.currentTime);
    highShelf.gain.setValueAtTime(4, audioCtx.currentTime);

    const lowShelf = audioCtx.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.setValueAtTime(180, audioCtx.currentTime);
    lowShelf.gain.setValueAtTime(8, audioCtx.currentTime);

    const midFilter = audioCtx.createBiquadFilter();
    midFilter.type = 'peaking';
    midFilter.frequency.setValueAtTime(1100, audioCtx.currentTime);
    midFilter.gain.setValueAtTime(-2, audioCtx.currentTime); // subtle scoop

    finalNode.connect(lowShelf);
    lowShelf.connect(highShelf);
    highShelf.connect(midFilter);
    finalNode = midFilter;

  } else if (pitchType === 'light') {
    // Airy whisper highpass
    const whisperFilter = audioCtx.createBiquadFilter();
    whisperFilter.type = 'highpass';
    whisperFilter.frequency.setValueAtTime(1200, audioCtx.currentTime);

    const topEnd = audioCtx.createBiquadFilter();
    topEnd.type = 'highshelf';
    topEnd.frequency.setValueAtTime(6000, audioCtx.currentTime);
    topEnd.gain.setValueAtTime(10, audioCtx.currentTime);

    finalNode.connect(whisperFilter);
    whisperFilter.connect(topEnd);
    finalNode = topEnd;

  } else if (pitchType === 'robot') {
    // Ring modulator simulation with Web Audio
    // We create a dry/wet mix where the wet channel is multiplied by a sine wave
    const ringOsc = audioCtx.createOscillator();
    ringOsc.type = 'sine';
    ringOsc.frequency.setValueAtTime(55, audioCtx.currentTime);

    const ringGain = audioCtx.createGain();
    ringGain.gain.setValueAtTime(0, audioCtx.currentTime);

    finalNode.connect(ringGain);
    ringOsc.connect(ringGain.gain); // Modulate ringGain by the oscillator
    
    // Bandpass filter to make it sound vintage/metallic
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1000, audioCtx.currentTime);
    bp.Q.setValueAtTime(3, audioCtx.currentTime);

    ringGain.connect(bp);
    
    ringOsc.start();
    finalNode = bp;

  } else if (pitchType === 'helium') {
    // Helium squeak bandpass + highpass
    const formFilter = audioCtx.createBiquadFilter();
    formFilter.type = 'peaking';
    formFilter.frequency.setValueAtTime(3200, audioCtx.currentTime);
    formFilter.gain.setValueAtTime(15, audioCtx.currentTime);

    const hiPass = audioCtx.createBiquadFilter();
    hiPass.type = 'highpass';
    hiPass.frequency.setValueAtTime(900, audioCtx.currentTime);

    finalNode.connect(formFilter);
    formFilter.connect(hiPass);
    finalNode = hiPass;
  }

  return { source, outputNode: finalNode };
}
