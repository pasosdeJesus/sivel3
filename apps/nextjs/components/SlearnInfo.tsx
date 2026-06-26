'use client'

import { useState } from 'react'
import { Card, CardContent } from '@pasosdejesus/m/shadcn-components/ui/card'
import { Info, GraduationCap, BadgeCheck, ArrowRightLeft } from 'lucide-react'

const tS = {
  en: {
    title: '🎓 SLEARN Cashback',
    what: 'What is SLEARN?',
    description: 'When you donate, you earn 10% back in SLEARN tokens — a reward for your generosity.',
    step1Title: '1. Donate',
    step1Desc: 'You donate to a region in sivel.xyz',
    step2Title: '2. Earn SLEARN',
    step2Desc: '10% of your donation is minted as SLEARN to your wallet',
    step3Title: '3. Take courses',
    step3Desc: 'Use SLEARN to pay for courses on learn.tg',
    step4Title: '4. Redeem',
    step4Desc: 'Complete a premium course → get SBT → redeem SLEARN on stable-sl.pdJ.app for Leones (Sierra Leone) or USDT (worldwide)',
    links: {
      learnTg: 'Take courses on learn.tg',
      stableSl: 'Redeem on stable-sl',
    },
  },
  es: {
    title: '🎓 SLEARN Cashback',
    what: '¿Qué es SLEARN?',
    description: 'Al donar, recibes el 10% de vuelta en tokens SLEARN — una recompensa por tu generosidad.',
    step1Title: '1. Donas',
    step1Desc: 'Donas a una región en sivel.xyz',
    step2Title: '2. Ganas SLEARN',
    step2Desc: 'El 10% de tu donación se mintea como SLEARN a tu billetera',
    step3Title: '3. Tomas cursos',
    step3Desc: 'Usa SLEARN para pagar cursos en learn.tg',
    step4Title: '4. Canjeas',
    step4Desc: 'Completa un curso premium → obtén SBT → canjea SLEARN en stable-sl.pdJ.app por Leones (Sierra Leona) o USDT (todo el mundo)',
    links: {
      learnTg: 'Tomar cursos en learn.tg',
      stableSl: 'Canjear en stable-sl',
    },
  },
}

interface SlearnInfoProps {
  locale?: string
  isVerified?: boolean
}

export function SlearnInfo({ locale = 'en', isVerified }: SlearnInfoProps) {
  const t = (k: keyof typeof tS.en) => (tS[locale as keyof typeof tS]?.[k] || tS.en[k]) as string
  const [open, setOpen] = useState(false)

  const base = process.env.NEXT_PUBLIC_NETWORK === 'celo'
    ? 'https://learn.tg'
    : 'https://learn.tg:9001'

  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors rounded-t-lg"
      >
        <span className="font-medium flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-purple-600" />
          {t('what')}
        </span>
        <Info className="h-4 w-4 text-gray-400" />
      </button>

      {open && (
        <CardContent className="pt-0 pb-4 space-y-3 text-sm">
          <p className="text-gray-600">{t('description')}</p>

          {!isVerified && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800">
              🔐 Verify on learn.tg to unlock SLEARN and start taking courses.
            </div>
          )}

          <div className="space-y-2">
            {[1, 2, 3, 4].map((step) => {
              const icons = [null, ArrowRightLeft, GraduationCap, BadgeCheck]
              const Icon = icons[step - 1]
              return (
                <div key={step} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-bold">
                    {step}
                  </span>
                  <div>
                    <strong>{t(`step${step}Title` as any)}</strong>
                    <span className="text-gray-500"> — {t(`step${step}Desc` as any)}</span>
                  </div>
                  {Icon && step > 1 && <Icon className="h-3 w-3 text-purple-400 flex-shrink-0 mt-0.5" />}
                </div>
              )
            })}
          </div>

          <div className="flex gap-2 pt-1">
            <a
              href={base}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-600 underline hover:text-purple-800"
            >
              {tS[locale as keyof typeof tS]?.links?.learnTg || tS.en.links.learnTg} →
            </a>
            <a
              href="https://stable-sl.pdJ.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-600 underline hover:text-purple-800"
            >
              {tS[locale as keyof typeof tS]?.links?.stableSl || tS.en.links.stableSl} →
            </a>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
