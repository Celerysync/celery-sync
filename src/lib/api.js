export async function callClaude({ system, staticSystem, dynamicSystem, messages, maxTokens = 900, tier = 'standard' }) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, staticSystem, dynamicSystem, messages, maxTokens, tier }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || `API error ${res.status}`)
  }

  const data = await res.json()
  return data.text ?? ''
}

export async function streamClaude({ system, staticSystem, dynamicSystem, messages, maxTokens = 900, tier = 'standard', onDelta, onDone }) {
  const res = await fetch('/api/claude/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, staticSystem, dynamicSystem, messages, maxTokens, tier }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || `API error ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6)
      if (payload === '[DONE]') { onDone?.(full); return full }
      try {
        const { delta, error } = JSON.parse(payload)
        if (error) throw new Error(error)
        if (delta) { full += delta; onDelta?.(delta, full) }
      } catch (e) {
        if (e.message !== 'Unexpected end of JSON input') throw e
      }
    }
  }

  onDone?.(full)
  return full
}
