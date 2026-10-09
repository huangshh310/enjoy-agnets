/** 快门试听。不依赖系统 afplay，设置页和截图成功都能响。 */
export function playShutter(): void {
  const audio = new AudioContext()
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.frequency.value = 880
  gain.gain.setValueAtTime(0.06, audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12)
  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start()
  osc.stop(audio.currentTime + 0.12)
  osc.onended = () => void audio.close()
}
