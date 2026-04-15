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
    const amount = parseFloat(donationAmount);
    logger.info(`handleDonate llamado - Amount: ${donationAmount}, Region: ${selectedRegion}`, 'DonatePage');
    
    if (isNaN(amount) || amount <= 0) {
      logger.error(`Monto inválido: ${donationAmount}`, 'DonatePage');
      alert(t.invalidAmount);
      return;
    }

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
    }
  };

  return {
    isApproving,
    handleDonate
  };
}