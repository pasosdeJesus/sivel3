
import { NextRequest, NextResponse } from 'next/server';
import { newKyselyPostgresql } from '@/.config/kysely.config';

export async function POST(req: NextRequest) {
  try {
    const db = newKyselyPostgresql();
    const body = await req.json();
    const { type, path, amount, currency, metadata } = body;

    if (!type) {
      return NextResponse.json({ error: 'Type is required' }, { status: 400 });
    }

    const event = await db
      .insertInto('userevent')
      .values({
        type,
        path,
        amount,
        currency,
        metadata,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const db = newKyselyPostgresql();
    const events = await db.selectFrom('userevent').selectAll().orderBy('timestamp', 'desc').execute();
    return NextResponse.json(events, { status: 200 });
  } catch (error) {
    console.error('Error fetching userevents:', error);
    return NextResponse.json(
      { error: 'Error fetching userevents' },
      { status: 500 }
    );
  }
}
