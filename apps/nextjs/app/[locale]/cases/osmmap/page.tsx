'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/components/ui/use-toast';
import confetti from 'canvas-confetti';
import { CountsPopover } from '@/components/CountsPopover';
import { FiltersPopover } from '@/components/FiltersPopover';
import { DonationPopover } from '@/components/DonationPopover';
import { translations } from './locales/osmmap';
import { useRegionBalance } from './hooks/useRegionBalance';
import { useDonation } from './hooks/useDonation';
import { useOSMMapData } from './hooks/useOSMMapData';

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

  // Refrescar balance después de la transacción de DONATE
  const prevIsTransactingRef = useRef(isTransacting);
  const lastDonationRef = useRef<string>('');
  
  useEffect(() => {
    // Solo ejecutar cuando la transacción de DONATE termina
    if (prevIsTransactingRef.current === true && isTransacting === false && selectedRegion) {
      // Crear un identificador único para esta donación
      const donationId = `${selectedRegion}-${donationAmount}-${Date.now()}`;
      
      // Evitar duplicados
      if (lastDonationRef.current === donationId) return;
      lastDonationRef.current = donationId;
      
      // Pequeño delay para asegurar que es la transacción de donate (no approve)
      setTimeout(() => {
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
        
        // Reintentar balance varias veces
        const tryFetchBalance = (retries = 5) => {
          fetchBalance(selectedRegion);
          if (retries > 0 && regionBalance === '0') {
            setTimeout(() => tryFetchBalance(retries - 1), 2000);
          }
        };
        setTimeout(() => tryFetchBalance(5), 3000);
      }, 500);
    }
    prevIsTransactingRef.current = isTransacting;
  }, [isTransacting, selectedRegion, donationAmount, donationRegions, toast, t.thanksTitle, t.thanksMessage, currentLocale, fetchBalance, regionBalance]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <main className="container mx-auto px-4 py-6">
        {/* Versión móvil: solo mapa + botones flotantes */}
        <div className="lg:hidden">
          <div className="w-full mb-4">
            <Card>
              <CardContent className="p-0">
                <MapComponent
                  filtros={filters}
                  onCargarConteos={handleCountsLoad}
                  isConnected={isConnected}
                />
              </CardContent>
            </Card>
          </div>
          
          {/* Botones flotantes para móvil */}
          <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-2">
            <CountsPopover 
              counts={counts}
              labelCases={t.cases}
              labelVictims={t.victims}
              labelVictimizations={t.victimizations}
              labelActs={t.acts}
              title={t.counts}
              variant="mobile"
            />
            <FiltersPopover 
              filters={filters}
              departments={departments}
              allegedPerpetrators={allegedPerpetrators}
              categories={categories}
              onFilterChange={handleFilterChange}
              onApplyFilters={applyFilters}
              labels={{
                from: t.from,
                to: t.to,
                department: t.department,
                allegedPerpetrator: t.allegedPerpetrator,
                violence: t.violence,
                filter: t.filter,
                showAll: t.showAll
              }}
              variant="mobile"
            />
            <DonationPopover 
              isConnected={isConnected}
              selectedRegion={selectedRegion}
              donationAmount={donationAmount}
              regionBalance={regionBalance}
              donationRegions={donationRegions}
              onRegionChange={setSelectedRegion}
              onAmountChange={setDonationAmount}
              onDonate={() => handleDonate(donationAmount, selectedRegion)}
              isTransacting={isTransacting}
              isApproving={isApproving}
              labels={{
                cause: t.cause,
                availableFunds: t.availableFunds,
                amount: t.amount,
                approve: t.approve,
                approving: t.approving,
                donating: t.donating
              }}
              variant="mobile"
            />
          </div>
        </div>

        {/* Versión desktop: grid con cards a la izquierda y mapa a la derecha */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-6">
          {/* Cards - columna izquierda */}
          <div className="space-y-6">
            <CountsPopover 
              counts={counts}
              labelCases={t.cases}
              labelVictims={t.victims}
              labelVictimizations={t.victimizations}
              labelActs={t.acts}
              title={t.counts}
              totalsByFilters={t.totalsByFilters}
              variant="desktop"
            />
            <FiltersPopover 
              filters={filters}
              departments={departments}
              allegedPerpetrators={allegedPerpetrators}
              categories={categories}
              onFilterChange={handleFilterChange}
              onApplyFilters={applyFilters}
              labels={{
                from: t.from,
                to: t.to,
                department: t.department,
                allegedPerpetrator: t.allegedPerpetrator,
                violence: t.violence,
                filter: t.filter,
                showAll: t.showAll
              }}
              variant="desktop"
            />
            {isConnected && (
              <DonationPopover 
                isConnected={isConnected}
                selectedRegion={selectedRegion}
                donationAmount={donationAmount}
                regionBalance={regionBalance}
                donationRegions={donationRegions}
                onRegionChange={setSelectedRegion}
                onAmountChange={setDonationAmount}
                onDonate={() => handleDonate(donationAmount, selectedRegion)}
                isTransacting={isTransacting}
                isApproving={isApproving}
                labels={{
                  cause: t.cause,
                  availableFunds: t.availableFunds,
                  amount: t.amount,
                  approve: t.approve,
                  approving: t.approving,
                  donating: t.donating
                }}
                variant="desktop"
              />
            )}
          </div>
          
          {/* Mapa - columna derecha (ocupa 3 columnas) */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-0">
                <MapComponent
                  filtros={filters}
                  onCargarConteos={handleCountsLoad}
                  isConnected={isConnected}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}