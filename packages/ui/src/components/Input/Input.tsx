'use client'

import React from 'react'
import { cn } from '../../lib/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  errorText?: string
  showPasswordStrength?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, helperText, errorText, showPasswordStrength, ...props }, ref) => {
    const hasError = !!errorText

    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-[--text-secondary] mb-1.5">{label}</label>}
        <input
          type={type}
          className={cn(
            'flex h-8 w-full rounded-[--radius-md] border border-[--border-default] bg-white px-2.5 py-1.5 text-sm placeholder:text-[--text-tertiary] transition-all duration-120 focus-visible:outline-none',
            hasError
              ? 'border-[--danger] ring-3 ring-[--danger-bg]'
              : 'focus-visible:border-[--accent] focus-visible:ring-3 focus-visible:ring-[--accent-light]',
            className,
          )}
          ref={ref}
          {...props}
        />
        {showPasswordStrength && type === 'password' && (
          <p className="text-xs text-[--text-tertiary] mt-1">Use uppercase, lowercase, numbers, and symbols</p>
        )}
        {errorText && <p className="text-xs text-[--danger] mt-1">{errorText}</p>}
        {helperText && !errorText && <p className="text-xs text-[--text-tertiary] mt-1">{helperText}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'

export { Input }
