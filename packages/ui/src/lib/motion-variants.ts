import type { Variants } from 'framer-motion'

// Re-export existing variants
export {
  pageVariants,
  slideOverVariants,
  modalVariants,
  tableRowVariants,
  sidebarVariants,
} from './variants'

export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

export const popoverVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: -4 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.15, ease: [0.2, 0, 0, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: -2,
    transition: { duration: 0.1 },
  },
}

export const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.04 } },
}

export const fadeUpItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.2, 0, 0, 1] } },
}
