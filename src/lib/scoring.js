const KNOCKOUT_STAGES = ['ROUND_OF_32', 'LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL']

export function calculatePoints(predicted, actual) {
  const { homeScore: pH, awayScore: pA, winnerPrediction: pW } = predicted
  const { homeScore: aH, awayScore: aA, winner: aW, duration, stage } = actual

  if (aH === null || aA === null) return null
  if (pH === null || pA === null) return null

  const exactScore = pH === aH && pA === aA
  const predictedDraw = pH === pA
  const actualDraw = aH === aA
  const isKnockout = KNOCKOUT_STAGES.includes(stage)
  const wentBeyond90 = duration === 'EXTRA_TIME' || duration === 'PENALTY_SHOOTOUT'

  if (exactScore) {
    // En eliminatoria con empate a 90', el punto extra es por acertar el ganador
    if (isKnockout && actualDraw && wentBeyond90) {
      return pW === aW ? 3 : 2
    }
    return 3
  }

  // Empate exacto en fase de grupos
  if (!isKnockout && predictedDraw && actualDraw) return 2

  if (Math.sign(pH - pA) === Math.sign(aH - aA)) return 1

  return 0
}

export function getPointsLabel(points) {
  if (points === 3) return '🎯 ¡Exacto! +3pts'
  if (points === 2) return '✓ Empate exacto +2pts'
  if (points === 1) return '✓ Resultado +1pt'
  if (points === 0) return '+0pts'
  return ''
}

export function getPointsColor(points) {
  if (points === 3) return 'text-gold'
  if (points === 2) return 'text-win'
  if (points === 1) return 'text-info'
  return 'text-muted'
}
