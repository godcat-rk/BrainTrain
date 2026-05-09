import { useCorsiGame, BLOCK_COUNT } from '../../games/corsi/useCorsiGame'
import type { GamePhase, CorsiResult } from '../../games/corsi/useCorsiGame'

// 9 blocks in scattered positions on a 320×320 canvas (px)
const BLOCK_POSITIONS = [
  { x: 28,  y: 52  },
  { x: 195, y: 18  },
  { x: 112, y: 128 },
  { x: 268, y: 88  },
  { x: 14,  y: 198 },
  { x: 168, y: 192 },
  { x: 284, y: 228 },
  { x: 72,  y: 272 },
  { x: 218, y: 272 },
]
const BLOCK_SIZE = 52
const CANVAS = 340

interface BlockProps {
  idx: number
  phase: GamePhase
  isLit: boolean
  tapOrder: number | null
  feedbackCorrect: boolean | null
  onClick: () => void
}

function Block({ idx, phase, isLit, tapOrder, feedbackCorrect, onClick }: BlockProps) {
  const pos = BLOCK_POSITIONS[idx]
  const canClick = phase === 'input'

  let bg = 'bg-white border-2 border-gray-200'
  if (phase === 'feedback') {
    bg = feedbackCorrect
      ? 'bg-green-400 border-2 border-green-500'
      : 'bg-red-400 border-2 border-red-500'
  } else if (isLit) {
    bg = 'bg-[#6c63ff] border-2 border-[#5a52d5] shadow-lg shadow-purple-200'
  } else if (tapOrder !== null) {
    bg = 'bg-[#6c63ff]/30 border-2 border-[#6c63ff]'
  }

  return (
    <button
      data-testid={`block-${idx}`}
      onClick={onClick}
      disabled={!canClick}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: BLOCK_SIZE,
        height: BLOCK_SIZE,
      }}
      className={`
        rounded-xl flex items-center justify-center font-bold text-sm
        transition-all duration-150 select-none
        ${bg}
        ${canClick ? 'cursor-pointer active:scale-90' : 'cursor-default'}
        ${isLit ? 'scale-110' : ''}
      `}
    >
      {tapOrder !== null && !isLit && (
        <span className="text-[#6c63ff] text-xs font-bold">{tapOrder + 1}</span>
      )}
    </button>
  )
}

function CorsiBoard({
  phase,
  sequence,
  showingIndex,
  input,
  lastCorrect,
  onPress,
}: {
  phase: GamePhase
  sequence: number[]
  showingIndex: number
  input: number[]
  lastCorrect: boolean | null
  onPress: (idx: number) => void
}) {
  const litBlock = showingIndex >= 0 ? sequence[showingIndex] : -1
  const feedbackCorrect = phase === 'feedback' ? lastCorrect : null

  return (
    <div
      data-testid="corsi-board"
      style={{ position: 'relative', width: CANVAS, height: CANVAS }}
      className="mx-auto"
    >
      {Array.from({ length: BLOCK_COUNT }, (_, i) => {
        const tapOrder = input.indexOf(i)
        return (
          <Block
            key={i}
            idx={i}
            phase={phase}
            isLit={litBlock === i}
            tapOrder={tapOrder >= 0 ? tapOrder : null}
            feedbackCorrect={feedbackCorrect}
            onClick={() => onPress(i)}
          />
        )
      })}
    </div>
  )
}

function IdleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-[#f8f7ff] flex flex-col items-center justify-center px-4 py-8 gap-6">
      <div className="text-6xl">🔲</div>
      <h1 className="text-3xl font-bold text-[#6c63ff]">コルシブロック</h1>
      <p className="text-gray-500 text-center text-sm max-w-xs leading-relaxed">
        ブロックが光る順番を覚えて、同じ順番にタップしよう。<br />
        正解するたびに長くなるよ！
      </p>
      <div className="bg-white rounded-2xl shadow-sm p-5 w-full max-w-xs text-sm text-gray-500 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-[#6c63ff] inline-block flex-shrink-0" />
          <span>光る → 順番を覚える</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-[#6c63ff]/30 border-2 border-[#6c63ff] inline-block flex-shrink-0" />
          <span>タップ済みブロック</span>
        </div>
      </div>
      <button
        data-testid="start-button"
        onClick={onStart}
        className="bg-[#6c63ff] text-white font-bold py-4 px-12 rounded-2xl hover:bg-purple-700 transition-colors text-lg"
      >
        スタート
      </button>
    </div>
  )
}

function GameScreen({
  phase,
  span,
  sequence,
  showingIndex,
  input,
  lastCorrect,
  onPress,
}: {
  phase: GamePhase
  span: number
  sequence: number[]
  showingIndex: number
  input: number[]
  lastCorrect: boolean | null
  onPress: (idx: number) => void
}) {
  const statusText = () => {
    if (phase === 'showing') return '順番を覚えよう'
    if (phase === 'input') return `同じ順にタップ（${input.length} / ${sequence.length}）`
    if (phase === 'feedback') return lastCorrect ? '✓ 正解！' : '✗ 不正解'
    return ''
  }

  const statusColor = () => {
    if (phase === 'feedback') return lastCorrect ? 'text-green-600' : 'text-red-500'
    return 'text-gray-500'
  }

  return (
    <div
      data-phase={phase}
      className="min-h-screen bg-[#f8f7ff] flex flex-col items-center justify-center px-4 py-8 gap-5"
    >
      <div className="flex items-center gap-3">
        <span className="bg-[#6c63ff] text-white px-3 py-1 rounded-full font-bold text-sm">
          スパン {span - 1}
        </span>
        <span className="text-gray-400 text-sm">{sequence.length}個</span>
      </div>

      <p className={`text-sm font-medium h-5 ${statusColor()}`}>{statusText()}</p>

      <CorsiBoard
        phase={phase}
        sequence={sequence}
        showingIndex={showingIndex}
        input={input}
        lastCorrect={lastCorrect}
        onPress={onPress}
      />
    </div>
  )
}

function ResultScreen({
  result,
  onReplay,
  onHome,
}: {
  result: CorsiResult
  onReplay: () => void
  onHome: () => void
}) {
  return (
    <div className="min-h-screen bg-[#f8f7ff] flex flex-col items-center justify-center px-4 py-8 gap-6">
      {result.perfect && (
        <div className="text-4xl animate-bounce">🏆</div>
      )}
      <h2 className="text-2xl font-bold text-[#6c63ff]">
        {result.perfect ? 'パーフェクト！' : '結果'}
      </h2>

      <div className="bg-white rounded-3xl shadow-md p-8 w-full max-w-xs flex flex-col items-center gap-4">
        <div className="text-6xl font-bold text-[#6c63ff]">{result.score}</div>
        <div className="text-gray-400 text-sm">スコア</div>

        <div className="w-full border-t border-gray-100 pt-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">最大スパン</span>
            <span className="font-bold text-[#6c63ff]">{result.maxSpan}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">正解ラウンド数</span>
            <span className="font-bold text-green-600">{result.totalCorrect}</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          {result.maxSpan >= 7
            ? '素晴らしい記憶力！'
            : result.maxSpan >= 5
              ? '平均以上の成績だよ！'
              : result.maxSpan >= 3
                ? 'もう少しで平均に届くよ！'
                : 'まずは3を目指そう！'}
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          data-testid="replay-button"
          onClick={onReplay}
          className="bg-[#6c63ff] text-white font-bold py-3 px-8 rounded-2xl hover:bg-purple-700 transition-colors"
        >
          もう一度
        </button>
        <button
          onClick={onHome}
          className="bg-white border-2 border-[#6c63ff] text-[#6c63ff] font-bold py-3 px-8 rounded-2xl hover:bg-purple-50 transition-colors"
        >
          ホームへ
        </button>
      </div>
    </div>
  )
}

export default function Corsi() {
  const {
    phase,
    span,
    sequence,
    showingIndex,
    input,
    lastCorrect,
    result,
    startGame,
    pressBlock,
    restart,
  } = useCorsiGame()

  if (phase === 'idle') {
    return <IdleScreen onStart={startGame} />
  }

  if (phase === 'result' && result !== null) {
    return (
      <ResultScreen
        result={result}
        onReplay={startGame}
        onHome={restart}
      />
    )
  }

  return (
    <GameScreen
      phase={phase}
      span={span}
      sequence={sequence}
      showingIndex={showingIndex}
      input={input}
      lastCorrect={lastCorrect}
      onPress={pressBlock}
    />
  )
}
