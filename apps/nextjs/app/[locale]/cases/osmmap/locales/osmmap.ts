// Keys that are NOT in lib/i18n/common.ts.
// Common keys (counts, cases, victims, etc.) are inherited via fallback.
export const translations = {
  en: {
    donation: 'Donation',
    cause: 'To document cases in',
    amount: 'Amount (in USDT)',
    donate: 'Donate',
    donating: 'Donating...',
    approving: 'Approving...',
    invalidAmount: 'Please enter a valid donation amount.',
    noRecipient: 'The destination address for the donation is not configured.',
    approve: 'Donate',
    donateTitle: 'Donate',
    noContract: 'Donation contract not configured',
    availableFunds: '💰 Regional Balance',
    waitingForConfirmation: 'Waiting for confirmation...',
    donateSuccess: '🎉 Donation completed!',
    thanksTitle: '🙏 Thank you for your donation!',
    thanksMessage: '✨ Your generosity will help document cases of violence in {{region}}. {{amount}} USDT has been donated.'
  },
  es: {
    donation: 'Donación',
    cause: 'Para documentar casos en',
    amount: 'Valor (en USDT)',
    donate: 'Donar',
    donating: 'Donando...',
    approving: 'Aprobando...',
    invalidAmount: 'Por favor, ingrese un monto de donación válido.',
    noRecipient: 'La dirección de destino para la donación no está configurada.',
    approve: 'Donar',
    donateTitle: 'Donar',
    noContract: 'El contrato de donaciones no está configurado',
    availableFunds: '💰 Balance Regional',
    waitingForConfirmation: 'Esperando confirmación...',
    donateSuccess: '🎉 ¡Donación completada!',
    thanksTitle: '🙏 ¡Gracias por tu donación!',
    thanksMessage: '✨ Tu generosidad ayudará a documentar casos de violencia en {{region}}. Se han donado {{amount}} USDT.'
  }
};

export type TranslationKey = keyof typeof translations.en;
