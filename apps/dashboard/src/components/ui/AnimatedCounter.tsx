'use client'
import { useEffect, useRef } from 'react'
import { useSpring, useMotionValue, useTransform, motion } from 'framer-motion'

interface AnimatedCounterProps {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  style?: React.CSSProperties
}

export default function AnimatedCounter({ value, decimals = 0, prefix = '', suffix = '', style }: AnimatedCounterProps) {
  const motionVal = useMotionValue(0)
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20 })
  const display = useTransform(spring, (v) => `${prefix}${v.toFixed(decimals)}${suffix}`)
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      motionVal.set(0)
    }
    motionVal.set(value)
  }, [value, motionVal])

  return (
    <motion.span style={{ fontFamily: 'var(--font-display)', ...style }}>
      {display}
    </motion.span>
  )
}
