import { syncEngine } from '@/features/collaboration/sync'
import { useProjectStore } from '@/stores/project-store'
import type { ArchitectureSpec } from './types'
import { specToCanvas } from './format'

/** Replace the live canvas with an imported Architecture Spec and queue sync. */
export async function applyArchitectureSpec(input: {
  spec: ArchitectureSpec
  projectId: string
  userId: string
}): Promise<void> {
  const store = useProjectStore.getState()
  const previousNodes = store.nodes
  const previousEdges = store.edges
  const { nodes, edges } = specToCanvas(input)

  store.replaceAll(nodes, edges)

  for (const edge of previousEdges) {
    await syncEngine.deleteEdge(edge.id)
  }
  for (const node of previousNodes) {
    await syncEngine.deleteNode(node.id)
  }
  for (const node of nodes) {
    await syncEngine.insertNode(node)
  }
  for (const edge of edges) {
    await syncEngine.insertEdge(edge)
  }
  await syncEngine.persistLocalSnapshot()
}
