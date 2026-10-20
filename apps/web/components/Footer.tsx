// components/Footer.tsx
import { Badge } from '@pasosdejesus/m/shadcn-components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@pasosdejesus/m/shadcn-components/ui/tooltip'
import { useWallet } from '@/contexts/WalletContext'
import { useState, useEffect } from 'react'

interface FooterProps {
  lang?: string
  showWalletStatus?: boolean
}

export default function Footer({
  lang = 'en',
  showWalletStatus = true,
}: FooterProps) {
  const { isConnected } = useWallet()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <footer className="mt-8 border-t border-gray-200 bg-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600">
            <p>
            {lang == 'es' ? 'Desarrollado por ' : 'Developed by '}
              <a href="https://www.pasosdeJesus.org">Pasos de Jesús</a> 
              (<a href="https://gitlab.com/pasosdeJesus/sivel3/-/blob/main/CREDITOS.md">{lang == 'es' ? 'Ver Créditos' : 'See Credits'}</a>).
            </p>
            <p className="mt-1">
              {lang == 'es' ? 'Muestra de datos abiertos de ' :
               'Sample of open data from '}
              <a href="nocheyniebla.org">Noche y Niebla</a>
            </p>
          </div>

          <div className="flex items-center gap-4">
            {showWalletStatus && mounted && (
              isConnected ? (
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-200"
                >
               
                  🔗  {lang == 'es' ? 'Billetera conectada' : 
                    'Wallet connected'}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-amber-600 border-amber-200"
                >
                  ⚠️ {lang == 'es' ? 
                    ' Conecta una billetera web3 para funciones avanzadas' : 
                    ' Connect a web3 wallet to have advanced functions'}
                </Badge>
              )
            )}
            {showWalletStatus && !mounted && (
              <Badge variant="outline" className="text-gray-400 border-gray-200">
                ⏳ {lang == 'es' ? 'Cargando...' : 'Loading...'}
              </Badge>
            )}

            <Badge variant="secondary">OpenStreetMap</Badge>
            <Badge variant="secondary">Celo Network</Badge>
          </div>
        </div>
      </div>
    </footer>
  )
}
