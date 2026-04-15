'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/components/ui/use-toast';
import confetti from 'canvas-confetti';
import { translations } from './locales/osmmap';
import { useRegionBalance } from './hooks/useRegionBalance';
import { useDonation } from './hooks/useDonation';
import { useOSMMapData } from './hooks/useOSMMapData';
import { OSMMapDesktop } from '@/components/OSMMapDesktop';
import { OSMMapMobile } from '@/components/OSMMapMobile';

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
  const params = useParams();
  const currentLocale = Array.isArray(params.locale) ? params.locale[0] : params.locale || 'en';
  const t = translations[currentLocale as keyof typeof translations] || translations.en;

  const { isConnected, approveUSDT, donateToRegion, isTransacting, isMiniPay } = useWallet();
  const { toast } = useToast();
  const [donationAmount, setDonationAmount] = useState('');

  // Datos del mapa (filtros, conteos, regiones, etc.)
  const {
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
  } = useOSMMapData(currentLocale);

  // Balance regional
  const { regionBalance, balanceLoading, fetchBalance } = useRegionBalance(selectedRegion);
  
  // Cargar balance inicial cuando hay región seleccionada
  useEffect(() => {
    if (selectedRegion) {
      fetchBalance(selectedRegion);
    }
  }, [selectedRegion, fetchBalance]);

  // Donación
  const { isApproving, handleDonate } = useDonation({
    approveUSDT,
    donateToRegion,
    isTransacting,
    isMiniPay,
    t: {
      invalidAmount: t.invalidAmount,
      noContract: t.noContract,
      donateSuccess: t.donateSuccess
    }
  });
  
  // Función para refrescar balance después de donar (con confetti y toast)
  const refreshBalanceAfterDonation = () => {
    if (selectedRegion) {
      // Confetti
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#ef4444', '#f59e0b']
      });
      
      // Toast de agradecimiento
      const regionName = donationRegions.find(r => r.id.toString() === selectedRegion)?.name || 
                        (currentLocale === 'es' ? 'la región' : 'the region');
      
      toast({
        title: t.thanksTitle,
        description: t.thanksMessage
          .replace('{{region}}', regionName)
          .replace('{{amount}}', donationAmount),
        duration: 4000,
      });
      
      // Refrescar balance después de 3 segundos
      setTimeout(() => {
        fetchBalance(selectedRegion);
      }, 3000);
    }
  };

  // El refresh de balance ahora lo maneja DonationPopover con onRefreshBalance
  // Solo mantenemos confetti y toast para desktop (pero DonationPopover ya los tiene)
  // Este efecto se elimina para evitar duplicación

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  const commonProps = {
    counts,
    filters,
    departments,
    categories,
    allegedPerpetrators,
    donationRegions,
    selectedRegion,
    donationAmount,
    regionBalance,
    isConnected,
    isTransacting,
    isApproving,
    onFilterChange: handleFilterChange,
    onApplyFilters: applyFilters,
    onRegionChange: setSelectedRegion,
    onAmountChange: setDonationAmount,
    onDonate: () => handleDonate(donationAmount, selectedRegion),
    t,
    MapComponent,
    filtersObj: filters,
    handleCountsLoad
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <main className="container mx-auto px-4 py-6">
        {/* Versión móvil */}
        <div className="lg:hidden">
          <OSMMapMobile {...commonProps} />
        </div>

        {/* Versión desktop */}
        <div className="hidden lg:block">
          <OSMMapDesktop {...commonProps} />
        </div>
      </main>
    </div>
  );
}