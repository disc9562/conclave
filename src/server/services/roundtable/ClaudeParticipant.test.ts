// src/server/services/roundtable/ClaudeParticipant.test.ts
import { describe, expect, test } from 'bun:test'
import { ClaudeParticipant } from './ClaudeParticipant.js'
import type { ClaudeTurnPort } from './ClaudeParticipant.js'
import { createTranscript, appendEntry } from './transcript.js'
import type { ParticipantEvent } from './types.js'

async function collect(it: AsyncIterable<ParticipantEvent>): Promise<ParticipantEvent[]> {
  const out: ParticipantEvent[] = []
  for await (const e of it) out.push(e)
  return out
}

describe('ClaudeParticipant', () => {
  test('forwards port events and renders the transcript into the prompt', async () => {
    let seenPrompt = ''
    const port: ClaudeTurnPort = async (prompt, _mode, onEvent) => {
      seenPrompt = prompt
      onEvent({ kind: 'text', text: 'hello' })
      onEvent({ kind: 'done' })
    }
    const p = new ClaudeParticipant(port)
    const t = appendEntry(createTranscript(), { author: 'user', text: 'ping', timestamp: 1 })
    const events = await collect(p.send(t, 'discuss'))
    expect(seenPrompt).toContain('User: ping')
    expect(events).toContainEqual({ kind: 'text', text: 'hello' })
    expect(events.at(-1)).toEqual({ kind: 'done' })
  })

  test('passes the capability mode through to the port', async () => {
    let seenMode = ''
    const port: ClaudeTurnPort = async (_p, mode, onEvent) => { seenMode = mode; onEvent({ kind: 'done' }) }
    await collect(new ClaudeParticipant(port).send(createTranscript(), 'act'))
    expect(seenMode).toBe('act')
  })
})
