import { describe, expect, test } from 'bun:test'
import { createClaudeTurnPort } from './createClaudeTurnPort.js'
import type { ConversationServiceLike } from './createClaudeTurnPort.js'
import type { ParticipantEvent } from './types.js'

// A fake conversation service that captures the registered callback and lets
// the test feed it realistic cliMsg objects matching the real engine shapes
// (see handler.ts translateCliMessage). No real CLI is spawned.
function makeFakeService(script: any[]): {
  service: ConversationServiceLike
  permissionModes: string[]
  sentPrompts: string[]
  removed: () => boolean
} {
  let registered: ((msg: any) => void) | null = null
  let wasRemoved = false
  const permissionModes: string[] = []
  const sentPrompts: string[] = []

  const service: ConversationServiceLike = {
    setPermissionMode(_sessionId, mode) {
      permissionModes.push(mode)
    },
    onOutput(_sessionId, cb) {
      registered = cb
    },
    removeOutputCallback(_sessionId, cb) {
      if (cb === registered) wasRemoved = true
    },
    sendMessage(_sessionId, prompt) {
      sentPrompts.push(prompt)
      // Drive the captured callback with the scripted engine messages.
      for (const msg of script) registered?.(msg)
    },
  }

  return { service, permissionModes, sentPrompts, removed: () => wasRemoved }
}

describe('createClaudeTurnPort', () => {
  test('emits text deltas from stream_event then done, and resolves on result', async () => {
    const script = [
      { type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hel' } } },
      { type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'lo' } } },
      // Full assistant message repeats the same text — must NOT be double-emitted.
      { type: 'assistant', message: { content: [{ type: 'text', text: 'Hello' }] } },
      { type: 'result', is_error: false },
    ]
    const { service, permissionModes, removed } = makeFakeService(script)

    const events: ParticipantEvent[] = []
    await createClaudeTurnPort('sess-1', service)('prompt', 'discuss', (e) => events.push(e))

    expect(permissionModes).toEqual(['plan'])
    expect(events).toEqual([
      { kind: 'text', text: 'Hel' },
      { kind: 'text', text: 'lo' },
      { kind: 'done' },
    ])
    expect(removed()).toBe(true)
  })

  test('falls back to assistant content blocks when no stream deltas arrive', async () => {
    const script = [
      { type: 'assistant', message: { content: [{ type: 'text', text: 'Block A' }, { type: 'text', text: 'Block B' }] } },
      { type: 'result', is_error: false },
    ]
    const { service } = makeFakeService(script)

    const events: ParticipantEvent[] = []
    await createClaudeTurnPort('sess-2', service)('prompt', 'discuss', (e) => events.push(e))

    expect(events).toEqual([
      { kind: 'text', text: 'Block A' },
      { kind: 'text', text: 'Block B' },
      { kind: 'done' },
    ])
  })

  test("uses permissionMode 'default' for act mode", async () => {
    const { service, permissionModes } = makeFakeService([{ type: 'result', is_error: false }])
    await createClaudeTurnPort('sess-3', service)('prompt', 'act', () => {})
    expect(permissionModes).toEqual(['default'])
  })

  test('resolves and cleans up on an error result (is_error)', async () => {
    const script = [
      { type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'partial' } } },
      { type: 'result', is_error: true, result: 'boom' },
    ]
    const { service, removed } = makeFakeService(script)

    const events: ParticipantEvent[] = []
    await createClaudeTurnPort('sess-4', service)('prompt', 'discuss', (e) => events.push(e))

    expect(events).toEqual([
      { kind: 'text', text: 'partial' },
      { kind: 'done' },
    ])
    expect(removed()).toBe(true)
  })
})
