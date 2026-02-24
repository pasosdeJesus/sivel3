import { redirect } from 'next/navigation';

// This page simply redirects to the case map for the given locale.
// In Next.js 15, params can be a promise that needs to be awaited.
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/cases/osmmap`);
}
