import { redirect } from 'next/navigation';

export default async function HomePage({
  params
}: {
  params: { locale: string }
}) {
  // Espera a que se resuelvan los parmetros
  const { locale } = await params;
  redirect(`/${locale}/cases/osmmap`);

  // O home page:
  // return <div>Home page in {locale}</div>
}
