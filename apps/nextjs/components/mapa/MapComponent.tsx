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
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
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
  victimas: string[]
  presponsables: string[]
}

export default function MapComponent({
  center = [4.6682, -74.071],
  zoom = 6,
  filtros = {},
  onCargarConteos,
  isConnected = false,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<any>(null)
  const filtrosAnterioresRef = useRef<any>({})

  const [cargando, setCargando] = useState(true)
  const [casoSeleccionado, setCasoSeleccionado] = useState<CasoDetalle | null>(
    null,
  )
  const [mostrarInfo, setMostrarInfo] = useState(false)
  const [capasVisibles, setCapasVisibles] = useState<string[]>([
    'OpenStreetMap',
  ])

  const cargarDetalleCaso = useCallback(async (codigo: string) => {
    setMostrarInfo(true)
    setCasoSeleccionado(null)
    try {
      const response = await fetch(`/api/cases/${codigo}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const text = await response.text();
      try {
        const datos = JSON.parse(text);
        setCasoSeleccionado(datos.caso);
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

    setCargando(true)
    try {
      let url = '/api/cases/datos-osm?'
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) {
          url += `${key}=${value}&`
        }
      })

      const response = await fetch(url)
      const datos = await response.json()

      if (onCargarConteos) {
        const conteosUrl = `/api/cases/counts?${new URLSearchParams(filtros).toString()}`
        const conteosRes = await fetch(conteosUrl)
        const conteosData = await conteosRes.json()
        onCargarConteos(conteosData)
      }

      markersRef.current?.clearLayers()
      const listaMarcadores: L.Marker[] = []
      const respuesta = datos.respuesta

      for (const codigo in respuesta) {
        if (respuesta.hasOwnProperty(codigo)) {
          const caso = respuesta[codigo]
          const lat = parseFloat(caso.latitud)
          const lng = parseFloat(caso.longitud)

          if (!isNaN(lat) && !isNaN(lng)) {
            const marcador = L.marker([lat, lng])
            marcador.on('click', () => cargarDetalleCaso(codigo))
            listaMarcadores.push(marcador)
          }
        }
      }
      markersRef.current?.addLayers(listaMarcadores)
    } catch (error) {
      console.error('Error cargando casos:', error)
    } finally {
      setCargando(false)
    }
  }, [filtros, onCargarConteos, cargarDetalleCaso])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      zoomControl: false,
      minZoom: 2,
    }).setView(center, zoom)

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
    })
    map.addLayer(markersRef.current)
    mapInstanceRef.current = map

    cargarCasos()

    map.on('baselayerchange', (e: any) => setCapasVisibles([e.name]))

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, []) // Dependencias vacías para que se ejecute solo una vez

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

  return (
    <div className="relative h-full">
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
             {!casoSeleccionado ? (
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

                  {casoSeleccionado.victimas && casoSeleccionado.victimas.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Víctimas
                        </h4>
                        <ul className="text-sm space-y-1 list-disc pl-5">
                          {casoSeleccionado.victimas.map((v, i) => <li key={i}>{v}</li>)}
                        </ul>
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
