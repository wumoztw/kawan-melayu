let ctx = null;

export function playCorrect(win = globalThis) {
  try {
    const Ctx = win.AudioContext ?? win.webkitAudioContext;
    if (!Ctx) return false;
    ctx ??= new Ctx();
    if (ctx.state === 'suspended') ctx.resume?.();
    const start = ctx.currentTime;
    // C6 -> G6 "ding-dong"
    [
      [1046.5, 0],
      [1568, 0.12],
    ].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = start + delay;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    });
    return true;
  } catch {
    return false;
  }
}
