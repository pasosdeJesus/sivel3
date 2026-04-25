'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { logger } from '@/lib/logger';
import confetti from 'canvas-confetti';
import { useRegionBalance } from './hooks/useRegionBalance';
import { useOSMMapData } from './hooks/useOSMMapData';
import { OSMMapDesktop } from '@/components/OSMMapDesktop';
import { OSMMapMobile } from '@/components/OSMMapMobile';

const localTranslations = {
  en: {
    counts: 'Counts',
    totalsByFilters: 'Totals according to applied filters',
    cases: 'Cases',
    victims: 'Victims',
    victimizations: 'Victimizations',
    acts: 'Acts',
    filters: 'Filters',
    from: 'From',
    to: 'To',
    department: 'Department',
    showAll: 'Show All',
    allegedPerpetrator: 'Alleged Perpetrator',
    violence: 'Violence',
    filter: 'Filter',
    connectWallet: 'Connect wallet for advanced features',
    donation: 'Donation',
    cause: 'To document cases in',
    amount: 'Amount (in USDT)',
    donate: 'Donate',
    donating: 'Donating...',
    approving: 'Approving...',
    invalidAmount: 'Please enter a valid donation amount.',
    noRecipient: 'The destination address for the donation is not configured.',
    approve: 'Donate',
    donateTitle: 'Donate',
    noContract: 'Donation contract not configured',
    availableFunds: '💰 Regional Balance',
    waitingForConfirmation: 'Waiting for confirmation...',
    donateSuccess: '🎉 Donation completed!',
    thanksTitle: '🙏 Thank you for your donation!',
    thanksMessage: '✨ Your generosity will help document cases of violence in {{region}}. {{amount}} USDT has been donated.'
  },
  es: {
    counts: 'Conteos',
    totalsByFilters: 'Totales según filtros aplicados',
    cases: 'Casos',
    victims: 'Víctimas',
    victimizations: 'Victimizaciones',
    acts: 'Actos',
    filters: 'Filtros',
    from: 'Desde',
    to: 'Hasta',
    department: 'Departamento',
    showAll: 'Mostrar todos',
    allegedPerpetrator: 'P. Responsable',
    violence: 'Violencia',
    filter: 'Filtrar',
    connectWallet: 'Conecta la billetera para funciones avanzadas',
    donation: 'Donación',
    cause: 'Para documentar casos en',
    amount: 'Valor (en USDT)',
    donate: 'Donar',
    donating: 'Donando...',
    approving: 'Aprobando...',
    invalidAmount: 'Por favor, ingrese un monto de donación válido.',
    noRecipient: 'La dirección de destino para la donación no está configurada.',
    approve: 'Donar',
    donateTitle: 'Donar',
    noContract: 'El contrato de donaciones no está configurado',
    availableFunds: '💰 Balance Regional',
    waitingForConfirmation: 'Esperando confirmación...',
    donateSuccess: '🎉 ¡Donación completada!',
    thanksTitle: '🙏 ¡Gracias por tu donación!',
    thanksMessage: '✨ Tu generosidad ayudará a documentar casos de violencia en {{region}}. Se han donado {{amount}} USDT.'
  }
};

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
  const { t, locale: currentLocale } = useTranslation(localTranslations);

  const { isConnected, donate, isTransacting, isProcessing } = useWallet();
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
  const refreshBalanceAfterDonation = () => {
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
        title: t('thanksTitle'),
        description: t('thanksMessage', {
          region: regionName,
          amount: donationAmount
        }),
        duration: 4000,
      });
      
      // Limpiar monto después de donar
      setDonationAmount('');
      
      // Refrescar balance después de 3 segundos
      setTimeout(() => {
        fetchBalance(selectedRegion);
      }, 3000);
    }
  };

  // Función de donación unificada con manejo de errores
  const onDonate = async (amount: string) => {
    try {
      await donate(parseInt(selectedRegion, 10), amount);
      refreshBalanceAfterDonation();
    } catch (err: any) {
      console.error('Error en donación:', err);
      
      // Mensaje de error amigable según el tipo de error
      let errorMessage = 'No se pudo completar la donación. ';
      
      if (err?.message?.includes('insufficient funds') || err?.message?.includes('exceeds balance')) {
        errorMessage = '❌ Saldo insuficiente.\n\nNo tienes suficientes USDT para realizar esta donación.';
      } else if (err?.message?.includes('user rejected') || err?.code === 4001) {
        errorMessage = '⚠️ Transacción cancelada.\n\nCancelaste la transacción en tu wallet.';
      } else if (err?.message?.includes('network') || err?.message?.includes('RPC')) {
        errorMessage = '🌐 Error de red.\n\nNo se pudo conectar con la red. Verifica tu conexión.';
      } else if (err?.message?.includes('gas')) {
        errorMessage = '⛽ Error de gas.\n\nNo tienes suficiente CELO para pagar la transacción.';
      } else {
        errorMessage = `❌ Error en la donación.\n\n${err?.message || 'Intenta nuevamente más tarde.'}`;
      }
      
      alert(errorMessage);
      
      // También mostrar en consola para depuración
      console.error('[Donation Error]', err);
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
    onRegionChange: (val: string) => {
      logger.info(`Cambio de región: ${val}`, 'OSMMapPage');
      setSelectedRegion(val);
    },
    onAmountChange: setDonationAmount,
    onDonate,
    onRefreshBalance: refreshBalanceAfterDonation,
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