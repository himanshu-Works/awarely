import { cn } from '@/utils/cn'

export interface SkeletonProps {
  className?: string
  circle?: boolean
}

export function Skeleton({ className, circle = false }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-slate-800/80',
        circle ? 'rounded-full' : 'rounded-xl',
        className,
      )}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#1E3550] bg-[#122338] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 flex-1 rounded-xl" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
    </div>
  )
}
