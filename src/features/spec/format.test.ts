import { describe, expect, it } from 'vitest'
import {
  exportArchitectureSpec,
  parseArchitectureSpec,
  specToCanvas,
  stringifyArchitectureSpec,
} from './format'
import { SPEC_LIMITS } from './limits'
import type { ArchitectureEdge, ArchitectureNode } from '@/types'

function sampleNode(overrides: Partial<ArchitectureNode> = {}): ArchitectureNode {
  return {
    id: 'n1',
    projectId: 'p1',
    type: 'service',
    name: 'Auth Service',
    description: '',
    technology: 'Go',
    color: '#8b5cf6',
    positionX: 100,
    positionY: 200,
    width: 180,
    height: 80,
    zIndex: 1,
    parentGroupId: null,
    metadata: {},
    updatedBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('parseArchitectureSpec', () => {
  it('accepts a minimal valid document', () => {
    const spec = parseArchitectureSpec(
      JSON.stringify({
        version: 1,
        name: 'Demo',
        nodes: [{ id: 'api', type: 'api', name: 'API' }],
        edges: [],
      }),
    )
    expect(spec.version).toBe(1)
    expect(spec.nodes).toHaveLength(1)
  })

  it('rejects unsupported versions', () => {
    expect(() =>
      parseArchitectureSpec(
        JSON.stringify({
          version: 99,
          nodes: [{ id: 'a', type: 'api', name: 'API' }],
          edges: [],
        }),
      ),
    ).toThrow(/Unsupported Architecture Spec version/)
  })

  it('rejects duplicate node ids', () => {
    expect(() =>
      parseArchitectureSpec(
        JSON.stringify({
          version: 1,
          nodes: [
            { id: 'a', type: 'api', name: 'A' },
            { id: 'a', type: 'service', name: 'B' },
          ],
          edges: [],
        }),
      ),
    ).toThrow(/Duplicate node id/)
  })

  it('rejects edges that point at missing nodes', () => {
    expect(() =>
      parseArchitectureSpec(
        JSON.stringify({
          version: 1,
          nodes: [{ id: 'a', type: 'api', name: 'A' }],
          edges: [{ from: 'a', to: 'missing', label: 'x' }],
        }),
      ),
    ).toThrow(/unknown node ids/)
  })

  it('rejects payloads that exceed size limits', () => {
    const huge = 'x'.repeat(SPEC_LIMITS.maxJsonBytes + 10)
    expect(() => parseArchitectureSpec(huge)).toThrow(/too large/)
  })

  it('rejects unknown node types', () => {
    expect(() =>
      parseArchitectureSpec(
        JSON.stringify({
          version: 1,
          nodes: [{ id: 'a', type: 'spaceship', name: 'A' }],
          edges: [],
        }),
      ),
    ).toThrow(/unknown type/)
  })
})

describe('export / import round trip', () => {
  it('preserves topology through export → parse → canvas', () => {
    const nodes = [
      sampleNode({ id: '1', name: 'Frontend', type: 'application', positionX: 10, positionY: 20 }),
      sampleNode({ id: '2', name: 'API', type: 'api', positionX: 300, positionY: 20 }),
    ]
    const edges: ArchitectureEdge[] = [
      {
        id: 'e1',
        projectId: 'p1',
        sourceNodeId: '1',
        targetNodeId: '2',
        label: 'HTTPS',
        edgeType: 'default',
        style: {},
        updatedBy: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]
    const exported = exportArchitectureSpec({ name: 'Roundtrip', nodes, edges })
    const text = stringifyArchitectureSpec(exported)
    const parsed = parseArchitectureSpec(text)
    expect(parsed.nodes).toHaveLength(2)
    expect(parsed.edges).toHaveLength(1)
    const canvas = specToCanvas({ spec: parsed, projectId: 'p2', userId: 'u1' })
    expect(canvas.nodes).toHaveLength(2)
    expect(canvas.edges).toHaveLength(1)
    expect(canvas.edges[0]?.label).toBe('HTTPS')
  })
})
