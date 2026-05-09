import { useState, useCallback, useEffect, useRef } from 'react'
import { db } from '../../db'

export type GamePhase = 'idle' | 'showing' | 'input' | 'feedback' | 'result'

export interface CorsiResult {
  maxSpan: number
  totalCorrect: number
  score: number
  perfect: boolean
}

interface CorsiState {
  phase: GamePhase
  span: number
  sequence: number[]
  input: number[]
  showingIndex: number
  lastCorrect: boolean | null
  result: CorsiResult | null
}

export const BLOCK_COUNT = 9
const INITIAL_SPAN = 2
const SHOW_MS = 800
const BLANK_MS = 300
const FEEDBACK_MS = 1000

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
  span: INITIAL_SPAN,
  sequence: [],
  input: [],
  showingIndex: -1,
  lastCorrect: null,
  result: null,
}

export function useCorsiGame() {
  const [state, setState] = useState<CorsiState>(INITIAL_STATE)
  const totalCorrectRef = useRef(0)
  const maxSpanRef = useRef(0)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  const scheduleAnimation = useCallback((sequence: number[]) => {
    timersRef.current.forEach(clearTimeout)

    const timers: ReturnType<typeof setTimeout>[] = []
    let delay = 500

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
    totalCorrectRef.current = 0
    maxSpanRef.current = 0
    const seq = generateSequence(INITIAL_SPAN)
    setState({ ...INITIAL_STATE, phase: 'showing', sequence: seq })
    scheduleAnimation(seq)
  }, [clearTimers, scheduleAnimation])

  // Correct feedback → start next (harder) round
  useEffect(() => {
    if (state.phase !== 'feedback' || !state.lastCorrect) return

    const seq = generateSequence(state.span)
    const timer = setTimeout(() => {
      setState(s => ({
        ...s,
        phase: 'showing',
        sequence: seq,
        input: [],
        showingIndex: -1,
      }))
      scheduleAnimation(seq)
    }, FEEDBACK_MS)

    return () => clearTimeout(timer)
  }, [state.phase, state.lastCorrect, state.span, scheduleAnimation])

  const pressBlock = useCallback((blockIdx: number) => {
    setState(prev => {
      if (prev.phase !== 'input') return prev

      const newInput = [...prev.input, blockIdx]
      const pos = newInput.length - 1

      if (newInput[pos] !== prev.sequence[pos]) {
        const score = maxSpanRef.current * 10 + totalCorrectRef.current * 2
        const result: CorsiResult = {
          maxSpan: maxSpanRef.current,
          totalCorrect: totalCorrectRef.current,
          score,
          perfect: false,
        }
        db.playRecords.add({
          gameId: 'corsi',
          timestamp: new Date(),
          score,
          metadata: { maxSpan: maxSpanRef.current, totalCorrect: totalCorrectRef.current },
        })
        return { ...prev, input: newInput, phase: 'result', result, lastCorrect: false }
      }

      if (newInput.length === prev.sequence.length) {
        totalCorrectRef.current++
        if (prev.span > maxSpanRef.current) {
          maxSpanRef.current = prev.span
        }

        const nextSpan = prev.span + 1

        if (nextSpan > BLOCK_COUNT) {
          const score = maxSpanRef.current * 10 + totalCorrectRef.current * 2
          const result: CorsiResult = {
            maxSpan: maxSpanRef.current,
            totalCorrect: totalCorrectRef.current,
            score,
            perfect: true,
          }
          db.playRecords.add({
            gameId: 'corsi',
            timestamp: new Date(),
            score,
            metadata: { maxSpan: maxSpanRef.current, totalCorrect: totalCorrectRef.current, perfect: true },
          })
          return { ...prev, input: newInput, phase: 'result', result, lastCorrect: true }
        }

        return {
          ...prev,
          input: newInput,
          phase: 'feedback',
          lastCorrect: true,
          span: nextSpan,
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
    span: state.span,
    sequence: state.sequence,
    input: state.input,
    showingIndex: state.showingIndex,
    lastCorrect: state.lastCorrect,
    result: state.result,
    startGame,
    pressBlock,
    restart,
  }
}
