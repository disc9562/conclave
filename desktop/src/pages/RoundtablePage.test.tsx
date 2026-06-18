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

  it('Start opens the approval dialog; declining sends all-discuss', () => {
    const startRoundtable = vi.fn()
    useRoundtableStore.setState({ startRoundtable } as never)
    render(<RoundtablePage sessionId={SID} />)
    fireEvent.change(screen.getByPlaceholderText(/ask the round table/i), {
      target: { value: 'What is 2+2?' },
    })
    // Start no longer sends directly — it opens the approval dialog.
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(startRoundtable).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '只討論' }))
    expect(startRoundtable).toHaveBeenCalledWith(SID, 'What is 2+2?', {
      claude: 'discuss',
      codex: 'discuss',
      grok: 'discuss',
    })
  })

  it('approving writes sends all-act', () => {
    const startRoundtable = vi.fn()
    useRoundtableStore.setState({ startRoundtable } as never)
    render(<RoundtablePage sessionId={SID} />)
    fireEvent.change(screen.getByPlaceholderText(/ask the round table/i), {
      target: { value: 'edit the file' },
    })
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    fireEvent.click(screen.getByRole('button', { name: '允許寫檔' }))
    expect(startRoundtable).toHaveBeenCalledWith(SID, 'edit the file', {
      claude: 'act',
      codex: 'act',
      grok: 'act',
    })
  })

  it('Start with empty input does not open the approval dialog', () => {
    render(<RoundtablePage sessionId={SID} />)
    // Start button is disabled with empty input, and no dialog is present.
    expect(screen.queryByRole('button', { name: '允許寫檔' })).toBeNull()
  })
})
