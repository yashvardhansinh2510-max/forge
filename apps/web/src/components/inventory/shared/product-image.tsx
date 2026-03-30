import Image from 'next/image'

// Unsplash photo ID map by subcategory keyword
const PHOTO_MAP: Record<string, string> = {
  'basin-mixer':     'photo-1584622650111-993a426fbf0a',
  'kitchen-mixer':   'photo-1585771724684-38269d6639fd',
  'shower-mixer':    'photo-1552321554-5fefe8c9ef14',
  'overhead-shower': 'photo-1620626011761-996317702782',
  'bath-filler':     'photo-1534353436294-0dbd4bdac845',
  'wc-toilet':       'photo-1564540586988-aa4e53c3d799',
  'wash-basin':      'photo-1552321554-5fefe8c9ef14',
  'bathtub':         'photo-1534353436294-0dbd4bdac845',
  'smart-toilet':    'photo-1564540586988-aa4e53c3d799',
  'floor-tile':      'photo-1615971677499-5467cbab01c0',
  'wall-tile':       'photo-1562184552-997c461abbe6',
  'large-format':    'photo-1615971677499-5467cbab01c0',
  'mosaic':          'photo-1562184552-997c461abbe6',
  'outdoor':         'photo-1558618666-fcd25c85cd64',
  'slab':            'photo-1615971677499-5467cbab01c0',
  'adhesive':        'photo-1504917595217-d4dc5ebe6122',
  'grout':           'photo-1504917595217-d4dc5ebe6122',
  'concealed':       'photo-1584622650111-993a426fbf0a',
  'vanity-unit':     'photo-1552321554-5fefe8c9ef14',
  'shower-system':   'photo-1620626011761-996317702782',
  'mirror':          'photo-1552321554-5fefe8c9ef14',
  'shower-panel':    'photo-1620626011761-996317702782',
  'faucet':          'photo-1584622650111-993a426fbf0a',
  'tap':             'photo-1584622650111-993a426fbf0a',
}

export function getProductImageUrl(subCategory: string, width = 400): string {
  const key = subCategory.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '')
  // Try full key, then first word
  const photoId = PHOTO_MAP[key] ?? PHOTO_MAP[key.split('-')[0] ?? ''] ?? PHOTO_MAP['floor-tile']!
  return `https://images.unsplash.com/${photoId}?w=${width}&h=${width}&fit=crop&q=75`
}

type ProductImageSize = 'xs' | 'sm' | 'md' | 'lg'

const SIZE_STYLES: Record<ProductImageSize, { width: number; height: number; borderRadius: number }> = {
  xs: { width: 36,  height: 36,  borderRadius: 5 },
  sm: { width: 48,  height: 48,  borderRadius: 6 },
  md: { width: 120, height: 120, borderRadius: 8 },
  lg: { width: 400, height: 240, borderRadius: 8 },
}

interface ProductImageProps {
  subCategory: string
  name: string
  size?: ProductImageSize
  fullWidth?: boolean
}

export function ProductImage({ subCategory, name, size = 'sm', fullWidth = false }: ProductImageProps) {
  const { width, height, borderRadius } = SIZE_STYLES[size]
  const src = getProductImageUrl(subCategory, Math.max(width, 400))

  return (
    <div
      style={{
        position: 'relative',
        width: fullWidth ? '100%' : width,
        height: fullWidth ? height : height,
        borderRadius,
        overflow: 'hidden',
        background: 'var(--n-100)',
        flexShrink: 0,
      }}
    >
      <Image
        src={src}
        alt={name}
        fill
        className="object-cover"
        sizes={`${width}px`}
        unoptimized
      />
    </div>
  )
}
