'use client'

import { Map } from 'lucide-react'
import { useRouter, usePathname, useParams } from 'next/navigation'

import ConnectWalletButton from './ConnectWalletButton'

// Dado que no se usa i18next, se puede usar un diccionario simple o un
// proveedor de contexto para las traducciones. Por ahora, se usa un ternario.
const translations = {
  en: { mapOfCases: 'Map of Cases' },
  es: { mapOfCases: 'Mapa de Casos' },
}

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  
  const currentLocale = Array.isArray(params.locale) ? params.locale[0] : params.locale || 'en'

  const changeLanguage = (newLocale: string) => {
    // Reemplaza el locale actual en la URL con el nuevo
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`)
    router.push(newPath)
  }

  const t = translations[currentLocale] || translations.en

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Map className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {t.mapOfCases}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={currentLocale}
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
