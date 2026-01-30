'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigation, Download, Layers, Filter, MapPin, Users, Calendar, FileText, Share2 } from 'lucide-react';

interface MapComponentProps {
  center?: [number, number];
  zoom?: number;
  filtros?: any;
  onCargarConteos?: (conteos: any) => void;
}

interface CasoDetalle {
  id: string;
  titulo: string;
  hechos: string;
  fecha: string;
  hora: string;
  departamento: string;
  municipio: string;
  centro_poblado: string;
  lugar: string;
  victimas: string[];
  presponsables: string[];
}

export default function MapComponent({ 
  center = [4.6682, -74.071], 
  zoom = 6,
  filtros = {},
  onCargarConteos 
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<any>(null);
  const infoRef = useRef<any>(null);
  
  const [cargando, setCargando] = useState(true);
  const [casoSeleccionado, setCasoSeleccionado] = useState<CasoDetalle | null>(null);
  const [mostrarInfo, setMostrarInfo] = useState(false);
  const [capasVisibles, setCapasVisibles] = useState<string[]>(['OpenStreetMap']);

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      minZoom: 2
    }).setView(center, zoom);

    // Capas base (igual que Rails)
    const capasBase = {
      "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; Contribuyentes de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }),
      "Satelite (ArcGIS)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'),
      "Oscuro (CartoDB)": L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png')
    };

    // Capas superpuestas (igual que Rails)
    const capasSuperpuestas = {
      "Transporte (OpenPtmap)": L.tileLayer('http://www.openptmap.org/tiles/{z}/{x}/{y}.png'),
    };

    // Añadir capa por defecto
    capasBase["OpenStreetMap"].addTo(map);

    // Control de capas
    const controlCapas = L.control.layers(capasBase, capasSuperpuestas, {
      position: 'topleft'
    }).addTo(map);

    // Control de zoom
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Escala
    L.control.scale({ imperial: false }).addTo(map);

    // Control de ubicación
    const locateControl = new L.Control({ position: 'topleft' });
    locateControl.onAdd = function() {
      const div = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
      div.innerHTML = `
        <button 
          title="Mi ubicación"
          class="w-10 h-10 bg-white border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <Navigation className="w-5 h-5" />
        </button>
      `;
      div.onclick = () => map.locate({setView: true, maxZoom: 13});
      return div;
    };
    locateControl.addTo(map);

    // Inicializar cluster de marcadores
    markersRef.current = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 50
    });

    map.addLayer(markersRef.current);
    mapInstanceRef.current = map;

    // Cargar casos iniciales
    cargarCasos();

    // Escuchar cambios en capas
    map.on('baselayerchange', (e: any) => {
      setCapasVisibles([e.name]);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Cargar casos desde API
  const cargarCasos = useCallback(async () => {
    if (!mapInstanceRef.current) return;

    setCargando(true);
    try {
      let url = '/api/casos/datos-osm?';
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) {
          url += `${key}=${value}&`;
        }
      });

      const response = await fetch(url);
      const datos = await response.json();
      
      // Actualizar conteos
      if (onCargarConteos) {
        onCargarConteos({
          casos: datos.casos || 0,
          victimas: datos.victimas || 0,
          victimizaciones: datos.victimizaciones || 0,
          actos: datos.actos || 0
        });
      }
      
      // Limpiar marcadores anteriores
      markersRef.current?.clearLayers();
      
      const listaMarcadores: L.Marker[] = [];
      const respuesta = datos.respuesta;
      
      for (const codigo in respuesta) {
        if (respuesta.hasOwnProperty(codigo)) {
          const caso = respuesta[codigo];
          const lat = parseFloat(caso.latitud);
          const lng = parseFloat(caso.longitud);
          
          if (isNaN(lat) || isNaN(lng)) continue;
          
          // Crear marcador simple (sin colores por categoría)
          const marcador = L.marker([lat, lng]);
          
          // Popup simple igual a Rails
          marcador.bindPopup(`
            <div class="p-2 min-w-[200px]">
              <h4 class="font-bold text-sm mb-1">${caso.titulo || 'Caso ' + codigo}</h4>
              <p class="text-xs text-gray-600">${caso.departamento || ''}</p>
              <button 
                onclick="window.verDetalleCaso('${codigo}')"
                class="mt-2 w-full py-1 px-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
              >
                Ver detalles
              </button>
            </div>
          `);
          
          // Al hacer clic
          marcador.on('click', async () => {
            await cargarDetalleCaso(codigo);
          });
          
          listaMarcadores.push(marcador);
        }
      }
      
      // Añadir todos los marcadores al cluster
      markersRef.current?.addLayers(listaMarcadores);
      
    } catch (error) {
      console.error('Error cargando casos:', error);
    } finally {
      setCargando(false);
    }
  }, [filtros, onCargarConteos]);

  // Cargar detalle de caso
  const cargarDetalleCaso = async (codigo: string) => {
    try {
      const response = await fetch(`/casos/${codigo}.json`);
      const datos = await response.json();
      const caso = datos.caso;
      
      setCasoSeleccionado({
        id: caso.id || codigo,
        titulo: caso.titulo || '',
        hechos: caso.hechos || '',
        fecha: caso.fecha || '',
        hora: caso.hora || '',
        departamento: caso.departamento || '',
        municipio: caso.municipio || '',
        centro_poblado: caso.centro_poblado || '',
        lugar: caso.lugar || '',
        victimas: Array.isArray(caso.victimas) ? caso.victimas : [],
        presponsables: Array.isArray(caso.presponsables) ? caso.presponsables : []
      });
      
      setMostrarInfo(true);
      
    } catch (error) {
      console.error('Error cargando detalle:', error);
    }
  };

  // Exportar GeoJSON
  const descargarCapaCasos = () => {
    if (!markersRef.current) return;
    
    const geojson = markersRef.current.toGeoJSON();
    const dataStr = "data:text/json;charset=utf-8," + 
      encodeURIComponent(JSON.stringify(geojson));
    
    const link = document.createElement('a');
    link.setAttribute("href", dataStr);
    link.setAttribute("download", "casos.geojson");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Compartir
  const compartirMapa = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mapa de Casos - Noche y Niebla',
          text: 'Explora los casos documentados en el mapa interactivo',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error al compartir:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Enlace copiado al portapapeles');
    }
  };

  // Recargar casos cuando cambian filtros
  useEffect(() => {
    if (mapInstanceRef.current) {
      cargarCasos();
    }
  }, [filtros, cargarCasos]);

  return (
    <div className="relative h-full">
      {/* Mapa */}
      <div 
        ref={mapRef} 
        className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg border border-gray-300 relative z-10"
      />
      
      {/* Overlay de carga */}
      {cargando && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20 rounded-lg">
          <div className="text-center">
            <Skeleton className="h-12 w-12 mx-auto rounded-full" />
            <Skeleton className="h-4 w-48 mt-4 mx-auto" />
            <Skeleton className="h-4 w-32 mt-2 mx-auto" />
          </div>
        </div>
      )}
      
      {/* Panel de información del caso (similar a Rails) */}
      {mostrarInfo && casoSeleccionado && (
        <Card className="absolute top-4 right-4 w-80 max-h-[80vh] z-30 shadow-xl">
          <CardHeader className="pb-3 relative">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Detalles del Caso
            </CardTitle>
            <CardDescription>Información completa del caso seleccionado</CardDescription>
            <button
              onClick={() => setMostrarInfo(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </CardHeader>
          
          <ScrollArea className="max-h-[60vh] px-4">
            <div className="space-y-4">
              {/* Descripción */}
              <div>
                <h3 className="font-semibold text-lg mb-2">{casoSeleccionado.titulo}</h3>
                <p className="text-sm text-gray-700">{casoSeleccionado.hechos}</p>
              </div>
              
              <Separator />
              
              {/* Datos básicos */}
              <div className="space-y-2 text-sm">
                {casoSeleccionado.fecha && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>Fecha: {casoSeleccionado.fecha}</span>
                  </div>
                )}
                
                {casoSeleccionado.departamento && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>Departamento: {casoSeleccionado.departamento}</span>
                  </div>
                )}
                
                {casoSeleccionado.municipio && (
                  <div>
                    <span className="text-gray-600">Municipio: </span>
                    <span>{casoSeleccionado.municipio}</span>
                  </div>
                )}
                
                {casoSeleccionado.lugar && (
                  <div>
                    <span className="text-gray-600">Lugar: </span>
                    <span>{casoSeleccionado.lugar}</span>
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Víctimas */}
              {casoSeleccionado.victimas.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Víctimas
                  </h4>
                  <ul className="text-sm space-y-1">
                    {casoSeleccionado.victimas.map((victima, index) => (
                      <li key={index} className="text-gray-700">{victima}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Presuntos responsables */}
              {casoSeleccionado.presponsables.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Presuntos Responsables</h4>
                  <ul className="text-sm space-y-1">
                    {casoSeleccionado.presponsables.map((pr, index) => (
                      <li key={index} className="text-gray-700">{pr}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Acciones */}
              <div className="pt-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(`/casos/${casoSeleccionado.id}`, '_blank')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Ver completo
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
          
          <CardContent className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Código: {casoSeleccionado.id}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (mapInstanceRef.current && casoSeleccionado) {
                    // Centrar en el caso
                    const caso = Object.values(markersRef.current?._layers || {})
                      .find((m: any) => m.options.title?.includes(casoSeleccionado.id));
                    
                    if (caso) {
                      mapInstanceRef.current.setView(
                        (caso as L.Marker).getLatLng(),
                        13
                      );
                    }
                  }
                  setMostrarInfo(false);
                }}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Centrar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Controles flotantes superiores */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={compartirMapa}
          className="shadow-md"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Compartir
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={descargarCapaCasos}
          className="shadow-md"
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>
      
      {/* Indicador de capa activa */}
      <div className="absolute bottom-4 left-4 z-20">
        <Badge variant="secondary" className="shadow-md">
          <Layers className="h-3 w-3 mr-1" />
          {capasVisibles[0]}
        </Badge>
      </div>
    </div>
  );
}
