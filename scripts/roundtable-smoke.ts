// Manual smoke: drive the REAL CodexParticipant through our Participant abstraction.
// Proves the subscription-driven `codex exec` CLI streams back through Roundtable Phase 1.
// Run: bun run scripts/roundtable-smoke.ts
// ponytail: smoke harness, not a test — Codex side only; full loop needs provider + session bootstrap.
import { CodexParticipant, type SpawnFn } from '../src/server/services/roundtable/CodexParticipant.js'
import { createTranscript, appendEntry } from '../src/server/services/roundtable/transcript.js'

const spawn: SpawnFn = (argv) => {
  const proc = Bun.spawn(argv, { stdout: 'pipe', stderr: 'inherit', cwd: process.cwd() })
  return { stdout: proc.stdout, exited: proc.exited }
}

let transcript = createTranscript()
transcript = appendEntry(transcript, {
  author: 'user',
  text: 'In ONE short sentence, what is your opinion on using TypeScript strict mode? Do not run any commands.',
  timestamp: 0,
})

const codex = new CodexParticipant(spawn)
console.log('--- Codex (discuss) speaking ---\n')
for await (const ev of codex.send(transcript, 'discuss')) {
  if (ev.kind === 'text') process.stdout.write(ev.text)
  else if (ev.kind === 'done') console.log('\n\n--- done ---')
}
