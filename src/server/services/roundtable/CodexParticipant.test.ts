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
  test('emits only the agent_message text from JSONL, dropping banner/usage events', async () => {
    const argvs: string[][] = []
    const jsonl = [
      '{"type":"thread.started","thread_id":"x"}',
      '{"type":"turn.started"}',
      '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"codex says hi"}}',
      '{"type":"turn.completed","usage":{"output_tokens":17}}',
      '',
    ].join('\n')
    const p = new CodexParticipant(stubSpawn(jsonl, argvs))
    const t = appendEntry(createTranscript(), { author: 'user', text: 'q', timestamp: 1 })
    const events = await collect(p.send(t, 'discuss'))
    expect(events.filter((e) => e.kind === 'text').map((e) => (e as { text: string }).text).join('')).toBe('codex says hi')
    expect(events.at(-1)).toEqual({ kind: 'done' })
  })

  test('discuss mode passes the read-only flag; act mode does not; both pass --json', async () => {
    const argvs: string[][] = []
    await collect(new CodexParticipant(stubSpawn('', argvs)).send(createTranscript(), 'discuss'))
    await collect(new CodexParticipant(stubSpawn('', argvs)).send(createTranscript(), 'act'))
    expect(argvs[0].join(' ')).toContain('read-only')
    expect(argvs[1].join(' ')).not.toContain('read-only')
    expect(argvs[0].join(' ')).toContain('--json')
    expect(argvs[1].join(' ')).toContain('--json')
  })
})
