'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { LucideIcon } from 'lucide-react'
import { Search, SearchX, Clock, Compass, Plus, Zap } from 'lucide-react'
import {
  usePaletteStore,
  useKeyboardShortcut,
  useRecentPages,
  overlayVariants,
  modalVariants,
} from '@forge/ui'
import { COMMANDS, CATEGORY_COLORS, type Command, type CommandGroup } from '@/lib/commands'

const GROUP_META: Record<CommandGroup, { label: string; icon: LucideIcon }> = {
  jump: { label: 'Jump To', icon: Compass },
  create: { label: 'Create', icon: Plus },
  action: { label: 'Actions', icon: Zap },
}

const CATEGORY_LABELS: Record<string, string> = {
  crm: 'CRM',
  sales: 'Sales',
  inventory: 'Inventory',
  manufacturing: 'Mfg',
  finance: 'Finance',
  settings: 'Settings',
}

function filterCommands(commands: Command[], query: string): Command[] {
  const q = query.toLowerCase()
  return commands.filter(
    (c) =>
      c.label.toLowerCase().includes(q) ||
      (c.description?.toLowerCase().includes(q) ?? false),
  )
}

export function CommandPalette() {
  const { isOpen, query, close, toggle, setQuery } = usePaletteStore()
  const router = useRouter()
  const { pages: recentPages, addRecentPage } = useRecentPages()
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)
  const listRef = React.useRef<HTMLDivElement>(null)

  useKeyboardShortcut('k', ['meta'], toggle)

  const filtered = query ? filterCommands(COMMANDS, query) : null
  const hasQuery = query.length > 0

  // Build flat list of visible items for keyboard navigation
  // Must mirror the exact render order: recent pages (if no query) + all groups
  const flatItems = React.useMemo(() => {
    if (filtered) return filtered

    const items: Command[] = []
    // Recent pages come first in the render
    for (const page of recentPages) {
      const cmd = COMMANDS.find((c) => c.href === page.href)
      if (cmd) items.push(cmd)
    }
    // Then all command groups
    const groups: CommandGroup[] = ['jump', 'create', 'action']
    for (const g of groups) {
      items.push(...COMMANDS.filter((c) => c.group === g))
    }
    return items
  }, [filtered, recentPages])

  React.useEffect(() => {
    setHighlightedIndex(0)
  }, [query])

  const executeCommand = React.useCallback(
    (command: Command) => {
      if (command.href) {
        router.push(command.href as never)
        addRecentPage({ label: command.label, href: command.href, icon: command.category })
      }
      close()
    },
    [router, close, addRecentPage],
  )

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((prev) => (prev + 1) % flatItems.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = flatItems[highlightedIndex]
        if (item) executeCommand(item)
      }
    },
    [flatItems, highlightedIndex, executeCommand],
  )

  // Scroll highlighted item into view
  React.useEffect(() => {
    const el = listRef.current?.querySelector(`[data-command-item="${highlightedIndex}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex])

  const renderCommandItem = (command: Command, globalIndex: number) => {
    const colors = CATEGORY_COLORS[command.category]
    const isHighlighted = globalIndex === highlightedIndex

    return (
      <div
        key={command.id}
        data-command-item={globalIndex}
        role="option"
        aria-selected={isHighlighted}
        className="mx-1.5 flex h-11 cursor-pointer items-center gap-2.5 rounded-md px-2.5"
        style={{
          backgroundColor: isHighlighted ? 'rgba(0,113,227,0.08)' : 'transparent',
        }}
        onClick={() => executeCommand(command)}
        onMouseEnter={() => setHighlightedIndex(globalIndex)}
      >
        <div
          className="flex shrink-0 items-center justify-center rounded-[7px]"
          style={{
            width: '28px',
            height: '28px',
            backgroundColor: colors.bg,
          }}
        >
          <command.icon size={13} style={{ color: colors.color }} />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <span
            style={{
              fontSize: '14px',
              fontWeight: 500,
              letterSpacing: '-0.006em',
              color: 'var(--text-primary)',
            }}
          >
            {command.label}
          </span>
          {command.description && (
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              · {command.description}
            </span>
          )}
        </div>
        <span
          className="shrink-0 rounded border px-1.5"
          style={{
            fontSize: '12px',
            backgroundColor: 'var(--surface-ground)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-tertiary)',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {CATEGORY_LABELS[command.category] ?? command.category}
        </span>
        {isHighlighted && (
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', background: 'var(--surface-ground)', border: '1px solid var(--border-default)', borderRadius: 4, padding: '1px 5px', marginLeft: 4, flexShrink: 0 }}>↵</span>
        )}
      </div>
    )
  }

  let globalIndex = -1

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && close()}>
      <AnimatePresence>
        {isOpen && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                variants={overlayVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="fixed inset-0 z-50"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content
              asChild
              onKeyDown={handleKeyDown}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <motion.div
                variants={modalVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="fixed z-50 overflow-hidden rounded-[16px] shadow-2xl"
                style={{
                  left: '50%',
                  top: '20vh',
                  transform: 'translateX(-50%)',
                  width: '560px',
                  maxWidth: 'calc(100vw - 32px)',
                  backgroundColor: 'white',
                  boxShadow: '0 0 0 0.5px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.06), 0 24px 48px rgba(0,0,0,0.10), 0 48px 96px rgba(0,0,0,0.08)',
                }}
              >
                {/* Search row */}
                <div
                  className="flex h-[56px] items-center gap-2.5 border-b px-4"
                  style={{ borderColor: 'var(--border-default)' }}
                >
                  <Search
                    size={16}
                    className="shrink-0"
                    style={{ color: 'var(--text-tertiary)' }}
                  />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search Forge…"
                    autoFocus
                    className="h-full flex-1 border-none bg-transparent outline-none"
                    style={{
                      fontSize: '17px',
                      letterSpacing: '-0.022em',
                      color: 'var(--text-primary)',
                    }}
                  />
                  {!hasQuery && (
                    <kbd
                      className="flex items-center rounded border px-1.5 py-0.5"
                      style={{
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        borderColor: 'var(--border-default)',
                        backgroundColor: 'var(--surface-ground)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      esc
                    </kbd>
                  )}
                </div>

                {/* Results */}
                <div
                  ref={listRef}
                  role="listbox"
                  className="overflow-y-auto"
                  style={{ maxHeight: '380px' }}
                >
                  {hasQuery && filtered ? (
                    filtered.length > 0 ? (
                      <div className="py-1.5">
                        {filtered.map((cmd) => {
                          globalIndex++
                          return renderCommandItem(cmd, globalIndex)
                        })}
                      </div>
                    ) : (
                      <div className="py-10 text-center">
                        <SearchX
                          size={28}
                          className="mx-auto mb-2.5"
                          style={{ color: 'var(--text-tertiary)' }}
                        />
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                          No results for &ldquo;{query}&rdquo;
                        </div>
                        <div
                          className="mt-1"
                          style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}
                        >
                          Try: contacts, invoices, orders
                        </div>
                      </div>
                    )
                  ) : (
                    <>
                      {/* Recent pages */}
                      {recentPages.length > 0 && (
                        <div>
                          <div
                            className="flex items-center gap-1.5 px-3.5 py-2"
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--text-tertiary)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                            }}
                          >
                            <Clock size={12} />
                            Recent
                          </div>
                          {recentPages.map((page) => {
                            const cmd = COMMANDS.find((c) => c.href === page.href)
                            if (!cmd) return null
                            globalIndex++
                            return renderCommandItem(cmd, globalIndex)
                          })}
                        </div>
                      )}
                      {/* All groups */}
                      {(['jump', 'create', 'action'] as CommandGroup[]).map((group) => {
                        const meta = GROUP_META[group]
                        const GroupIcon = meta.icon
                        const cmds = COMMANDS.filter((c) => c.group === group)
                        return (
                          <div key={group}>
                            <div
                              className="flex items-center gap-1.5 px-3.5 py-2"
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: 'var(--text-tertiary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                              }}
                            >
                              <GroupIcon size={12} />
                              {meta.label}
                            </div>
                            {cmds.map((cmd) => {
                              globalIndex++
                              return renderCommandItem(cmd, globalIndex)
                            })}
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div
                  className="flex h-9 items-center justify-between border-t px-3.5"
                  style={{
                    borderColor: 'rgba(0,0,0,0.06)',
                    backgroundColor: 'var(--surface-ground)',
                  }}
                >
                  <div
                    className="flex items-center gap-3"
                    style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}
                  >
                    <span>
                      <kbd className="font-mono">↑↓</kbd> navigate
                    </span>
                    <span>
                      <kbd className="font-mono">↵</kbd> open
                    </span>
                    <span>
                      <kbd className="font-mono">esc</kbd> close
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    Forge
                  </span>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}
