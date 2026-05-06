import { NextRequest, NextResponse } from 'next/server';
import { recordEvent } from '@/lib/web-analytics'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Construir URL para Rails API
    const railsUrl = `${process.env.NEXT_PUBLIC_API1}/casos/datos-osm.json`;
    const url = new URL(railsUrl);
    
    // Pasar todos los parámetros de filtro
    searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
    
    // Añadir parámetros fijos de Rails
    url.searchParams.append('filtro[inc_fecha]', '1');
    url.searchParams.append('filtro[inc_ubicaciones]', '2');
    url.searchParams.append('filtro[disgenera]', 'reprevista.json');
    url.searchParams.append('idplantilla', 'reprevista');
    
    const response = await fetch(url.toString());
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    recordEvent({ event_type: 'api_error', metadata: { route: '/api/cases/datos-osm', status: 500 } });
    return NextResponse.json(
      { error: 'Error al obtener datos del mapa' },
      { status: 500 }
    );
  }
}
