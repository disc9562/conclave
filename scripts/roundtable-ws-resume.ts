// Resume driver: opens WS to an EXISTING sessionId (no create) and fires
// roundtable_start, to reproduce the "reconnect to previous session" path.
// Usage: bun scripts/roundtable-ws-resume.ts <port> <sessionId>
const port = process.argv[2]
const sessionId = process.argv[3]
if (!port || !sessionId) { console.error('usage: <port> <sessionId>'); process.exit(1) }

const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/${sessionId}`)
const seen: string[] = []

ws.addEventListener('open', () => {
  console.log('[resume] ws open -> roundtable_start on existing session', sessionId)
  ws.send(JSON.stringify({
    type: 'roundtable_start',
    content: '重連測試：請各自用一句話簡短回應。',
    modes: { claude: 'discuss', codex: 'discuss' },
  }))
})

ws.addEventListener('message', (ev) => {
  let m: any
  try { m = JSON.parse(String(ev.data)) } catch { return }
  if (m.type === 'roundtable_event') {
    const e = m.event ?? m
    const tag = `${e.kind}${e.author ? ':' + e.author : ''}`
    if (e.kind === 'text') process.stdout.write('.')
    else console.log(`\n[evt] ${tag}${e.reason ? ' (' + e.reason + ')' : ''}${e.error ? ' ERROR=' + e.error : ''}`)
    seen.push(tag)
    if (e.kind === 'complete' || e.kind === 'round-limit') {
      console.log('\n[resume] DONE. tags:', seen.join(' | '))
      ws.close(); process.exit(0)
    }
  } else {
    console.log('[other]', JSON.stringify(m).slice(0, 200))
  }
})

ws.addEventListener('error', (e) => console.error('[resume] ws error', e))
setTimeout(() => { console.log('\n[resume] TIMEOUT. tags so far:', seen.join(' | ')); ws.close(); process.exit(2) }, 90_000)
