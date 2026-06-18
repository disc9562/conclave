import { useRef, useState } from 'react'
import { useRoundtableStore, emptyRoundtableSession } from '../stores/roundtableStore'
import { useChatStore } from '../stores/chatStore'
import { useSessionStore } from '../stores/sessionStore'
import { PermissionDialog } from '../components/chat/PermissionDialog'
import type { RoundtableCapabilityMode } from '../types/chat'
import { participantColorHex } from './roundtableColors'

// Stable fallback so the selector returns a referentially-stable value when the
// session does not exist yet (getSession() builds a fresh object each call,
// which would otherwise re-trigger renders indefinitely).
const EMPTY_SESSION = emptyRoundtableSession()

export default function RoundtablePage({ sessionId }: { sessionId: string }) {
  const session = useRoundtableStore((s) => s.sessions[sessionId] ?? EMPTY_SESSION)
  const startRoundtable = useRoundtableStore((s) => s.startRoundtable)
  const stopRoundtable = useRoundtableStore((s) => s.stopRoundtable)
  const pendingPermission = useChatStore((s) => s.sessions[sessionId]?.pendingPermission)
  const workDir = useSessionStore((s) => s.sessions.find((x) => x.id === sessionId)?.workDir ?? null)
  const [input, setInput] = useState('')
  // WebKit (the Tauri WKWebView) fires `compositionend` BEFORE the confirming
  // Enter's keydown, so ev.nativeEvent.isComposing is already false by then and
  // a single Enter wrongly sends mid-IME. Track composition ourselves and clear
  // it on the next tick so that confirming keydown still sees composing=true.
  const composingRef = useRef(false)
  // Set when Start is pressed; opens the write-permission dialog before sending.
  const [awaitingApproval, setAwaitingApproval] = useState(false)

  const running = session.status === 'running'

  // Pressing Start no longer sends immediately — it opens one approval dialog
  // (Claude-Code-desktop style). The answer decides every agent's mode at once.
  const start = () => {
    if (!input.trim() || running) return
    setAwaitingApproval(true)
  }

  // allowWrites=true → all agents 'act' (codex/grok get workspace-write, claude
  // runs default perm-mode and still pops its own per-write dialog).
  // false → all 'discuss' (read-only, propose only).
  const launch = (allowWrites: boolean) => {
    const mode: RoundtableCapabilityMode = allowWrites ? 'act' : 'discuss'
    startRoundtable(sessionId, input.trim(), { claude: mode, codex: mode, grok: mode })
    setInput('')
    setAwaitingApproval(false)
  }

  return (
    <div
      className="flex-1 flex flex-col relative overflow-hidden bg-[var(--color-surface)] text-[var(--color-text-primary)]"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {/* Working-dir context + stop. Write permission is asked per-send via the
          approval dialog, so the old per-agent act toggles are gone. */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border-separator)] px-4 py-2.5">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">圓桌會議</span>

        {workDir && (
          <span
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-surface-container-low)] border border-[var(--color-border)] text-xs text-[var(--color-text-tertiary)] max-w-[260px]"
            title={`act 寫檔範圍:${workDir}`}
          >
            <span aria-hidden>📁</span>
            <span className="truncate">{workDir}</span>
          </span>
        )}

        {running && (
          <button
            type="button"
            aria-label="stop"
            onClick={() => stopRoundtable(sessionId)}
            className="ml-auto px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-error-container)] text-[var(--color-error)] border border-[var(--color-error)]/30 transition-all hover:brightness-110 active:scale-95"
          >
            Stop
          </button>
        )}
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 max-w-3xl mx-auto w-full space-y-3">
        {session.entries.map((e) => {
          if (e.kind === 'user') {
            return (
              <div key={e.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-xl bg-[image:var(--gradient-btn-primary)] text-[var(--color-btn-primary-fg)] px-4 py-2.5 shadow-[var(--shadow-button-primary)]">
                  <p className="whitespace-pre-wrap leading-relaxed text-sm">{e.text}</p>
                </div>
              </div>
            )
          }
          if (e.kind === 'system') {
            return (
              <div
                key={e.id}
                className="text-xs text-[var(--color-text-tertiary)] opacity-70 italic text-center"
              >
                {e.text}
              </div>
            )
          }
          if (e.kind === 'error') {
            return (
              <div key={e.id} className="text-xs text-[var(--color-error)]">
                <span className="font-semibold">[{e.author}]</span> {e.text}
              </div>
            )
          }
          if (e.kind === 'proposal') {
            return (
              <div
                key={e.id}
                className="text-xs italic"
                style={{ color: participantColorHex(e.author) }}
              >
                [{e.author} proposes] {e.description}
              </div>
            )
          }
          // message
          const tint = participantColorHex(e.author)
          return (
            <div key={e.id} className="space-y-1.5">
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: tint }}
              >
                {e.author}
              </p>
              <div
                className="rounded-xl border p-4 shadow-[var(--shadow-dropdown)]"
                // ponytail: tint the bubble bg with the speaker's color (~12% alpha)
                // so each AI's sentences are visually grouped by background, not just the label.
                style={{ backgroundColor: `${tint}1f`, borderColor: `${tint}55`, borderLeft: `3px solid ${tint}` }}
              >
                <p className="whitespace-pre-wrap leading-relaxed text-[var(--color-text-primary)]">
                  {e.text}
                </p>
              </div>
            </div>
          )
        })}

        {pendingPermission && (
          <PermissionDialog
            sessionId={sessionId}
            requestId={pendingPermission.requestId}
            toolName={pendingPermission.toolName}
            input={pendingPermission.input}
            description={pendingPermission.description}
          />
        )}
      </div>

      {/* Write-permission approval — asked once per Start, like Claude Code desktop. */}
      {awaitingApproval && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-panel rounded-xl p-5 w-[min(92%,400px)] space-y-4 shadow-[var(--shadow-dropdown)]">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">允許這一輪建立 / 修改檔案？</p>
              <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">
                允許後，codex / grok 可在下列資料夾內寫檔，claude 仍會逐項跳出確認；拒絕則三者皆只討論不動手。
              </p>
              {workDir ? (
                <p className="text-xs font-mono text-[var(--color-text-secondary)] break-all bg-[var(--color-surface-container-low)] rounded px-2 py-1.5">
                  📁 {workDir}
                </p>
              ) : (
                <p className="text-xs text-[var(--color-error)]">尚未選擇資料夾，寫檔會落在預設目錄。</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => launch(false)}
                className="px-4 h-9 rounded-lg text-sm font-semibold bg-[var(--color-surface-container-high)] text-[var(--color-text-secondary)] border border-[var(--color-border)] transition-all hover:brightness-110 active:scale-95"
              >
                只討論
              </button>
              <button
                type="button"
                onClick={() => launch(true)}
                className="px-4 h-9 rounded-lg text-sm font-semibold bg-[image:var(--gradient-btn-primary)] text-[var(--color-btn-primary-fg)] shadow-[var(--shadow-button-primary)] transition-all hover:brightness-105 active:scale-95"
              >
                允許寫檔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="max-w-3xl mx-auto w-full px-4 md:px-8 pb-6">
        <div className="glass-panel relative rounded-xl p-1.5 flex items-center gap-2 transition-all">
          <input
            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm text-[var(--color-text-primary)] px-3 py-2 disabled:opacity-50"
            placeholder="Ask the round table…"
            type="text"
            value={input}
            onChange={(ev) => setInput(ev.target.value)}
            onCompositionStart={() => { composingRef.current = true }}
            onCompositionEnd={() => {
              // Defer so the confirming Enter's keydown (which fires AFTER this
              // in WebKit) still reads composingRef as true and is suppressed.
              setTimeout(() => { composingRef.current = false }, 0)
            }}
            onKeyDown={(ev) => {
              // Block Enter while an IME (注音/拼音/かな…) is composing OR confirming
              // a candidate. isComposing covers Chromium; composingRef covers WebKit,
              // which clears isComposing before this keydown.
              if (ev.key !== 'Enter' || running) return
              if (ev.nativeEvent.isComposing || composingRef.current) return
              start()
            }}
            disabled={running}
          />
          <button
            type="button"
            aria-label="start"
            onClick={start}
            disabled={running || !input.trim()}
            className="bg-[image:var(--gradient-btn-primary)] text-[var(--color-btn-primary-fg)] shadow-[var(--shadow-button-primary)] px-4 h-9 rounded-lg flex items-center justify-center text-sm font-semibold transition-all hover:brightness-105 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            {running ? 'Running…' : 'Start'}
          </button>
        </div>
      </div>
    </div>
  )
}
