'use client'

import { motion } from 'framer-motion'
import { staggerContainer } from '@forge/ui'
import { KPITile } from './kpi-tile'
import { kpiData } from '@/lib/mock/dashboard-data'

interface KPIStripProps {
  isLoading?: boolean
}

export function KPIStrip({ isLoading = false }: KPIStripProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    >
      {kpiData.map((item, i) => (
        <KPITile key={item.id} {...item} index={i} isLoading={isLoading} />
      ))}
    </motion.div>
  )
}
