'use client';

import { Filter, Info } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useParams } from 'next/navigation';
import { useEffect, useState} from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useWallet } from '@/contexts/WalletContext';

// Componente dinámico del mapa
const MapComponent = dynamic(() => import('@/components/mapa/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Skeleton className="h-12 w-12 mx-auto rounded-full" />
        <Skeleton className="h-4 w-48 mt-4 mx-auto" />
        <Skeleton className="h-4 w-32 mt-2 mx-auto" />
      </div>
    </div>
  ),
});

export default function OSMMapPage() {
  const { t, i18n } = useTranslation('common');
  console.log("OJO t=", t)
  console.log("OJO i18n=", i18n)
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = params.locale as string || 'en'; // Obtiene el locale de la URL

  const cambiarIdioma = (nuevoLocale: string) => {
    const nuevaRuta = pathname.replace(`/${currentLocale}/`, `/${nuevoLocale}/`);
    router.push(nuevaRuta);
    // i18n.changeLanguage(nuevoLocale);
  };

  const { isConnected } = useWallet();
  const [cargando, setCargando] = useState(true);
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);
  
  // Conteos
  const [conteos, setConteos] = useState({
    casos: 0,
    victimas: 0,
    victimizaciones: 0,
    actos: 0
  });
  
  // Filtros básicos (igual que API Rails)
  const [filtros, setFiltros] = useState({
    'filtro[fechaini]': '',
    'filtro[fechafin]': '',
    'filtro[departamento_id]': '',
    'filtro[presponsable_id]': '',
    'filtro[categoria_id]': ''
  });
  
  // Datos para selects
  const [departamentos, setDepartamentos] = useState<Array<{id: string, nombre: string}>>([]);
  const [categorias, setCategorias] = useState<Array<{id: string, nombre: string}>>([]);
  const [presponsables, setPresponsables] = useState<Array<{id: string, nombre: string}>>([]);
  
  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      setCargando(true);

      try {
        // Cargar opciones para selects (si existen endpoints)
        const [deptRes, catRes, presRes] = await Promise.all([
          fetch('/api/departments'),
          fetch('/api/categories'),
          fetch('/api/alleged-perpetrators')
        ]);

        setDepartamentos(await deptRes.json());
        setCategorias(await catRes.json());
        setPresponsables(await presRes.json());


      } catch (error) {
        console.error('Error cargando datos:', error);
        setDepartamentos([{ id: '1', nombre: 'Cauca' }]);
        setCategorias([{ id: '1', nombre: 'Desaparición' }]);
        setPresponsables([{ id: '1', nombre: 'Grupo A' }]);
      } finally {
        setCargando(false);
      }
    };
    
    cargarDatosIniciales();
  }, []);
  
  // Manejar cambio de filtros
  const handleFiltroChange = (key: string, value: string) => {
    if (value === "separator") return;
    setFiltros(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Aplicar filtros
  const aplicarFiltros = () => {
    console.log('Aplicando filtros:', filtros);
    // Los filtros se pasan automáticamente al MapComponent
  };
  
  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      'filtro[fechaini]': '',
      'filtro[fechafin]': '',
      'filtro[departamento_id]': '',
      'filtro[presponsable_id]': '',
      'filtro[categoria_id]': ''
    });
  };
  
  // Actualizar conteos desde el mapa
  const handleCargarConteos = (nuevosConteos: any) => {
    setConteos(nuevosConteos);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Selector de idioma en esquina superior derecha */}
      <div className="absolute top-4 right-4 z-50">
        <select 
          value={currentLocale}
          onChange={(e) => cambiarIdioma(e.target.value)}
          className="px-3 py-1 border rounded-md bg-white text-sm"
        >
          <option value="en">English</option>
          <option value="es">Español</option>
          {/* Agregar más idiomas después */}
        </select>
      </div>
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar izquierda - Conteos y Filtros */}
          <div className="lg:col-span-1 space-y-6">
            {/* Tarjeta de Conteos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  📊 {t('counts')}
                </CardTitle>
                <CardDescription>
                  {t('totalsByFilters')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cargando ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">{t('cases')}</span>
                      <Badge variant="secondary">{conteos.casos.toLocaleString()}</Badge>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">{t('victims')}</span>
                      <Badge variant="secondary">{conteos.victimas.toLocaleString()}</Badge>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">{t('victimizations')}</span>
                      <Badge variant="secondary">{conteos.victimizaciones.toLocaleString()}</Badge>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">{t('acts')}</span>
                      <Badge variant="secondary">{conteos.actos.toLocaleString()}</Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            {/* Tarjeta de Filtros */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                    {t('filters')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Fila 1: Fechas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="campo-desde" className="text-primary">
                      {t('from')}
                    </Label>
                    <Input
                      id="campo-desde"
                      name="desde"
                      type="date"
                      value={filtros['filtro[fechaini]']}
                      onChange={(e) => handleFiltroChange('filtro[fechaini]', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="campo-hasta" className="text-primary">
                     {t('to')}
                    </Label>
                    <Input
                      id="campo-hasta"
                      name="hasta"
                      type="date"
                      value={filtros['filtro[fechafin]']}
                      onChange={(e) => handleFiltroChange('filtro[fechafin]', e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Fila 2: Departamentos, P. Responsable, Violencia */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Departamento */}
                  <div className="space-y-2">
                    <Label htmlFor="departamento">
                      {t('department')}
                    </Label>
                    <Select 
                      value={filtros['filtro[departamento_id]']}
                      onValueChange={(value) => handleFiltroChange('filtro[departamento_id]', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('showAll')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">{t('showAll')}</SelectItem>
                        <SelectItem value="separator" disabled>-----------------------</SelectItem>
                        {departamentos.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* P. Responsable */}
                  <div className="space-y-2">
                    <Label htmlFor="presponsable">
                      {t('allegedPerpetrator')}
                    </Label>
                    <Select 
                      value={filtros['filtro[presponsable_id]']}
                      onValueChange={(value) => handleFiltroChange('filtro[presponsable_id]', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('showAll')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">{t('showAll')}</SelectItem>
                        <SelectItem value="separator" disabled>-----------------------</SelectItem>
                        {presponsables.map(pr => (
                          <SelectItem key={pr.id} value={pr.id}>
                            {pr.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Violencia (Categoría) */}
                  <div className="space-y-2">
                    <Label htmlFor="tvio">
                      {t('violence')}
                    </Label>
                    <Select 
                      value={filtros['filtro[categoria_id]']}
                      onValueChange={(value) => handleFiltroChange('filtro[categoria_id]', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('showAll')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">{t('showAll')}</SelectItem>
                        <SelectItem value="separator" disabled>-----------------------</SelectItem>
                        {categorias.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Botón Filtrar */}
                <div className="flex justify-center pt-4">
                  <Button 
                    onClick={aplicarFiltros}
                    className="w-full md:w-auto px-8"
                  >
                    {t('filter')}
                  </Button>
                </div>
              </CardContent>
            </Card>

                        
            {/* Estado de wallet */}
            {!isConnected && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <Info className="h-4 w-4" />
                    <span>{t('connectWallet')}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Contenido principal - Mapa */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-0">
                <MapComponent
                  filtros={filtros}
                  onCargarConteos={handleCargarConteos}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
