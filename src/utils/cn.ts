/**
 * cn — utility for merging Tailwind CSS class names conditionally.
 * Avoids dependency on clsx/classnames for minimal bundle overhead.
 */

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
