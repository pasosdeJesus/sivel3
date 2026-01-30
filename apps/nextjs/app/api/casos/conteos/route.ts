
// /app/api/casos/estadisticas/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // En producción, esto vendría de tu base de datos
  const stats = {
    casos: 12543,
    victimas: 28976,
    victimizaciones: 45231,
    actos: 56789
  };

  return NextResponse.json(stats);
}


