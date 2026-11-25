'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@pasosdejesus/m/shadcn-components/ui/card'
import { Badge } from '@pasosdejesus/m/shadcn-components/ui/badge'
import { Separator } from '@pasosdejesus/m/shadcn-components/ui/separator'

const tS = {
  en: {
    back: '← Published alerts',
    notFound: 'This alert does not exist or was unpublished.',
    error: 'The alert could not be loaded.',
    facts: 'Facts',
    date: 'Date',
    department: 'Department',
    municipality: 'Municipality',
    sources: 'Sources',
    published: 'Published',
  },
  es: {
    back: '← Alertas publicadas',
    notFound: 'Esta alerta no existe o fue despublicada.',
    error: 'No se pudo cargar la alerta.',
    facts: 'Hechos',
    date: 'Fecha',
    department: 'Departamento',
    municipality: 'Municipio',
    sources: 'Fuentes',
    published: 'Publicada',
  },
}

interface Detalle {
  id: number
  titulo: string
  fecha: string
  departamento: string
  municipio: string
  hechos: string
  relatos: unknown[]
  resumen_fuente: string | null
  publicada: string | null
}

function texto(valor: unknown): string {
  if (typeof valor === 'string') return valor
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor)
  return ''
}

export default function AlertPage() {
  const params = useParams()
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale || 'en'
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const t = (clave: keyof typeof tS.en) => (tS[locale as keyof typeof tS] || tS.en)[clave]

  const [alerta, setAlerta] = useState<Detalle | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<'no_existe' | 'error' | null>(null)

  const cargar = useCallback(async () => {
    try {
      const respuesta = await fetch(`/api/alerts/${id}`, { cache: 'no-store' })
      if (respuesta.status === 404) {
        setError('no_existe')
        return
      }
      if (!respuesta.ok) throw new Error('failed')
      const datos = (await respuesta.json()) as { alert?: Detalle }
      setAlerta(datos.alert ?? null)
    } catch {
      setError('error')
    } finally {
      setCargando(false)
    }
  }, [id])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return (
    <main className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
      <a
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        href={`/${locale}/alerts`}
      >
        {t('back')}
      </a>

      {cargando && <p className="text-sm text-muted-foreground">{'…'}</p>}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error === 'no_existe' ? t('notFound') : t('error')}
        </p>
      )}

      {alerta && (
        <article className="space-y-4">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold">{alerta.titulo || `#${alerta.id}`}</h1>
            <p className="text-xs text-muted-foreground">
              {[alerta.fecha, alerta.municipio, alerta.departamento].filter(Boolean).join(' · ')}
            </p>
            <Badge variant="secondary">{t('published')}</Badge>
          </header>

          {alerta.hechos && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('facts')}</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
                {alerta.hechos}
              </CardContent>
            </Card>
          )}

          {alerta.relatos.length > 1 && (
            <Card>
              <CardContent className="space-y-3 pt-6">
                {alerta.relatos.slice(1).map((relato, indice) => {
                  const r = (relato ?? {}) as Record<string, unknown>
                  return (
                    <div key={indice} className="space-y-1 text-sm">
                      <p className="font-medium">{texto(r.titulo) || `#${indice + 2}`}</p>
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {texto(r.hechos ?? r.descripcion ?? r.memo)}
                      </p>
                      <Separator />
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {alerta.resumen_fuente && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('sources')}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {alerta.resumen_fuente}
              </CardContent>
            </Card>
          )}
        </article>
      )}
    </main>
  )
}
