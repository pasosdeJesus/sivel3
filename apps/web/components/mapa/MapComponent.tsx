'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@pasosdejesus/m/shadcn-components/ui/card'
import { Button } from '@pasosdejesus/m/shadcn-components/ui/button'
import { useToast } from '@pasosdejesus/m/shadcn-components/ui/use-toast'
import { useTranslation } from '@/hooks/useTranslation'
import { requiereAvisoAcceso, topeDeFilas } from '@/lib/accesoPublico'
import { casosDeCluster } from '@/lib/mapData'
import { Badge } from '@pasosdejesus/m/shadcn-components/ui/badge'
import { Separator } from '@pasosdejesus/m/shadcn-components/ui/separator'
import { ScrollArea } from '@pasosdejesus/m/shadcn-components/ui/scroll-area'
import { Skeleton } from '@pasosdejesus/m/shadcn-components/ui/skeleton'
import {
  Navigation,
  Download,
  Layers,
  MapPin,
  Users,
  Calendar,
  FileText,
  Share2,
} from 'lucide-react'

interface MapComponentProps {
  center?: [number, number]
  zoom?: number
  filtros?: any
  onCargarConteos?: (conteos: any) => void
  isConnected?: boolean
  wallet?: string | null
  isVerified?: boolean
  preAlerts?: Array<{
    id: number
    titulo: string
    fecha: string
    departamento: string
    municipio: string
    status: string
    source_urls: string[]
    source_summary: string | null
  }>
  onPreAlertClick?: (id: number) => void
  /** Pide el pase de cuota con la billetera (`personal_sign`) y devuelve si quedó activo. */
  onActivarCuota?: () => Promise<boolean>
  /** Ventana pública del corpus (R-#22); los filtros se inicializan con ella. */
  ventana?: { desde: string | null; hasta: string | null; activa: boolean } | null
}

interface CasoDetalle {
  id: string
  titulo: string
  hechos: string
  fecha: string
  hora: string
  departamento: string
  municipio: string
  centro_poblado: string
  lugar: string
  victimas_count?: number
  presponsables: string[]
}

const sbtToastT = {
  en: { sbtTitle: '🎖️ SBT Obtained!' },
  es: { sbtTitle: '🎖️ ¡SBT Obtenido!' },
}

export default function MapComponent({
  center,
  zoom,
  filtros = {},
  onCargarConteos,
  isConnected = false,
  wallet = null,
  isVerified = false,
  preAlerts = [],
  onPreAlertClick,
  onActivarCuota,
  ventana = null,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<any>(null)
  const filtrosAnterioresRef = useRef<any>({})
  const preRef = useRef<L.LayerGroup | null>(null)
  const coordsCache = useRef<Map<number, [number, number]>>(new Map())
  const recargaTimerRef = useRef<number | null>(null)
  const ultimaCargaRef = useRef(0)
  const ultimaClaveRef = useRef('')
  const { toast } = useToast()
  const { t } = useTranslation(sbtToastT)

  type MapMode = 'casos' | 'preAlertas'
  const [mapMode, setMapMode] = useState<MapMode>('casos')
  const mapModeRef = useRef(mapMode)
  mapModeRef.current = mapMode

  const [cargando, setCargando] = useState(true)
  const [casoSeleccionado, setCasoSeleccionado] = useState<CasoDetalle | null>(
    null,
  )
  const [mostrarInfo, setMostrarInfo] = useState(false)
  const [avisoCuota, setAvisoCuota] = useState<string | null>(null)
  const [codigoSeleccionado, setCodigoSeleccionado] = useState<string | null>(null)
  // Casos que devolvió la última consulta (conteos); el aviso de acceso se decide
  // comparándolos con el tope del usuario actual (ver `lib/accesoPublico.ts`).
  const [casosConsultados, setCasosConsultados] = useState<number | null>(null)
  const [capasVisibles, setCapasVisibles] = useState<string[]>([
    'OpenStreetMap',
  ])

  const walletRef = useRef(wallet)
  walletRef.current = wallet

  const cargarDetalleCaso = useCallback(async (codigo: string) => {
    const currentWallet = walletRef.current
    setMostrarInfo(true)
    setCasoSeleccionado(null)
    setAvisoCuota(null)
    setCodigoSeleccionado(codigo)
    try {
      const response = await fetch(`/api/cases/${codigo}`)

      if (response.status === 402) {
        const datos = (await response.json().catch(() => ({}))) as { error?: string }
        setAvisoCuota(datos.error || 'La cuota gratuita de detalles se agotó.')
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const text = await response.text();
      try {
        const datos = JSON.parse(text);
        setCasoSeleccionado(datos.caso);
        // Track case view and wait for it to be recorded
        await fetch('/api/web-analytics/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_type: 'pageview', pathname: `/cases/${codigo}`, wallet: currentWallet }),
          keepalive: true,
        }).catch(() => {})
        // Check Explorer SBT eligibility (views 3+ distinct cases)
        if (currentWallet) {
          console.log(`[Explorer] Checking eligibility for ${currentWallet.slice(0,6)}...`)
          fetch('/api/credential/mint-explorer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: currentWallet }),
            keepalive: true,
          }).then(async r => {
            if (!r.ok) return
            const data = await r.json()
            if (data.minted && data.mintedSbt) {
              toast({ title: t('sbtTitle'), description: data.mintedSbt.name, duration: 4000 })
            }
          }).catch(() => {})
        };
      } catch (e) {
        console.error("Error al parsear JSON:", e);
        console.error("Respuesta recibida del servidor:", text);
        // Opcional: mostrar un error en la UI en lugar de cerrar
      }

    } catch (error) {
      console.error('Error cargando detalle:', error)
      setMostrarInfo(false) // Cerrar solo en caso de error de red
    }
  }, [])

  const cargarCasos = useCallback(async () => {
    if (!mapInstanceRef.current) return

    if (mapModeRef.current !== 'casos') {
      markersRef.current?.clearLayers()
      setCargando(false)
      return
    }

    setCargando(true)
    try {
      // Only the viewport is requested: the server aggregates by zoom, so the
      // payload stays proportional to what the screen can draw (issue 69).
      const map = mapInstanceRef.current
      const bounds = map.getBounds()

      // Leaflet returns a point while the container has no size (first render);
      // asking the API would be a 400 and the map would stay empty.
      if (
        !bounds.isValid() ||
        bounds.getEast() - bounds.getWest() < 1e-6 ||
        bounds.getNorth() - bounds.getSouth() < 1e-6
      ) {
        setCargando(false)
        return
      }

      const bbox = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ]
        .map((value) => value.toFixed(5))
        .join(',')
      const zoom = map.getZoom()

      // Several effects ask for a reload on mount and on filter change; the key
      // keeps one request per viewport (the server also answers 304).
      const clave = `${bbox}|${zoom}|${JSON.stringify(filtros)}`
      if (clave === ultimaClaveRef.current) {
        setCargando(false)
        return
      }
      ultimaClaveRef.current = clave

      const params = new URLSearchParams({ bbox, zoom: String(zoom) })
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.set(key, String(value))
      })

      const response = await fetch(`/api/cases/datos-osm?${params.toString()}`)
      if (!response.ok) {
        ultimaClaveRef.current = ''
        throw new Error(`datos-osm HTTP ${response.status}`)
      }
      const datos = await response.json()
      ultimaCargaRef.current = Date.now()

      if (onCargarConteos) {
        const conteosUrl = `/api/cases/counts?${new URLSearchParams(filtros).toString()}`
        const conteosRes = await fetch(conteosUrl)
        // A failed counts request returns an error body (no `casos`/`actos`…);
        // passing it on crashed the counts widget. Only propagate a valid payload.
        if (conteosRes.ok) {
          const conteosData = await conteosRes.json()
          onCargarConteos(conteosData)
          // R-#22 + issue 69: la vista por omisión ya cabe en el tope, así que el
          // aviso de acceso sólo aparece si el usuario amplía el rango de fechas.
          setCasosConsultados(
            Number(conteosData?.casos ?? datos?.total ?? 0) || null,
          )
        } else {
          console.error('Error cargando conteos:', conteosRes.status)
        }
      }

      markersRef.current?.clearLayers()
      const listaMarcadores: L.Marker[] = []
      const respuesta = datos.respuesta || {}
      const celdas = datos.celdas || []

      for (const celda of celdas) {
        const lat = Number(celda.latitud)
        const lng = Number(celda.longitud)
        const n = Number(celda.n)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

        const icono = L.divIcon({
          className: 'sivel3-celda',
          html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;background:rgba(185,28,28,0.88);color:#fff;font-size:12px;font-weight:600;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${n}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        })
        const marcador = L.marker([lat, lng], { icon: icono, n } as L.MarkerOptions)
        marcador.on('click', () => {
          const currentMap = mapInstanceRef.current
          if (!currentMap) return
          currentMap.setView([lat, lng], Math.min(currentMap.getZoom() + 2, 12))
        })
        listaMarcadores.push(marcador)
      }

      for (const codigo in respuesta) {
        if (respuesta.hasOwnProperty(codigo)) {
          const caso = respuesta[codigo]
          const lat = Number(caso.latitud)
          const lng = Number(caso.longitud)

          if (!isNaN(lat) && !isNaN(lng)) {
            const marcador = L.marker([lat, lng])
            marcador.on('click', () => cargarDetalleCaso(codigo))
            listaMarcadores.push(marcador)
          }
        }
      }
      markersRef.current?.addLayers(listaMarcadores)
    } catch (error) {
      ultimaClaveRef.current = ''
      setCasosConsultados(null)
      console.error('Error cargando casos:', error)
    } finally {
      setCargando(false)
    }
  }, [filtros, onCargarConteos, cargarDetalleCaso])

  const cargarCasosRef = useRef(cargarCasos)
  cargarCasosRef.current = cargarCasos

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      zoomControl: false,
      minZoom: 2,
    })
    // The initial view fits the country: a fixed center+zoom clipped the
    // southern cases (Amazonas) and the map then drew fewer cases than the
    // counts legible in the same screen. Callers may still pass center/zoom.
    if (center && zoom !== undefined) {
      map.setView(center, zoom)
    } else {
      map.fitBounds(L.latLngBounds([-4.6, -79.6], [13.6, -66.3]), { padding: [12, 12] })
    }

    const capasBase = {
      OpenStreetMap: L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '&copy; Contribuyentes de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' },
      ),
      'Satelite (ArcGIS)': L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ),
      'Oscuro (CartoDB)': L.tileLayer(
        'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
      ),
    }

    const capasSuperpuestas = {
      'Transporte (OpenPtmap)': L.tileLayer(
        'http://www.openptmap.org/tiles/{z}/{x}/{y}.png',
      ),
    }

    capasBase['OpenStreetMap'].addTo(map)
    L.control.layers(capasBase, capasSuperpuestas, { position: 'topleft' }).addTo(map)
    L.control.zoom({ position: 'topleft' }).addTo(map)
    L.control.scale({ imperial: false }).addTo(map)
    
    const locateControl = new L.Control({ position: 'topleft' })
    locateControl.onAdd = function () {
      const div = L.DomUtil.create('div', 'leaflet-control leaflet-bar')
      div.innerHTML = `
        <button 
          title="Mi ubicación"
          class="w-10 h-10 bg-white border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
        </button>
      `
      div.onclick = () => map.locate({ setView: true, maxZoom: 13 })
      return div
    }
    locateControl.addTo(map)

    markersRef.current = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 50,
      // The cells already are aggregates: a cluster bubble must add their `n`, not
      // count how many cells fell inside. Counting cells showed a number that
      // matched neither the cases nor anything the reader could interpret.
      // A single red for every bubble: one case is as grave as a thousand, so the
      // colour must not rank severity; the size only helps to read volume.
      iconCreateFunction: (cluster: any) => {
        const n = casosDeCluster(cluster.getAllChildMarkers())
        const tamano = n >= 1000 ? 48 : n >= 100 ? 42 : n >= 10 ? 36 : 30
        return L.divIcon({
          className: 'sivel3-cluster',
          html: `<div style="display:flex;align-items:center;justify-content:center;width:${tamano}px;height:${tamano}px;border-radius:9999px;background:rgba(185,28,28,0.92);color:#fff;font-size:12px;font-weight:600;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${n}</div>`,
          iconSize: [tamano, tamano],
          iconAnchor: [tamano / 2, tamano / 2],
        })
      },
    })
    map.addLayer(markersRef.current)
    mapInstanceRef.current = map

    // The container may not have its final size yet; resize and load again.
    map.invalidateSize()
    cargarCasos()

    map.on('baselayerchange', (e: any) => setCapasVisibles([e.name]))

    // Reload on pan/zoom, debounced; the response is viewport-bounded (issue 69).
    const programarRecarga = () => {
      if (Date.now() - ultimaCargaRef.current < 800) return
      if (recargaTimerRef.current) window.clearTimeout(recargaTimerRef.current)
      recargaTimerRef.current = window.setTimeout(() => {
        map.invalidateSize()
        cargarCasosRef.current()
      }, 400)
    }
    map.on('moveend', programarRecarga)
    map.on('resize', programarRecarga)
    const primerAjuste = window.setTimeout(() => {
      map.invalidateSize()
      cargarCasosRef.current()
    }, 120)

    return () => {
      window.clearTimeout(primerAjuste)
      if (recargaTimerRef.current) window.clearTimeout(recargaTimerRef.current)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, []) // Dependencias vacías para que se ejecute solo una vez

  // Toggle Casos/PreAlertas
  useEffect(() => {
    if (!mapInstanceRef.current) return
    if (mapMode === 'casos') {
      cargarCasosRef.current()
      preRef.current?.clearLayers()
    } else {
      markersRef.current?.clearLayers()
      setCargando(false)
    }
  }, [mapMode])

  // Pre-alert markers (🤖 grey=pending, green=reserved)
  const defaultCoords: Record<string, [number, number]> = {
    putumayo: [1.15, -76.6], cauca: [2.45, -76.6], antioquia: [6.55, -75.8],
    bogota: [4.61, -74.08], cundinamarca: [5.0, -74.2], nariño: [1.2, -77.3],
    valle: [3.4, -76.5], santander: [7.1, -73.1], 'norte de santander': [8.0, -72.5],
    arauca: [6.9, -70.7], meta: [3.3, -73.0], huila: [2.5, -75.7], tolima: [4.1, -75.2],
    caldas: [5.2, -75.5], risaralda: [4.8, -75.7], quindio: [4.5, -75.7],
    boyaca: [5.6, -73.3], bolivar: [9.1, -74.4], magdalena: [10.5, -74.1],
    cesar: [9.3, -73.5], cordoba: [8.1, -75.6], sucre: [9.1, -75.1],
    atlantico: [10.8, -74.9], guajira: [11.5, -72.5], choco: [5.7, -76.7],
    casanare: [5.3, -71.5],
  }

  // Assign coords for pre-alerts — prefer real coordinates, fallback to defaults
  for (const pa of preAlerts) {
    if (coordsCache.current.has(pa.id)) continue
    const jsonData = (pa as any).json_data
    if (jsonData?.latitud && jsonData?.longitud) {
      const lat = parseFloat(jsonData.latitud)
      const lng = parseFloat(jsonData.longitud)
      if (!isNaN(lat) && !isNaN(lng)) {
        coordsCache.current.set(pa.id, [lat, lng])
        continue
      }
    }
    const dept = (pa.departamento || '').toLowerCase().trim()
    const def = defaultCoords[dept]
    if (def) coordsCache.current.set(pa.id, def)
  }

  useEffect(() => {
    if (!mapInstanceRef.current || !isConnected) return
    if (mapModeRef.current !== 'preAlertas') {
      preRef.current?.clearLayers()
      return
    }
    if (!preRef.current) {
      preRef.current = L.layerGroup().addTo(mapInstanceRef.current)
    }
    preRef.current.clearLayers()

    const greyIcon = L.divIcon({
      html: '<div style="font-size:22px">🔎</div>',
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })
    const greenIcon = L.divIcon({
      html: '<div style="font-size:22px;filter:hue-rotate(90deg)">🔎</div>',
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })

    const bellIcon = L.divIcon({
      html: '<div style="font-size:22px">🔔</div>',
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })

    const pushpinIcon = L.divIcon({
      html: '<div style="font-size:22px;filter:hue-rotate(120deg)">📍</div>',
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })

    // Group by coordinate to offset overlapping pre-alerts
    const coordCount = new Map<string, number>()
    for (const pa of preAlerts) {
      const coords = coordsCache.current.get(pa.id)
      if (!coords) continue
      const key = `${coords[0].toFixed(5)},${coords[1].toFixed(5)}`
      const idx = coordCount.get(key) || 0
      coordCount.set(key, idx + 1)
      // Pseudo-random offset from preAlert ID for natural distribution
      const seed = (pa.id * 2654435761) & 0xffffffff
      const angle = ((seed % 360) * Math.PI) / 180
      const dist = 0.002 + ((seed >> 16) % 100) * 0.00004 // 0.002° to 0.006°
      const lat = coords[0] + Math.cos(angle) * dist
      const lng = coords[1] + Math.sin(angle) * dist
      let icon
      if (pa.status === 'paid') {
        icon = pushpinIcon
      } else if (pa.status === 'converted' || pa.status === 'pending_reward' || pa.status === 'rejected') {
        icon = bellIcon
      } else if (pa.status === 'reserved') {
        icon = greenIcon
      } else {
        icon = greyIcon
      }
      const marker = L.marker([lat, lng], { icon })
      marker.on('click', () => onPreAlertClick?.(pa.id))
      preRef.current.addLayer(marker)
    }
  }, [preAlerts, isConnected, onPreAlertClick, mapMode])

  useEffect(() => {
    const filtrosCambiaron = JSON.stringify(filtros) !== JSON.stringify(filtrosAnterioresRef.current);
    if (mapInstanceRef.current && filtrosCambiaron) {
      filtrosAnterioresRef.current = { ...filtros };
      cargarCasos();
    }
  }, [filtros, cargarCasos]);

  const descargarCapaCasos = () => {
    if (!markersRef.current) return
    const geojson = markersRef.current.toGeoJSON()
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geojson))
    const link = document.createElement('a')
    link.setAttribute('href', dataStr)
    link.setAttribute('download', 'casos.geojson')
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const compartirMapa = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Mapa de Casos - SIVeL',
        text: 'Explora los casos documentados en el mapa interactivo',
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Enlace copiado al portapapeles')
    }
  }

  const avisoAcceso =
    casosConsultados !== null &&
    requiereAvisoAcceso(
      casosConsultados,
      { desde: filtros?.['filtro[fechaini]'], hasta: filtros?.['filtro[fechafin]'] },
      ventana,
      Boolean(wallet),
    )
      ? { casos: casosConsultados, tope: topeDeFilas(Boolean(wallet)) }
      : null

  return (
    <div className="relative h-full">
      {/* Mode toggle */}
      <div className="absolute top-2 left-12 z-30 flex gap-1 bg-white/90 backdrop-blur rounded-lg p-1 shadow">
        <button
          onClick={() => setMapMode('casos')}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            mapMode === 'casos' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          Casos
        </button>
        {isConnected && (
          <button
            onClick={() => setMapMode('preAlertas')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              mapMode === 'preAlertas' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            🔎 PreAlertas
          </button>
        )}
        {isConnected && (
          <a
            href={window.location.pathname.replace(/\/cases\/osmmap.*/, '/dashboard')}
            className="px-3 py-1 text-sm rounded hover:bg-gray-100 text-gray-700 flex items-center gap-1"
            title="Mis Pre-Alertas"
          >
            📋
          </a>
        )}
      </div>

      {avisoAcceso && (
        <div
          className="absolute bottom-4 left-4 z-30 max-w-sm rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 shadow"
          role="status"
          data-testid="mapa-aviso-acceso"
        >
          <p>
            Esta selección reúne <strong>{avisoAcceso.casos.toLocaleString('es-CO')}</strong> casos,
            más del tope de <strong>{avisoAcceso.tope.toLocaleString('es-CO')}</strong> filas
            previsto para tu acceso.
          </p>
          {wallet ? (
            onActivarCuota && (
              <div className="mt-2">
                <button
                  type="button"
                  className="rounded-md border border-amber-400 bg-white px-3 py-1 text-xs"
                  data-testid="mapa-aviso-activar-cuota"
                  onClick={() => void onActivarCuota()}
                >
                  Activar cuota con mi billetera
                </button>
              </div>
            )
          ) : (
            <p className="mt-1 text-xs">
              Conecta tu billetera (arriba) para ampliar tu cuota.
            </p>
          )}
        </div>
      )}

      <div
        ref={mapRef}
        className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg border border-gray-300 relative z-10"
      />

      {cargando && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20 rounded-lg">
           <div className="text-center">
            <Skeleton className="h-12 w-12 mx-auto rounded-full" />
            <Skeleton className="h-4 w-48 mt-4 mx-auto" />
            <Skeleton className="h-4 w-32 mt-2 mx-auto" />
          </div>
        </div>
      )}

      {mostrarInfo && (
        <Card className="absolute top-4 right-4 w-80 max-h-[90vh] z-30 shadow-xl flex flex-col">
          <CardHeader className="pb-3 relative flex-shrink-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Detalles del Caso
            </CardTitle>
            <button
              onClick={() => setMostrarInfo(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 text-2xl"
            >
              &times;
            </button>
          </CardHeader>

          <ScrollArea className="flex-grow px-4" style={{overflow: 'auto'}}>
             {avisoCuota ? (
                <div className="space-y-3 p-2" role="alert">
                  <p className="text-sm text-gray-700">{avisoCuota}</p>
                  {wallet && onActivarCuota && codigoSeleccionado && (
                    <button
                      type="button"
                      className="w-full rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                      data-testid="mapa-activar-cuota"
                      onClick={async () => {
                        const activado = await onActivarCuota()
                        if (activado) await cargarDetalleCaso(codigoSeleccionado)
                      }}
                    >
                      Activar cuota con mi billetera
                    </button>
                  )}
                </div>
             ) : !casoSeleccionado ? (
                <div className="space-y-4 p-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Separator/>
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
             ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      {casoSeleccionado.titulo}
                    </h3>
                    <p className="text-sm text-gray-700">
                      {casoSeleccionado.hechos}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    {casoSeleccionado.fecha && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>{casoSeleccionado.fecha}</span>
                      </div>
                    )}
                    {casoSeleccionado.departamento && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{casoSeleccionado.departamento}, {casoSeleccionado.municipio}</span>
                      </div>
                    )}
                  </div>

                  {typeof casoSeleccionado.victimas_count === 'number' && casoSeleccionado.victimas_count > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Víctimas
                        </h4>
                        <p className="text-sm text-gray-700">{casoSeleccionado.victimas_count}</p>
                      </div>
                    </>
                  )}

                  {casoSeleccionado.presponsables && casoSeleccionado.presponsables.length > 0 && (
                     <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Presuntos Responsables</h4>
                        <ul className="text-sm space-y-1 list-disc pl-5">
                          {casoSeleccionado.presponsables.map((pr, i) => <li key={i}>{pr}</li>)}
                        </ul>
                      </div>
                    </>
                  )}
                  
                  <div className="pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(`https://base.nocheyniebla.org/casos/${casoSeleccionado.id}`, '_blank')}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Ver Ficha Completa
                    </Button>
                   </div>
                </div>
             )}
          </ScrollArea>
           {casoSeleccionado && (
             <CardContent className="pt-4 border-t flex-shrink-0">
                <span className="text-xs text-gray-500">
                  Código: {casoSeleccionado.id}
                </span>
             </CardContent>
           )}
        </Card>
      )}

      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={compartirMapa}
          className="shadow-md bg-white"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Compartir
        </Button>

        {isConnected && (
          <Button
            variant="outline"
            size="sm"
            onClick={descargarCapaCasos}
            className="shadow-md bg-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        )}
      </div>

      <div className="absolute bottom-4 left-4 z-20">
        <Badge variant="secondary" className="shadow-md bg-white/80 backdrop-blur-sm">
          <Layers className="h-3 w-3 mr-1" />
          {capasVisibles[0]}
        </Badge>
      </div>
    </div>
  )
}
