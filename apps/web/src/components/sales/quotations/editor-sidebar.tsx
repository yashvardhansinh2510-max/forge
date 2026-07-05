'use client'

import * as React from 'react'

export interface SidebarData {
  customerName:       string
  customerPhone:      string
  billingAddress:     string
  siteAddress:        string
  projectName:        string
  salesRep:           string
  brandLabel:         string
  quoteDate:          string
  validUntil:         string
  notes:              string
  termsAndConditions: string
}

interface EditorSidebarProps {
  data:     SidebarData
  onChange: (updated: SidebarData) => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: 12, padding: '5px 8px',
  border: '1px solid var(--border-default)', borderRadius: 6,
  outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box',
  color: 'var(--text-primary)', background: 'white',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle, resize: 'vertical', lineHeight: '1.5',
}

export function EditorSidebar({ data, onChange }: EditorSidebarProps) {
  function set(key: keyof SidebarData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...data, [key]: e.target.value })
  }

  return (
    <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', overflowY: 'auto', padding: '16px 16px' }}>
      <Field label="Customer Name">
        <input value={data.customerName} onChange={set('customerName')} style={inputStyle} />
      </Field>
      <Field label="Phone (NUM)">
        <input value={data.customerPhone} onChange={set('customerPhone')} style={inputStyle} />
      </Field>
      <Field label="Billing Address">
        <textarea value={data.billingAddress} onChange={set('billingAddress')} rows={2} style={textareaStyle} />
      </Field>
      <Field label="Site Address">
        <textarea value={data.siteAddress} onChange={set('siteAddress')} rows={2} style={textareaStyle} />
      </Field>
      <Field label="Project Name">
        <input value={data.projectName} onChange={set('projectName')} style={inputStyle} />
      </Field>
      <Field label="Sales Rep (REF)">
        <input value={data.salesRep} onChange={set('salesRep')} style={inputStyle} />
      </Field>
      <Field label="Brand Label">
        <input value={data.brandLabel} onChange={set('brandLabel')} style={inputStyle} placeholder="e.g. GROHE" />
      </Field>
      <Field label="Quote Date">
        <input type="date" value={data.quoteDate} onChange={set('quoteDate')} style={inputStyle} />
      </Field>
      <Field label="Valid Until">
        <input type="date" value={data.validUntil} onChange={set('validUntil')} style={inputStyle} />
      </Field>
      <Field label="Notes">
        <textarea value={data.notes} onChange={set('notes')} rows={6} style={textareaStyle} />
      </Field>
      <Field label="Terms & Contacts">
        <textarea value={data.termsAndConditions} onChange={set('termsAndConditions')} rows={6} style={textareaStyle} />
      </Field>
    </div>
  )
}
