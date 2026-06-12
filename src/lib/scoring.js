export function calculatePoints(predicted, actual) {
  const { homeScore: pH, awayScore: pA } = predicted
  const { homeScore: aH, awayScore: aA } = actual

  if (aH === null || aA === null) return null
  if (pH === null || pA === null) return null

  if (pH === aH && pA === aA) return 3

  if (pH === pA && aH === aA) return 2

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
