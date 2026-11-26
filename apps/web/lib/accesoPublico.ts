// Topes de filas del corpus público (https://gitlab.com/pasosdeJesus/sivel3/-/issues/17,
// ejercidos por el mapa en https://gitlab.com/pasosdeJesus/sivel3/-/issues/69).
//
// El mapa sirve una vista anónima de hasta 2.000 casos; con la billetera conectada el
// tope sube a 10.000. Por encima de eso la consulta requiere una vista más estrecha o
// más acceso (créditos). La ventana pública (R-#22) mantiene la vista por omisión
// dentro del tope, así que el aviso de acceso sólo aparece cuando el usuario amplía el
// rango de fechas.

export const TOPE_FILAS_ANONIMO = 2_000
export const TOPE_FILAS_BILLETERA = 10_000

export interface VentanaRango {
  desde: string | null
  hasta: string | null
  activa?: boolean
}

export interface ConsultaFechas {
  desde?: string | null
  hasta?: string | null
}

/** Filas que puede pedir una consulta según haya o no billetera conectada. */
export function topeDeFilas(billetera: boolean): number {
  return billetera ? TOPE_FILAS_BILLETERA : TOPE_FILAS_ANONIMO
}

/** `true` si la consulta pide un rango de fechas más amplio que la ventana pública. */
export function consultaAmpliada(
  consulta: ConsultaFechas,
  ventana?: VentanaRango | null,
): boolean {
  const desde = consulta.desde || null
  const hasta = consulta.hasta || null
  if (!ventana || ventana.activa === false || (!ventana.desde && !ventana.hasta)) {
    // Sin ventana configurada, el mapa muestra todo el archivo por omisión: sólo una
    // consulta con fechas pedidas por el usuario cuenta como intención explícita.
    return Boolean(desde || hasta)
  }
  // Una fecha vacía no amplía nada: el servidor vuelve a aplicar la ventana.
  if (ventana.desde && desde && desde < ventana.desde) return true
  if (ventana.hasta && hasta && hasta > ventana.hasta) return true
  return false
}

/** Aviso de acceso: sólo con la consulta ampliada y por encima del tope de filas. */
export function requiereAvisoAcceso(
  casos: number,
  consulta: ConsultaFechas,
  ventana: VentanaRango | null | undefined,
  billetera: boolean,
): boolean {
  if (!Number.isFinite(casos) || casos <= 0) return false
  return casos > topeDeFilas(billetera) && consultaAmpliada(consulta, ventana)
}
