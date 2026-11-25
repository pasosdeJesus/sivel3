'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@pasosdejesus/m/shadcn-components/ui/card'
import { Button } from '@pasosdejesus/m/shadcn-components/ui/button'
import { Badge } from '@pasosdejesus/m/shadcn-components/ui/badge'
import { Separator } from '@pasosdejesus/m/shadcn-components/ui/separator'
import { useWallet } from '@/contexts/WalletContext'
import { despublicarAlerta, listarRevision, publicarAlerta } from '@/lib/documenterClient'

const tS = {
  en: {
    title: 'Alerts under review',
    intro:
      'Publishing makes the proposed case public and anonymous. It cannot be undone automatically: you can unpublish at any time.',
    noWallet: 'Connect your wallet to review alerts.',
    denied: 'This wallet does not have documenter permission.',
    empty: 'There are no documenter alerts awaiting review.',
    publish: 'Publish',
    unpublish: 'Unpublish',
    published: 'Published',
    review: 'Under review',
    error: 'The action failed.',
    reload: 'Reload',
    assistant: 'Open the assistant',
    back: '← Documenter panel',
    facts: 'Facts',
  },
  es: {
    title: 'Alertas en revisión',
    intro:
      'Publicar hace visible el caso propuesto, de forma anónima. Es reversible: puedes despublicar en cualquier momento.',
    noWallet: 'Conecta tu billetera para revisar alertas.',
    denied: 'Esta billetera no tiene permiso de documentador.',
    empty: 'No hay alertas de documentador esperando revisión.',
    publish: 'Publicar',
    unpublish: 'Despublicar',
    published: 'Publicada',
    review: 'En revisión',
    error: 'La acción falló.',
    reload: 'Recargar',
    assistant: 'Abrir el asistente',
    back: '← Panel de documentación',
    facts: 'Hechos',
  },
}

interface AlertaRevision {
  id: number
  status: string
  json_data?: Record<string, unknown>
  published_at?: string | null
  created_at?: string | null
}

function texto(valor: unknown): string {
  if (typeof valor === 'string') return valor
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor)
  return ''
}

export default function ReviewAlertsPage() {
  const params = useParams()
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale || 'en'
  const t = (clave: keyof typeof tS.en) => (tS[locale as keyof typeof tS] || tS.en)[clave]

  const { isConnected, effectiveAddress, provider } = useWallet()
  const [alertas, setAlertas] = useState<AlertaRevision[]>([])
  const [cargando, setCargando] = useState(true)
  const [denied, setDenied] = useState(false)
  const [error, setError] = useState('')
  const [ocupada, setOcupada] = useState<number | null>(null)

  const cargar = useCallback(async () => {
    if (!provider || !effectiveAddress) return
    setCargando(true)
    setError('')
    const r = await listarRevision({ provider, address: effectiveAddress })
    setCargando(false)
    if (r.status === 403) {
      setDenied(true)
      return
    }
    if (!r.ok || !r.data) {
      setError(t('error'))
      return
    }
    setDenied(false)
    setAlertas((r.data.alerts ?? []) as AlertaRevision[])
  }, [provider, effectiveAddress, t])

  useEffect(() => {
    if (!effectiveAddress) {
      setCargando(false)
      return
    }
    void cargar()
  }, [effectiveAddress, cargar])

  const cambiar = async (alerta: AlertaRevision, accion: 'publicar' | 'despublicar') => {
    if (!provider || !effectiveAddress) return
    setOcupada(alerta.id)
    setError('')
    const r =
      accion === 'publicar'
        ? await publicarAlerta({ provider, address: effectiveAddress, id: alerta.id })
        : await despublicarAlerta({ provider, address: effectiveAddress, id: alerta.id })
    setOcupada(null)
    if (!r.ok) {
      setError(t('error'))
      return
    }
    setAlertas((lista) =>
      lista.map((item) =>
        item.id === alerta.id
          ? {
              ...item,
              status: accion === 'publicar' ? 'published' : 'converted',
              published_at: accion === 'publicar' ? new Date().toISOString() : null,
            }
          : item,
      ),
    )
  }

  if (!isConnected) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t('noWallet')}
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <a
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          href={`/${locale}/documenter`}
        >
          {t('back')}
        </a>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <a
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            href={`/${locale}/documenter/asistente`}
          >
            {t('assistant')} →
          </a>
        </div>
        <p className="text-sm text-muted-foreground">{t('intro')}</p>
      </header>

      {denied && (
        <p role="alert" className="text-sm text-destructive">
          {t('denied')}
        </p>
      )}
      {error && (
        <div role="alert" className="space-y-2 text-sm text-destructive">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => void cargar()}>
            {t('reload')}
          </Button>
        </div>
      )}

      {cargando && <p className="text-sm text-muted-foreground">{'…'}</p>}

      {!cargando && !denied && !error && alertas.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t('empty')}
          </CardContent>
        </Card>
      )}

      {alertas.map((alerta) => {
        const datos = (alerta.json_data ?? {}) as Record<string, unknown>
        const publicada = alerta.status === 'published'
        const hechos = texto(datos.hechos ?? datos.descripcion ?? datos.memo)
        return (
          <Card key={alerta.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                #{alerta.id} — {texto(datos.titulo) || t('review')}
                <Badge variant={publicada ? 'default' : 'secondary'}>
                  {publicada ? t('published') : t('review')}
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {[texto(datos.fecha), texto(datos.municipio), texto(datos.departamento)]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {hechos && (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{hechos}</p>
              )}
              <Separator />
              <div className="flex flex-wrap gap-2">
                {publicada ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={ocupada === alerta.id}
                    onClick={() => void cambiar(alerta, 'despublicar')}
                  >
                    {t('unpublish')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={ocupada === alerta.id}
                    onClick={() => void cambiar(alerta, 'publicar')}
                  >
                    {t('publish')}
                  </Button>
                )}
                {publicada && (
                  <a
                    className="self-center text-sm text-primary underline-offset-4 hover:underline"
                    href={`/${locale}/alerts/${alerta.id}`}
                  >
                    /{locale}/alerts/{alerta.id} →
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </main>
  )
}
