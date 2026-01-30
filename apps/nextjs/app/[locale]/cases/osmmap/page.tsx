import { redirect } from 'next/navigation';
import { locales } from '@/i18n';

export default function LocaleOSMMapPage({
  params
}: {
  params: { locale: string }
}) {
  // Validar que el locale sea soportado
  if (!locales.includes(params.locale)) {
    redirect('/cases/osmmap'); // default a inglés
  }
  
  // Redirigir a la página real (que leerá el locale de la URL)
  redirect(`/${params.locale}/cases/osmmap`);
}

/* // Redirección en el servidor:
import { permanentRedirect } from 'next/navigation';

export default function LocaleOSMMapPage() {
  permanentRedirect('/cases/osmmap');
} */
