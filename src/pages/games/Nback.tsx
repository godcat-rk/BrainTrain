import { useNbackGame, JUDGEABLE } from '../../games/nback/useNbackGame'
import type {
  NbackLevel,
  NbackResult,
  Stimulus,
  TrialFeedback,
  TrialPhase,
  TrialResponse,
} from '../../games/nback/useNbackGame'

const LEVEL_CONFIG: Record<NbackLevel, { label: string; difficulty: string; color: string }> = {
  1: { label: '1-back', difficulty: 'かんたん', color: 'text-green-600' },
  2: { label: '2-back', difficulty: 'ふつう', color: 'text-yellow-600' },
  3: { label: '3-back', difficulty: 'むずかしい', color: 'text-orange-600' },
  4: { label: '4-back', difficulty: '超むずかしい', color: 'text-red-600' },
}

type FeedbackResult = 'hit' | 'miss' | 'false_alarm' | 'correct_rejection'

function getFeedbackResult(match: boolean, pressed: boolean): FeedbackResult {
  if (match && pressed) return 'hit'
  if (match && !pressed) return 'miss'
  if (!match && pressed) return 'false_alarm'
  return 'correct_rejection'
}

const FEEDBACK_STYLE: Record<FeedbackResult, { bg: string; label: string }> = {
  hit:               { bg: 'bg-green-500 text-white',              label: '✓ 正解！' },
  miss:              { bg: 'bg-red-400 text-white',                label: '✗ 見逃し' },
  false_alarm:       { bg: 'bg-orange-400 text-white',             label: '! 誤検出' },
  correct_rejection: { bg: 'bg-gray-100 text-gray-400 border-2 border-gray-100', label: '— 一致なし' },
}

function SelectScreen({ onSelect }: { onSelect: (n: NbackLevel) => void }) {
  return (
    <div className="min-h-screen bg-[#f8f7ff] flex flex-col items-center justify-center px-4 py-8">
      <div className="text-6xl mb-4">🧠</div>
      <h1 className="text-3xl font-bold text-[#6c63ff] mb-2">N-back 課題</h1>
      <p className="text-gray-500 mb-2 text-center text-sm max-w-xs">
        N個前と同じ<span className="font-bold text-[#6c63ff]">位置</span>・
        <span className="font-bold text-[#ff6584]">数字</span>かを判定しよう
      </p>
      <p className="text-gray-400 mb-8 text-xs text-center">各10回判定 · 約35秒</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {([1, 2, 3, 4] as NbackLevel[]).map((level) => {
          const cfg = LEVEL_CONFIG[level]
          return (
            <button
              key={level}
              onClick={() => onSelect(level)}
              className="bg-white border-2 border-[#6c63ff] text-[#6c63ff] font-bold py-4 px-6 rounded-2xl hover:bg-purple-50 transition-colors flex justify-between items-center"
            >
              <span>{cfg.label}</span>
              <span className={`text-sm font-normal ${cfg.color}`}>{cfg.difficulty}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ProgressDots({
  completedCount,
  currentIdx,
}: {
  completedCount: number
  currentIdx: number
}) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: JUDGEABLE }, (_, i) => {
        const done = i < completedCount
        const current = i === currentIdx
        return (
          <div
            key={i}
            className={`
              w-3 h-3 rounded-full transition-all duration-300
              ${done
                ? 'bg-[#6c63ff]'
                : current
                  ? 'bg-[#6c63ff] opacity-40 scale-125'
                  : 'bg-gray-200'
              }
            `}
          />
        )
      })}
    </div>
  )
}

function NbackGrid({
  stimulus,
  trialPhase,
}: {
  stimulus: Stimulus | null
  trialPhase: TrialPhase
}) {
  const isVisible = trialPhase === 'showing' && stimulus !== null
  return (
    <div className="grid grid-cols-3 gap-2" style={{ width: 216, height: 216 }}>
      {Array.from({ length: 9 }, (_, i) => {
        const isActive = isVisible && stimulus?.position === i
        return (
          <div
            key={i}
            className={`
              rounded-xl flex items-center justify-center text-3xl font-bold
              transition-all duration-100
              ${isActive
                ? 'bg-[#6c63ff] text-white shadow-lg'
                : 'bg-white border-2 border-gray-100 text-transparent'
              }
            `}
          >
            {isActive ? stimulus!.number : '0'}
          </div>
        )
      })}
    </div>
  )
}

function ResponseButton({
  label,
  pressed,
  canRespond,
  feedbackResult,
  activeBg,
  borderColor,
  textColor,
  hoverBg,
  onClick,
}: {
  label: string
  pressed: boolean
  canRespond: boolean
  feedbackResult: FeedbackResult | null
  activeBg: string
  borderColor: string
  textColor: string
  hoverBg: string
  onClick: () => void
}) {
  if (feedbackResult !== null) {
    const { bg, label: fbLabel } = FEEDBACK_STYLE[feedbackResult]
    return (
      <div className={`px-5 py-4 rounded-2xl font-bold text-sm text-center min-w-[120px] ${bg}`}>
        {fbLabel}
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={!canRespond}
      className={`
        px-5 py-4 rounded-2xl font-bold text-sm transition-all select-none min-w-[120px]
        ${pressed
          ? `${activeBg} text-white shadow-md scale-95`
          : !canRespond
            ? 'bg-gray-100 text-gray-300 cursor-not-allowed border-2 border-gray-100'
            : `bg-white border-2 ${borderColor} ${textColor} ${hoverBg}`
        }
      `}
    >
      {label}
    </button>
  )
}

function TimerBar({ trialIndex, trialPhase }: { trialIndex: number; trialPhase: TrialPhase }) {
  return (
    <div className="h-1 bg-gray-200 rounded-full overflow-hidden" style={{ width: 216 }}>
      {trialPhase === 'showing' && (
        <div
          key={`${trialIndex}-timer`}
          className="h-full bg-[#6c63ff] rounded-full"
          style={{ animation: 'nback-shrink 2600ms linear forwards' }}
        />
      )}
    </div>
  )
}

function PlayScreen({
  n,
  trialIndex,
  isJudgeable,
  currentStimulus,
  trialPhase,
  currentResponse,
  lastFeedback,
  onPressPosition,
  onPressNumber,
  onQuit,
}: {
  n: NbackLevel
  trialIndex: number
  isJudgeable: boolean
  currentStimulus: Stimulus | null
  trialPhase: TrialPhase
  currentResponse: TrialResponse
  lastFeedback: TrialFeedback | null
  onPressPosition: () => void
  onPressNumber: () => void
  onQuit: () => void
}) {
  const canRespond = isJudgeable && trialPhase === 'showing'
  const judgeableIdx = isJudgeable ? trialIndex - n : -1

  const completedCount = isJudgeable
    ? judgeableIdx + (trialPhase === 'blank' ? 1 : 0)
    : 0
  const currentDotIdx = isJudgeable && trialPhase === 'showing' ? judgeableIdx : -1

  const posFeedback: FeedbackResult | null =
    lastFeedback !== null
      ? getFeedbackResult(lastFeedback.posMatch, lastFeedback.posPressed)
      : null
  const numFeedback: FeedbackResult | null =
    lastFeedback !== null
      ? getFeedbackResult(lastFeedback.numMatch, lastFeedback.numPressed)
      : null

  return (
    <div className="min-h-screen bg-[#f8f7ff] flex flex-col items-center justify-center px-4 py-8 gap-4">
      <div className="flex items-center gap-3">
        <span className="bg-[#6c63ff] text-white px-3 py-1 rounded-full font-bold text-sm">
          {n}-back
        </span>
        {!isJudgeable && (
          <span className="text-gray-400 text-sm">準備中 {trialIndex + 1} / {n}</span>
        )}
      </div>

      <ProgressDots completedCount={completedCount} currentIdx={currentDotIdx} />

      <NbackGrid stimulus={currentStimulus} trialPhase={trialPhase} />

      <TimerBar trialIndex={trialIndex} trialPhase={trialPhase} />

      <p className="text-xs text-gray-400 h-4">
        {!isJudgeable
          ? `${n}個前まで覚えよう`
          : canRespond
            ? '一致するものを押そう（複数可・取消可）'
            : ''}
      </p>

      <div className="flex gap-3">
        <ResponseButton
          label="📍 位置が同じ"
          pressed={currentResponse.positionPressed}
          canRespond={canRespond}
          feedbackResult={posFeedback}
          activeBg="bg-[#6c63ff]"
          borderColor="border-[#6c63ff]"
          textColor="text-[#6c63ff]"
          hoverBg="hover:bg-purple-50"
          onClick={onPressPosition}
        />
        <ResponseButton
          label="🔢 数字が同じ"
          pressed={currentResponse.numberPressed}
          canRespond={canRespond}
          feedbackResult={numFeedback}
          activeBg="bg-[#ff6584]"
          borderColor="border-[#ff6584]"
          textColor="text-[#ff6584]"
          hoverBg="hover:bg-pink-50"
          onClick={onPressNumber}
        />
      </div>

      <button onClick={onQuit} className="text-xs text-gray-300 hover:text-gray-500 mt-2">
        やめる
      </button>
    </div>
  )
}

function ResultScreen({
  result,
  onReplay,
  onRestart,
}: {
  result: NbackResult
  onReplay: () => void
  onRestart: () => void
}) {
  const hitRate = result.targets > 0 ? Math.round((result.hits / result.targets) * 100) : 0

  return (
    <div className="min-h-screen bg-[#f8f7ff] flex flex-col items-center justify-center px-4 py-8 gap-6">
      <h2 className="text-2xl font-bold text-[#6c63ff]">結果</h2>

      <div className="bg-white rounded-3xl shadow-md p-8 w-full max-w-xs flex flex-col items-center gap-4">
        <div className="text-6xl font-bold text-[#6c63ff]">
          {result.score.toLocaleString()}
        </div>
        <div className="text-gray-400 text-sm">スコア（{result.n}-back）</div>

        <div className="w-full border-t border-gray-100 pt-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">正解</span>
            <span className="font-bold text-green-600">
              {result.hits} / {result.targets} 回
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">見逃し・誤検出</span>
            <span className="font-bold text-red-400">{result.errors} 回</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">正解率</span>
            <span className="font-bold">{hitRate}%</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onReplay}
          className="bg-[#6c63ff] text-white font-bold py-3 px-8 rounded-2xl hover:bg-purple-700 transition-colors"
        >
          もう一度
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

export default function Nback() {
  const {
    gamePhase,
    trialPhase,
    n,
    trialIndex,
    isJudgeable,
    currentStimulus,
    currentResponse,
    lastFeedback,
    result,
    startGame,
    pressPosition,
    pressNumber,
    restart,
  } = useNbackGame()

  if (gamePhase === 'select') {
    return <SelectScreen onSelect={startGame} />
  }

  if (gamePhase === 'playing' && n !== null) {
    return (
      <PlayScreen
        n={n}
        trialIndex={trialIndex}
        isJudgeable={isJudgeable}
        currentStimulus={currentStimulus}
        trialPhase={trialPhase}
        currentResponse={currentResponse}
        lastFeedback={lastFeedback}
        onPressPosition={pressPosition}
        onPressNumber={pressNumber}
        onQuit={restart}
      />
    )
  }

  if (gamePhase === 'result' && result !== null) {
    return (
      <ResultScreen
        result={result}
        onReplay={() => startGame(result.n)}
        onRestart={restart}
      />
    )
  }

  return null
}
