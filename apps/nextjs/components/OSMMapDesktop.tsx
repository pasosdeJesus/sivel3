'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CountsPopover } from '@/components/CountsPopover';
import { FiltersPopover } from '@/components/FiltersPopover';
import { DonationPopover } from '@/components/DonationPopover';

interface OSMMapDesktopProps {
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
  isApproving: boolean;
  onFilterChange: (key: string, value: string) => void;
  onApplyFilters: () => void;
  onRegionChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onDonate: () => void;
  t: any;
  MapComponent: React.ComponentType<any>;
  filtersObj: any;
  handleCountsLoad: (counts: any) => void;
}

export function OSMMapDesktop({
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
  onFilterChange,
  onApplyFilters,
  onRegionChange,
  onAmountChange,
  onDonate,
  t,
  MapComponent,
  filtersObj,
  handleCountsLoad
}: OSMMapDesktopProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Columna izquierda: Conteos + Filtros */}
      <div className="lg:col-span-1 space-y-6">
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
          onFilterChange={onFilterChange}
          onApplyFilters={onApplyFilters}
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
      </div>

      {/* Columna derecha: Mapa + Donación (ancha) */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardContent className="p-0">
            <MapComponent
              filtros={filtersObj}
              onCargarConteos={handleCountsLoad}
              isConnected={isConnected}
            />
          </CardContent>
        </Card>

        {isConnected && (
          <DonationPopover 
            isConnected={isConnected}
            selectedRegion={selectedRegion}
            donationAmount={donationAmount}
            regionBalance={regionBalance}
            donationRegions={donationRegions}
            onRegionChange={onRegionChange}
            onAmountChange={onAmountChange}
            onDonate={onDonate}
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
    </div>
  );
}