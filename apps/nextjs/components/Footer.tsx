// components/Footer.tsx
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useWallet } from '@/contexts/WalletContext';

interface FooterProps {
  lang?: string;
  showWalletStatus?: boolean;
}

export default function Footer({ lang = 'en', showWalletStatus = true }: FooterProps) {
  const { isConnected } = useWallet();

  return (
    <footer className="mt-8 border-t border-gray-200 bg-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600">
            <p>Desarrollado por <a href="https://www.pasosdeJesus.org">Pasos de Jesús</a> (ver <a href="">créditos</a>).</p>
            <p className="mt-1">Datos abiertos de <a href="nocheyniebla.org">Noche y Niebla</a></p>
          </div>
          
          <div className="flex items-center gap-4">
            {showWalletStatus && (
              isConnected ? (
                <Badge variant="outline" className="text-green-600 border-green-200">
                  🔗 Wallet conectada
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-200">
                  ⚠️ Conecta wallet para funciones avanzadas
                </Badge>
              )
            )}
            
            <Badge variant="secondary">OpenStreetMap</Badge>
            <Badge variant="secondary">Celo Network</Badge>
          </div>
        </div>
      </div>
    </footer>
  );
}
