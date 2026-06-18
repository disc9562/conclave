// src/server/services/roundtable/CodexParticipant.test.ts
import { describe, expect, test } from 'bun:test'
import { CodexParticipant } from './CodexParticipant.js'
import type { SpawnFn } from './CodexParticipant.js'
import { createTranscript, appendEntry } from './transcript.js'
import type { ParticipantEvent } from './types.js'

function stubSpawn(output: string, capturedArgv: string[][]): SpawnFn {
  return (argv) => {
    capturedArgv.push(argv)
    const stdout = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(output))
        controller.close()
      },
    })
    return { stdout, exited: Promise.resolve(0) }
  }
}

async function collect(it: AsyncIterable<ParticipantEvent>): Promise<ParticipantEvent[]> {
  const out: ParticipantEvent[] = []
  for await (const e of it) out.push(e)
  return out
}

describe('CodexParticipant', () => {
  test('streams stdout as text then done', async () => {
    const argvs: string[][] = []
    const p = new CodexParticipant(stubSpawn('codex says hi', argvs))
    const t = appendEntry(createTranscript(), { author: 'user', text: 'q', timestamp: 1 })
    const events = await collect(p.send(t, 'discuss'))
    expect(events.filter((e) => e.kind === 'text').map((e) => (e as { text: string }).text).join('')).toBe('codex says hi')
    expect(events.at(-1)).toEqual({ kind: 'done' })
  })

  test('discuss mode passes the read-only flag; act mode does not', async () => {
    const argvs: string[][] = []
    await collect(new CodexParticipant(stubSpawn('x', argvs)).send(createTranscript(), 'discuss'))
    await collect(new CodexParticipant(stubSpawn('x', argvs)).send(createTranscript(), 'act'))
    expect(argvs[0].join(' ')).toContain('read-only')
    expect(argvs[1].join(' ')).not.toContain('read-only')
  })
})
