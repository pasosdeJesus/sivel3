'use client'

// Pase de cuota de billetera (R-#22 P1). El navegador pide una firma EIP-191 de una sola
// vez (`pase:{address}:{timestamp}`) y el servidor emite una cookie HttpOnly firmada;
// desde ahí el detalle de caso se cuenta por billetera (16/mes, 24 verificada) en vez de
// por IP (1/día). No es una sesión: no identifica a la persona ni guarda nada suyo.
export interface Eip1193Like {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
}

export async function pedirPase(opciones: {
  provider: Eip1193Like
  address: string
}): Promise<{ ok: boolean; status: number }> {
  const timestamp = Math.floor(Date.now() / 1000)
  const mensaje = `pase:${opciones.address.toLowerCase()}:${timestamp}`
  let signature: string
  try {
    signature = (await opciones.provider.request({
      method: 'personal_sign',
      params: [mensaje, opciones.address],
    })) as string
  } catch {
    return { ok: false, status: 400 }
  }

  const respuesta = await fetch('/api/wallet-pass', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: opciones.address, timestamp, signature }),
    credentials: 'same-origin',
  })
  return { ok: respuesta.ok, status: respuesta.status }
}
