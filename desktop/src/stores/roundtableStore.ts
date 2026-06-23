import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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

// A persisted 'running' status is stale after a reload — the process that was
// streaming is gone, so nothing is actually active. Reset it so the UI shows the
// Start button instead of a frozen "Running…".
export function normalizeRehydrated(
  sessions: Record<string, RoundtableSessionState>,
): Record<string, RoundtableSessionState> {
  const out: Record<string, RoundtableSessionState> = {}
  for (const [k, s] of Object.entries(sessions)) {
    out[k] = s.status === 'running' ? { ...s, status: 'complete', activeSpeaker: null } : s
  }
  return out
}

type RoundtableStore = {
  sessions: Record<string, RoundtableSessionState>
  getSession: (sessionId: string) => RoundtableSessionState
  applyEvent: (sessionId: string, event: RoundtableEvent) => void
  startRoundtable: (
    sessionId: string,
    content: string,
    modes: { claude?: RoundtableCapabilityMode; codex?: RoundtableCapabilityMode; grok?: RoundtableCapabilityMode },
    loop?: boolean,
  ) => void
  stopRoundtable: (sessionId: string) => void
  resetSession: (sessionId: string) => void
}

export const useRoundtableStore = create<RoundtableStore>()(
  persist(
    (set, get) => ({
  sessions: {},
  getSession: (sessionId) => get().sessions[sessionId] ?? emptyRoundtableSession(),
  applyEvent: (sessionId, event) =>
    set((state) => {
      const current = state.sessions[sessionId] ?? emptyRoundtableSession()
      return { sessions: { ...state.sessions, [sessionId]: reduceRoundtableEvent(current, event) } }
    }),
  startRoundtable: (sessionId, content, modes, loop) => {
    set((state) => {
      const current = state.sessions[sessionId] ?? emptyRoundtableSession()
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...current,
            status: 'running',
            activeSpeaker: null,
            // Append the new question below prior rounds instead of wiping the
            // thread — each Start adds to the running record. seq keeps ids unique.
            entries: [...current.entries, { id: `rt-user-${current.seq}`, kind: 'user', text: content }],
            seq: current.seq + 1,
          },
        },
      }
    })
    wsManager.send(sessionId, { type: 'roundtable_start', content, modes, loop })
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
    }),
    {
      // ponytail: persist the whole transcript to localStorage so reconnecting a
      // session keeps its roundtable history. If transcripts ever get large
      // enough to blow the localStorage quota, move this to the backend store.
      name: 'dreamcoder-roundtable-history',
      partialize: (s) => ({ sessions: s.sessions }),
      merge: (persisted, current) => {
        const p = persisted as { sessions?: Record<string, RoundtableSessionState> } | undefined
        return { ...current, sessions: normalizeRehydrated(p?.sessions ?? {}) }
      },
    },
  ),
)
