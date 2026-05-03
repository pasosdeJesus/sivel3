// lib/i18n/common.ts
// Global/common translations shared across all components.
//
// Local TypeScript Objects pattern — see doc/I18N.md
// Pure data: no framework dependencies, designed to be migratable to @pasosdejesus/m.
//
// When adding new keys, always add both 'en' and 'es' entries.

import type { TranslationSet } from '@pasosdejesus/m/i18n'

const commonTranslations: TranslationSet = {
  en: {
    acts: 'Acts',
    allegedPerpetrator: 'Alleged Perpetrator',
    caseDetails: 'Case Details',
    cases: 'Cases',
    center: 'Center',
    code: 'Code',
    completeInformation: 'Complete case information',
    connectWallet: 'Connect wallet for advanced features',
    counts: 'Counts',
    date: 'Date',
    department: 'Department',
    description: 'Interactive map of documented cases',
    export: 'Export',
    filter: 'Filter',
    filters: 'Filters',
    from: 'From',
    municipality: 'Municipality',
    perpetrator: 'Perpetrator',
    place: 'Place',
    share: 'Share',
    showAll: 'Show all',
    time: 'Time',
    title: 'Case Map',
    to: 'To',
    totalsByFilters: 'Totals by applied filters',
    updated: 'Updated',
    victimizations: 'Victimizations',
    victims: 'Victims',
    viewComplete: 'View complete',
    violence: 'Violence',
    mapOfCases: 'Map of Cases',
    error: 'Error',
    errorDesc: 'Unable to fetch region balance. Check your connection.',
  },
  es: {
    acts: 'Actos',
    allegedPerpetrator: 'P. Responsable',
    caseDetails: 'Detalles del Caso',
    cases: 'Casos',
    center: 'Centrar',
    code: 'Código',
    completeInformation: 'Información completa del caso',
    connectWallet: 'Conecta wallet para funciones avanzadas',
    counts: 'Conteos',
    date: 'Fecha',
    department: 'Departamento',
    description: 'Mapa interactivo de casos documentados',
    export: 'Exportar',
    filter: 'Filtrar',
    filters: 'Filtros',
    from: 'Desde',
    municipality: 'Municipio',
    perpetrator: 'P. Responsable',
    place: 'Lugar',
    share: 'Compartir',
    showAll: 'Mostrar todos',
    time: 'Hora',
    title: 'Mapa de Casos',
    to: 'Hasta',
    totalsByFilters: 'Totales según filtros aplicados',
    updated: 'Actualizado',
    victimizations: 'Victimizaciones',
    victims: 'Víctimas',
    viewComplete: 'Ver completo',
    violence: 'Violencia',
    mapOfCases: 'Mapa de Casos',
    error: 'Error',
    errorDesc: 'No se pudo consultar el balance de la región. Verifica tu conexión.',
  },
}

export default commonTranslations
