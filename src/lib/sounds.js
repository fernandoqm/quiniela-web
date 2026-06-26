// Fanfarria de victoria generada con Web Audio API — sin archivos externos.
// Usa un singleton de AudioContext para evitar problemas en iOS con múltiples instancias.

let _ctx = null

function getCtx() {
  if (_ctx && _ctx.state !== 'closed') return _ctx
  _ctx = new (window.AudioContext || window.webkitAudioContext)()
  return _ctx
}

export function playVictorySound() {
  try {
    const ctx = getCtx()
    // iOS suspende el contexto hasta interacción del usuario; resume si es necesario
    if (ctx.state === 'suspended') ctx.resume()

    // Notas del acorde ascendente: Do - Mi - Sol - Do (una octava arriba)
    const notes = [
      { freq: 523.25, start: 0.00, dur: 0.18 },  // C5
      { freq: 659.25, start: 0.15, dur: 0.18 },  // E5
      { freq: 783.99, start: 0.30, dur: 0.18 },  // G5
      { freq: 1046.5, start: 0.45, dur: 0.50 },  // C6 — nota larga final
    ]

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)

      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.03)
      gain.gain.setValueAtTime(0.18, ctx.currentTime + start + dur - 0.05)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur)

      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur)
    })
  } catch {
    // Web Audio no disponible — silencio sin romper nada
  }
}
