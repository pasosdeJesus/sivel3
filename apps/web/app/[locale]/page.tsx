import { LandingPage } from '@/components/LandingPage';

// Landing page internacionalizada para SIVeL 3
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <LandingPage locale={locale} />;
}
