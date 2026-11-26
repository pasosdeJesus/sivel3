import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useToast } from '@pasosdejesus/m/shadcn-components/ui/use-toast';

interface DonationRegion {
  id: number;
  name: string;
}

interface Filters {
  'filtro[fechaini]': string;
  'filtro[fechafin]': string;
  'filtro[departamento_id]': string;
  'filtro[presponsable_id]': string;
  'filtro[categoria_id]': string;
}

interface Counts {
  casos: number;
  victimas: number;
  victimizaciones: number;
  actos: number;
}

interface Ventana {
  desde: string | null;
  hasta: string | null;
  activa: boolean;
}

export function useOSMMapData(currentLocale: string) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Counts>({ casos: 0, victimas: 0, victimizaciones: 0, actos: 0 });
  const [filters, setFilters] = useState<Filters>({
    'filtro[fechaini]': '',
    'filtro[fechafin]': '',
    'filtro[departamento_id]': '',
    'filtro[presponsable_id]': '',
    'filtro[categoria_id]': ''
  });
  
  const [departments, setDepartments] = useState<Array<{id: string, nombre: string}>>([]);
  const [categories, setCategories] = useState<Array<{id: string, nombre: string}>>([]);
  const [allegedPerpetrators, setAllegedPerpetrators] = useState<Array<{id: string, nombre: string}>>([]);
  const [donationRegions, setDonationRegions] = useState<DonationRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [ventana, setVentana] = useState<Ventana | null>(null);

  const handleFilterChange = (key: string, value: string) => {
    if (value === "separator") return;
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const applyFilters = () => {
    logger.info('Applying filters:', 'Filters');
    // Aquí se puede agregar lógica para aplicar filtros al mapa
  };
  
  const handleCountsLoad = (newCounts: Counts) => {
    setCounts(newCounts);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [deptRes, catRes, presRes, regionRes, ventanaRes] = await Promise.all([
          fetch('/api/departments'),
          fetch('/api/categories'),
          fetch('/api/alleged-perpetrators'),
          fetch(`/api/regions?locale=${currentLocale}`),
          fetch('/api/cases/ventana')
        ]);
        
        const departmentsData = await deptRes.json();
        const categoriesData = await catRes.json();
        const allegedPerpetratorsData = await presRes.json();
        const regionsData = await regionRes.json();
        // Un servidor viejo sin este endpoint no debe romper el mapa: sin ventana
        // simplemente se muestran los filtros vacíos como antes.
        const ventanaData = ventanaRes.ok ? await ventanaRes.json().catch(() => null) : null;
        
        setDepartments(departmentsData);
        setCategories(categoriesData);
        setAllegedPerpetrators(allegedPerpetratorsData);
        setDonationRegions(regionsData);
        
        if (regionsData.length > 0) {
          setSelectedRegion(String(regionsData[0].id));
        }

        // La ventana pública del corpus (R-#22) se inicializa en los filtros: el
        // mapa no avisa nada mientras el usuario esté dentro de ella.
        const infoVentana: Ventana | null = ventanaData?.ventana ?? null;
        setVentana(infoVentana);
        if (infoVentana?.activa) {
          setFilters(prev => ({
            ...prev,
            'filtro[fechaini]': prev['filtro[fechaini]'] || infoVentana.desde || '',
            'filtro[fechafin]': prev['filtro[fechafin]'] || infoVentana.hasta || ''
          }));
        }
        
        logger.info('Datos iniciales cargados correctamente', 'OSMMapData');
      } catch (error) {
        logger.error(`Error loading data: ${error}`, 'OSMMapData');
        console.error('Error loading data:', error);
        toast({
          title: currentLocale === 'es' ? 'Error al cargar datos' : 'Error loading data',
          description: currentLocale === 'es'
            ? 'No se pudieron cargar los datos del mapa. Verifica tu conexión e intenta de nuevo.'
            : 'Unable to load map data. Check your connection and try again.',
          variant: 'destructive',
          duration: 0,
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [currentLocale]);

  return {
    loading,
    counts,
    filters,
    departments,
    categories,
    allegedPerpetrators,
    donationRegions,
    selectedRegion,
    ventana,
    setSelectedRegion,
    handleFilterChange,
    applyFilters,
    handleCountsLoad
  };
}