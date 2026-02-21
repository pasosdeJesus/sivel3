import { redirect } from 'next/navigation';

// Esta página simplemente redirige al mapa de casos para el locale dado.
export default function HomePage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  redirect(`/${locale}/cases/osmmap`);
}
