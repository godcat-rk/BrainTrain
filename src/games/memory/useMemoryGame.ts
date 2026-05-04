import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '../../db'

export type Difficulty = '4x4' | '4x6' | '6x6'
export type GamePhase = 'select' | 'playing' | 'result'

export interface MemoryCard {
  id: number
  emoji: string
  isFlipped: boolean
  isMatched: boolean
}

export interface DifficultyConfig {
  rows: number
  cols: number
  pairs: number
  label: string
}

const EMOJI_POOL = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐨', '🐯', '🦁', '🐸', '🐵', '🦄', '🐮', '🐷', '🦋', '🐝',
]

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  '4x4': { rows: 4, cols: 4, pairs: 8, label: 'かんたん' },
  '4x6': { rows: 4, cols: 6, pairs: 12, label: 'ふつう' },
  '6x6': { rows: 6, cols: 6, pairs: 18, label: 'むずかしい' },
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function createCards(difficulty: Difficulty): MemoryCard[] {
  const { pairs } = DIFFICULTY_CONFIG[difficulty]
  const emojis = EMOJI_POOL.slice(0, pairs)
  const shuffled = shuffle([...emojis, ...emojis])
  return shuffled.map((emoji, id) => ({ id, emoji, isFlipped: false, isMatched: false }))
}

function calcScore(pairs: number, oversights: number, elapsedSeconds: number): number {
  const base = pairs * 100
  const timeBonus = Math.max(0, (pairs * 10 - elapsedSeconds) * 10)
  const oversightPenalty = oversights * 20
  return Math.max(0, Math.round(base - oversightPenalty + timeBonus))
}

export function useMemoryGame() {
  const [phase, setPhase] = useState<GamePhase>('select')
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [cards, setCards] = useState<MemoryCard[]>([])
  const [flippedIds, setFlippedIds] = useState<number[]>([])
  const [matchedPairs, setMatchedPairs] = useState(0)
  const [moves, setMoves] = useState(0)
  const [oversights, setOversights] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [seenCardIds, setSeenCardIds] = useState<Set<number>>(new Set())

  const elapsedRef = useRef(0)
  const startTimeRef = useRef<number | null>(null)
  const hadKnownMatchRef = useRef(false)

  useEffect(() => {
    elapsedRef.current = elapsed
  }, [elapsed])

  useEffect(() => {
    if (phase !== 'playing') return
    startTimeRef.current = Date.now()
    const timer = setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing' || !difficulty) return
    const totalPairs = DIFFICULTY_CONFIG[difficulty].pairs
    if (matchedPairs < totalPairs) return

    const score = calcScore(totalPairs, oversights, elapsedRef.current)
    setFinalScore(score)
    db.playRecords
      .add({
        gameId: 'memory',
        timestamp: new Date(),
        score,
        metadata: {
          difficulty,
          pairs: totalPairs,
          moves,
          elapsed: elapsedRef.current,
          oversights,
        },
      })
      .catch(() => {})
    setPhase('result')
  }, [matchedPairs, phase, difficulty, oversights, moves])

  const startGame = useCallback((diff: Difficulty) => {
    setDifficulty(diff)
    setCards(createCards(diff))
    setFlippedIds([])
    setMatchedPairs(0)
    setMoves(0)
    setOversights(0)
    setElapsed(0)
    setIsLocked(false)
    setFinalScore(0)
    setSeenCardIds(new Set())
    hadKnownMatchRef.current = false
    setPhase('playing')
  }, [])

  const flipCard = useCallback(
    (id: number) => {
      if (isLocked) return
      const card = cards.find(c => c.id === id)
      if (!card || card.isFlipped || card.isMatched) return

      if (flippedIds.length === 0) {
        hadKnownMatchRef.current = [...seenCardIds].some(
          seenId => cards.find(c => c.id === seenId)?.emoji === card.emoji
        )
        setCards(prev => prev.map(c => (c.id === id ? { ...c, isFlipped: true } : c)))
        setFlippedIds([id])
        return
      }

      const firstId = flippedIds[0]
      if (firstId === id) return

      const newCards = cards.map(c => (c.id === id ? { ...c, isFlipped: true } : c))
      const first = newCards.find(c => c.id === firstId)!
      const second = newCards.find(c => c.id === id)!
      setFlippedIds([])
      setMoves(m => m + 1)

      if (first.emoji === second.emoji) {
        setCards(
          newCards.map(c =>
            c.id === firstId || c.id === id ? { ...c, isMatched: true } : c
          )
        )
        setMatchedPairs(p => p + 1)
      } else {
        setCards(newCards)
        if (hadKnownMatchRef.current) {
          setOversights(o => o + 1)
        }
        setIsLocked(true)
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              c.id === firstId || c.id === id ? { ...c, isFlipped: false } : c
            )
          )
          setSeenCardIds(prev => {
            const next = new Set(prev)
            next.add(firstId)
            next.add(id)
            return next
          })
          setIsLocked(false)
        }, 800)
      }
    },
    [isLocked, cards, flippedIds, seenCardIds]
  )

  const restart = useCallback(() => {
    setPhase('select')
    setDifficulty(null)
    setCards([])
    setFlippedIds([])
    setMatchedPairs(0)
    setMoves(0)
    setOversights(0)
    setElapsed(0)
    setFinalScore(0)
    setIsLocked(false)
    setSeenCardIds(new Set())
    hadKnownMatchRef.current = false
  }, [])

  const totalPairs = difficulty ? DIFFICULTY_CONFIG[difficulty].pairs : 0

  return {
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
  }
}
