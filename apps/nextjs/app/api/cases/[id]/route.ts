import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } } // Corregido: sin Promise
) {
  try {
    const { id } = params; // Corregido: sin await

    // Proxy a Rails
    const railsUrl = `${process.env.NEXT_PUBLIC_API1}/casos/${id}.json`;
    const response = await fetch(railsUrl);

    if (!response.ok) {
      // Si la respuesta del proxy no es exitosa, propaga el error
      const errorData = await response.text();
      return NextResponse.json(
        { error: `Error from Rails API: ${errorData}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Error al obtener detalle del caso', details: errorMessage },
      { status: 500 }
    );
  }
}
