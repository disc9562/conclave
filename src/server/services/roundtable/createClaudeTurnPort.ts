import type { ClaudeTurnPort } from './ClaudeParticipant.js'
import { conversationService } from '../conversationService.js'

// Minimal slice of the conversation service this port depends on. Declared
// here (rather than importing the singleton's type) so tests can inject a fake
// without spawning a real CLI.
export type ConversationServiceLike = {
  setPermissionMode: (sessionId: string, mode: string) => unknown
  onOutput: (sessionId: string, cb: (msg: any) => void) => void
  removeOutputCallback: (sessionId: string, cb: (msg: any) => void) => void
  sendMessage: (sessionId: string, content: string) => unknown
}

// Shapes below mirror what handler.ts's translateCliMessage discriminates on:
// - streamed text deltas:  cliMsg.type === 'stream_event',
//   cliMsg.event.type === 'content_block_delta',
//   cliMsg.event.delta.type === 'text_delta' → cliMsg.event.delta.text
// - full assistant blocks: cliMsg.type === 'assistant',
//   cliMsg.message.content[] with block.type === 'text' → block.text
// - terminal:              cliMsg.type === 'result' (success OR is_error)
type CliTextDelta = { type?: string; text?: string }
type CliStreamEvent = { type?: string; delta?: CliTextDelta }
type CliContentBlock = { type?: string; text?: string }
type CliMessage = {
  type?: string
  event?: CliStreamEvent
  message?: { content?: CliContentBlock[] }
}

function isStreamTextDelta(cliMsg: CliMessage): cliMsg is CliMessage & { event: { delta: { text: string } } } {
  return (
    cliMsg?.type === 'stream_event' &&
    cliMsg.event?.type === 'content_block_delta' &&
    cliMsg.event.delta?.type === 'text_delta' &&
    typeof cliMsg.event.delta.text === 'string' &&
    cliMsg.event.delta.text.length > 0
  )
}

// Drives ONE Claude turn over the existing callback-streaming API.
// discuss -> permissionMode 'plan' (engine proposes, does not apply).
// act     -> permissionMode 'default' (permission_request surfaces to the user).
export function createClaudeTurnPort(
  sessionId: string,
  service: ConversationServiceLike = conversationService,
): ClaudeTurnPort {
  return (prompt, mode, onEvent) =>
    new Promise<void>((resolve) => {
      service.setPermissionMode(sessionId, mode === 'act' ? 'default' : 'plan')

      // Track whether incremental text deltas arrived so the full assistant
      // message (which repeats the same text) doesn't double-emit it.
      let sawStreamText = false

      const cb = (cliMsg: CliMessage) => {
        // Streamed text deltas (the live, incremental path).
        if (isStreamTextDelta(cliMsg)) {
          sawStreamText = true
          onEvent({ kind: 'text', text: cliMsg.event.delta.text })
          return
        }

        // Full assistant message — fall back only when no stream deltas were
        // seen for this turn (otherwise the text was already emitted above).
        if (cliMsg?.type === 'assistant' && !sawStreamText && Array.isArray(cliMsg.message?.content)) {
          for (const block of cliMsg.message!.content!) {
            if (block?.type === 'text' && block.text) {
              onEvent({ kind: 'text', text: block.text })
            }
          }
          return
        }

        // 'result' is the single terminal for this turn — emitted for both
        // success and error (is_error) outcomes by the engine — so resolving
        // here also covers the error path and avoids a hung Promise / leaked
        // callback.
        if (cliMsg?.type === 'result') {
          service.removeOutputCallback(sessionId, cb)
          onEvent({ kind: 'done' })
          resolve()
        }
      }

      service.onOutput(sessionId, cb)
      service.sendMessage(sessionId, prompt)
    })
}
