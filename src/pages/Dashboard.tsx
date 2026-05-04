import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { db } from '../db'
import type { PlayRecord } from '../types'

const GAME_NAMES: Record<string, string> = {
  memory: '神経衰弱',
}

const GAME_COLORS: Record<string, string> = {
  memory: '#6c63ff',
}

const DIFFICULTY_LABELS: Record<string, string> = {
  '4x4': 'かんたん',
  '4x6': 'ふつう',
  '6x6': 'むずかしい',
}

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getWeekStart(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toLocalDateStr(d)
}

function weekLabel(weekKey: string): string {
  const [, month, day] = weekKey.split('-').map(Number)
  return `${month}/${day}`
}

function calcStreak(records: PlayRecord[]): number {
  if (records.length === 0) return 0
  const days = new Set(records.map(r => toLocalDateStr(new Date(r.timestamp))))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (days.has(toLocalDateStr(d))) {
      streak++
    } else {
      break
    }
  }
  return streak
}

function buildWeeklyData(records: PlayRecord[], gameIds: string[]) {
  const now = new Date()
  const weeks: string[] = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    weeks.push(getWeekStart(d))
  }

  const grouped: Record<string, Record<string, number[]>> = {}
  for (const r of records) {
    const wk = getWeekStart(new Date(r.timestamp))
    if (!grouped[wk]) grouped[wk] = {}
    if (!grouped[wk][r.gameId]) grouped[wk][r.gameId] = []
    grouped[wk][r.gameId].push(r.score)
  }

  return weeks.map(wk => {
    const point: Record<string, string | number> = { week: weekLabel(wk) }
    for (const gid of gameIds) {
      const scores = grouped[wk]?.[gid] ?? []
      if (scores.length > 0) {
        point[gid] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      }
    }
    return point
  })
}

function buildWeeklyMetricData(records: PlayRecord[], gameId: string, metaKey: string) {
  const filtered = records.filter(r => r.gameId === gameId)
  const now = new Date()
  const weeks: string[] = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    weeks.push(getWeekStart(d))
  }

  const grouped: Record<string, number[]> = {}
  for (const r of filtered) {
    const val = (r.metadata as Record<string, unknown>)[metaKey]
    if (typeof val !== 'number') continue
    const wk = getWeekStart(new Date(r.timestamp))
    if (!grouped[wk]) grouped[wk] = []
    grouped[wk].push(val)
  }

  return weeks.map(wk => {
    const vals = grouped[wk] ?? []
    const point: Record<string, string | number> = { week: weekLabel(wk) }
    if (vals.length > 0) {
      point.value = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    }
    return point
  })
}

function buildGameStats(records: PlayRecord[], gameIds: string[]) {
  const now = Date.now()
  const FOUR_WEEKS = 28 * 24 * 60 * 60 * 1000

  return gameIds.map(gid => {
    const all = records.filter(r => r.gameId === gid)
    const recent = all.filter(r => now - new Date(r.timestamp).getTime() < FOUR_WEEKS)
    const older = all.filter(r => {
      const age = now - new Date(r.timestamp).getTime()
      return age >= FOUR_WEEKS && age < FOUR_WEEKS * 2
    })

    const avg = (arr: PlayRecord[]) =>
      arr.length === 0
        ? null
        : Math.round(arr.reduce((s, r) => s + r.score, 0) / arr.length)

    const recentAvg = avg(recent)
    const olderAvg = avg(older)
    const change = recentAvg !== null && olderAvg !== null ? recentAvg - olderAvg : null

    return { gameId: gid, recentAvg, olderAvg, change, recentCount: recent.length }
  })
}

function EmptyState() {
  return (
    <div className="min-h-screen bg-[#f8f7ff] px-4 py-8">
      <header className="text-center mb-10">
        <h1 className="text-3xl font-bold text-[#6c63ff] mb-2">📊 ダッシュボード</h1>
        <p className="text-gray-500">あなたの成長を確認しよう！</p>
      </header>
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md p-8 text-center">
        <p className="text-5xl mb-4">🎮</p>
        <p className="text-lg font-bold text-gray-500">まだプレイ履歴がありません</p>
        <p className="text-sm text-gray-400 mt-2">ゲームをプレイするとここに統計が表示されます</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [records, setRecords] = useState<PlayRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    db.playRecords
      .orderBy('timestamp')
      .reverse()
      .toArray()
      .then(r => {
        setRecords(r)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const gameIds = useMemo(() => [...new Set(records.map(r => r.gameId))], [records])
  const weeklyData = useMemo(() => buildWeeklyData(records, gameIds), [records, gameIds])
  const gameStats = useMemo(() => buildGameStats(records, gameIds), [records, gameIds])
  const streak = useMemo(() => calcStreak(records), [records])
  const hasMemory = useMemo(() => records.some(r => r.gameId === 'memory'), [records])
  const weeklyMovesData = useMemo(() => buildWeeklyMetricData(records, 'memory', 'moves'), [records])
  const weeklyOversightsData = useMemo(() => buildWeeklyMetricData(records, 'memory', 'oversights'), [records])

  const now = new Date()
  const thisMonthCount = records.filter(r => {
    const d = new Date(r.timestamp)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  const recentRecords = records.slice(0, 10)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7ff] flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    )
  }

  if (records.length === 0) return <EmptyState />

  return (
    <div className="min-h-screen bg-[#f8f7ff] px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#6c63ff] mb-2">📊 ダッシュボード</h1>
        <p className="text-gray-500">あなたの成長を確認しよう！</p>
      </header>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* サマリーカード */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-[#6c63ff]">{thisMonthCount}</div>
            <div className="text-xs text-gray-400 mt-1">今月のプレイ</div>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-[#ff6584]">
              {streak > 0 ? `${streak}🔥` : '0'}
            </div>
            <div className="text-xs text-gray-400 mt-1">連続プレイ日数</div>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-gray-600">{records.length}</div>
            <div className="text-xs text-gray-400 mt-1">累計プレイ</div>
          </div>
        </div>

        {/* スコア推移グラフ */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-4">スコア推移（週平均）</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  fontSize: '13px',
                }}
              />
              {gameIds.length > 1 && <Legend />}
              {gameIds.map(gid => (
                <Line
                  key={gid}
                  type="monotone"
                  dataKey={gid}
                  name={GAME_NAMES[gid] ?? gid}
                  stroke={GAME_COLORS[gid] ?? '#999'}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: GAME_COLORS[gid] ?? '#999' }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 手数の推移グラフ（神経衰弱のみ） */}
        {hasMemory && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-1">手数の推移（週平均）</h2>
            <p className="text-xs text-gray-400 mb-4">少ないほど効率よくクリアできている</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weeklyMovesData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    fontSize: '13px',
                  }}
                  formatter={(v) => [typeof v === 'number' ? `${v} 手` : '-', '手数']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="手数"
                  stroke="#ff6584"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#ff6584' }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 見落としの推移グラフ（神経衰弱のみ） */}
        {hasMemory && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-1">見落としの推移（週平均）</h2>
            <p className="text-xs text-gray-400 mb-4">少ないほど記憶が正確に活かせている</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weeklyOversightsData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    fontSize: '13px',
                  }}
                  formatter={(v) => [typeof v === 'number' ? `${v} 回` : '-', '見落とし']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="見落とし"
                  stroke="#34d399"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#34d399' }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ゲーム別スコア比較 */}
        <div>
          <h2 className="font-bold text-gray-700 mb-3">ゲーム別スコア</h2>
          <div className="space-y-3">
            {gameStats.map(({ gameId, recentAvg, olderAvg, change, recentCount }) => (
              <div key={gameId} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-gray-700">{GAME_NAMES[gameId] ?? gameId}</span>
                  <span className="text-xs text-gray-400">直近4週 {recentCount}回</span>
                </div>
                <div className="flex items-end gap-4">
                  <div>
                    <div className="text-3xl font-bold text-[#6c63ff]">
                      {recentAvg !== null ? recentAvg.toLocaleString() : '—'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">直近4週の平均スコア</div>
                  </div>
                  {change !== null && (
                    <div
                      className={`text-base font-bold mb-0.5 ${change >= 0 ? 'text-green-500' : 'text-red-400'}`}
                    >
                      {change >= 0 ? '↑' : '↓'} {Math.abs(change).toLocaleString()}
                      <span className="text-xs font-normal text-gray-400 ml-1">前の4週比</span>
                    </div>
                  )}
                  {change === null && olderAvg === null && (
                    <div className="text-xs text-gray-400 mb-0.5">比較データなし</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 直近のプレイ履歴 */}
        <div>
          <h2 className="font-bold text-gray-700 mb-3">直近のプレイ履歴</h2>
          <div className="space-y-2">
            {recentRecords.map(record => {
              const meta = record.metadata as {
                difficulty?: string
                moves?: number
                elapsed?: number
                oversights?: number
              }
              const d = new Date(record.timestamp)
              const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
              return (
                <div
                  key={record.id}
                  className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <span className="text-sm font-bold text-gray-700">
                      {GAME_NAMES[record.gameId] ?? record.gameId}
                    </span>
                    {meta.difficulty && (
                      <span className="text-xs text-gray-400 ml-2">
                        {DIFFICULTY_LABELS[meta.difficulty] ?? meta.difficulty}
                      </span>
                    )}
                    <div className="text-xs text-gray-400 mt-0.5">{dateStr}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#6c63ff]">
                      {record.score.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 space-x-2">
                      {meta.moves !== undefined && <span>{meta.moves}手</span>}
                      {meta.elapsed !== undefined && <span>{meta.elapsed}秒</span>}
                      {meta.oversights !== undefined && <span>見落とし{meta.oversights}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
