import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useToast } from '@/components/ui/use-toast';

export function useRegionBalance(selectedRegion: string | null) {
  const { toast } = useToast();
  const [regionBalance, setRegionBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const fetchBalance = useCallback((regionId: string, retries = 3, delay = 2000) => {
    if (!regionId) return;
    
    const attempt = (retryCount: number) => {
      setBalanceLoading(true);
      fetch(`/api/regions/${regionId}/balance`)
        .then(res => res.json())
        .then(data => {
          if (data.balance && parseFloat(data.balance) > 0) {
            setRegionBalance(data.balance);
            logger.info(`Balance actualizado: ${data.balance} USDT`, 'Balance');
            setBalanceLoading(false);
          } else if (retryCount > 0) {
            logger.info(`Balance aún en 0, reintentando en ${delay}ms... (${retryCount} intentos restantes)`, 'Balance');
            setTimeout(() => attempt(retryCount - 1), delay);
          } else {
            logger.info(`⚠️ Balance sigue en 0 después de reintentos`, 'Balance');
            setBalanceLoading(false);
          }
        })
        .catch(error => {
          logger.error(`Error fetching region balance: ${error}`, 'Balance');
          if (retryCount > 0) {
            setTimeout(() => attempt(retryCount - 1), delay);
          } else {
            setBalanceLoading(false);
            toast({
              title: 'Error',
              description: 'No se pudo consultar el balance de la región. Verifica tu conexión.',
              variant: 'destructive',
              duration: 5000,
            });
          }
        });
    };
    
    attempt(retries);
  }, []);

  // No cargar balance automáticamente al cambiar la región
  // El balance se carga explícitamente desde el componente padre
  // Esto evita refrescos duplicados durante transacciones

  return {
    regionBalance,
    balanceLoading,
    fetchBalance,
    setRegionBalance
  };
}