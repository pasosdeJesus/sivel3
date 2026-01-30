'use client';

import { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export default function ConnectWalletButton() {
  const { isConnected } = useWallet();
  const [openPopover, setOpenPopover] = useState(false);

  return (
    <TooltipProvider>
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted,
        }) => {
          const ready = mounted && authenticationStatus !== 'loading';
          const connected = ready && account && chain && isConnected;

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                className: "opacity-0 pointer-events-none select-none"
              })}
            >
              {!connected ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={openConnectModal}
                      variant="default"
                      size="sm"
                      className="gap-2"
                    >
                      <span className="text-lg">🔗</span>
                      Conectar Wallet
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Conectar wallet Web3 (opcional)</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Botón de red con Badge */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={openChainModal}
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 px-2"
                      >
                        {chain.hasIcon && chain.iconUrl && (
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={chain.iconUrl} alt={chain.name} />
                            <AvatarFallback className="text-[10px]">
                              {chain.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span className="text-xs font-medium truncate max-w-[60px]">
                          {chain.name}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Cambiar red</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Botón de cuenta con Badge de estado */}
                  <Popover open={openPopover} onOpenChange={setOpenPopover}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 gap-2 px-3 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Badge 
                          variant="outline" 
                          className="h-2 w-2 p-0 bg-green-500 border-green-500"
                        />
                        <span className="text-xs font-medium truncate max-w-[100px]">
                          {account.displayName}
                        </span>
                        {account.displayBalance && (
                          <Badge 
                            variant="secondary" 
                            className="text-[10px] font-normal bg-emerald-500/20 text-emerald-800"
                          >
                            {account.displayBalance}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="end">
                      <div className="p-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-semibold">Wallet conectada</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {account.displayName}
                            </p>
                          </div>
                          
                          <Separator />
                          
                          <div className="space-y-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start text-xs h-8"
                              onClick={openAccountModal}
                            >
                              👤 Ver detalles de cuenta
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start text-xs h-8"
                              onClick={openChainModal}
                            >
                              🌐 Cambiar red
                            </Button>
                          </div>
                          
                          <Separator />
                          
                          <div className="pt-1">
                            <p className="text-xs text-muted-foreground">
                              Conexión Web3 para futuras funciones
                            </p>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </TooltipProvider>
  );
}
