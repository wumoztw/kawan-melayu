function pickVoice(synth) {
  const voices = synth.getVoices?.() ?? [];
  return (
    voices.find((v) => v.lang?.toLowerCase().replace('_', '-') === 'ms-my') ??
    voices.find((v) => v.lang?.toLowerCase().startsWith('ms')) ??
    voices.find((v) => v.lang?.toLowerCase().startsWith('id'))
  );
}

export function speak(text, win = globalThis) {
  const synth = win.speechSynthesis;
  if (!synth || !win.SpeechSynthesisUtterance) return false;
  const utter = new win.SpeechSynthesisUtterance(text);
  utter.lang = 'ms-MY';
  const voice = pickVoice(synth);
  if (voice) utter.voice = voice;
  synth.cancel();
  synth.speak(utter);
  return true;
}
