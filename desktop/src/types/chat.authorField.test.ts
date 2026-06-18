import { describe, expect, it } from 'vitest'
import type { UIMessage } from './chat'

describe('UIMessage assistant_text author field', () => {
  it('accepts an author on assistant_text', () => {
    const msg: UIMessage = {
      id: '1',
      type: 'assistant_text',
      content: 'hi',
      timestamp: 0,
      author: 'codex',
    }
    expect(msg.type === 'assistant_text' && msg.author).toBe('codex')
  })
})
