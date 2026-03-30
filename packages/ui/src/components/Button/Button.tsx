'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const buttonVariants = cva(
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[--accent] whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'inline-flex items-center justify-center gap-[6px] h-[34px] px-[14px] min-w-[80px] text-[13px] font-[560] tracking-[-0.01em] text-white bg-[#0071E3] rounded-[8px] shadow-[0_0_0_0.5px_rgba(0,71,183,0.5),inset_0_1px_0_rgba(255,255,255,0.16),0_1px_2px_rgba(0,71,183,0.3)] transition-all duration-[80ms] hover:bg-[#0077ED] hover:shadow-[0_0_0_0.5px_rgba(0,71,183,0.55),inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(0,71,183,0.25)] active:scale-[0.97] active:bg-[#006ADB] active:shadow-[0_0_0_0.5px_rgba(0,71,183,0.4),inset_0_1px_0_rgba(0,0,0,0.06)] active:duration-[60ms] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        secondary: 'inline-flex items-center justify-center gap-[6px] h-[34px] px-[14px] text-[13px] font-[500] tracking-[-0.01em] text-[#1C1C1E] bg-white rounded-[8px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(0,0,0,0.06)] transition-all duration-[80ms] hover:shadow-[0_0_0_0.5px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,1),0_2px_4px_rgba(0,0,0,0.08)] active:scale-[0.97] active:bg-[#F7F7F7] active:shadow-[0_0_0_0.5px_rgba(0,0,0,0.10)] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        ghost: 'inline-flex items-center justify-center gap-[5px] h-[30px] px-[8px] text-[13px] font-[450] tracking-[-0.006em] text-[#8E8E93] rounded-[7px] transition-all duration-[80ms] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1C1C1E] active:bg-[rgba(0,0,0,0.07)] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed',
        destructive: 'inline-flex items-center justify-center gap-[6px] h-[34px] px-[14px] text-[13px] font-[500] text-white bg-[#CF222E] rounded-[8px] shadow-[0_0_0_0.5px_rgba(180,24,36,0.5),inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(180,24,36,0.25)] transition-all duration-[80ms] hover:bg-[#B91C2C] active:scale-[0.97] active:duration-[60ms] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        danger: 'bg-[--danger-bg] text-[--danger] rounded-[8px] shadow-[0_0_0_0.5px_rgba(190,18,60,0.15)]',
        link: 'text-[--accent] underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-[34px] px-[14px] text-[13px] tracking-[-0.01em] font-[560]',
        md: 'h-[36px] px-[16px] text-[13px] tracking-[-0.01em] font-[500]',
        lg: 'h-[40px] px-[18px] text-[14px] tracking-[-0.006em] font-[500]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, disabled, children, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={isLoading || disabled}
      ref={ref}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  ),
)

Button.displayName = 'Button'

export { Button, buttonVariants }
