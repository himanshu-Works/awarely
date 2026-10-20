import { cn } from '@/utils/cn'

interface BrandLogoProps {
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Show the brand tagline "Safety, When It Matters." */
  showTagline?: boolean
  /** Optional clickable link back to home */
  clickable?: boolean
  className?: string
  alt?: string
}

export function BrandLogo({
  size = 'md',
  showTagline = false,
  clickable = false,
  className,
  alt = 'Awarely — Safety, When It Matters.',
}: BrandLogoProps) {
  // Height classes for image preserving exact natural proportions
  const sizeClasses = {
    xs: 'h-6 w-auto',
    sm: 'h-8 w-auto',
    md: 'h-10 w-auto',
    lg: 'h-14 w-auto',
    xl: 'h-20 w-auto',
  }[size]

  const content = (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      {/* Contrast-safe surface ensures logo stands out with high contrast in both light & dark modes */}
      <div className="awarely-logo-badge relative flex items-center justify-center rounded-xl bg-[#0B192C] p-1 border border-[#1E3550] shadow-sm shrink-0">
        <img
          src="/logo.png"
          alt={alt}
          className={cn(sizeClasses, 'object-contain shrink-0 drop-shadow-sm')}
          loading="eager"
        />
      </div>
      {showTagline && size !== 'xs' && (
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-none">
            Awarely
          </span>
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-snug mt-0.5">
            Safety, When It Matters.
          </span>
        </div>
      )}
    </div>
  )

  if (clickable) {
    return (
      <a
        href="/"
        className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition active:scale-98"
        aria-label="Awarely Home"
      >
        {content}
      </a>
    )
  }

  return content
}
