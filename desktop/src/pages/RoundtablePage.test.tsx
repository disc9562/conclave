import { afterEach, describe, it, expect, beforeEach, vi } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import RoundtablePage from './RoundtablePage'
import { useRoundtableStore, emptyRoundtableSession } from '../stores/roundtableStore'

const SID = 'rt-ui-1'

describe('RoundtablePage', () => {
  beforeEach(() => {
    useRoundtableStore.setState({ sessions: {} })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders message entries with the author label', () => {
    useRoundtableStore.setState({
      sessions: {
        [SID]: {
          ...emptyRoundtableSession(),
          entries: [
            { id: 'a', kind: 'system', text: 'Claude goes first' },
            { id: 'b', kind: 'message', author: 'claude', text: 'TypeScript strict is good.' },
            { id: 'c', kind: 'error', author: 'codex', text: 'codex not logged in' },
          ],
        },
      },
    })
    render(<RoundtablePage sessionId={SID} />)
    expect(screen.getByText('TypeScript strict is good.')).toBeTruthy()
    expect(screen.getByText('Claude goes first')).toBeTruthy()
    expect(screen.getByText(/codex not logged in/)).toBeTruthy()
  })

  it('sends discuss modes by default when starting', () => {
    const startRoundtable = vi.fn()
    useRoundtableStore.setState({ startRoundtable } as never)
    render(<RoundtablePage sessionId={SID} />)
    fireEvent.change(screen.getByPlaceholderText(/ask the round table/i), {
      target: { value: 'What is 2+2?' },
    })
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(startRoundtable).toHaveBeenCalledWith(SID, 'What is 2+2?', {
      claude: 'discuss',
      codex: 'discuss',
    })
  })

  it('unlocking claude sends act for claude only', () => {
    const startRoundtable = vi.fn()
    useRoundtableStore.setState({ startRoundtable } as never)
    render(<RoundtablePage sessionId={SID} />)
    fireEvent.click(screen.getByRole('button', { name: /toggle claude/i }))
    fireEvent.change(screen.getByPlaceholderText(/ask the round table/i), {
      target: { value: 'edit the file' },
    })
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(startRoundtable).toHaveBeenCalledWith(SID, 'edit the file', {
      claude: 'act',
      codex: 'discuss',
    })
  })

  it('codex act toggle is disabled', () => {
    render(<RoundtablePage sessionId={SID} />)
    const codexToggle = screen.getByRole('button', { name: /toggle codex/i })
    expect(codexToggle.hasAttribute('disabled')).toBe(true)
  })
})
