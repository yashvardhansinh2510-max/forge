'use client'

import * as React from 'react'
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { ClerkAuthBridge } from './clerk-auth-bridge'

export function ClerkRootProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <header className="flex h-16 items-center justify-end gap-4 border-b p-4">
        <Show when="signed-out">
          <SignInButton />
          <SignUpButton>
            <button className="h-10 cursor-pointer rounded-full bg-purple-700 px-5 text-sm font-medium text-white">
              Sign Up
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </header>
      <ClerkAuthBridge>{children}</ClerkAuthBridge>
    </ClerkProvider>
  )
}
