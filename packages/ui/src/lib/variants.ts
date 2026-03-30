import type { Variants } from 'framer-motion'

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.2, 0, 0, 1] } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } },
}

export const slideOverVariants: Variants = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.28, ease: [0.2, 0, 0, 1] } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
}

export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.22, ease: [0.2, 0, 0, 1] } },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.16 } },
}

export const tableRowVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.18 },
  }),
}

export const sidebarVariants: Variants = {
  expanded: { width: 240, transition: { duration: 0.25, ease: [0.2, 0, 0, 1] } },
  collapsed: { width: 56, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
}
