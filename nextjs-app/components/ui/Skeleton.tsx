import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  height?: number | string
  width?: number | string
  radius?: number | string
}

export function Skeleton({
  className,
  height = '1rem',
  width = '100%',
  radius = '0.75rem',
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse bg-gray-200 dark:bg-gray-700', className)}
      style={{ height, width, borderRadius: radius, ...style }}
      {...props}
    />
  )
}
