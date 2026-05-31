'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1] as const

interface FadeInProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'whileInView' | 'transition' | 'viewport'> {
  delay?: number
  duration?: number
  y?: number
}

export function FadeIn({ delay = 0, duration = 0.7, y = 18, children, ...props }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-72px' }}
      transition={{ duration, delay, ease: EASE }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface FadeInGroupProps {
  children: React.ReactNode
  stagger?: number
  className?: string
}

const groupVariants = {
  hidden: {},
  visible: (stagger: number) => ({
    transition: { staggerChildren: stagger },
  }),
}

const childVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE },
  },
}

export function FadeInGroup({ children, stagger = 0.1, className }: FadeInGroupProps) {
  return (
    <motion.div
      className={className}
      variants={groupVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-72px' }}
      custom={stagger}
    >
      {children}
    </motion.div>
  )
}

export function FadeInItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={childVariants}>
      {children}
    </motion.div>
  )
}
