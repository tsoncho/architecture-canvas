import type { PresenceUser } from '@/types'
import { initials } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type PresenceAvatarsProps = {
  users: PresenceUser[]
  currentUserId?: string
  max?: number
}

export function PresenceAvatars({ users, currentUserId, max = 5 }: PresenceAvatarsProps) {
  const visible = users.slice(0, max)
  const overflow = users.length - visible.length

  if (users.length === 0) return null

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex -space-x-2">
        {visible.map((user) => (
          <Tooltip key={user.userId}>
            <TooltipTrigger asChild>
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--color-surface)] text-[10px] font-medium text-white dark:border-[var(--color-surface-dark)]"
                style={{ backgroundColor: user.color }}
                title={user.displayName}
              >
                {initials(user.displayName)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {user.displayName}
              {user.userId === currentUserId ? ' (you)' : ''}
            </TooltipContent>
          </Tooltip>
        ))}
        {overflow > 0 ? (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-canvas)] text-[10px] text-[var(--color-muted)]">
            +{overflow}
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  )
}
