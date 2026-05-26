// Canonical purchase stage configuration.
// Imports purchases-tracker primitives to avoid duplicating constants.
export {
  STAGE_ORDER as STAGES,
  STAGE_LABEL as STAGE_LABELS,
  STAGE_COLORS,
  type PurchaseStage,
} from '@/lib/purchases-tracker'

// Legal forward transitions per stage.
// Source of truth is in the move-stage API route; this re-exports for client-side UI.
export const LEGAL_TRANSITIONS: Record<import('@/lib/purchases-tracker').PurchaseStage, import('@/lib/purchases-tracker').PurchaseStage[]> = {
  NEEDS_PO:   ['ORDERED', 'AT_GODOWN'],
  ORDERED:    ['AT_GODOWN'],
  AT_GODOWN:  ['IN_BOX'],
  IN_BOX:     ['DISPATCHED'],
  DISPATCHED: [],
}
