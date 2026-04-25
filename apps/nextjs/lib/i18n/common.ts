/**
 * Common translation strings used across the application.
 * Follows the zero-dependency pattern for OpenBSD/adJ compatibility.
 */
export const commonTranslations = {
  en: {
    acts: 'Acts',
    allegedPerpetrator: 'Alleged Perpetrator',
    cancel: 'Cancel',
    cases: 'Cases',
    close: 'Close',
    connectWallet: 'Connect Wallet',
    counts: 'Counts',
    date: 'Date',
    department: 'Department',
    donate: 'Donate',
    donating: 'Donating...',
    donation: 'Donation',
    error: 'Error',
    filter: 'Filter',
    filters: 'Filters',
    loading: 'Loading...',
    municipality: 'Municipality',
    share: 'Share',
    victims: 'Victims',
    victimizations: 'Victimizations',
    violence: 'Violence',
  },
  es: {
    acts: 'Actos',
    allegedPerpetrator: 'P. Responsable',
    cancel: 'Cancelar',
    cases: 'Casos',
    close: 'Cerrar',
    connectWallet: 'Conectar Wallet',
    counts: 'Conteos',
    date: 'Fecha',
    department: 'Departamento',
    donate: 'Donar',
    donating: 'Donando...',
    donation: 'Donación',
    error: 'Error',
    filter: 'Filtrar',
    filters: 'Filtros',
    loading: 'Cargando...',
    municipality: 'Municipio',
    share: 'Compartir',
    victims: 'Víctimas',
    victimizations: 'Victimizaciones',
    violence: 'Violencia',
  }
};

export type CommonTranslationKey = keyof typeof commonTranslations.en;
