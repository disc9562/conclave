import { useState } from 'react'
import { useRoundtableStore, emptyRoundtableSession } from '../stores/roundtableStore'
import { useChatStore } from '../stores/chatStore'
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
  const [input, setInput] = useState('')
  const [claudeAct, setClaudeAct] = useState(false)
  const [grokAct, setGrokAct] = useState(false)

  const running = session.status === 'running'

  const start = () => {
    if (!input.trim()) return
    const modes: { claude: RoundtableCapabilityMode; codex: RoundtableCapabilityMode; grok: RoundtableCapabilityMode } = {
      claude: claudeAct ? 'act' : 'discuss',
      codex: 'discuss', // codex act is Phase 2
      grok: grokAct ? 'act' : 'discuss',
    }
    startRoundtable(sessionId, input.trim(), modes)
    setInput('')
  }

  return (
    <div
      className="flex-1 flex flex-col relative overflow-hidden bg-[var(--color-surface)] text-[var(--color-text-primary)]"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {/* Participant act toggles + stop */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border-separator)] px-4 py-2.5">
        <button
          type="button"
          aria-label="toggle claude act"
          onClick={() => setClaudeAct((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-surface-container-high)] border transition-all hover:brightness-110"
          style={{ borderColor: `${participantColorHex('claude')}55` }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: participantColorHex('claude') }}
          />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">claude</span>
          <span aria-hidden className="text-sm">
            {claudeAct ? '🔓' : '🔒'}
          </span>
        </button>

        <button
          type="button"
          aria-label="toggle codex act"
          disabled
          title="Codex act coming in Phase 2"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-surface-container-low)] border border-[var(--color-border)] grayscale opacity-60 cursor-not-allowed"
          style={{ borderColor: `${participantColorHex('codex')}33` }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: participantColorHex('codex') }}
          />
          <span className="text-xs font-semibold text-[var(--color-text-tertiary)]">codex</span>
          <span aria-hidden className="text-sm">
            🔒
          </span>
        </button>

        <button
          type="button"
          aria-label="toggle grok act"
          onClick={() => setGrokAct((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-surface-container-high)] border transition-all hover:brightness-110"
          style={{ borderColor: `${participantColorHex('grok')}55` }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: participantColorHex('grok') }}
          />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">grok</span>
          <span aria-hidden className="text-sm">
            {grokAct ? '🔓' : '🔒'}
          </span>
        </button>

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

      {/* Input row */}
      <div className="max-w-3xl mx-auto w-full px-4 md:px-8 pb-6">
        <div className="glass-panel relative rounded-xl p-1.5 flex items-center gap-2 transition-all">
          <input
            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm text-[var(--color-text-primary)] px-3 py-2 disabled:opacity-50"
            placeholder="Ask the round table…"
            type="text"
            value={input}
            onChange={(ev) => setInput(ev.target.value)}
            onKeyDown={(ev) => {
              // ev.nativeEvent.isComposing is true while an IME (注音/拼音/かな…)
              // is mid-composition; Enter then confirms a candidate, it must not send.
              if (ev.key === 'Enter' && !ev.nativeEvent.isComposing && !running) start()
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
