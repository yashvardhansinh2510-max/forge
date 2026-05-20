'use client'

import * as React from 'react'
import type { Finish, POSProduct } from '@/lib/mock/pos-data'

interface ProductVisualProps {
  product: Pick<POSProduct, 'category' | 'subCategory' | 'brand' | 'name' | 'imageUrl'>
  finish?: Pick<Finish, 'name' | 'color'> | null
  size?: number
  muted?: boolean
}

function finishTone(product: ProductVisualProps['product'], finish?: ProductVisualProps['finish']) {
  if (finish?.color) return finish.color
  if (product.brand === 'Vitra') return '#f7f5f0'
  if (product.brand === 'Geberit') return '#c7ccd4'
  return '#c9d1d9'
}

function strokeFor(fill: string) {
  const light = ['#fff', '#ffffff', '#f8', '#f7', '#f2']
  return light.some((token) => fill.toLowerCase().startsWith(token)) ? '#c9c7bf' : 'rgba(17,24,39,0.38)'
}

export function ProductVisual({ product, finish, size = 64, muted = false }: ProductVisualProps) {
  if (product.imageUrl) {
    return (
      <img
        src={product.imageUrl}
        alt={`${product.name}${finish?.name ? ` in ${finish.name}` : ''}`}
        width={size}
        height={size}
        style={{
          display: 'block',
          width: size,
          height: size,
          objectFit: 'contain',
          borderRadius: Math.max(6, Math.round(size * 0.14)),
          opacity: muted ? 0.58 : 1,
        }}
      />
    )
  }

  const category = `${product.category} ${product.subCategory}`.toLowerCase()
  const fill = finishTone(product, finish)
  const stroke = strokeFor(fill)
  const accent = product.brand === 'Vitra' ? '#d71920' : product.brand === 'Grohe' ? '#0077b6' : product.brand === 'Hansgrohe' ? '#c41e3a' : '#334155'
  const opacity = muted ? 0.58 : 1

  let shape: React.ReactNode
  if (category.includes('wc') || category.includes('bidet')) {
    shape = (
      <>
        <path d="M25 20h30c4 0 7 3 7 7v6c0 12-10 22-22 22H26c-7 0-12-5-12-12V31c0-6 5-11 11-11Z" fill={fill} stroke={stroke} strokeWidth="2" />
        <path d="M24 27h31v7c0 8-7 14-15 14H28c-5 0-9-4-9-9v-6c0-3 2-6 5-6Z" fill="rgba(255,255,255,0.5)" />
        <path d="M21 54h29l-4 8H25l-4-8Z" fill={fill} stroke={stroke} strokeWidth="2" />
        <rect x="18" y="12" width="36" height="11" rx="4" fill={fill} stroke={stroke} strokeWidth="2" />
      </>
    )
  } else if (category.includes('basin') || category.includes('vanity')) {
    shape = (
      <>
        <ellipse cx="40" cy="35" rx="28" ry="17" fill={fill} stroke={stroke} strokeWidth="2" />
        <ellipse cx="40" cy="32" rx="19" ry="9" fill="rgba(255,255,255,0.68)" stroke="rgba(15,23,42,0.12)" />
        <circle cx="40" cy="33" r="2" fill="rgba(15,23,42,0.25)" />
        <path d="M20 43h40l-6 13H26l-6-13Z" fill={fill} stroke={stroke} strokeWidth="2" />
      </>
    )
  } else if (category.includes('bath')) {
    shape = (
      <>
        <path d="M14 39c0-7 6-13 13-13h39v15c0 9-7 16-16 16H28c-8 0-14-6-14-14v-4Z" fill={fill} stroke={stroke} strokeWidth="2" />
        <path d="M21 35h40" stroke="rgba(255,255,255,0.65)" strokeWidth="3" strokeLinecap="round" />
        <path d="M26 57l-3 6M55 57l3 6" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      </>
    )
  } else if (category.includes('shower')) {
    shape = (
      <>
        <path d="M23 18h23c7 0 13 6 13 13v2H23V18Z" fill={fill} stroke={stroke} strokeWidth="2" />
        <path d="M45 18V9h14" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        <path d="M27 41v7M36 41v9M45 41v7M54 41v9" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.58" />
      </>
    )
  } else if (category.includes('mixer') || category.includes('thermostat') || category.includes('tap')) {
    shape = (
      <>
        <rect x="29" y="30" width="22" height="25" rx="5" fill={fill} stroke={stroke} strokeWidth="2" />
        <path d="M40 30V18c0-5 4-9 9-9h9" stroke={stroke} strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M50 9v13" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
        <rect x="25" y="55" width="30" height="6" rx="3" fill={fill} stroke={stroke} />
      </>
    )
  } else {
    shape = (
      <>
        <rect x="18" y="24" width="44" height="28" rx="7" fill={fill} stroke={stroke} strokeWidth="2" />
        <path d="M24 34h32M24 43h24" stroke="rgba(255,255,255,0.55)" strokeWidth="3" strokeLinecap="round" />
      </>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      role="img"
      aria-label={`${product.name}${finish?.name ? ` in ${finish.name}` : ''}`}
      style={{ display: 'block', opacity }}
    >
      <rect x="4" y="4" width="72" height="72" rx="14" fill="#f8fafc" />
      <circle cx="62" cy="17" r="6" fill={accent} opacity="0.14" />
      {shape}
      <path d="M12 66h56" stroke="rgba(15,23,42,0.08)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
