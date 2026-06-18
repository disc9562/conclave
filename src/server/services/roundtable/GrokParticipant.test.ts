// src/server/services/roundtable/GrokParticipant.test.ts
import { describe, expect, test } from 'bun:test'
import { GrokParticipant } from './GrokParticipant.js'
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

describe('GrokParticipant', () => {
  test('streams plain stdout as text then done', async () => {
    const argvs: string[][] = []
    const p = new GrokParticipant(stubSpawn('grok says hi', argvs))
    const t = appendEntry(createTranscript(), { author: 'user', text: 'q', timestamp: 1 })
    const events = await collect(p.send(t, 'discuss'))
    expect(events.filter((e) => e.kind === 'text').map((e) => (e as { text: string }).text).join('')).toBe('grok says hi')
    expect(events.at(-1)).toEqual({ kind: 'done' })
  })

  test('discuss uses --permission-mode plan; act uses bypassPermissions', async () => {
    const argvs: string[][] = []
    await collect(new GrokParticipant(stubSpawn('', argvs)).send(createTranscript(), 'discuss'))
    await collect(new GrokParticipant(stubSpawn('', argvs)).send(createTranscript(), 'act'))
    expect(argvs[0].join(' ')).toContain('--permission-mode plan')
    expect(argvs[1].join(' ')).toContain('--permission-mode bypassPermissions')
    // single-turn flag on both
    expect(argvs[0]).toContain('-p')
    expect(argvs[1]).toContain('-p')
  })
})
