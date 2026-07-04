// Every AI call gets a default timeout even if the caller doesn't pass a
// signal — a hung request used to leave the UI stuck indefinitely with no
// recovery. Callers can still pass their own `signal` (e.g. tied to a
// component unmount) to also support abort-on-navigation; it's combined
// with the timeout, whichever fires first wins.
function withTimeout(externalSignal, ms) {
  const timeoutSignal = AbortSignal.timeout(ms)
  return externalSignal ? AbortSignal.any([externalSignal, timeoutSignal]) : timeoutSignal
}

function friendlyAbortError(err) {
  if (err.name === 'TimeoutError') return new Error('That took too long to respond — please try again.')
  if (err.name === 'AbortError') return err // real cancellation (navigation) — caller decides how to handle
  return err
}

export async function callClaude({ system, staticSystem, dynamicSystem, messages, maxTokens = 900, tier = 'standard', signal, timeoutMs = 30000 }) {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, staticSystem, dynamicSystem, messages, maxTokens, tier }),
      signal: withTimeout(signal, timeoutMs),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error || `API error ${res.status}`)
    }

    const data = await res.json()
    return data.text ?? ''
  } catch (err) {
    throw friendlyAbortError(err)
  }
}

export async function streamClaude({ system, staticSystem, dynamicSystem, messages, maxTokens = 900, tier = 'standard', onDelta, onDone, signal, timeoutMs = 45000 }) {
  const combinedSignal = withTimeout(signal, timeoutMs)
  let res
  try {
    res = await fetch('/api/claude/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, staticSystem, dynamicSystem, messages, maxTokens, tier }),
      signal: combinedSignal,
    })
  } catch (err) {
    throw friendlyAbortError(err)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || `API error ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  let buffer = ''

  try {
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
  } catch (err) {
    throw friendlyAbortError(err)
  }

  onDone?.(full)
  return full
}
