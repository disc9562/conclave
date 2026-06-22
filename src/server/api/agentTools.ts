import { listCodex, setCodexMcpEnabled, setCodexFeatureEnabled } from '../services/agentTools/codexTools.js'
import { listGrok, setGrokPluginEnabled, setGrokMcpEnabled } from '../services/agentTools/grokTools.js'

async function getCodex() {
  try {
    const { mcp, features } = await listCodex()
    return { available: true, mcp, features }
  } catch {
    return { available: false, mcp: [], features: [] }
  }
}

async function getGrok() {
  try {
    const { plugins, mcp } = await listGrok()
    return { available: true, plugins, mcp }
  } catch {
    return { available: false, plugins: [], mcp: [] }
  }
}

export async function handleAgentToolsApi(
  req: Request,
  _url: URL,
  segments: string[],
): Promise<Response> {
  const sub = segments[2]

  if (req.method === 'GET' && sub === 'codex') return Response.json(await getCodex())
  if (req.method === 'GET' && sub === 'grok') return Response.json(await getGrok())

  if (req.method === 'POST' && sub === 'toggle') {
    const { tool, kind, name, enabled } = (await req.json()) as {
      tool: string; kind: string; name: string; enabled: boolean
    }
    try {
      if (tool === 'codex' && kind === 'mcp') await setCodexMcpEnabled(name, enabled)
      else if (tool === 'codex' && kind === 'features') await setCodexFeatureEnabled(name, enabled)
      else if (tool === 'grok' && kind === 'plugins') await setGrokPluginEnabled(name, enabled)
      else if (tool === 'grok' && kind === 'mcp') await setGrokMcpEnabled(name, enabled)
      else return Response.json({ error: `unknown toggle ${tool}/${kind}` }, { status: 400 })
    } catch (e) {
      return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
    return Response.json(tool === 'codex' ? await getCodex() : await getGrok())
  }

  return Response.json({ error: 'Method Not Allowed' }, { status: 405 })
}
