async function req(path, body) {
  const res = await fetch(path, body === undefined ? undefined : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  let json = {}
  try { json = await res.json() } catch { /* non-JSON body */ }
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
  return json
}

export const createPledge = (data) => req('/api/pledge', data)
export const confirmPledge = (id, sessionId) => req('/api/confirm', { id, sessionId })
export const getPledge = (id) => req(`/api/pledge?id=${encodeURIComponent(id)}`)
export const getWitness = (w) => req(`/api/witness?w=${encodeURIComponent(w)}`)
export const checkToday = (id, link) => req('/api/check', link ? { id, link } : { id })
export const advanceDay = (id) => req('/api/advance', { id })
export const insureDay = (id, date) => req('/api/insure', { id, date })
export const settleWeek = (id) => req('/api/settle', { id })
export const getReceipts = (id) => req(`/api/receipts?id=${encodeURIComponent(id)}`)
export const getWitnessReceipts = (w) => req(`/api/receipts?w=${encodeURIComponent(w)}`)
