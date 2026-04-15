import { useState } from 'react';
import { logger } from '@/lib/logger';
import { useToast } from '@/components/ui/use-toast';

interface UseDonationProps {
  approveUSDT: (spender: `0x${string}`, amount: string) => Promise<`0x${string}`>;
  donateToRegion: (regionId: number, amount: string) => Promise<void>;
  isTransacting: boolean;
  isMiniPay: boolean;
  t: {
    invalidAmount: string;
    noContract: string;
    donateSuccess: string;
  };
}

export function useDonation({ approveUSDT, donateToRegion, isTransacting, isMiniPay, t }: UseDonationProps) {
  const { toast } = useToast();
  const [isApproving, setIsApproving] = useState(false);

  const handleDonate = async (
    donationAmount: string,
    selectedRegion: string,
    onSuccess?: () => void,
    onRefreshBalance?: () => void,
    onClearAmount?: () => void
  ) => {
    // Asegurar que donationAmount sea string y tenga valor
    const amountStr = String(donationAmount || '');
    const amount = parseFloat(amountStr);
    
    logger.info(`🔍 [useDonation] handleDonate - Amount recibido: "${donationAmount}" (parsed: ${amount})`, 'DonatePage');
    
    // Validación estricta
    if (!amountStr || amountStr.trim() === '' || isNaN(amount) || amount <= 0) {
      logger.error(`❌ [useDonation] Monto inválido: "${donationAmount}" - ignorando`, 'DonatePage');
      return;
    }
    
    logger.info(`✅ [useDonation] Procesando donación de ${amount} USDT a región ${selectedRegion}`, 'DonatePage');

    const contractAddress = process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS as `0x${string}`;
    logger.info(`Contract address from env: ${contractAddress}`, 'DonatePage');
    
    if (!contractAddress) {
      logger.error('Contract address no configurada', 'DonatePage');
      alert(t.noContract);
      return;
    }

    try {
      logger.info('Iniciando approveUSDT...', 'DonatePage');
      setIsApproving(true);
      
      if (isMiniPay) {
        alert('🟡 Aprobación iniciada. Confirma la transacción en MiniPay cuando aparezca el popup.');
      }
      
      await approveUSDT(contractAddress, donationAmount);
      logger.success('approveUSDT transaction submitted', 'DonatePage');
      
      if (isMiniPay) {
        const userConfirmed = confirm('✅ Aprobación confirmada. ¿Deseas continuar con la donación?');
        if (!userConfirmed) {
          setIsApproving(false);
          return;
        }
      } else {
        logger.info('Esperando 2 segundos para que la wallet procese...', 'DonatePage');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      logger.info('Procediendo con la donación...', 'DonatePage');
      const regionId = parseInt(selectedRegion, 10);
      await donateToRegion(regionId, donationAmount);
      
      if (isMiniPay) {
        alert(`🎉 ¡Donación completada! Se donaron ${donationAmount} USDT a la región seleccionada.`);
      } else {
        toast({
          title: t.donateSuccess || '🎉 ¡Donación completada!',
          description: `Se donaron ${donationAmount} USDT a la región seleccionada`,
        });
      }
      
      logger.success('Donación completada', 'DonatePage');
      if (onSuccess) onSuccess();
      if (onClearAmount) onClearAmount();
      if (onRefreshBalance) {
        setTimeout(() => onRefreshBalance(), 3000);
      }
    } catch (error) {
      logger.error(`Error en proceso de donación: ${error}`, 'DonatePage');
      console.error(error);
    } finally {
      setIsApproving(false);
      console.log('🔍 [useDonation] setIsApproving(false) ejecutado');
      // Forzar reset adicional después de 5 segundos por si acaso
      setTimeout(() => {
        setIsApproving(false);
        console.log('🔍 [useDonation] Forzando setIsApproving(false) después de 5s');
      }, 5000);
    }
  };

  return {
    isApproving,
    handleDonate
  };
}