import { redirect } from 'next/navigation';

export default function HomePage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  redirect(`/${locale}/cases/osmmap`);
  
  // O home page:
  // return <div>Home page in {locale}</div>
}
