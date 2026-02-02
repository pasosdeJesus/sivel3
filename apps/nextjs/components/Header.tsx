import { Map, Info } from 'lucide-react'
import ConnectWalletButton from './ConnectWalletButton'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export default function Header({ lang = 'en' }) {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Map className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {lang == 'es' ? 'Mapa de Casos' : 'Map of Cases'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ConnectWalletButton />
          </div>
        </div>
      </div>
    </header>
  )
}
