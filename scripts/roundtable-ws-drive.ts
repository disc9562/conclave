// Headless end-to-end roundtable driver: creates a session over HTTP, opens the
// session WebSocket, fires roundtable_start, and prints every roundtable_event.
// ponytail: throwaway diagnostic — run with `bun scripts/roundtable-ws-drive.ts <port>`.
const port = process.argv[2] ?? '51141'
const base = `http://127.0.0.1:${port}`

const res = await fetch(`${base}/api/sessions`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: '{}',
})
const created = await res.json()
console.log('[drive] create session resp:', JSON.stringify(created))
const sessionId = created.sessionId ?? created.session?.id ?? created.id
if (!sessionId) { console.error('[drive] no sessionId in response'); process.exit(1) }
console.log('[drive] sessionId =', sessionId)

const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/${sessionId}`)
const seen: string[] = []

ws.addEventListener('open', () => {
  console.log('[drive] ws open -> roundtable_start')
  ws.send(JSON.stringify({
    type: 'roundtable_start',
    content: '測試圓桌：請各自用一句話簡短自我介紹。',
    modes: { claude: 'discuss', codex: 'discuss' },
  }))
})

ws.addEventListener('message', (ev) => {
  let m: any
  try { m = JSON.parse(String(ev.data)) } catch { return }
  if (m.type === 'roundtable_event') {
    const e = m.event ?? m
    const tag = `${e.kind}${e.author ? ':' + e.author : ''}`
    if (e.kind === 'text') console.log(`[evt] ${tag}: ${e.text}`)
    else console.log(`[evt] ${tag}${e.reason ? ' (' + e.reason + ')' : ''}${e.error ? ' ERROR=' + e.error : ''}`)
    seen.push(tag)
    if (e.kind === 'complete' || e.kind === 'round-limit') {
      console.log('[drive] DONE. event tags:', seen.join(' | '))
      ws.close(); process.exit(0)
    }
  }
})

ws.addEventListener('error', (e) => console.error('[drive] ws error', e))
setTimeout(() => { console.log('[drive] TIMEOUT. tags so far:', seen.join(' | ')); ws.close(); process.exit(2) }, 120_000)
