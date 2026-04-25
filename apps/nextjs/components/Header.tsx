'use client'

import { Map } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'

import ConnectWalletButton from './ConnectWalletButton'

const localTranslations = {
  en: { mapOfCases: 'Map of Cases' },
  es: { mapOfCases: 'Mapa de Casos' },
}

interface HeaderProps {
  lang: string;
}

export default function Header({ lang }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useTranslation(localTranslations)

  const changeLanguage = (newLocale: string) => {
    // Reemplaza el locale actual en la URL con el nuevo
    const newPath = pathname.replace(`/${lang}`, `/${newLocale}`)
    router.push(newPath)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Map className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {t('mapOfCases')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={lang}
              onChange={(e) => changeLanguage(e.target.value)}
              className="rounded-md border bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>

            <ConnectWalletButton />
          </div>
        </div>
      </div>
    </header>
  )
}
