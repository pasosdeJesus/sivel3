'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@pasosdejesus/m/shadcn-components/ui/card'
import { Button } from '@pasosdejesus/m/shadcn-components/ui/button'
import { Badge } from '@pasosdejesus/m/shadcn-components/ui/badge'
import { Separator } from '@pasosdejesus/m/shadcn-components/ui/separator'
import { Skeleton } from '@pasosdejesus/m/shadcn-components/ui/skeleton'
import { useToast } from '@pasosdejesus/m/shadcn-components/ui/use-toast'
import { MapPin, Calendar, Globe, Star, XCircle } from 'lucide-react'
import { useWallet } from '@/contexts/WalletContext'

const tS = {
  en: {
    title: 'Documenter Panel',
    noWallet: 'Connect your wallet to access the documenter panel.',
    noAccess: 'You do not have DOCUMENTER_ROLE.',
    noAlerts: 'No converted pre-alerts awaiting review.',
    score: 'Score',
    scorePrompt: 'Rate the quality (2-5) or reject (0):',
    feedback: 'Feedback',
    feedbackPlaceholder: 'Explain your score…',
    submit: 'Submit Score',
    submitting: 'Submitting…',
    reject: 'Reject',
    success: 'Score submitted successfully',
    error: 'Error submitting score',
  },
  es: {
    title: 'Panel de Documentación',
    noWallet: 'Conecta tu billetera para acceder al panel de documentación.',
    noAccess: 'No tienes DOCUMENTER_ROLE.',
    noAlerts: 'No hay pre-alertas convertidas esperando revisión.',
    score: 'Puntuar',
    scorePrompt: 'Califica la calidad (2-5) o rechaza (0):',
    feedback: 'Retroalimentación',
    feedbackPlaceholder: 'Explica tu puntuación…',
    submit: 'Enviar Puntuación',
    submitting: 'Enviando…',
    reject: 'Rechazar',
    success: 'Puntuación enviada exitosamente',
    error: 'Error al enviar puntuación',
  },
}

export default function DocumenterPage() {
  const params = useParams()
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale || 'en'
  const pt = (k: keyof typeof tS.en) => (tS[locale as keyof typeof tS]?.[k] || tS.en[k]) as string
  const { isConnected, effectiveAddress } = useWallet()
  const { toast } = useToast()

  const [queue, setQueue] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scoring, setScoring] = useState<number | null>(null)
  const [scoreVal, setScoreVal] = useState<number>(3)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (!effectiveAddress) { setLoading(false); return }
    fetch(`/api/pre-alerts/queue?wallet=${effectiveAddress}`)
      .then(async r => {
        if (r.status === 403) { setError('noAccess'); setQueue([]); return }
        if (!r.ok) throw new Error('Failed')
        const d = await r.json()
        setQueue(d.pending || [])
      })
      .catch(() => setError('fetchError'))
      .finally(() => setLoading(false))
  }, [effectiveAddress])

  const submitScore = async (preAlertId: number, score: number) => {
    setScoring(preAlertId)
    try {
      // EIP-191: sign "score:{id}:{score}:{timestamp}" with personal_sign
      const timestamp = Math.floor(Date.now() / 1000)
      const message = `score:${preAlertId}:${score}:${timestamp}`

      let signature: string
      const ethereum = (window as any).ethereum
      if (!ethereum) throw new Error('No wallet')
      try {
        signature = await ethereum.request({
          method: 'personal_sign',
          params: [message, effectiveAddress],
        })
      } catch {
        // MiniPay fallback
        signature = await ethereum.send({
          method: 'personal_sign',
          params: [message, effectiveAddress],
        })
      }

      const res = await fetch(`/api/pre-alerts/${preAlertId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score,
          documenter_wallet: effectiveAddress,
          feedback,
          timestamp,
          signature,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      toast({ title: pt('success'), duration: 3000 })
      setQueue(q => q.filter(p => p.id !== preAlertId))
      setFeedback('')
    } catch (e: any) {
      toast({ title: pt('error'), description: e.message, variant: 'destructive' })
    } finally {
      setScoring(null)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96"><CardContent className="pt-6 text-center text-gray-500">{pt('noWallet')}</CardContent></Card>
      </div>
    )
  }

  if (error === 'noAccess') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96"><CardContent className="pt-6 text-center text-gray-500">{pt('noAccess')}</CardContent></Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">{pt('title')}</h1>

        {queue.length === 0 ? (
          <Card><CardContent className="pt-6 text-center text-gray-500">{pt('noAlerts')}</CardContent></Card>
        ) : (
          queue.map((item: any) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  #{item.id} — {item.json_data?.titulo || 'Untitled'}
                </CardTitle>
                <p className="text-xs text-gray-500">
                  Buyer: {item.buyer_wallet?.slice(0, 10)}…
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1 text-sm text-gray-700">
                  {item.json_data?.hechos && <p>{String(item.json_data.hechos).slice(0, 200)}</p>}
                  {item.json_data?.fecha && (
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{item.json_data.fecha}</div>
                  )}
                  {item.json_data?.departamento && (
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{item.json_data.departamento}</div>
                  )}
                </div>

                {item.source_urls && (
                  <div className="flex items-start gap-2 text-xs">
                    <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{item.source_urls.length} source(s)</span>
                  </div>
                )}

                <Separator />

                <div>
                  <label className="text-xs font-medium block mb-1">{pt('scorePrompt')}</label>
                  <div className="flex gap-1 mb-2">
                    {[2, 3, 4, 5].map(s => (
                      <Button
                        key={s}
                        size="sm"
                        variant={scoreVal === s ? 'default' : 'outline'}
                        onClick={() => setScoreVal(s)}
                      >
                        <Star className="h-3 w-3 mr-1" />{s}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setScoreVal(0)}
                      className={scoreVal === 0 ? 'ring-2 ring-red-400' : ''}
                    >
                      <XCircle className="h-3 w-3 mr-1" />0
                    </Button>
                  </div>
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder={pt('feedbackPlaceholder')}
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full"
                  disabled={scoring === item.id}
                  onClick={() => submitScore(item.id, scoreVal)}
                >
                  {scoring === item.id ? pt('submitting') : pt('submit')}
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
