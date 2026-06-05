'use client'

import React from 'react'
import { Button, Input } from '@forge/ui'

type Filters = {
  userId: string
  category: string
  entityType: string
  entityId: string
  action: string
  status: string
  from: string
  to: string
}

type AuditFiltersProps = {
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  onExport: (format: 'csv' | 'excel') => void
}

export default function AuditFilters({ filters, setFilters, onExport }: AuditFiltersProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const clearFilters = () => {
    setFilters({
      userId: '',
      category: '',
      entityType: '',
      entityId: '',
      action: '',
      status: '',
      from: '',
      to: '',
    })
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Filters</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onExport('csv')}>
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onExport('excel')}>
            Export Excel
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">User ID</label>
          <Input
            name="userId"
            placeholder="Filter by user ID"
            value={filters.userId}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
          <select 
            name="category" 
            value={filters.category} 
            onChange={handleChange}
            className="w-full text-sm border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="AUTH">Auth</option>
            <option value="PAYMENTS">Payments</option>
            <option value="PURCHASES">Purchases</option>
            <option value="QUOTATIONS">Quotations</option>
            <option value="SETTINGS">Settings</option>
            <option value="PROJECTS">Projects</option>
            <option value="FOLLOWUPS">Follow-Ups</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Entity Type</label>
          <Input 
            name="entityType" 
            placeholder="e.g. Quotation" 
            value={filters.entityType} 
            onChange={handleChange} 
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Entity ID</label>
          <Input 
            name="entityId" 
            placeholder="Search by ID" 
            value={filters.entityId} 
            onChange={handleChange} 
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
          <Input 
            name="action" 
            placeholder="e.g. created" 
            value={filters.action} 
            onChange={handleChange} 
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select 
            name="status" 
            value={filters.status} 
            onChange={handleChange}
            className="w-full text-sm border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="WARNING">Warning</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
          <Input 
            type="date"
            name="from" 
            value={filters.from} 
            onChange={handleChange} 
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
          <Input 
            type="date"
            name="to" 
            value={filters.to} 
            onChange={handleChange} 
          />
        </div>
      </div>
    </div>
  )
}
