// app/api/departamentos/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Datos de ejemplo - en producción vendrían de Rails
    const departamentos = [
      { id: '1', nombre: 'Cauca' },
      { id: '2', nombre: 'Nariño' },
      { id: '3', nombre: 'Valle del Cauca' },
      { id: '4', nombre: 'Antioquia' },
      { id: '5', nombre: 'Chocó' },
      { id: '6', nombre: 'Meta' }
    ];
    
    return NextResponse.json(departamentos);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener departamentos' },
      { status: 500 }
    );
  }
}

// app/api/categorias/route.ts
export async function GET() {
  try {
    const categorias = [
      { id: '1', nombre: 'Desaparición', codigo: '100' },
      { id: '2', nombre: 'Masacre', codigo: '200' },
      { id: '3', nombre: 'Tortura', codigo: '300' },
      { id: '4', nombre: 'Desplazamiento', codigo: '400' }
    ];
    
    return NextResponse.json(categorias);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener categorías' },
      { status: 500 }
    );
  }
}

// app/api/presponsables/route.ts  
export async function GET() {
  try {
    const presponsables = [
      { id: '1', nombre: 'FARC-EP' },
      { id: '2', nombre: 'ELN' },
      { id: '3', nombre: 'Paramilitares' },
      { id: '4', nombre: 'Fuerza Pública' }
    ];
    
    return NextResponse.json(presponsables);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener presuntos responsables' },
      { status: 500 }
    );
  }
}
