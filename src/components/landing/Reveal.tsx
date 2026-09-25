'use client'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/** Fades/slides children in once they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'li'
}) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Show immediately when observers are unavailable or the element is already on screen.
    if (typeof IntersectionObserver === 'undefined' || el.getBoundingClientRect().top < window.innerHeight) {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      // Any visible pixel triggers the reveal, so tall sections can never stay hidden.
      { rootMargin: '0px 0px -5% 0px', threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref as any}
      className={cn('reveal', visible && 'is-visible', className)}
      style={{ ['--reveal-delay' as any]: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}
