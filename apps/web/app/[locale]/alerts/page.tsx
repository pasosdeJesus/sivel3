'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@pasosdejesus/m/shadcn-components/ui/card'
import { Badge } from '@pasosdejesus/m/shadcn-components/ui/badge'

const tS = {
  en: {
    title: 'Published alerts',
    intro:
      'Cases documented by the project team and reviewed before publication. The map, cases and stats remain the public corpus.',
    empty: 'No published alerts yet.',
    error: 'The alerts could not be loaded.',
    published: 'Published',
    sources: 'sources',
    map: 'Open the map',
  },
  es: {
    title: 'Alertas publicadas',
    intro:
      'Casos documentados por el equipo del proyecto y revisados antes de publicar. El mapa, los casos y las estadísticas siguen siendo el corpus público.',
    empty: 'Todavía no hay alertas publicadas.',
    error: 'No se pudieron cargar las alertas.',
    published: 'Publicada',
    sources: 'fuentes',
    map: 'Abrir el mapa',
  },
}

interface Alerta {
  id: number
  titulo: string
  fecha: string
  departamento: string
  municipio: string
  fuentes: number
  publicada: string | null
}

export default function AlertsPage() {
  const params = useParams()
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale || 'en'
  const t = (clave: keyof typeof tS.en) => (tS[locale as keyof typeof tS] || tS.en)[clave]

  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const respuesta = await fetch('/api/alerts?limit=50', { cache: 'no-store' })
      if (!respuesta.ok) throw new Error('failed')
      const datos = (await respuesta.json()) as { alerts?: Alerta[] }
      setAlertas(datos.alerts ?? [])
    } catch {
      setError(true)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return (
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('intro')}</p>
        <a
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          href={`/${locale}/cases/osmmap`}
        >
          {t('map')} →
        </a>
      </header>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {t('error')}
        </p>
      )}

      {cargando && <p className="text-sm text-muted-foreground">{'…'}</p>}

      {!cargando && !error && alertas.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t('empty')}
          </CardContent>
        </Card>
      )}

      {alertas.map((alerta) => (
        <Card key={alerta.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              <a
                className="underline-offset-4 hover:underline"
                href={`/${locale}/alerts/${alerta.id}`}
              >
                {alerta.titulo || `#${alerta.id}`}
              </a>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {[alerta.fecha, alerta.municipio, alerta.departamento].filter(Boolean).join(' · ')}
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{t('published')}</Badge>
            <span>
              {alerta.fuentes} {t('sources')}
            </span>
            {alerta.publicada && (
              <span>{new Date(alerta.publicada).toLocaleDateString(locale)}</span>
            )}
          </CardContent>
        </Card>
      ))}
    </main>
  )
}
