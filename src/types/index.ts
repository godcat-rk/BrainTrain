export interface PlayRecord {
  id?: number
  gameId: string
  timestamp: Date
  score: number
  metadata: Record<string, unknown>
}

export interface GameConfig {
  id: string
  name: string
  description: string
  icon: string
  scoreLabel: string
  higherIsBetter: boolean
  available: boolean
}
