import { afterEach, describe, it, expect, beforeEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import RoundtablePage from './RoundtablePage'
import { useChatStore } from '../stores/chatStore'
import { useRoundtableStore } from '../stores/roundtableStore'

const SID = 'rt-perm-1'

describe('RoundtablePage permission prompt', () => {
  beforeEach(() => {
    useRoundtableStore.setState({ sessions: {} })
    // The roundtable runs on a real chat session id, so the session already
    // exists in chatStore by the time a permission_request arrives. Seed a
    // minimal session so handleServerMessage has somewhere to record it.
    useChatStore.setState({
      sessions: { [SID]: useChatStore.getState().getSession(SID) },
    } as never)
  })

  afterEach(() => {
    cleanup()
    useChatStore.setState({ sessions: {} } as never)
  })

  it('shows the permission dialog when a permission_request arrives for this session', () => {
    useChatStore.getState().handleServerMessage(SID, {
      type: 'permission_request',
      requestId: 'req-1',
      toolName: 'Edit',
      input: { file_path: '/tmp/x.ts', old_string: 'a', new_string: 'b' },
      description: 'Edit /tmp/x.ts',
    })

    render(<RoundtablePage sessionId={SID} />)

    // PermissionDialog renders the tool description and the file path it targets.
    expect(screen.getByText('Edit /tmp/x.ts')).toBeTruthy()
    expect(screen.getAllByText('/tmp/x.ts').length).toBeGreaterThan(0)
  })
})
