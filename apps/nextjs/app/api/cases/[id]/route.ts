// app/api/casos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Proxy a Rails
    const railsUrl = `${process.env.NEXT_PUBLIC_API1}/casos/${id}.json`;
    const response = await fetch(railsUrl);
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener detalle del caso' },
      { status: 500 }
    );
  }
}
