'use client'

import { COLORS, RADIUS, SPACING, TRANSITIONS } from '@/constants/design-tokens'

interface NavigationDotsProps {
  total: number
  current: number
  onDotClick?: (index: number) => void
}

export function NavigationDots({ total, current, onDotClick }: NavigationDotsProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: SPACING.xs,
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${SPACING.sm} 0`,
      }}
    >
      {Array.from({ length: total }).map((_, index) => {
        const isActive = index === current
        const isPast = index < current

        return (
          <button
            key={index}
            onClick={() => onDotClick?.(index)}
            disabled={!onDotClick}
            aria-label={`Question ${index + 1}`}
            aria-current={isActive ? 'step' : undefined}
            style={{
              width: isActive ? '20px' : '6px',
              height: '6px',
              borderRadius: RADIUS.full,
              background: isActive
                ? COLORS.primary.dark
                : isPast
                  ? COLORS.primary.medium
                  : COLORS.border.light,
              border: 'none',
              cursor: onDotClick ? 'pointer' : 'default',
              transition: `all ${TRANSITIONS.normal}`,
              padding: 0,
            }}
          />
        )
      })}
    </div>
  )
}
