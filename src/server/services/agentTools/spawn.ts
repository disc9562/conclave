export async function runCli(argv: string[]): Promise<string> {
  const proc = Bun.spawn(argv, { stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  if (code !== 0) {
    throw new Error(`${argv.join(' ')} exited ${code}: ${stderr.trim() || stdout.trim()}`)
  }
  return stdout.trim()
}
