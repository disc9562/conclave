import type { ClaudeTurnPort } from './ClaudeParticipant.js'
import { conversationService } from '../conversationService.js'

// Drives ONE Claude turn over the existing callback-streaming API.
// discuss -> permissionMode 'plan' (engine proposes, does not apply).
// act     -> permissionMode 'default' (permission_request surfaces to the user).
export function createClaudeTurnPort(sessionId: string): ClaudeTurnPort {
  return (prompt, mode, onEvent) =>
    new Promise<void>((resolve) => {
      conversationService.setPermissionMode(sessionId, mode === 'act' ? 'default' : 'plan')
      const cb = (cliMsg: { type?: string; delta?: { text?: string }; text?: string }) => {
        if (cliMsg?.delta?.text) onEvent({ kind: 'text', text: cliMsg.delta.text })
        else if (typeof cliMsg?.text === 'string') onEvent({ kind: 'text', text: cliMsg.text })
        if (cliMsg?.type === 'result') {
          conversationService.removeOutputCallback(sessionId, cb)
          onEvent({ kind: 'done' })
          resolve()
        }
      }
      conversationService.onOutput(sessionId, cb)
      conversationService.sendMessage(sessionId, prompt)
    })
}
