import { useState, useCallback, useEffect, useRef } from 'react'
import { db } from '../../db'

export type GamePhase = 'idle' | 'showing' | 'input' | 'feedback' | 'result'

export interface CorsiResult {
  correctCount: number
  totalRounds: number
  score: number
  perfect: boolean
}

export interface BlockPosition {
  x: number
  y: number
}

interface CorsiState {
  phase: GamePhase
  roundIndex: number
  sequence: number[]
  input: number[]
  showingIndex: number
  lastCorrect: boolean | null
  result: CorsiResult | null
  positions: BlockPosition[]
  correctCount: number
}

export const BLOCK_COUNT = 9
export const BLOCK_SIZE = 52
export const CANVAS_SIZE = 340

// スパン配列: [2,2,3,3,4,4] → 6ラウンド徐々に増加
const ROUND_SPANS = [2, 2, 3, 3, 4, 4]
export const TOTAL_ROUNDS = ROUND_SPANS.length

const MIN_BLOCK_DIST = 70
const SHOW_MS = 500
const BLANK_MS = 200
const FEEDBACK_MS = 800

function generatePositions(): BlockPosition[] {
  const maxCoord = CANVAS_SIZE - BLOCK_SIZE
  const positions: BlockPosition[] = []
  let attempts = 0

  while (positions.length < BLOCK_COUNT && attempts < 2000) {
    attempts++
    const x = Math.floor(Math.random() * (maxCoord + 1))
    const y = Math.floor(Math.random() * (maxCoord + 1))
    const tooClose = positions.some(p => Math.hypot(p.x - x, p.y - y) < MIN_BLOCK_DIST)
    if (!tooClose) positions.push({ x, y })
  }

  return positions
}

function generateSequence(span: number): number[] {
  const pool = Array.from({ length: BLOCK_COUNT }, (_, i) => i)
  for (let i = 0; i < span; i++) {
    const j = i + Math.floor(Math.random() * (BLOCK_COUNT - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, span)
}

const INITIAL_STATE: CorsiState = {
  phase: 'idle',
  roundIndex: 0,
  sequence: [],
  input: [],
  showingIndex: -1,
  lastCorrect: null,
  result: null,
  positions: [],
  correctCount: 0,
}

export function useCorsiGame() {
  const [state, setState] = useState<CorsiState>(INITIAL_STATE)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  const scheduleAnimation = useCallback((sequence: number[]) => {
    timersRef.current.forEach(clearTimeout)
    const timers: ReturnType<typeof setTimeout>[] = []
    let delay = 300

    for (let i = 0; i < sequence.length; i++) {
      const idx = i
      timers.push(
        setTimeout(() => {
          setState(s => (s.phase === 'showing' ? { ...s, showingIndex: idx } : s))
        }, delay),
      )
      delay += SHOW_MS
      timers.push(
        setTimeout(() => {
          setState(s => (s.phase === 'showing' ? { ...s, showingIndex: -1 } : s))
        }, delay),
      )
      delay += BLANK_MS
    }

    timers.push(
      setTimeout(() => {
        setState(s => (s.phase === 'showing' ? { ...s, phase: 'input' } : s))
      }, delay),
    )

    timersRef.current = timers
  }, [])

  const startGame = useCallback(() => {
    clearTimers()
    const positions = generatePositions()
    const seq = generateSequence(ROUND_SPANS[0])
    setState({ ...INITIAL_STATE, phase: 'showing', sequence: seq, positions })
    scheduleAnimation(seq)
  }, [clearTimers, scheduleAnimation])

  // feedbackフェーズ終了 → 次ラウンドへ or ゲーム終了
  useEffect(() => {
    if (state.phase !== 'feedback') return

    const nextRoundIndex = state.roundIndex + 1
    const isLastRound = nextRoundIndex >= TOTAL_ROUNDS
    const newPositions = isLastRound ? [] : generatePositions()
    const seq = isLastRound ? [] : generateSequence(ROUND_SPANS[nextRoundIndex])
    const correctCount = state.correctCount

    const timer = setTimeout(() => {
      if (isLastRound) {
        const score = Math.round((correctCount / TOTAL_ROUNDS) * 100)
        const perfect = correctCount === TOTAL_ROUNDS
        const result: CorsiResult = { correctCount, totalRounds: TOTAL_ROUNDS, score, perfect }
        db.playRecords.add({
          gameId: 'corsi',
          timestamp: new Date(),
          score,
          metadata: { correctCount, totalRounds: TOTAL_ROUNDS, perfect },
        })
        setState(s => ({ ...s, phase: 'result', result }))
      } else {
        setState(s => ({
          ...s,
          phase: 'showing',
          roundIndex: nextRoundIndex,
          sequence: seq,
          input: [],
          showingIndex: -1,
          positions: newPositions,
        }))
        scheduleAnimation(seq)
      }
    }, FEEDBACK_MS)

    return () => clearTimeout(timer)
  }, [state.phase, state.roundIndex, state.correctCount, scheduleAnimation])

  const pressBlock = useCallback((blockIdx: number) => {
    setState(prev => {
      if (prev.phase !== 'input') return prev

      const newInput = [...prev.input, blockIdx]
      const pos = newInput.length - 1

      if (newInput[pos] !== prev.sequence[pos]) {
        return { ...prev, input: newInput, phase: 'feedback', lastCorrect: false }
      }

      if (newInput.length === prev.sequence.length) {
        return {
          ...prev,
          input: newInput,
          phase: 'feedback',
          lastCorrect: true,
          correctCount: prev.correctCount + 1,
        }
      }

      return { ...prev, input: newInput }
    })
  }, [])

  const restart = useCallback(() => {
    clearTimers()
    setState(INITIAL_STATE)
  }, [clearTimers])

  return {
    phase: state.phase,
    roundIndex: state.roundIndex,
    span: ROUND_SPANS[Math.min(state.roundIndex, ROUND_SPANS.length - 1)],
    sequence: state.sequence,
    input: state.input,
    showingIndex: state.showingIndex,
    lastCorrect: state.lastCorrect,
    result: state.result,
    positions: state.positions,
    correctCount: state.correctCount,
    startGame,
    pressBlock,
    restart,
  }
}
