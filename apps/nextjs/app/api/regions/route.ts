"use server"

import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'

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
    return NextResponse.json(
      { error: 'Error al obtener regions' },
      { status: 500 }
    );
  }
}
