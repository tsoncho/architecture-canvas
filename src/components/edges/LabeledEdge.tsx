import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  type Edge,
  type EdgeProps,
} from '@xyflow/react'
import type { ArchitectureEdgeData } from '@/lib/flow-mappers'

function toPosition(value: Position | string | undefined): Position {
  if (value === Position.Top || value === 'top') return Position.Top
  if (value === Position.Right || value === 'right') return Position.Right
  if (value === Position.Bottom || value === 'bottom') return Position.Bottom
  if (value === Position.Left || value === 'left') return Position.Left
  return Position.Right
}

export function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  selected,
  markerEnd,
  data,
}: EdgeProps<Edge<ArchitectureEdgeData>>) {
  const offset =
    typeof data?.pathOffset === 'number' && Number.isFinite(data.pathOffset)
      ? data.pathOffset
      : 0

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: toPosition(sourcePosition),
    targetPosition: toPosition(targetPosition),
    borderRadius: 14,
    offset,
  })

  const stroke = selected ? 'var(--color-accent)' : 'var(--color-edge, #94a3b8)'

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={20}
        style={{
          stroke,
          strokeWidth: selected ? 2.25 : 1.75,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }}
      />
      {label ? (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            className="nodrag nopan pointer-events-none absolute rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium leading-none text-[var(--color-muted)] shadow-sm"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}
