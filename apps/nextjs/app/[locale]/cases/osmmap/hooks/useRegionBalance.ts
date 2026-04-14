import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

export function useRegionBalance(selectedRegion: string | null) {
  const [regionBalance, setRegionBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const fetchBalance = useCallback((regionId: string) => {
    if (!regionId) return;
    
    setBalanceLoading(true);
    fetch(`/api/regions/${regionId}/balance`)
      .then(res => res.json())
      .then(data => {
        if (data.balance) {
          setRegionBalance(data.balance);
          logger.info(`Balance actualizado: ${data.balance} USDT`, 'Balance');
        }
      })
      .catch(error => logger.error(`Error fetching region balance: ${error}`, 'Balance'))
      .finally(() => setBalanceLoading(false));
  }, []);

  // Cargar balance cuando cambia la región
  useEffect(() => {
    if (selectedRegion) {
      fetchBalance(selectedRegion);
    }
  }, [selectedRegion, fetchBalance]);

  return {
    regionBalance,
    balanceLoading,
    fetchBalance,
    setRegionBalance
  };
}