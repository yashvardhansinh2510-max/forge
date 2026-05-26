export const FILTER_TAGS = {
  THREE_HOLE:   'THREE_HOLE',
  BM:           'BM',
  CERAMIC:      'CERAMIC',
  HAND_SHOWER:  'HAND_SHOWER',
  HF_AV:        'HF_AV',
  HOLDER:       'HOLDER',
  KITCHEN:      'KITCHEN',
  RAIL:         'RAIL',
  SHOWERS:      'SHOWERS',
  HANSGROHE:    'HANSGROHE',
  SINGLE_LEVER: 'SINGLE_LEVER',
  SPOUT:        'SPOUT',
  TBM:          'TBM',
  THERMOSTAT:   'THERMOSTAT',
  WBM:          'WBM',
} as const

export type FilterTag = typeof FILTER_TAGS[keyof typeof FILTER_TAGS]

export const FILTER_TAG_LABELS: Record<FilterTag, string> = {
  THREE_HOLE:   'THREE HOLE',
  BM:           'BM',
  CERAMIC:      'CERAMIC',
  HAND_SHOWER:  'HAND SHOWER',
  HF_AV:        'HF AV',
  HOLDER:       'HOLDER',
  KITCHEN:      'KITCHEN',
  RAIL:         'RAIL',
  SHOWERS:      'SHOWERS',
  HANSGROHE:    'HANSGROHE',
  SINGLE_LEVER: 'SINGLE LEVER',
  SPOUT:        'SPOUT',
  TBM:          'TBM',
  THERMOSTAT:   'THERMOSTAT',
  WBM:          'WBM',
}

export const HANSGROHE_CATEGORIES = {
  THREE_HOLE:   { label: 'THREE HOLE',   tag: 'THREE_HOLE'   as FilterTag },
  BM:           { label: 'BM',           tag: 'BM'           as FilterTag },
  CERAMIC:      { label: 'CERAMIC',      tag: 'CERAMIC'      as FilterTag },
  HAND_SHOWER:  { label: 'HAND SHOWER',  tag: 'HAND_SHOWER'  as FilterTag },
  HF_AV:        { label: 'HF AV',        tag: 'HF_AV'        as FilterTag },
  HOLDER:       { label: 'HOLDER',       tag: 'HOLDER'       as FilterTag },
  KITCHEN:      { label: 'KITCHEN',      tag: 'KITCHEN'      as FilterTag },
  RAIL:         { label: 'RAIL',         tag: 'RAIL'         as FilterTag },
  SHOWERS:      { label: 'SHOWERS',      tag: 'SHOWERS'      as FilterTag },
  HANSGROHE:    { label: 'HANSGROHE',    tag: 'HANSGROHE'    as FilterTag },
  SINGLE_LEVER: { label: 'SINGLE LEVER', tag: 'SINGLE_LEVER' as FilterTag },
  SPOUT:        { label: 'SPOUT',        tag: 'SPOUT'        as FilterTag },
  TBM:          { label: 'TBM',          tag: 'TBM'          as FilterTag },
  THERMOSTAT:   { label: 'THERMOSTAT',   tag: 'THERMOSTAT'   as FilterTag },
  WBM:          { label: 'WBM',          tag: 'WBM'          as FilterTag },
} as const

export const BRAND_FILTER_COLORS: Record<string, string> = {
  HANSGROHE: '#E30613',
  AXOR:      '#374151',
}

export const BRAND_FILTER_BRANDS = ['HANSGROHE', 'AXOR'] as const
export type BrandFilterBrand = typeof BRAND_FILTER_BRANDS[number]

/** Derive filter tags from a product name (used in seed generation and tests). */
export function deriveFilterTags(name: string, brand: string): FilterTag[] {
  const n = name.toLowerCase()
  const tags: FilterTag[] = []

  if (n.includes('3-hole') || n.includes('3-h.') || n.includes('3hole') || n.includes('three hole') || n.includes('3 hole'))
    tags.push(FILTER_TAGS.THREE_HOLE)

  if (n.includes('thermostat') || n.includes('thermostatic') || n.includes('thermo mod'))
    tags.push(FILTER_TAGS.THERMOSTAT)

  if (n.includes('kitchen') || n.includes('sink mix'))
    tags.push(FILTER_TAGS.KITCHEN)

  if (n.includes('hand shower') || n.includes('hand show') || n.includes('handshower'))
    tags.push(FILTER_TAGS.HAND_SHOWER)

  const isShower = n.includes('shower') || n.includes('ohs') || n.includes('overhead') ||
    n.includes('showerheaven') || n.includes('rainbrain') || n.includes('raindance') ||
    n.includes('head shower')
  const isHandShower = tags.includes(FILTER_TAGS.HAND_SHOWER)
  if (isShower && !isHandShower)
    tags.push(FILTER_TAGS.SHOWERS)

  if (n.includes('bath spout') || n.includes('bath spou') || n.includes('spout') || n.includes('spou'))
    tags.push(FILTER_TAGS.SPOUT)

  if (n.includes('bath mix') || n.includes('tub mix') || n.includes('bath mxier') || n.includes('tbm') ||
      (n.includes('bath') && (n.includes('mixer') || n.includes('mxier') || n.includes('mix.'))) && !isShower)
    tags.push(FILTER_TAGS.TBM)

  if (n.includes('rail') || n.includes('slide rail') || n.includes('railset'))
    tags.push(FILTER_TAGS.RAIL)

  if (n.includes('holder') || n.includes('cradle') || n.includes('bracket'))
    tags.push(FILTER_TAGS.HOLDER)

  const isHFAV = n.includes('angle valve') || n.includes('hf/av') || n.includes('high flow') ||
    n.includes('hfav') || n.includes('shut-off') || n.includes('shut off') || n.includes('stop valve')
  if (isHFAV) tags.push(FILTER_TAGS.HF_AV)

  if (n.includes('ceramic'))
    tags.push(FILTER_TAGS.CERAMIC)

  // Wall basin mixer
  const isWBM = (n.includes('wall') && (n.includes('basin mix') || n.includes('bas.mix') || n.includes('bas.m'))) ||
    n.includes('wall mount') || n.includes('wall-mount') || n.includes('wall bas')
  if (isWBM) tags.push(FILTER_TAGS.WBM)

  // Basin mixer (single lever, deck-mounted) — exclude 3-hole, thermostat, wall mount, kitchen
  const isThreeHole  = tags.includes(FILTER_TAGS.THREE_HOLE)
  const isThermostat = tags.includes(FILTER_TAGS.THERMOSTAT)
  const isWBMTag     = tags.includes(FILTER_TAGS.WBM)
  const isKitchen    = tags.includes(FILTER_TAGS.KITCHEN)
  const isBasinMixer = (n.includes('basin mix') || n.includes('basin tap') || n.includes('bas.mix') ||
    n.includes('washbasin') || n.includes('washbowl')) && !isThreeHole && !isThermostat && !isWBMTag && !isKitchen
  if (isBasinMixer) tags.push(FILTER_TAGS.BM)

  // Single lever — if it has a basin/bath/kitchen mixer and not thermostat/3-hole
  const isSingleLever = (isBasinMixer || (n.includes('single lever') || n.includes('single handle'))) &&
    !isThermostat && !isThreeHole
  if (isSingleLever) tags.push(FILTER_TAGS.SINGLE_LEVER)

  // Hansgrohe brand tag
  if (brand === 'HANSGROHE') tags.push(FILTER_TAGS.HANSGROHE)

  return [...new Set(tags)]
}

/** Map product name → ProductCategory enum value for Prisma seed. */
export function derivePrismaCategory(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('thermostat') || n.includes('thermostatic')) return 'THERMOSTATS'
  if (n.includes('kitchen') || n.includes('sink mix'))        return 'KITCHEN'
  if (n.includes('bath mix') || n.includes('tub mix') || n.includes('bath mxier') || n.includes('bath spout') || n.includes('spout')) return 'BATHTUBS'
  if (n.includes('wc') || n.includes('toilet') || n.includes('bidet')) return 'WCS'
  if (n.includes('shower') || n.includes('ohs') || n.includes('overhead') || n.includes('rain') || n.includes('raindance') || n.includes('head shower')) return 'SHOWERS'
  if (n.includes('concealed') || n.includes('f-set') || n.includes('rough-in') || n.includes('basic set') || n.includes('rough in')) return 'CONCEALED'
  if (n.includes('holder') || n.includes('rail') || n.includes('bracket') || n.includes('cradle') || n.includes('hose') || n.includes('spare') || n.includes('accessory') || n.includes('handshower') || n.includes('hand shower')) return 'ACCESSORIES'
  if (n.includes('basin') || n.includes('washbasin') || n.includes('washbowl') || n.includes('bas.mix') || n.includes('basin mix')) return 'FAUCETS'
  return 'ACCESSORIES'
}
