'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Skeleton } from '@pasosdejesus/m/shadcn-components/ui/skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@pasosdejesus/m/shadcn-components/ui/use-toast';
import { logger } from '@/lib/logger';
import { debugLog } from '@/lib/debug';
import { parseWalletError } from '@/lib/errors';
import confetti from 'canvas-confetti';
import { useTranslation } from '@/hooks/useTranslation';
import { useRegionBalance } from './hooks/useRegionBalance';
import { useOSMMapData } from './hooks/useOSMMapData';
import { usePreAlerts } from '@/hooks/usePreAlerts';
import { PreAlertModal } from '@/components/PreAlertModal';
import { buyPreAlert as buyPreAlertOnChain } from '@/lib/buyPreAlert';
import { OSMMapDesktop } from '@/components/OSMMapDesktop';
import { OSMMapMobile } from '@/components/OSMMapMobile';
import { SlearnInfo } from '@/components/SlearnInfo';
import { SLEARN_ADDRESS } from '@/lib/contractAddresses';

const localT = {
  en: {
    thanksTitle: '🙏 Thank you for your donation!',
    thanksMessage: '✨ Your generosity will help document cases of violence in {{region}}. {{amount}} USDT has been donated.',
    lpTitle: '🎓 SLEARN Cashback',
    lpSuccess: 'You earned SLEARN cashback: {{0}}',
    lpSuccessVerified: `You earned SLEARN cashback: {{0}}. Add token ${SLEARN_ADDRESS} to your wallet to see them.`,
    lpNotVerified: 'You earned SLEARN cashback: {{0}}. Verify on learn.tg to unlock them!',
    lpFallbackError: 'Unable to mint SLEARN cashback. Contact the team.',
    donationError: 'Donation error',
    sbtTitle: '🎖️ SBT Obtained!',
    viewStats: '📊 View Site Statistics',
  },
  es: {
    thanksTitle: '🙏 ¡Gracias por tu donación!',
    thanksMessage: '✨ Tu generosidad ayudará a documentar casos de violencia en {{region}}. Se han donado {{amount}} USDT.',
    lpTitle: '🎓 SLEARN Cashback',
    lpSuccess: 'Has ganado SLEARN cashback: {{0}}',
    lpSuccessVerified: `Has ganado SLEARN cashback: {{0}}. Agrega el token ${SLEARN_ADDRESS} a tu billetera para verlos.`,
    lpNotVerified: 'Has ganado SLEARN cashback: {{0}}. ¡Verifícate en learn.tg para desbloquearlos!',
    lpFallbackError: 'No se pudo mintear SLEARN cashback. Contacta al equipo.',
    donationError: 'Error en donación',
    sbtTitle: '🎖️ ¡SBT Obtenido!',
    viewStats: '📊 Ver Estadísticas del Sitio',
  },
}

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
  const { t } = useTranslation(localT);

  const { isConnected, donate, isTransacting, isProcessing, effectiveAddress, isMiniPay } = useWallet();
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

  // Pre-alerts
  const { preAlerts, loading: preLoading, fetchPreAlerts, fetchDetail, convertPreAlert } = usePreAlerts()
  const [selectedPreAlert, setSelectedPreAlert] = useState<any>(null)
  const [showPreModal, setShowPreModal] = useState(false)
  const [preDetailLoading, setPreDetailLoading] = useState(false)
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    fetchPreAlerts({ buyer: effectiveAddress || undefined })
  }, [fetchPreAlerts, effectiveAddress])

  useEffect(() => {
    if (!effectiveAddress) return
    fetch(`/api/verify?wallet=${effectiveAddress}`)
      .then(r => r.json())
      .then(d => setIsVerified(!!d.verified))
      .catch(() => {})
  }, [effectiveAddress])

  const handlePreAlertClick = async (id: number) => {
    setShowPreModal(true)
    setPreDetailLoading(true)
    setSelectedPreAlert(null)
    const detail = await fetchDetail(id, effectiveAddress)
    setSelectedPreAlert(detail)
    setPreDetailLoading(false)
  }

  const handleBuy = async (id: number) => {
    if (!effectiveAddress) return
    logger.info(`[handleBuy #${id}] Starting purchase — wallet: ${effectiveAddress.slice(0, 8)}…`, 'PreAlertBuy')
    try {
      await buyPreAlertOnChain(id, effectiveAddress, currentLocale)
      logger.info(`[handleBuy #${id}] Purchase confirmed`, 'PreAlertBuy')
      toast({ title: '✅ Purchase confirmed', duration: 3000 })
    } catch (e: any) {
      debugLog(`handleBuy #${id} FAILED`, { error: e.message || e })
      const fullError = `Purchase #${id} failed: ${e.message || e}`
      navigator.clipboard.writeText(fullError).catch(() => {})
      toast({ title: '❌ Purchase failed', description: `${e.message || e} (copied to clipboard)`, variant: 'destructive', duration: 0 })
      return
    }
    const detail = await fetchDetail(id, effectiveAddress)
    setSelectedPreAlert(detail)
    fetchPreAlerts()
  }

  const handleConvert = async (id: number, citizenNotes?: string) => {
    if (!effectiveAddress) return
    await convertPreAlert(id, effectiveAddress, citizenNotes)
    const detail = await fetchDetail(id, effectiveAddress)
    setSelectedPreAlert(detail)
    fetchPreAlerts()
  }
  
  // Cargar balance inicial cuando hay región seleccionada
  useEffect(() => {
    if (selectedRegion) {
      fetchBalance(selectedRegion);
    }
  }, [selectedRegion, fetchBalance]);

  // Función para refrescar balance después de donar (con confetti y toast)
  const refreshBalanceAfterDonation = (
    slearn?: { success: boolean; slearnMinted?: string; message?: string; userMessage?: string },
    mintedSbts?: { name: string; imageUrl: string }[]
  ) => {
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
        description: t('thanksMessage')
          .replace('{{region}}', regionName)
          .replace('{{amount}}', donationAmount),
        duration: isMiniPay ? 0 : 4000,
      });

      // Mostrar toast de SLEARN si se minteó exitosamente
      if (slearn?.success) {
        const msg = isVerified
          ? t('lpSuccessVerified')
          : t('lpNotVerified')
        toast({
          title: t('lpTitle'),
          description: msg.replace('{{0}}', slearn.slearnMinted || ''),
          duration: 0,
        })
      }

      // Mostrar toast informativo si SLEARN falló
      if (slearn && !slearn.success) {
        toast({
          title: t('lpTitle'),
          description: slearn.userMessage || t('lpFallbackError'),
          duration: 0,
        })
      }

      // Mostrar SBTs minteados
      if (mintedSbts && mintedSbts.length > 0) {
        for (const sbt of mintedSbts) {
          toast({
            title: t('sbtTitle'),
            description: sbt.name,
            duration: isMiniPay ? 0 : 4000,
          })
        }
      }

      // Limpiar monto después de donar
      setDonationAmount('');

      // Refrescar balance después de 3 segundos
      setTimeout(() => {
        fetchBalance(selectedRegion);
      }, 3000);
    }
  };

  // Función de donación unificada con manejo de errores y SLEARN cashback
  const onDonate = async (amount: string) => {
    try {
      const result = await donate(parseInt(selectedRegion, 10), amount, currentLocale);
      refreshBalanceAfterDonation(result.slearn, result.mintedSbts);

      logger.info(`✅ Donación completada. TX: ${result.txHash}${result.slearn?.success ? ` + ${result.slearn.slearnMinted} SLEARN cashback` : ''}`, 'DonatePage')
      
    } catch (err: unknown) {
      console.error('Error en donación:', err);
      const errorMessage = parseWalletError(err, currentLocale);
      navigator.clipboard.writeText(`Donation error: ${errorMessage}`).catch(() => {})
      toast({
        title: t('donationError'),
        description: `${errorMessage} (copied to clipboard)`,
        variant: 'destructive',
        duration: 0,
      });
    }
  };

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
    wallet: effectiveAddress,
    isTransacting,
    isProcessing,
    onFilterChange: handleFilterChange,
    onApplyFilters: applyFilters,
    onRegionChange: setSelectedRegion,
    onAmountChange: setDonationAmount,
    onDonate,
    onRefreshBalance: () => selectedRegion && fetchBalance(selectedRegion),
    MapComponent,
    filtersObj: filters,
    handleCountsLoad,
    preAlerts,
    onPreAlertClick: handlePreAlertClick,
    isVerified,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 relative">
      {showPreModal && (
        <PreAlertModal
          preAlert={selectedPreAlert}
          loading={preDetailLoading}
          isConnected={isConnected}
          isVerified={isVerified}
          wallet={effectiveAddress}
          locale={currentLocale}
          onBuy={handleBuy}
          onConvert={handleConvert}
          onClose={() => setShowPreModal(false)}
        />
      )}
      <main className="container mx-auto px-4 py-6">
        {/* Versión móvil */}
        <div className="lg:hidden">
          <OSMMapMobile {...commonProps} />
        </div>

        {/* Versión desktop */}
        <div className="hidden lg:block">
          <OSMMapDesktop {...commonProps} />
        </div>

        {isConnected && (
          <div className="mt-6 max-w-lg">
            <SlearnInfo locale={currentLocale} isVerified={isVerified} />
          </div>
        )}

        {/* Link to stats */}
        <div className="mt-6 text-center">
          <a
            href={`/${currentLocale}/stats`}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded font-medium hover:bg-blue-700 transition-colors"
          >
            {t('viewStats')}
          </a>
        </div>
      </main>
    </div>
  );
}
