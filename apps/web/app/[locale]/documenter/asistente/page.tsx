'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@pasosdejesus/m/shadcn-components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@pasosdejesus/m/shadcn-components/ui/card'
import { Badge } from '@pasosdejesus/m/shadcn-components/ui/badge'
import { Separator } from '@pasosdejesus/m/shadcn-components/ui/separator'
import { useWallet } from '@/contexts/WalletContext'
import {
  borrarIngesta,
  crearPrealerta,
  estadoIngesta,
  exportarXrlat,
  extraerCaso,
  guardarCandidato,
  ingestarUrl,
  reintentarIngesta,
  saludAsistente,
} from '@/lib/asistenteClient'

const tS = {
  en: {
    title: 'Documentation assistant',
    intro: 'Turn a news URL (or your own notes) into a proposed case, export it as XRLAT or create a pre-alert.',
    noWallet: 'Connect your wallet to use the assistant.',
    noAccess: 'This wallet does not have documenter permission.',
    checking: 'Checking permission…',
    notAvailable: 'The assistant is not available.',
    tabNews: 'From a news URL',
    tabNotes: 'From my notes',
    urlLabel: 'News URL',
    urlPlaceholder: 'https://…',
    fetchText: 'Fetch text',
    discard: 'Delete server copy',
    notesLabel: 'Your documentation',
    editorLabel: 'Clean text (this is what the model receives)',
    restore: 'Restore original',
    generate: 'Generate case',
    generating: 'Generating…',
    generationTakes: 'Generation takes about a minute on the project server; the button stays disabled meanwhile.',
    regenerate: 'Back to the text',
    retry: 'Retry download',
    export: 'Export XRLAT',
    prealert: 'Create pre-alert',
    draft: 'Draft generated automatically; review it before exporting or creating a pre-alert.',
    states: {
      en_cola: 'Queued…',
      descargando: 'Downloading…',
      limpiando: 'Cleaning…',
      listo: 'Text ready.',
      sin_texto: 'The text could not be downloaded; paste it by hand.',
      error: 'The download failed.',
    } as Record<string, string>,
    noCase: 'The model did not find a case in this text.',
    downloadedOnce: 'The page is downloaded once; the clean text is what you edit.',
    prealertCreated:
      'Alert sent to review. It does not go through the market and pays no citizen reward.',
    proposedCase: 'Proposed case',
    case: 'Case',
    fieldFecha: 'Date',
    fieldDepartamento: 'Department',
    fieldMunicipio: 'Municipality',
    fieldLugar: 'Place',
    fieldHechos: 'Facts',
    fieldActos: 'Acts',
    fieldGrupos: 'Alleged perpetrators',
    fieldFuentes: 'Sources',
    consent: 'I may use this text to train the project model',
    consentNeeded: 'The notes are only saved as a candidate if you authorize their use for training.',
    saveCandidate: 'Save candidate',
    candidateSaved: 'Candidate saved for later review; it is not part of the training corpus yet.',
    errors: {
      sin_firma: 'Missing signature. Reconnect your wallet.',
      firma_vencida: 'Your signature expired. Try again.',
      firma_invalida: 'The signature does not match your wallet.',
      nonce_repetido: 'That action was already sent. Try again.',
      no_documenter: 'This wallet does not have documenter permission.',
      sin_permiso: 'This item belongs to another documenter.',
      agente_no_configurado: 'The assistant is not configured on this server.',
      agente_ocupado: 'The assistant is busy. Try again in a moment.',
      agente_caido: 'The assistant did not respond. Try again.',
      agente_tiempo: 'The assistant timed out. Try again.',
      cuota: 'You reached the daily limit.',
      texto_largo: 'The text is too long; split it.',
      texto_corto: 'The text is too short.',
      origen_invalido: 'The origin of the text is missing or invalid.',
      relatos_invalidos: 'There is no proposed case to save.',
      motor_remoto: 'Your notes are only processed by a local engine, and this server uses a remote one.',
      no_reintentable: 'This download cannot be retried; paste the text by hand.',
      sin_consentimiento: 'Authorize the use of your notes for training before saving them.',
      url_invalida: 'That URL is not valid.',
      fuente_no_existe: 'The downloaded source could not be found.',
      no_existe: 'That item no longer exists.',
      sin_caso: 'The model did not find a case in this text.',
      duplicada: 'That case already has a pre-alert.',
      error: 'Something went wrong. Try again.',
    } as Record<string, string>,
    victimas: 'Victims',
    acts: 'Acts',
    groups: 'Alleged perpetrators',
    sources: 'Sources',
    warnings: 'Warnings',
    characters: 'characters',
    notesPrivacy:
      'Notes are processed on the project server and are not sent to third parties; if you authorize it, they are stored anonymized for training.',
  },
  es: {
    title: 'Asistente de documentación',
    intro: 'Convierte el URL de una noticia (o tus propios apuntes) en un caso propuesto, expórtalo en XRLAT o crea una prealerta.',
    noWallet: 'Conecta tu billetera para usar el asistente.',
    noAccess: 'Esta billetera no tiene permiso de documentador.',
    checking: 'Verificando permiso…',
    notAvailable: 'El asistente no está disponible.',
    tabNews: 'Desde una noticia (URL)',
    tabNotes: 'Desde mi documentación',
    urlLabel: 'URL de la noticia',
    urlPlaceholder: 'https://…',
    fetchText: 'Traer texto',
    discard: 'Borrar copia del servidor',
    notesLabel: 'Tu documentación',
    editorLabel: 'Texto limpio (es lo que recibe el modelo)',
    restore: 'Restaurar original',
    generate: 'Generar caso',
    generating: 'Generando…',
    generationTakes: 'La generación tarda cerca de un minuto en el servidor del proyecto; mientras tanto el botón queda deshabilitado.',
    regenerate: 'Volver al texto',
    retry: 'Reintentar descarga',
    export: 'Exportar XRLAT',
    prealert: 'Crear prealerta',
    draft: 'Borrador generado automáticamente; verifíquelo antes de exportar o crear la prealerta.',
    states: {
      en_cola: 'En cola…',
      descargando: 'Descargando…',
      limpiando: 'Limpiando…',
      listo: 'Texto listo.',
      sin_texto: 'No se pudo obtener el texto; pégalo a mano.',
      error: 'La descarga falló.',
    } as Record<string, string>,
    noCase: 'El modelo no encontró un caso en este texto.',
    downloadedOnce: 'La página se descarga una sola vez; el texto limpio es el que editas.',
    prealertCreated:
      'Alerta enviada a revisión. No pasa por el mercado ni paga recompensa de ciudadano.',
    proposedCase: 'Caso propuesto',
    case: 'Caso',
    fieldFecha: 'Fecha',
    fieldDepartamento: 'Departamento',
    fieldMunicipio: 'Municipio',
    fieldLugar: 'Lugar',
    fieldHechos: 'Hechos',
    fieldActos: 'Actos',
    fieldGrupos: 'Presuntos responsables',
    fieldFuentes: 'Fuentes',
    consent: 'Puedo usar este texto para entrenar el modelo del proyecto',
    consentNeeded: 'Los apuntes sólo se guardan como candidato si autorizas su uso para entrenamiento.',
    saveCandidate: 'Guardar candidato',
    candidateSaved: 'Candidato guardado para revisión posterior; todavía no entra al corpus de entrenamiento.',
    errors: {
      sin_firma: 'Falta la firma. Reconecta tu billetera.',
      firma_vencida: 'La firma venció. Inténtalo de nuevo.',
      firma_invalida: 'La firma no corresponde a tu billetera.',
      nonce_repetido: 'Esa acción ya se envió. Inténtalo de nuevo.',
      no_documenter: 'Esta billetera no tiene permiso de documentador.',
      sin_permiso: 'Este elemento es de otro documentador.',
      agente_no_configurado: 'El asistente no está configurado en este servidor.',
      agente_ocupado: 'El asistente está ocupado. Inténtalo en un momento.',
      agente_caido: 'El asistente no respondió. Inténtalo de nuevo.',
      agente_tiempo: 'El asistente tardó demasiado. Inténtalo de nuevo.',
      cuota: 'Alcanzaste el límite diario.',
      texto_largo: 'El texto es demasiado largo; divídelo.',
      texto_corto: 'El texto es demasiado corto.',
      origen_invalido: 'Falta el origen del texto o no es válido.',
      relatos_invalidos: 'No hay un caso propuesto para guardar.',
      motor_remoto: 'Tus apuntes sólo se procesan con un motor local, y este servidor usa uno remoto.',
      no_reintentable: 'Esta descarga no se puede reintentar; pega el texto a mano.',
      sin_consentimiento: 'Autoriza el uso de tus apuntes para entrenamiento antes de guardarlos.',
      url_invalida: 'Ese URL no es válido.',
      fuente_no_existe: 'No se encontró la fuente descargada.',
      no_existe: 'Ese elemento ya no existe.',
      sin_caso: 'El modelo no encontró un caso en este texto.',
      duplicada: 'Ese caso ya tiene una prealerta.',
      error: 'Algo falló. Inténtalo de nuevo.',
    } as Record<string, string>,
    victimas: 'Víctimas',
    acts: 'Actos',
    groups: 'Presuntos responsables',
    sources: 'Fuentes',
    warnings: 'Avisos',
    characters: 'caracteres',
    notesPrivacy:
      'Tus apuntes se procesan en el servidor del proyecto y no se envían a terceros; si lo autorizas, se guardan anonimizados para entrenamiento.',
  },
}

type Cualquiera = Record<string, unknown>

const CAMPOS_DEL_CASO = ['fecha', 'departamento', 'municipio', 'lugar'] as const
const CAMPOS_DE_LISTA = ['actos', 'grupos', 'presponsables', 'fuentes'] as const

/** Campos cuyo valor es objeto: se prefiere su nombre antes que volcarlo. */
const CLAVES_DE_NOMBRE = ['nombre', 'titulo', 'nombre_completo', 'descripcion', 'texto', 'memo', 'mensaje']

function etiquetaDe(clave: string): string {
  const limpia = clave.replace(/_/g, ' ')
  return limpia.charAt(0).toUpperCase() + limpia.slice(1)
}

/** Nunca `JSON.stringify`: los objetos del caso se leen por su nombre. */
function textoDe(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') return String(valor)
  if (Array.isArray(valor)) return valor.map(textoDe).filter(Boolean).join(', ')
  if (typeof valor === 'object') {
    const objeto = valor as Cualquiera
    for (const clave of CLAVES_DE_NOMBRE) {
      const posible = objeto[clave]
      if (typeof posible === 'string' && posible.trim()) return posible
    }
    return Object.entries(objeto)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([clave, v]) => `${etiquetaDe(clave)}: ${textoDe(v)}`)
      .join('; ')
  }
  return String(valor)
}

function listaDe(valor: unknown): string[] {
  if (valor === null || valor === undefined || valor === '') return []
  if (Array.isArray(valor)) return valor.map(textoDe).filter(Boolean)
  return [textoDe(valor)].filter(Boolean)
}

export default function AsistentePage() {
  const params = useParams()
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale || 'en'
  const t = (clave: keyof typeof tS.en) => (tS[locale as keyof typeof tS] || tS.en)[clave] as any
  const tErrores = (tS[locale as keyof typeof tS] || tS.en).errors
  const tEstados = (tS[locale as keyof typeof tS] || tS.en).states
  const tCampos = (tS[locale as keyof typeof tS] || tS.en) as unknown as Record<string, string>
  const etiquetaCampo = (campo: string) =>
    tCampos[`field${campo.charAt(0).toUpperCase()}${campo.slice(1)}`] || etiquetaDe(campo)

  const { isConnected, effectiveAddress, provider } = useWallet()
  const [acceso, setAcceso] = useState<'checking' | 'ok' | 'denied' | 'sin-wallet'>('checking')
  const [origen, setOrigen] = useState<'noticia' | 'notas'>('noticia')
  const [url, setUrl] = useState('')
  const [textoOriginal, setTextoOriginal] = useState('')
  const [texto, setTexto] = useState('')
  const [ingestaId, setIngestaId] = useState<number | null>(null)
  const [sourceId, setSourceId] = useState<number | null>(null)
  const [estadoDescarga, setEstadoDescarga] = useState<string>('')
  const [avisos, setAvisos] = useState<string[]>([])
  const [relatos, setRelatos] = useState<Cualquiera[] | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [prealertaId, setPrealertaId] = useState<number | null>(null)
  const [candidatoId, setCandidatoId] = useState<number | null>(null)
  const [consentimiento, setConsentimiento] = useState(false)
  const [disponible, setDisponible] = useState(true)
  const sondeoRef = useRef<number | null>(null)

  const puedeFirmar = Boolean(provider && effectiveAddress)
  const caracteres = useMemo(() => texto.length, [texto])

  useEffect(() => {
    if (!effectiveAddress) {
      setAcceso('sin-wallet')
      return
    }
    let vivo = true
    fetch(`/api/pre-alerts/queue?wallet=${effectiveAddress}`)
      .then((r) => {
        if (!vivo) return
        setAcceso(r.ok ? 'ok' : r.status === 403 ? 'denied' : 'denied')
      })
      .catch(() => vivo && setAcceso('denied'))
    return () => {
      vivo = false
    }
  }, [effectiveAddress])

  useEffect(() => {
    if (!puedeFirmar || !provider || !effectiveAddress) return
    let vivo = true
    saludAsistente({ provider, address: effectiveAddress })
      .then((r) => vivo && setDisponible(r.ok))
      .catch(() => vivo && setDisponible(false))
    return () => {
      vivo = false
    }
  }, [puedeFirmar, provider, effectiveAddress])

  useEffect(() => () => {
    if (sondeoRef.current) window.clearTimeout(sondeoRef.current)
  }, [])

  const mostrarError = useCallback((code: string) => {
    setError(tErrores[code] || tErrores.error)
  }, [tErrores])

  const sondear = useCallback(
    (id: number) => {
      if (!provider || !effectiveAddress) return
      estadoIngesta({ provider, address: effectiveAddress, id })
        .then((r) => {
          if (!r.ok || !r.data) {
            mostrarError((r.data as any)?.code || 'agente_caido')
            return
          }
          const estado = r.data.estado || ''
          setEstadoDescarga(estado)
          setAvisos(listaDe(r.data.avisos))
          setSourceId(r.data.source_id ?? null)
          if (estado === 'listo') {
            setTextoOriginal(r.data.texto_original || '')
            setTexto(r.data.texto_automatico || r.data.texto_original || '')
            setCargando(false)
            return
          }
          if (estado === 'sin_texto' || estado === 'error') {
            setCargando(false)
            if (estado === 'sin_texto') setTexto('')
            return
          }
          sondeoRef.current = window.setTimeout(() => sondear(id), 2000)
        })
        .catch(() => {
          setCargando(false)
          mostrarError('agente_caido')
        })
    },
    [provider, effectiveAddress, mostrarError],
  )

  const traerTexto = useCallback(async () => {
    if (!provider || !effectiveAddress) return
    setError('')
    setCargando(true)
    setRelatos(null)
    setPrealertaId(null)
    setCandidatoId(null)
    setSourceId(null)
    const r = await ingestarUrl({ provider, address: effectiveAddress, url: url.trim() })
    if (!r.ok || !r.data) {
      setCargando(false)
      return mostrarError((r.data as any)?.code || 'error')
    }
    const datos = r.data
    const id = datos.ingesta_id ?? null
    setIngestaId(id)
    setEstadoDescarga(datos.estado || 'en_cola')
    if (datos.estado === 'listo' && id) {
      sondear(id)
    } else if (id) {
      sondeoRef.current = window.setTimeout(() => sondear(id), 2000)
    } else {
      setCargando(false)
    }
  }, [provider, effectiveAddress, url, mostrarError, sondear])

  const reintentar = useCallback(async () => {
    if (!provider || !effectiveAddress || !ingestaId) return
    setError('')
    setCargando(true)
    const r = await reintentarIngesta({ provider, address: effectiveAddress, id: ingestaId })
    if (!r.ok) {
      setCargando(false)
      return mostrarError((r.data as any)?.code || 'error')
    }
    sondeoRef.current = window.setTimeout(() => sondear(ingestaId), 2000)
  }, [provider, effectiveAddress, ingestaId, mostrarError, sondear])

  const descartar = useCallback(async () => {
    if (!provider || !effectiveAddress || !ingestaId) return
    setError('')
    const r = await borrarIngesta({ provider, address: effectiveAddress, id: ingestaId })
    if (!r.ok) return mostrarError((r.data as any)?.code || 'error')
    if (sondeoRef.current) window.clearTimeout(sondeoRef.current)
    setIngestaId(null)
    setSourceId(null)
    setTexto('')
    setTextoOriginal('')
    setEstadoDescarga('')
    setAvisos([])
    setRelatos(null)
    setCandidatoId(null)
  }, [provider, effectiveAddress, ingestaId, mostrarError])

  const generarCaso = useCallback(async () => {
    if (!provider || !effectiveAddress || !texto.trim()) return
    setError('')
    setCargando(true)
    setCandidatoId(null)
    const r = await extraerCaso({
      provider,
      address: effectiveAddress,
      texto,
      origen,
      sourceId,
      ingestaId,
      url: !ingestaId && url.trim() ? url.trim() : undefined,
    })
    setCargando(false)
    if (!r.ok || !r.data) return mostrarError((r.data as any)?.code || 'error')
    setAvisos(listaDe(r.data.avisos))
    const encontrados = Array.isArray(r.data.relatos) ? (r.data.relatos as Cualquiera[]) : []
    setRelatos(encontrados)
  }, [provider, effectiveAddress, texto, origen, sourceId, ingestaId, url, mostrarError])

  const exportar = useCallback(async () => {
    if (!provider || !effectiveAddress || !relatos) return
    setError('')
    const r = await exportarXrlat({ provider, address: effectiveAddress, relatos })
    if (!r.ok) return mostrarError((r.data as any)?.code || 'agente_caido')
    const blob = new Blob([r.texto], { type: 'application/xml' })
    const enlace = document.createElement('a')
    enlace.href = URL.createObjectURL(blob)
    enlace.download = 'caso-xrlat.xml'
    enlace.click()
    URL.revokeObjectURL(enlace.href)
  }, [provider, effectiveAddress, relatos, mostrarError])

  const crear = useCallback(async () => {
    if (!provider || !effectiveAddress || !relatos) return
    setError('')
    setPrealertaId(null)
    const titulo = textoDe((relatos[0] as Cualquiera)?.titulo) || undefined
    const r = await crearPrealerta({
      provider,
      address: effectiveAddress,
      relatos,
      titulo,
      fuente: url.trim() ? { url: url.trim() } : undefined,
    })
    if (!r.ok || !r.data) return mostrarError((r.data as any)?.code || 'error')
    setPrealertaId(r.data.id ?? null)
  }, [provider, effectiveAddress, relatos, url, mostrarError])

  const guardar = useCallback(async () => {
    if (!provider || !effectiveAddress || !relatos) return
    setError('')
    setCandidatoId(null)
    const r = await guardarCandidato({
      provider,
      address: effectiveAddress,
      ingestaId,
      texto,
      relatos,
      origen,
      consentimiento,
    })
    if (!r.ok || !r.data) return mostrarError((r.data as any)?.code || 'error')
    setCandidatoId(r.data.candidato_id ?? null)
  }, [provider, effectiveAddress, relatos, ingestaId, texto, origen, consentimiento, mostrarError])

  if (!isConnected || acceso === 'sin-wallet') {
    return (
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">{t('noWallet')}</CardContent>
        </Card>
      </main>
    )
  }

  if (acceso === 'checking') {
    return (
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">{t('checking')}</CardContent>
        </Card>
      </main>
    )
  }

  if (acceso === 'denied') {
    return (
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">{t('noAccess')}</CardContent>
        </Card>
      </main>
    )
  }

  const ocupado = cargando || ['en_cola', 'descargando', 'limpiando'].includes(estadoDescarga)

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('intro')}</p>
        {!disponible && (
          <p role="alert" className="text-sm text-destructive">{t('notAvailable')}</p>
        )}
      </header>

      <div className="flex gap-2" role="tablist" aria-label={t('title')}>
        <Button
          variant={origen === 'noticia' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setOrigen('noticia')}
          aria-pressed={origen === 'noticia'}
        >
          {t('tabNews')}
        </Button>
        <Button
          variant={origen === 'notas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setOrigen('notas')}
          aria-pressed={origen === 'notas'}
        >
          {t('tabNotes')}
        </Button>
      </div>

      {origen === 'noticia' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('tabNews')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block text-sm font-medium" htmlFor="asistente-url">
              {t('urlLabel')}
            </label>
            <input
              id="asistente-url"
              type="url"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder={t('urlPlaceholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={ocupado}
            />
            <p className="text-xs text-muted-foreground">{t('downloadedOnce')}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={traerTexto} disabled={ocupado || !url.trim()} data-testid="asistente-traer">
                {t('fetchText')}
              </Button>
              {(estadoDescarga === 'error' || estadoDescarga === 'sin_texto') && ingestaId && (
                <Button variant="outline" onClick={reintentar} disabled={ocupado}>
                  {t('retry')}
                </Button>
              )}
              {ingestaId && (
                <Button variant="ghost" onClick={descartar} disabled={ocupado} data-testid="asistente-borrar">
                  {t('discard')}
                </Button>
              )}
            </div>
            {estadoDescarga && (
              <p className="text-sm" aria-live="polite">
                {tEstados[estadoDescarga] || estadoDescarga}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{origen === 'noticia' ? t('editorLabel') : t('notesLabel')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="sr-only" htmlFor="asistente-texto">
            {origen === 'noticia' ? t('editorLabel') : t('notesLabel')}
          </label>
          <textarea
            id="asistente-texto"
            className="min-h-48 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            aria-describedby="asistente-contador"
          />
          {origen === 'notas' && (
            <p className="text-xs text-muted-foreground">{t('notesPrivacy')}</p>
          )}
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm" htmlFor="asistente-consentimiento">
              <input
                id="asistente-consentimiento"
                type="checkbox"
                className="mt-1"
                checked={consentimiento}
                onChange={(e) => setConsentimiento(e.target.checked)}
              />
              <span>{t('consent')}</span>
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span id="asistente-contador">{caracteres} {t('characters')}</span>
            {textoOriginal && (
              <Button variant="ghost" size="sm" onClick={() => setTexto(textoOriginal)}>
                {t('restore')}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={generarCaso} disabled={ocupado || !texto.trim()} data-testid="asistente-generar">
              {cargando ? t('generating') : t('generate')}
            </Button>
            {relatos && (
              <Button variant="outline" onClick={() => setRelatos(null)}>
                {t('regenerate')}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t('generationTakes')}</p>
          {avisos.length > 0 && (
            <div className="text-sm text-muted-foreground" aria-live="polite">
              <p className="font-medium">{t('warnings')}</p>
              <ul className="list-disc pl-5">
                {avisos.map((aviso, i) => (
                  <li key={i}>{aviso}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive" aria-live="assertive">
          {error}
        </p>
      )}

      {relatos && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('proposedCase')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {t('draft')}
            </p>
            {relatos.length === 0 && <p className="text-sm text-muted-foreground">{t('noCase')}</p>}
            {relatos.map((relato, indice) => (
              <article key={indice} className="space-y-3">
                <h3 className="font-medium">
                  {textoDe(relato.titulo) || `${t('case')} ${indice + 1}`}
                </h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {textoDe(relato.hechos || relato.descripcion || relato.memo)}
                </p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  {CAMPOS_DEL_CASO.map((campo) =>
                    relato[campo] ? (
                      <p key={campo}>
                        <span className="text-muted-foreground">{etiquetaCampo(campo)}: </span>
                        {textoDe(relato[campo])}
                      </p>
                    ) : null,
                  )}
                </div>
                {relato.victimas !== undefined && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">{t('victimas')}</p>
                    <p>{Array.isArray(relato.victimas) ? relato.victimas.length : textoDe(relato.victimas)}</p>
                  </div>
                )}
                {CAMPOS_DE_LISTA.map((campo) =>
                  relato[campo] ? (
                    <div key={campo} className="text-sm">
                      <p className="text-muted-foreground">{etiquetaCampo(campo)}</p>
                      <ul className="list-disc pl-5">
                        {listaDe(relato[campo]).map((valor, i) => (
                          <li key={i}>{valor}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null,
                )}
                <Separator />
              </article>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportar} data-testid="asistente-xrlat">
                {t('export')}
              </Button>
              <Button onClick={crear} data-testid="asistente-prealerta">
                {t('prealert')}
              </Button>
              <Button
                variant="secondary"
                onClick={guardar}
                disabled={origen === 'notas' && !consentimiento}
                data-testid="asistente-candidato"
              >
                {t('saveCandidate')}
              </Button>
            </div>
            {origen === 'notas' && !consentimiento && (
              <p className="text-xs text-muted-foreground">{t('consentNeeded')}</p>
            )}
            {prealertaId && (
              <p className="text-sm" aria-live="polite">
                <Badge variant="secondary">#{prealertaId}</Badge> {t('prealertCreated')}
              </p>
            )}
            {candidatoId && (
              <p className="text-sm" aria-live="polite">
                <Badge variant="secondary">#{candidatoId}</Badge> {t('candidateSaved')}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  )
}
