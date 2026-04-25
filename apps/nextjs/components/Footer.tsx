'use client'

import { Badge } from '@/components/ui/badge'
import { useWallet } from '@/contexts/WalletContext'
import { useState, useEffect } from 'react'
import { useTranslation } from '@/hooks/useTranslation'

const localTranslations = {
  en: {
    developedBy: 'Developed by ',
    seeCredits: 'See Credits',
    openDataFrom: 'Sample of open data from ',
    walletConnected: 'Wallet connected',
    connectWalletAdv: 'Connect a web3 wallet for advanced functions'
  },
  es: {
    developedBy: 'Desarrollado por ',
    seeCredits: 'Ver Créditos',
    openDataFrom: 'Muestra de datos abiertos de ',
    walletConnected: 'Billetera conectada',
    connectWalletAdv: 'Conecta una billetera web3 para funciones avanzadas'
  }
}

interface FooterProps {
  lang?: string
  showWalletStatus?: boolean
}

export default function Footer({
  showWalletStatus = true,
}: FooterProps) {
  const { isConnected } = useWallet()
  const { t } = useTranslation(localTranslations)
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
              {t('developedBy')}
              <a href="https://www.pasosdeJesus.org" className="hover:underline">Pasos de Jesús</a> 
              {' '}(<a href="https://gitlab.com/pasosdeJesus/sivel3/-/blob/main/CREDITOS.md" className="hover:underline">{t('seeCredits')}</a>).
            </p>
            <p className="mt-1">
              {t('openDataFrom')}
              <a href="https://nocheyniebla.org" className="hover:underline">Noche y Niebla</a>
            </p>
          </div>

          <div className="flex items-center gap-4">
            {showWalletStatus && mounted && (
              isConnected ? (
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-200"
                >
               
                  🔗  {t('walletConnected')}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-amber-600 border-amber-200"
                >
                  ⚠️ {t('connectWalletAdv')}
                </Badge>
              )
            )}
            {showWalletStatus && !mounted && (
              <Badge variant="outline" className="text-gray-400 border-gray-200">
                ⏳ {t('loading')}
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
