import { getRequestConfig } from 'next-intl/server';
export default getRequestConfig(async () => {
  const locale = 'es'; // Aquí implementarías la lógica para detectar el idioma
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
