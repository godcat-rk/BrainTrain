import { useMemoryGame, DIFFICULTY_CONFIG, type Difficulty, type MemoryCard } from '../../games/memory/useMemoryGame'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function SelectScreen({ onSelect }: { onSelect: (d: Difficulty) => void }) {
  const difficulties: Difficulty[] = ['4x4', '4x6', '6x6']
  const styles = [
    { card: 'bg-green-50 border-green-300', label: 'text-green-700', btn: 'bg-green-500 hover:bg-green-600' },
    { card: 'bg-yellow-50 border-yellow-300', label: 'text-yellow-700', btn: 'bg-yellow-500 hover:bg-yellow-600' },
    { card: 'bg-red-50 border-red-300', label: 'text-red-700', btn: 'bg-red-500 hover:bg-red-600' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="text-6xl mb-4">🃏</div>
      <h1 className="text-4xl font-bold text-[#6c63ff] mb-2">神経衰弱</h1>
      <p className="text-gray-500 mb-10">難易度を選んでスタート！</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
        {difficulties.map((diff, i) => {
          const config = DIFFICULTY_CONFIG[diff]
          const s = styles[i]
          return (
            <button
              key={diff}
              onClick={() => onSelect(diff)}
              className={`${s.card} border-2 rounded-2xl p-6 text-center transition-transform hover:scale-105 active:scale-95 cursor-pointer`}
            >
              <div className={`text-2xl font-bold ${s.label} mb-1`}>{config.label}</div>
              <div className="text-gray-500 text-sm mb-1">
                {config.rows} × {config.cols}
              </div>
              <div className="text-gray-400 text-xs mb-4">{config.pairs} ペア</div>
              <div className={`${s.btn} text-white text-sm font-semibold py-2 px-4 rounded-xl transition-colors`}>
                スタート
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CardTile({ card, onClick }: { card: MemoryCard; onClick: () => void }) {
  const visible = card.isFlipped || card.isMatched
  return (
    <div className="memory-card-container aspect-square" onClick={onClick}>
      <div className={`memory-card-inner${visible ? ' flipped' : ''}`}>
        <div className="memory-card-face memory-card-front flex items-center justify-center rounded-xl bg-gradient-to-br from-[#6c63ff] to-[#ff6584] text-white font-bold shadow-md select-none">
          <span className="text-2xl">？</span>
        </div>
        <div
          className={`memory-card-face memory-card-back flex items-center justify-center rounded-xl shadow-md select-none ${
            card.isMatched ? 'bg-green-50' : 'bg-white'
          }`}
        >
          <span className={`text-3xl ${card.isMatched ? 'opacity-60' : ''}`}>{card.emoji}</span>
        </div>
      </div>
    </div>
  )
}

function PlayScreen({
  cards,
  matchedPairs,
  totalPairs,
  moves,
  elapsed,
  difficulty,
  onFlip,
  onQuit,
}: {
  cards: MemoryCard[]
  matchedPairs: number
  totalPairs: number
  moves: number
  elapsed: number
  difficulty: Difficulty
  onFlip: (id: number) => void
  onQuit: () => void
}) {
  const config = DIFFICULTY_CONFIG[difficulty]
  const colsClass = config.cols === 6 ? 'grid-cols-4 sm:grid-cols-6' : 'grid-cols-4'

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 px-4 py-6">
      <div className="max-w-lg mx-auto mb-5">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onQuit}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← やめる
          </button>
          <span className="font-bold text-[#6c63ff] text-sm">
            神経衰弱 — {config.label}
          </span>
          <div className="w-14" />
        </div>

        <div className="flex justify-around bg-white rounded-2xl py-3 shadow-sm">
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">タイム</div>
            <div className="text-lg font-bold text-gray-700">⏱ {formatTime(elapsed)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">手数</div>
            <div className="text-lg font-bold text-gray-700">🖐 {moves}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">ペア</div>
            <div className="text-lg font-bold text-[#6c63ff]">✅ {matchedPairs}/{totalPairs}</div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        <div className={`grid ${colsClass} gap-2`}>
          {cards.map(card => (
            <CardTile key={card.id} card={card} onClick={() => onFlip(card.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ResultScreen({
  finalScore,
  matchedPairs,
  totalPairs,
  moves,
  oversights,
  elapsed,
  difficulty,
  onReplay,
  onRestart,
}: {
  finalScore: number
  matchedPairs: number
  totalPairs: number
  moves: number
  oversights: number
  elapsed: number
  difficulty: Difficulty
  onReplay: () => void
  onRestart: () => void
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="text-6xl mb-4">🎉</div>
      <h2 className="text-3xl font-bold text-[#6c63ff] mb-6">クリア！</h2>

      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm text-center mb-8">
        <div className="text-sm text-gray-400 mb-1">スコア</div>
        <div className="text-6xl font-bold text-[#6c63ff] mb-6">
          {finalScore.toLocaleString()}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t pt-5">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xl font-bold text-gray-700">{formatTime(elapsed)}</div>
            <div className="text-xs text-gray-400 mt-1">タイム</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xl font-bold text-gray-700">{moves}</div>
            <div className="text-xs text-gray-400 mt-1">総手数</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 col-span-2">
            <div className="text-xl font-bold text-[#6c63ff]">
              {matchedPairs}/{totalPairs} ペア
            </div>
            <div className="text-xs text-gray-400 mt-1">クリア</div>
          </div>
          <div className={`rounded-xl p-3 col-span-2 ${oversights === 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className={`text-xl font-bold ${oversights === 0 ? 'text-green-600' : 'text-red-500'}`}>
              {oversights === 0 ? '完璧！🎯' : `${oversights} 回`}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              見落とし（わかってたのに間違えた回数）
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          onClick={onReplay}
          className="bg-[#6c63ff] hover:bg-[#5a52d5] text-white font-bold py-3 px-8 rounded-2xl transition-colors"
        >
          もう一度（{DIFFICULTY_CONFIG[difficulty].label}）
        </button>
        <button
          onClick={onRestart}
          className="bg-white border-2 border-[#6c63ff] text-[#6c63ff] font-bold py-3 px-8 rounded-2xl hover:bg-purple-50 transition-colors"
        >
          難易度を変える
        </button>
      </div>
    </div>
  )
}

export default function Memory() {
  const {
    phase,
    difficulty,
    cards,
    matchedPairs,
    totalPairs,
    moves,
    oversights,
    elapsed,
    finalScore,
    startGame,
    flipCard,
    restart,
  } = useMemoryGame()

  if (phase === 'select') {
    return <SelectScreen onSelect={startGame} />
  }

  if (phase === 'playing' && difficulty) {
    return (
      <PlayScreen
        cards={cards}
        matchedPairs={matchedPairs}
        totalPairs={totalPairs}
        moves={moves}
        elapsed={elapsed}
        difficulty={difficulty}
        onFlip={flipCard}
        onQuit={restart}
      />
    )
  }

  if (phase === 'result' && difficulty) {
    return (
      <ResultScreen
        finalScore={finalScore}
        matchedPairs={matchedPairs}
        totalPairs={totalPairs}
        moves={moves}
        oversights={oversights}
        elapsed={elapsed}
        difficulty={difficulty}
        onReplay={() => startGame(difficulty)}
        onRestart={restart}
      />
    )
  }

  return null
}
