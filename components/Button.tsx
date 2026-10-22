import Link from 'next/link'
import type { ComponentProps } from 'react'

const SIZES = {
  xs: 'px-3.5 py-[7px] text-[13px] rounded-[9px]',
  sm: 'px-4 py-[9px] text-sm rounded-md',
} as const

const VARIANTS = {
  primary: 'border-transparent bg-magenta text-white hover:bg-magenta-dark hover:text-white',
  outline: 'bg-white text-ink border-border hover:text-magenta hover:border-magenta',
} as const

type Props = {
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
  className?: string
}

const base =
  'inline-flex items-center justify-center gap-2 border font-bold tracking-[-0.01em] leading-none cursor-pointer whitespace-nowrap transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

export function Button({
  variant = 'primary',
  size = 'sm',
  className = '',
  ...rest
}: Props & ComponentProps<'button'>) {
  return <button className={`${base} ${SIZES[size]} ${VARIANTS[variant]} ${className}`} {...rest} />
}

export function ButtonLink({
  variant = 'primary',
  size = 'sm',
  className = '',
  ...rest
}: Props & ComponentProps<typeof Link>) {
  return <Link className={`${base} ${SIZES[size]} ${VARIANTS[variant]} ${className}`} {...rest} />
}
