import { Link } from 'react-router-dom'
import type { GameConfig } from '../types'

const GAMES: GameConfig[] = [
  {
    id: 'memory',
    name: '神経衰弱',
    description: 'カードをめくってペアを揃えよう！',
    icon: '🃏',
    scoreLabel: 'スコア',
    higherIsBetter: true,
    available: true,
  },
  {
    id: 'reaction',
    name: '反応速度',
    description: '光ったらすぐタップ！',
    icon: '⚡',
    scoreLabel: 'ミリ秒',
    higherIsBetter: false,
    available: false,
  },
  {
    id: 'calculation',
    name: '計算トレーニング',
    description: '素早く正確に計算しよう！',
    icon: '🧮',
    scoreLabel: '正解数',
    higherIsBetter: true,
    available: false,
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8f7ff] px-4 py-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold text-[#6c63ff] mb-2">🧠 BrainTrain</h1>
        <p className="text-gray-500 text-lg">毎日の脳トレで、あたまを鍛えよう！</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-3xl mx-auto">
        {GAMES.map((game) =>
          game.available ? (
            <Link
              key={game.id}
              to={`/games/${game.id}`}
              className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center gap-3 border-2 border-transparent hover:border-[#6c63ff] hover:shadow-lg transition-all duration-200"
            >
              <span className="text-5xl">{game.icon}</span>
              <h2 className="text-xl font-bold text-gray-800">{game.name}</h2>
              <p className="text-sm text-gray-500 text-center">{game.description}</p>
              <span className="mt-auto bg-[#6c63ff] text-white text-xs font-bold px-3 py-1 rounded-full">
                あそぶ
              </span>
            </Link>
          ) : (
            <div
              key={game.id}
              className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-3 opacity-50 cursor-not-allowed"
            >
              <span className="text-5xl">{game.icon}</span>
              <h2 className="text-xl font-bold text-gray-800">{game.name}</h2>
              <p className="text-sm text-gray-500 text-center">{game.description}</p>
              <span className="mt-auto bg-gray-300 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">
                Coming Soon
              </span>
            </div>
          )
        )}
      </div>
    </div>
  )
}
