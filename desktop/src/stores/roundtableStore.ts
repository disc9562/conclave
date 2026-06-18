import { create } from 'zustand'
import { wsManager } from '../api/websocket'
import type {
  RoundtableEvent,
  RoundtableParticipantId,
  RoundtableCapabilityMode,
} from '../types/chat'

export type RoundtableEntry =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'message'; author: RoundtableParticipantId; text: string }
  | { id: string; kind: 'system'; text: string }
  | { id: string; kind: 'error'; author: RoundtableParticipantId; text: string }
  | { id: string; kind: 'proposal'; author: RoundtableParticipantId; description: string }

export type RoundtableStatus = 'idle' | 'running' | 'complete'

export type RoundtableSessionState = {
  entries: RoundtableEntry[]
  status: RoundtableStatus
  seq: number
  activeSpeaker: RoundtableParticipantId | null
}

export function emptyRoundtableSession(): RoundtableSessionState {
  return { entries: [], status: 'idle', seq: 0, activeSpeaker: null }
}

export function reduceRoundtableEvent(
  state: RoundtableSessionState,
  event: RoundtableEvent,
): RoundtableSessionState {
  const next: RoundtableSessionState = {
    entries: state.entries.slice(),
    status: state.status,
    seq: state.seq,
    activeSpeaker: state.activeSpeaker,
  }
  const id = () => `rt-${next.seq++}`

  switch (event.kind) {
    case 'speaker-start': {
      next.activeSpeaker = event.author
      next.status = next.status === 'complete' ? 'complete' : 'running'
      if (event.reason) next.entries.push({ id: id(), kind: 'system', text: event.reason })
      break
    }
    case 'text': {
      const last = next.entries[next.entries.length - 1]
      if (last && last.kind === 'message' && last.author === event.author) {
        next.entries[next.entries.length - 1] = { ...last, text: last.text + event.text }
      } else {
        next.entries.push({ id: id(), kind: 'message', author: event.author, text: event.text })
      }
      break
    }
    case 'proposal':
    case 'action-request': {
      const a = event.action
      next.entries.push({
        id: id(),
        kind: 'proposal',
        author: event.author,
        description: a.description ?? a.toolName,
      })
      break
    }
    case 'participant-error': {
      next.entries.push({ id: id(), kind: 'error', author: event.author, text: event.error })
      break
    }
    case 'speaker-end': {
      next.activeSpeaker = null
      break
    }
    case 'round-limit': {
      next.entries.push({ id: id(), kind: 'system', text: `Reached round limit (${event.rounds}).` })
      next.status = 'complete'
      break
    }
    case 'complete': {
      next.status = 'complete'
      next.activeSpeaker = null
      break
    }
  }
  return next
}

type RoundtableStore = {
  sessions: Record<string, RoundtableSessionState>
  getSession: (sessionId: string) => RoundtableSessionState
  applyEvent: (sessionId: string, event: RoundtableEvent) => void
  startRoundtable: (
    sessionId: string,
    content: string,
    modes: { claude: RoundtableCapabilityMode; codex: RoundtableCapabilityMode },
  ) => void
  stopRoundtable: (sessionId: string) => void
  resetSession: (sessionId: string) => void
}

export const useRoundtableStore = create<RoundtableStore>((set, get) => ({
  sessions: {},
  getSession: (sessionId) => get().sessions[sessionId] ?? emptyRoundtableSession(),
  applyEvent: (sessionId, event) =>
    set((state) => {
      const current = state.sessions[sessionId] ?? emptyRoundtableSession()
      return { sessions: { ...state.sessions, [sessionId]: reduceRoundtableEvent(current, event) } }
    }),
  startRoundtable: (sessionId, content, modes) => {
    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...emptyRoundtableSession(),
          status: 'running',
          // Echo the user's question so the thread reads "you asked → claude → codex".
          entries: [{ id: 'rt-user-0', kind: 'user', text: content }],
          seq: 1,
        },
      },
    }))
    wsManager.send(sessionId, { type: 'roundtable_start', content, modes })
  },
  stopRoundtable: (sessionId) => {
    wsManager.send(sessionId, { type: 'roundtable_stop' })
    set((state) => {
      const current = state.sessions[sessionId] ?? emptyRoundtableSession()
      return { sessions: { ...state.sessions, [sessionId]: { ...current, status: 'complete' } } }
    })
  },
  resetSession: (sessionId) =>
    set((state) => ({
      sessions: { ...state.sessions, [sessionId]: emptyRoundtableSession() },
    })),
}))
