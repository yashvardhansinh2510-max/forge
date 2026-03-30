'use client'

// ─── BrandLogo ────────────────────────────────────────────────────────────────
//
// Renders ONLY a logo image — no brand name text anywhere in this module.
//
// Fallback chain (per PRD):
//   1. Local SVG  /brands/{brand}.svg
//   2. Clearbit   https://logo.clearbit.com/{domain}
//   3. Styled div with brand color + initial letter
//
// Sizes: xs=20  sm=24  md=40  lg=64  (px, square)

import * as React from 'react'
import { BRAND_COLORS, BRAND_DOMAINS } from '@/lib/mock/procurement-data'

// ─── Types ────────────────────────────────────────────────────────────────────

type LogoSize = 'xs' | 'sm' | 'md' | 'lg'

const SIZE_PX: Record<LogoSize, number> = { xs: 20, sm: 24, md: 40, lg: 64 }

interface BrandLogoProps {
  brand: string
  size?: LogoSize
  /** Override px size directly */
  sizePx?: number
  /** When true, shows a brand-color ring around the logo */
  active?: boolean
  /** Extra styles on the outer container */
  style?: React.CSSProperties
  onClick?: () => void
  title?: string
}

// ─── Fallback placeholder ─────────────────────────────────────────────────────

function BrandPlaceholder({
  brand, px, active, style, onClick,
}: {
  brand: string; px: number; active?: boolean; style?: React.CSSProperties; onClick?: () => void
}) {
  const color   = BRAND_COLORS[brand.toUpperCase()] ?? '#6B7280'
  const initial = (brand[0] ?? '?').toUpperCase()

  return (
    <div
      onClick={onClick}
      title={brand}
      style={{
        width: px, height: px, borderRadius: px * 0.18,
        background: `${color}18`,
        border: active ? `2px solid ${color}` : `1.5px solid ${color}35`,
        boxShadow: active ? `0 0 0 2px ${color}30` : undefined,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, cursor: onClick ? 'pointer' : 'default',
        transition: 'border 0.15s, box-shadow 0.15s',
        ...style,
      }}
    >
      <span style={{
        fontFamily: 'var(--font-ui)',
        fontSize: px * 0.42, fontWeight: 900,
        color, lineHeight: 1,
      }}>
        {initial}
      </span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BrandLogo({
  brand, size = 'md', sizePx, active, style, onClick, title,
}: BrandLogoProps) {
  const px          = sizePx ?? SIZE_PX[size]
  const brandKey    = brand.toUpperCase()
  const localSrc    = `/brands/${brand.toLowerCase()}.svg`
  const clearbitSrc = `https://logo.clearbit.com/${BRAND_DOMAINS[brandKey] ?? ''}`
  const brandColor  = BRAND_COLORS[brandKey] ?? '#6B7280'

  // 0 = try local, 1 = try clearbit, 2 = show placeholder
  const [stage, setStage] = React.useState(0)

  const src = stage === 0 ? localSrc : stage === 1 ? clearbitSrc : null

  const containerStyle: React.CSSProperties = {
    width: px, height: px,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, cursor: onClick ? 'pointer' : 'default',
    borderRadius: px * 0.18,
    boxShadow: active ? `0 0 0 2px ${brandColor}, 0 0 0 4px ${brandColor}30` : undefined,
    transition: 'box-shadow 0.15s',
    ...style,
  }

  if (stage === 2 || !src) {
    return <BrandPlaceholder brand={brand} px={px} active={active} style={style} onClick={onClick} />
  }

  return (
    <div style={containerStyle} onClick={onClick} title={title ?? brand}>
      <img
        src={src}
        alt={brand}
        onError={() => setStage((s) => s + 1)}
        style={{
          width: '100%', height: '100%',
          objectFit: 'contain', display: 'block',
          borderRadius: px * 0.18,
        }}
        draggable={false}
      />
    </div>
  )
}
