// contexts/WalletContext.tsx - SOLO lo esencial
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAccount, useDisconnect, useChainId } from 'wagmi';

// Tipo SIMPLE - solo lo necesario
interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

  const [state, setState] = useState({
    isConnected: false,
    address: null as string | null,
    chainId: null as number | null,
  });

  // Sincronizar estado una vez
  useEffect(() => {
    setState({
      isConnected,
      address: address || null,
      chainId: chainId || null,
    });
  }, [isConnected, address, chainId]);

  const value: WalletContextType = {
    ...state,
    disconnect,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
