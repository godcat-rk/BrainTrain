import { useState, useCallback, useRef, useEffect } from 'react'
import { db } from '../../db'

export type NbackLevel = 1 | 2 | 3 | 4
export type GamePhase = 'select' | 'playing' | 'result'
export type TrialPhase = 'showing' | 'blank'

export interface Stimulus {
  position: number
  number: number
}

export interface TrialResponse {
  positionPressed: boolean
  numberPressed: boolean
}

export interface NbackResult {
  score: number
  hits: number
  errors: number
  targets: number
  n: NbackLevel
}

export const JUDGEABLE = 20
const STIMULUS_MS = 2000
const BLANK_MS = 500

const POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8]
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function pickExclude(pool: number[], exclude: number): number {
  const options = pool.filter(v => v !== exclude)
  return options[Math.floor(Math.random() * options.length)]
}

function generateSequence(n: NbackLevel): Stimulus[] {
  const total = n + JUDGEABLE
  const seq: Stimulus[] = []
  for (let i = 0; i < n; i++) {
    seq.push({
      position: Math.floor(Math.random() * 9),
      number: Math.floor(Math.random() * 9) + 1,
    })
  }
  for (let i = n; i < total; i++) {
    const ref = seq[i - n]
    const posMatch = Math.random() < 0.4
    const numMatch = Math.random() < 0.4
    seq.push({
      position: posMatch ? ref.position : pickExclude(POSITIONS, ref.position),
      number: numMatch ? ref.number : pickExclude(NUMBERS, ref.number),
    })
  }
  return seq
}

function calcStats(seq: Stimulus[], responses: TrialResponse[], n: NbackLevel) {
  let hits = 0, errors = 0, targets = 0
  for (let i = 0; i < JUDGEABLE; i++) {
    const curr = seq[n + i]
    const nback = seq[i]
    const resp = responses[i] ?? { positionPressed: false, numberPressed: false }
    const isPosMatch = curr.position === nback.position
    const isNumMatch = curr.number === nback.number
    if (isPosMatch) {
      targets++
      if (resp.positionPressed) hits++; else errors++
    } else {
      if (resp.positionPressed) errors++
    }
    if (isNumMatch) {
      targets++
      if (resp.numberPressed) hits++; else errors++
    } else {
      if (resp.numberPressed) errors++
    }
  }
  return { hits, errors, targets }
}

export function useNbackGame() {
  const [gamePhase, setGamePhase] = useState<GamePhase>('select')
  const [trialPhase, setTrialPhase] = useState<TrialPhase>('showing')
  const [n, setN] = useState<NbackLevel | null>(null)
  const [trialIndex, setTrialIndex] = useState(0)
  const [currentStimulus, setCurrentStimulus] = useState<Stimulus | null>(null)
  const [currentResponse, setCurrentResponse] = useState<TrialResponse>({
    positionPressed: false,
    numberPressed: false,
  })
  const [result, setResult] = useState<NbackResult | null>(null)

  const seqRef = useRef<Stimulus[]>([])
  const respRef = useRef<TrialResponse[]>([])
  const curRespRef = useRef<TrialResponse>({ positionPressed: false, numberPressed: false })
  const nRef = useRef<NbackLevel>(1)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPlayingRef = useRef(false)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const finishGame = useCallback(() => {
    isPlayingRef.current = false
    const nVal = nRef.current
    const { hits, errors, targets } = calcStats(seqRef.current, respRef.current, nVal)
    const score = Math.max(0, hits * 100 - errors * 50 + (nVal - 1) * 200)
    const res: NbackResult = { score, hits, errors, targets, n: nVal }
    setResult(res)
    setGamePhase('result')
    db.playRecords
      .add({
        gameId: 'nback',
        timestamp: new Date(),
        score,
        metadata: { n: nVal, hits, errors, targets, judgeableCount: JUDGEABLE },
      })
      .catch(() => {})
  }, [])

  const runTrial = useCallback(
    (idx: number) => {
      if (!isPlayingRef.current) return
      const nVal = nRef.current
      const total = nVal + JUDGEABLE

      curRespRef.current = { positionPressed: false, numberPressed: false }
      setTrialIndex(idx)
      setCurrentResponse({ positionPressed: false, numberPressed: false })
      setCurrentStimulus(seqRef.current[idx])
      setTrialPhase('showing')

      timerRef.current = setTimeout(() => {
        if (!isPlayingRef.current) return
        if (idx >= nVal) {
          respRef.current[idx - nVal] = { ...curRespRef.current }
        }
        setCurrentStimulus(null)
        setTrialPhase('blank')

        timerRef.current = setTimeout(() => {
          if (!isPlayingRef.current) return
          const nextIdx = idx + 1
          if (nextIdx >= total) {
            finishGame()
          } else {
            runTrial(nextIdx)
          }
        }, BLANK_MS)
      }, STIMULUS_MS)
    },
    [finishGame],
  )

  const startGame = useCallback(
    (nVal: NbackLevel) => {
      clearTimer()
      const seq = generateSequence(nVal)
      seqRef.current = seq
      respRef.current = []
      curRespRef.current = { positionPressed: false, numberPressed: false }
      nRef.current = nVal
      isPlayingRef.current = true

      setN(nVal)
      setResult(null)
      setCurrentResponse({ positionPressed: false, numberPressed: false })
      setGamePhase('playing')
      runTrial(0)
    },
    [runTrial],
  )

  const pressPosition = useCallback(() => {
    if (!isPlayingRef.current) return
    curRespRef.current = {
      ...curRespRef.current,
      positionPressed: !curRespRef.current.positionPressed,
    }
    setCurrentResponse({ ...curRespRef.current })
  }, [])

  const pressNumber = useCallback(() => {
    if (!isPlayingRef.current) return
    curRespRef.current = {
      ...curRespRef.current,
      numberPressed: !curRespRef.current.numberPressed,
    }
    setCurrentResponse({ ...curRespRef.current })
  }, [])

  const restart = useCallback(() => {
    clearTimer()
    isPlayingRef.current = false
    setGamePhase('select')
    setN(null)
    setTrialIndex(0)
    setCurrentStimulus(null)
    setCurrentResponse({ positionPressed: false, numberPressed: false })
    setResult(null)
  }, [])

  useEffect(() => () => clearTimer(), [])

  return {
    gamePhase,
    trialPhase,
    n,
    trialIndex,
    judgeableCount: JUDGEABLE,
    totalTrials: n !== null ? n + JUDGEABLE : 0,
    isJudgeable: n !== null && trialIndex >= n,
    currentStimulus,
    currentResponse,
    result,
    startGame,
    pressPosition,
    pressNumber,
    restart,
  }
}
