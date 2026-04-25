'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CountsPopover } from '@/components/CountsPopover';
import { FiltersPopover } from '@/components/FiltersPopover';
import { DonationPopover } from '@/components/DonationPopover';

interface OSMMapMobileProps {
  counts: { casos: number; victimas: number; victimizaciones: number; actos: number };
  filters: any;
  departments: any[];
  categories: any[];
  allegedPerpetrators: any[];
  donationRegions: any[];
  selectedRegion: string;
  donationAmount: string;
  regionBalance: string | null;
  isConnected: boolean;
  isTransacting: boolean;
  isProcessing: boolean;
  isApproving: boolean;
  onFilterChange: (key: string, value: string) => void;
  onApplyFilters: () => void;
  onRegionChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onDonate: (amount: string) => Promise<void>;
  onRefreshBalance?: () => void;
  t: any;
  MapComponent: React.ComponentType<any>;
  filtersObj: any;
  handleCountsLoad: (counts: any) => void;
}

export function OSMMapMobile({
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
  onFilterChange,
  onApplyFilters,
  onRegionChange,
  onAmountChange,
  onDonate,
  onRefreshBalance,
  t,
  MapComponent,
  filtersObj,
  handleCountsLoad
}: OSMMapMobileProps) {
  return (
    <>
      {/* Mapa a ancho completo */}
      <div className="w-full mb-4">
        <Card>
          <CardContent className="p-0">
            <MapComponent
              filtros={filtersObj}
              onCargarConteos={handleCountsLoad}
              isConnected={isConnected}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Botones flotantes móvil */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-2">
        <CountsPopover 
          counts={counts}
          variant="mobile"
        />
        <FiltersPopover 
          filters={filters}
          departments={departments}
          allegedPerpetrators={allegedPerpetrators}
          categories={categories}
          onFilterChange={onFilterChange}
          onApplyFilters={onApplyFilters}
          variant="mobile"
        />
        <DonationPopover 
          key={donationAmount}
          isConnected={isConnected}
          selectedRegion={selectedRegion}
          donationAmount={donationAmount}
          regionBalance={regionBalance}
          donationRegions={donationRegions}
          onRegionChange={onRegionChange}
          onAmountChange={onAmountChange}
          onDonate={onDonate}
          onRefreshBalance={onRefreshBalance}
          isTransacting={isTransacting}
          isProcessing={isProcessing}
          isApproving={isApproving}
          variant="mobile"
        />
      </div>
    </>
  );
}