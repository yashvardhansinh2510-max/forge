'use client'

// ─── EditableCell — generic click-to-edit cell ────────────────────────────────
//
// Behaviour:
//  1. Renders value in display mode by default
//  2. onClick → switches to edit mode (input / number input / select)
//  3. onBlur or Enter → calls onSave(newValue) optimistically
//  4. If onSave throws → reverts to prior value + shows a Sonner toast
//  5. Escape → cancels edit, reverts without calling onSave
//
// Never shows a Save button — auto-saves on every commit.

import * as React from 'react'
import { toast } from 'sonner'

// ─── Shared base ──────────────────────────────────────────────────────────────

interface CellBase {
  disabled?: boolean
  /** Extra wrapper styles */
  style?: React.CSSProperties
}

// ─── Variant types ────────────────────────────────────────────────────────────

interface TextCellProps extends CellBase {
  type: 'text'
  value: string
  onSave: (v: string) => Promise<void> | void
  placeholder?: string
  /** Render the display value differently from the raw string */
  renderDisplay?: (v: string) => React.ReactNode
  displayStyle?: React.CSSProperties
  inputStyle?: React.CSSProperties
}

interface NumberCellProps extends CellBase {
  type: 'number'
  value: number
  onSave: (v: number) => Promise<void> | void
  min?: number
  max?: number
  displayStyle?: React.CSSProperties
  inputStyle?: React.CSSProperties
}

interface SelectOption {
  value: string
  label: string
  color?: string   // optional dot color for badges
}

interface SelectCellProps extends CellBase {
  type: 'select'
  value: string
  onSave: (v: string) => Promise<void> | void
  options: ReadonlyArray<SelectOption>
  renderDisplay?: (v: string) => React.ReactNode
  displayStyle?: React.CSSProperties
}

export type EditableCellProps = TextCellProps | NumberCellProps | SelectCellProps

// ─── Component ────────────────────────────────────────────────────────────────

export function EditableCell(props: EditableCellProps) {
  const [editing, setEditing]         = React.useState(false)
  const [localValue, setLocalValue]   = React.useState<string>(String(props.value))
  const [saving, setSaving]           = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement & HTMLSelectElement>(null)

  // Sync when external value changes (e.g. store revert)
  React.useEffect(() => {
    if (!editing) setLocalValue(String(props.value))
  }, [props.value, editing])

  function startEdit() {
    if (props.disabled || saving) return
    setLocalValue(String(props.value))
    setEditing(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  async function commit(raw: string) {
    setEditing(false)
    const trimmed = raw.trim()

    if (props.type === 'text' && trimmed === String(props.value)) return
    if (props.type === 'number' && Number(trimmed) === props.value) return
    if (props.type === 'select' && trimmed === props.value) return

    const prior = String(props.value)
    setLocalValue(trimmed)
    setSaving(true)

    try {
      if (props.type === 'number') {
        await props.onSave(Number(trimmed))
      } else {
        // text and select both pass string
        await (props as TextCellProps | SelectCellProps).onSave(trimmed)
      }
    } catch {
      setLocalValue(prior)
      toast.error('Failed to save — change reverted')
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter')  { e.preventDefault(); commit(localValue) }
    if (e.key === 'Escape') { setEditing(false); setLocalValue(String(props.value)) }
  }

  // ── Shared display wrapper ─────────────────────────────────────────────────

  const wrapperStyle: React.CSSProperties = {
    cursor: props.disabled ? 'default' : 'text',
    opacity: saving ? 0.5 : 1,
    transition: 'opacity 0.1s',
    minHeight: 20,
    display: 'inline-flex',
    alignItems: 'center',
    ...props.style,
  }

  const hoverStyle: React.CSSProperties = props.disabled
    ? {}
    : {
        outline: editing ? '1.5px solid var(--text-primary)' : '1px dashed transparent',
        borderRadius: 4,
        padding: '1px 4px',
      }

  // ── Select ─────────────────────────────────────────────────────────────────

  if (props.type === 'select') {
    const displayNode = props.renderDisplay
      ? props.renderDisplay(props.value)
      : <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, ...props.displayStyle }}>{
          props.options.find((o) => o.value === props.value)?.label ?? props.value
        }</span>

    if (editing) {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={localValue}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => commit(localValue)}
          onKeyDown={handleKeyDown}
          style={{
            fontFamily: 'var(--font-ui)', fontSize: 11,
            border: '1.5px solid var(--text-primary)', borderRadius: 4,
            background: 'var(--background)', color: 'var(--text-primary)',
            padding: '2px 4px', outline: 'none', cursor: 'pointer',
            ...props.displayStyle,
          }}
        >
          {props.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )
    }

    return (
      <div
        onClick={startEdit}
        style={{ ...wrapperStyle, ...hoverStyle, cursor: props.disabled ? 'default' : 'pointer' }}
        title={props.disabled ? undefined : 'Click to edit'}
      >
        {displayNode}
      </div>
    )
  }

  // ── Text ───────────────────────────────────────────────────────────────────

  if (props.type === 'text') {
    const displayNode = props.renderDisplay
      ? props.renderDisplay(props.value)
      : <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, ...props.displayStyle }}>{props.value || props.placeholder}</span>

    if (editing) {
      return (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => commit(localValue)}
          onKeyDown={handleKeyDown}
          placeholder={props.placeholder}
          style={{
            fontFamily: 'var(--font-ui)', fontSize: 11,
            border: '1.5px solid var(--text-primary)', borderRadius: 4,
            background: 'var(--background)', color: 'var(--text-primary)',
            padding: '2px 6px', outline: 'none', width: '100%',
            ...(props as TextCellProps).inputStyle,
          }}
        />
      )
    }

    return (
      <div
        onClick={startEdit}
        style={{ ...wrapperStyle, ...hoverStyle }}
        title={props.disabled ? undefined : 'Click to edit'}
      >
        {displayNode}
      </div>
    )
  }

  // ── Number ─────────────────────────────────────────────────────────────────

  const numProps = props as NumberCellProps

  if (editing) {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="number"
        value={localValue}
        min={numProps.min}
        max={numProps.max}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => commit(localValue)}
        onKeyDown={handleKeyDown}
        style={{
          fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
          fontSize: 12, fontWeight: 700,
          border: '1.5px solid var(--text-primary)', borderRadius: 4,
          background: 'var(--background)', color: 'var(--text-primary)',
          padding: '2px 4px', outline: 'none', width: 52, textAlign: 'center',
          ...numProps.inputStyle,
        }}
      />
    )
  }

  return (
    <div
      onClick={startEdit}
      style={{ ...wrapperStyle, ...hoverStyle, justifyContent: 'center' }}
      title={props.disabled ? undefined : 'Click to edit'}
    >
      <span style={{
        fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
        fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
        ...numProps.displayStyle,
      }}>
        {numProps.value}
      </span>
    </div>
  )
}
