import { describe, expect, it } from 'vitest'
import { prepareOutbox } from './outbox'
import type { OutboxItem } from '@/types'

function item(
  partial: Partial<OutboxItem> & Pick<OutboxItem, 'id' | 'table' | 'op' | 'payload'>,
): OutboxItem {
  return {
    projectId: 'p1',
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('prepareOutbox', () => {
  it('keeps last write per entity', () => {
    const { apply, discardIds } = prepareOutbox([
      item({
        id: '1',
        table: 'nodes',
        op: 'update',
        payload: { id: 'n1', name: 'A' },
        createdAt: '2026-01-01T00:00:01.000Z',
      }),
      item({
        id: '2',
        table: 'nodes',
        op: 'update',
        payload: { id: 'n1', name: 'B' },
        createdAt: '2026-01-01T00:00:02.000Z',
      }),
    ])
    expect(apply).toHaveLength(1)
    expect(apply[0]?.payload.name).toBe('B')
    expect(discardIds).toEqual(['1'])
  })

  it('orders node upserts before edge upserts before deletes', () => {
    const { apply } = prepareOutbox([
      item({
        id: 'e-del',
        table: 'edges',
        op: 'delete',
        payload: { id: 'e1' },
        createdAt: '2026-01-01T00:00:04.000Z',
      }),
      item({
        id: 'e-up',
        table: 'edges',
        op: 'update',
        payload: { id: 'e2' },
        createdAt: '2026-01-01T00:00:03.000Z',
      }),
      item({
        id: 'n-up',
        table: 'nodes',
        op: 'update',
        payload: { id: 'n1' },
        createdAt: '2026-01-01T00:00:02.000Z',
      }),
      item({
        id: 'n-del',
        table: 'nodes',
        op: 'delete',
        payload: { id: 'n2' },
        createdAt: '2026-01-01T00:00:01.000Z',
      }),
    ])
    expect(apply.map((i) => i.id)).toEqual(['n-up', 'e-up', 'e-del', 'n-del'])
  })
})
