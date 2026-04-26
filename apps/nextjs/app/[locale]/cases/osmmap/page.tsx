'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { parseWalletError } from '@/lib/errors';
import confetti from 'canvas-confetti';
import { translations } from './locales/osmmap';
import { useRegionBalance } from './hooks/useRegionBalance';
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

  const { isConnected, donate, isTransacting, isProcessing, effectiveAddress } = useWallet();
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

  // Función para refrescar balance después de donar (con confetti y toast)
  const refreshBalanceAfterDonation = (learningPoints?: { success: boolean; newScore?: number; message?: string }) => {
    if (selectedRegion) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#ef4444', '#f59e0b']
      });

      const regionName = donationRegions.find(r => r.id.toString() === selectedRegion)?.name ||
                        (currentLocale === 'es' ? 'la región' : 'the region');

      toast({
        title: t.thanksTitle,
        description: t.thanksMessage
          .replace('{{region}}', regionName)
          .replace('{{amount}}', donationAmount),
        duration: 4000,
      });

      // Mostrar toast de Learning Points si se incrementaron exitosamente
      if (learningPoints?.success) {
        toast({
          title: currentLocale === 'es' ? '🎓 Puntos de Aprendizaje' : '🎓 Learning Points',
          description: currentLocale === 'es'
            ? `Has ganado puntos de aprendizaje. Puntaje total: ${learningPoints.newScore}`
            : `You earned Learning Points. Total score: ${learningPoints.newScore}`,
          duration: 4000,
        });
      }

      // Limpiar monto después de donar
      setDonationAmount('');

      // Refrescar balance después de 3 segundos
      setTimeout(() => {
        fetchBalance(selectedRegion);
      }, 3000);
    }
  };

  // Función de donación unificada con manejo de errores y Learning Points
  const onDonate = async (amount: string) => {
    try {
      const result = await donate(parseInt(selectedRegion, 10), amount);
      refreshBalanceAfterDonation(result.learningPoints);

      logger.info(`✅ Donación completada. TX: ${result.txHash}${result.learningPoints?.success ? ' + Learning Points' : ''}`, 'DonatePage')
      
    } catch (err: unknown) {
      console.error('Error en donación:', err);
      const errorMessage = parseWalletError(err);
      toast({
        title: currentLocale === 'es' ? 'Error en donación' : 'Donation error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  // isApproving ya no es necesario (flujo de una transacción)
  const isApproving = false;

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
    isProcessing,
    isApproving,
    onFilterChange: handleFilterChange,
    onApplyFilters: applyFilters,
    onRegionChange: setSelectedRegion,
    onAmountChange: setDonationAmount,
    onDonate,
    onRefreshBalance: () => selectedRegion && fetchBalance(selectedRegion),
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