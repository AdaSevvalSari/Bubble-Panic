const AudioManager = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playTone({ freq = 440, type = 'sine', duration = 0.15, gain = 0.3,
                      freqEnd = null, attack = 0.005, decay = 0 } = {}) {
    const ac  = getCtx();
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.connect(env);
    env.connect(ac.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (freqEnd !== null)
      osc.frequency.exponentialRampToValueAtTime(freqEnd, ac.currentTime + duration);

    env.gain.setValueAtTime(0, ac.currentTime);
    env.gain.linearRampToValueAtTime(gain, ac.currentTime + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration + decay);

    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + duration + decay + 0.05);
  }

  function playNoise({ duration = 0.08, gain = 0.2, freq = 800, q = 1 } = {}) {
    const ac      = getCtx();
    const bufSize = Math.ceil(ac.sampleRate * duration);
    const buf     = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src    = ac.createBufferSource();
    const filter = ac.createBiquadFilter();
    const env    = ac.createGain();
    src.buffer   = buf;
    filter.type  = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    src.connect(filter);
    filter.connect(env);
    env.connect(ac.destination);

    env.gain.setValueAtTime(gain, ac.currentTime);
    env.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
    src.start(ac.currentTime);
  }

  return {
    ropeShoot() {
      playTone({ freq: 900, freqEnd: 300, type: 'square', duration: 0.12, gain: 0.12 });
    },

    bubblePop(size) {
      const freqs = { LARGE: 180, MEDIUM: 280, SMALL: 420 };
      const f = freqs[size] || 280;
      // Low thud
      playTone({ freq: f * 2, freqEnd: f * 0.4, type: 'sine', duration: 0.18, gain: 0.35, decay: 0.05 });
      // Noise burst
      playNoise({ duration: 0.1, gain: 0.18, freq: f * 3, q: 0.8 });
    },

    playerHit() {
      playTone({ freq: 220, freqEnd: 80, type: 'sawtooth', duration: 0.2, gain: 0.25, decay: 0.05 });
      playNoise({ duration: 0.15, gain: 0.15, freq: 200, q: 0.5 });
    },

    powerupCollect() {
      [0, 0.07, 0.14].forEach((t, i) => {
        const ac = getCtx();
        const osc = ac.createOscillator();
        const env = ac.createGain();
        osc.connect(env); env.connect(ac.destination);
        osc.type = 'sine';
        osc.frequency.value = 500 + i * 200;
        env.gain.setValueAtTime(0, ac.currentTime + t);
        env.gain.linearRampToValueAtTime(0.2, ac.currentTime + t + 0.02);
        env.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.1);
        osc.start(ac.currentTime + t);
        osc.stop(ac.currentTime + t + 0.15);
      });
    },

    levelClear() {
      [0, 0.1, 0.2, 0.35].forEach((t, i) => {
        const ac = getCtx();
        const osc = ac.createOscillator();
        const env = ac.createGain();
        osc.connect(env); env.connect(ac.destination);
        osc.type = 'sine';
        const notes = [523, 659, 784, 1047];
        osc.frequency.value = notes[i];
        env.gain.setValueAtTime(0, ac.currentTime + t);
        env.gain.linearRampToValueAtTime(0.22, ac.currentTime + t + 0.02);
        env.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.22);
        osc.start(ac.currentTime + t);
        osc.stop(ac.currentTime + t + 0.3);
      });
    },

    gameOver() {
      [0, 0.18, 0.38].forEach((t, i) => {
        const ac = getCtx();
        const osc = ac.createOscillator();
        const env = ac.createGain();
        osc.connect(env); env.connect(ac.destination);
        osc.type = 'sawtooth';
        const notes = [330, 262, 196];
        osc.frequency.value = notes[i];
        env.gain.setValueAtTime(0.2, ac.currentTime + t);
        env.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.35);
        osc.start(ac.currentTime + t);
        osc.stop(ac.currentTime + t + 0.4);
      });
    },

    bombExplode() {
      const ac = getCtx();
      // Deep boom
      const osc = ac.createOscillator();
      const env = ac.createGain();
      osc.connect(env); env.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ac.currentTime + 0.5);
      env.gain.setValueAtTime(0.6, ac.currentTime);
      env.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.6);
      osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.65);
      // Noise burst
      playNoise({ duration: 0.35, gain: 0.4, freq: 300, q: 0.4 });
      // High crackle
      playTone({ freq: 800, freqEnd: 150, type: 'sawtooth', duration: 0.25, gain: 0.15 });
    }
  };
})();
