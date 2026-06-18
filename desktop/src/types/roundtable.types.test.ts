import { describe, it, expect } from 'vitest'
import type {
  ClientMessage,
  ServerMessage,
  RoundtableEvent,
  RoundtableServerEvent,
  RoundtableCapabilityMode,
} from './chat'

describe('roundtable WS types', () => {
  it('admits roundtable_start as a ClientMessage', () => {
    const modes: { claude: RoundtableCapabilityMode; codex: RoundtableCapabilityMode } = {
      claude: 'discuss',
      codex: 'act',
    }
    const msg: ClientMessage = { type: 'roundtable_start', content: 'hello', modes }
    expect(msg.type).toBe('roundtable_start')
  })

  it('admits roundtable_stop as a ClientMessage', () => {
    const msg: ClientMessage = { type: 'roundtable_stop' }
    expect(msg.type).toBe('roundtable_stop')
  })

  it('admits roundtable_event as a ServerMessage with a discriminated event', () => {
    const event: RoundtableEvent = { kind: 'speaker-start', author: 'claude', reason: 'go first' }
    const server: RoundtableServerEvent = { type: 'roundtable_event', event, timestamp: 1 }
    const msg: ServerMessage = server
    expect(msg.type).toBe('roundtable_event')
    if (msg.type === 'roundtable_event' && msg.event.kind === 'speaker-start') {
      expect(msg.event.author).toBe('claude')
    }
  })
})
