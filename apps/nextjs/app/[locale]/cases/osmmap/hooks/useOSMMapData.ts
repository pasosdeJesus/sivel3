import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

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

export function useOSMMapData(currentLocale: string) {
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
        const [deptRes, catRes, presRes, regionRes] = await Promise.all([
          fetch('/api/departments'),
          fetch('/api/categories'),
          fetch('/api/alleged-perpetrators'),
          fetch(`/api/regions?locale=${currentLocale}`)
        ]);
        
        const departmentsData = await deptRes.json();
        const categoriesData = await catRes.json();
        const allegedPerpetratorsData = await presRes.json();
        const regionsData = await regionRes.json();
        logger.info(`Regiones cargadas: ${JSON.stringify(regionsData)}`, 'OSMMapData');
        
        setDepartments(departmentsData);
        setCategories(categoriesData);
        setAllegedPerpetrators(allegedPerpetratorsData);
        setDonationRegions(regionsData);
        
        if (regionsData.length > 0) {
          const firstId = String(regionsData[0].id);
          logger.success(`Seleccionando región inicial: ${firstId}`, 'OSMMapData');
          setSelectedRegion(firstId);
        }
        
        logger.info('Datos iniciales cargados correctamente', 'OSMMapData');
      } catch (error) {
        logger.error(`Error loading data: ${error}`, 'OSMMapData');
        console.error('Error loading data:', error);
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
    setSelectedRegion,
    handleFilterChange,
    applyFilters,
    handleCountsLoad
  };
}