import { getPointsLabel, getPointsColor } from '../../lib/scoring'

export default function PredictionList({ predictions, members, matchStarted, currentUserId }) {
  if (!predictions.length) return (
    <p className="text-center text-muted text-sm py-4">Aún no hay predicciones</p>
  )

  const getAlias = (uid) => members.find((m) => m.uid === uid)?.alias || 'Jugador'

  return (
    <div className="flex flex-col divide-y divide-border">
      {predictions.map((pred) => {
        const isMe = pred.userId === currentUserId
        return (
          <div key={pred.id} className={`flex items-center justify-between py-3 ${isMe ? 'text-gold' : 'text-white'}`}>
            <span className="text-sm font-medium">
              {getAlias(pred.userId)} {isMe && '✎'}
            </span>
            {matchStarted ? (
              <div className="flex items-center gap-3">
                <span className="font-bold">{pred.homeScore} – {pred.awayScore}</span>
                {pred.points !== null && (
                  <span className={`text-xs ${getPointsColor(pred.points)}`}>
                    {getPointsLabel(pred.points)}
                  </span>
                )}
              </div>
            ) : (
              isMe
                ? <span className="font-bold">{pred.homeScore} – {pred.awayScore}</span>
                : <span className="text-xs text-muted bg-card px-2 py-0.5 rounded-full">Oculto</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
