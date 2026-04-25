"use server"

import { NextRequest, NextResponse } from 'next/server'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import { createTranslator } from '@/hooks/useTranslation'

const localTranslations = {
  en: { errorFetching: 'Error fetching regions' },
  es: { errorFetching: 'Error al obtener regiones' }
}

export async function GET(req: NextRequest) {
  const locale = (req.nextUrl.searchParams.get('locale') as 'en' | 'es') || 'en';
  const t = createTranslator(locale, localTranslations)

  try {
    const db = newKyselyPostgresql()

    const regions = await db
      .selectFrom('region')
      .select(['id', locale === 'es' ? 'name_es as name' : 'name'])
      .orderBy('id')
      .execute();

    return NextResponse.json(regions, { status: 200 });

  } catch (error) {
    console.error("Error en regions:", error);
    return NextResponse.json(
      { error: t('errorFetching') },
      { status: 500 }
    );
  }
}
