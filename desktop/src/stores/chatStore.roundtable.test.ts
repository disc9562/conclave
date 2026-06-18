import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore } from './chatStore'
import { useRoundtableStore } from './roundtableStore'
import type { ServerMessage } from '../types/chat'

describe('chatStore forwards roundtable_event', () => {
  beforeEach(() => {
    useRoundtableStore.setState({ sessions: {} })
  })

  it('applies a roundtable_event to the roundtable store', () => {
    const sid = 'rt-session-1'
    const msg: ServerMessage = {
      type: 'roundtable_event',
      event: { kind: 'text', author: 'claude', text: 'hi' },
      timestamp: 1,
    }
    useChatStore.getState().handleServerMessage(sid, msg)
    const session = useRoundtableStore.getState().getSession(sid)
    expect(session.entries.find((e) => e.kind === 'message')).toMatchObject({
      author: 'claude',
      text: 'hi',
    })
  })

  it('does not add the roundtable text to chat messages', () => {
    const sid = 'rt-session-2'
    // chatStore exposes per-session state via getSession(sid).messages
    const before = useChatStore.getState().getSession(sid).messages.length
    useChatStore.getState().handleServerMessage(sid, {
      type: 'roundtable_event',
      event: { kind: 'text', author: 'codex', text: 'yo' },
      timestamp: 2,
    })
    const after = useChatStore.getState().getSession(sid).messages.length
    expect(after).toBe(before)
  })
})
