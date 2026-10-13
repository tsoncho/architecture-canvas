import type { OutboxItem } from '@/types'

function outboxRank(item: OutboxItem): number {
  // Nodes before edges; deletes after writes so FKs stay valid.
  if (item.table === 'nodes' && item.op !== 'delete') return 0
  if (item.table === 'edges' && item.op !== 'delete') return 1
  if (item.table === 'edges' && item.op === 'delete') return 2
  return 3
}

/** Last write wins per entity; then order for FK-safe flush. */
export function prepareOutbox(items: OutboxItem[]): {
  apply: OutboxItem[]
  discardIds: string[]
} {
  const byKey = new Map<string, OutboxItem>()
  const chronological = [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  for (const item of chronological) {
    const id = String(item.payload.id ?? '')
    if (!id) continue
    byKey.set(`${item.table}:${id}`, item)
  }
  const apply = [...byKey.values()].sort((a, b) => {
    const rank = outboxRank(a) - outboxRank(b)
    if (rank !== 0) return rank
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
  const keep = new Set(apply.map((i) => i.id))
  const discardIds = items.filter((i) => !keep.has(i.id)).map((i) => i.id)
  return { apply, discardIds }
}
