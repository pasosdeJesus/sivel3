"use server"

import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import { recordEvent } from '@/lib/web-analytics'

export async function GET(req: NextRequest) {
  try {
    const db = newKyselyPostgresql()

    const locale = req.nextUrl.searchParams.get('locale') || 'en';

    const regions = await db
      .selectFrom('region')
      .select(['id', locale === 'es' ? 'name_es as name' : 'name'])
      .orderBy('id')
      .execute();

    return NextResponse.json(regions, { status: 200 });

  } catch (error) {
    console.error("Error en regions:", error);
    recordEvent({ event_type: 'api_error', metadata: { route: '/api/regions', status: 500 } });
    return NextResponse.json(
      { error: 'Error al obtener regions' },
      { status: 500 }
    );
  }
}
