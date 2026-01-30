import { NextRequest, NextResponse } from 'next/server'

// /app/api/casos/geojson/route.ts
export async function GET() {
  // GeoJSON de casos
  const geojson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [-74.0721, 4.6682] // Bogotá
        },
        properties: {
          id: 1,
          victimas: 3,
          ubicacion: "Bogotá, Cundinamarca",
          fecha: "2023-01-15",
          versiculo: "Bienaventurados los que tienen hambre y sed de justicia, porque ellos serán saciados.",
          urgente: true
        }
      }
      // ... más casos
    ]
  };

  return NextResponse.json(geojson);
}
