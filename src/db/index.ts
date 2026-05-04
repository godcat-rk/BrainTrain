import Dexie, { type EntityTable } from 'dexie'
import type { PlayRecord } from '../types'

const db = new Dexie('BrainTrainDB') as Dexie & {
  playRecords: EntityTable<PlayRecord, 'id'>
}

db.version(1).stores({
  playRecords: '++id, gameId, timestamp, score',
})

export { db }
