'use client'

import { useState, useCallback } from 'react'

export interface PreAlertSummary {
  id: number
  titulo: string
  fecha: string
  departamento: string
  municipio: string
  status: string
  source_urls: string[]
  source_summary: string | null
}

export interface PreAlertDetail extends PreAlertSummary {
  json_data?: Record<string, unknown>
  can_purchase?: boolean
  bought_at?: string
  conversion_deadline?: string
}

export function usePreAlerts() {
  const [preAlerts, setPreAlerts] = useState<PreAlertSummary[]>([])
  const [loading, setLoading] = useState(false)

  const fetchPreAlerts = useCallback(async (filters?: { departamento?: string; municipio?: string; wallet?: string }) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters?.departamento) params.set('departamento', filters.departamento)
      if (filters?.municipio) params.set('municipio', filters.municipio)
      if (filters?.wallet) params.set('wallet', filters.wallet)
      params.set('limit', '100')

      const qs = params.toString()
      const res = await fetch(`/api/pre-alerts${qs ? '?' + qs : ''}`)
      if (!res.ok) return
      const data = await res.json()
      setPreAlerts(data.pre_alerts || [])
    } catch {
      // Silently handle — pre-alerts are optional display
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDetail = useCallback(async (id: number, wallet?: string | null): Promise<PreAlertDetail | null> => {
    try {
      const base = `/api/pre-alerts/${id}`
      const url = wallet ? `${base}?wallet=${wallet}` : base
      const res = await fetch(url)
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }, [])

  const buyPreAlert = useCallback(async (id: number, buyerWallet: string, txHash?: string) => {
    const res = await fetch(`/api/pre-alerts/${id}/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyer_wallet: buyerWallet, tx_hash: txHash }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Purchase failed')
    }
    return await res.json()
  }, [])

  const convertPreAlert = useCallback(async (preAlertId: number, buyerWallet: string, citizenNotes?: string) => {
    const res = await fetch('/api/pre-alerts/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pre_alert_id: preAlertId, buyer_wallet: buyerWallet, citizen_notes: citizenNotes }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Conversion failed')
    }
    return await res.json()
  }, [])

  return { preAlerts, loading, fetchPreAlerts, fetchDetail, buyPreAlert, convertPreAlert }
}
