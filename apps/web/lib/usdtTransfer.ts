import { createPublicClient, http } from 'viem'
import { celo, celoSepolia } from 'viem/chains'

import { USDT_ADDRESS } from '@/lib/contractAddresses'

// Verificación de una transferencia USDT (ERC-20) a una dirección concreta, con el
// mismo criterio que `app/api/donations/assign`: se mira el recibo, se busca el evento
// Transfer del contrato de USDT y se comparan origen, destino y cantidad.
//
// Se usa para comprar créditos (R-#22 P2). No confía en el cliente: el `tx_hash` que
// llega se comprueba contra la cadena.
const TOPIC_TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

export interface TransferenciaUSDT {
  ok: boolean
  /** Monto en USDT (decimales de 6) cuando la transferencia coincide. */
  monto: number | null
  motivo?: 'sin_rpc' | 'no_encontrada' | 'sin_transferencia' | 'no_coincide'
}

export async function verificarTransferenciaUSDT(
  txHash: string,
  esperado: { hacia: string; desde?: string; minimoUSDT?: number },
): Promise<TransferenciaUSDT> {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL
  if (!rpcUrl) return { ok: false, monto: null, motivo: 'sin_rpc' }

  const cliente = createPublicClient({
    chain: process.env.NEXT_PUBLIC_NETWORK === 'celo' ? celo : celoSepolia,
    transport: http(rpcUrl),
  })

  let recibo
  try {
    recibo = await cliente.getTransactionReceipt({ hash: txHash as `0x${string}` })
  } catch {
    return { ok: false, monto: null, motivo: 'no_encontrada' }
  }
  if (!recibo) return { ok: false, monto: null, motivo: 'no_encontrada' }

  const transferencia = recibo.logs.find(
    (log) =>
      log.topics[0] === TOPIC_TRANSFER &&
      log.address.toLowerCase() === USDT_ADDRESS.toLowerCase() &&
      (log.topics?.length ?? 0) >= 3,
  )
  if (!transferencia) return { ok: false, monto: null, motivo: 'sin_transferencia' }

  const origen = `0x${(transferencia.topics[1] as string).slice(26)}`.toLowerCase()
  const destino = `0x${(transferencia.topics[2] as string).slice(26)}`.toLowerCase()
  const monto = Number(BigInt(transferencia.data)) / 1_000_000

  const destinoOk = destino === esperado.hacia.toLowerCase()
  const origenOk = !esperado.desde || origen === esperado.desde.toLowerCase()
  const montoOk = esperado.minimoUSDT === undefined || monto >= esperado.minimoUSDT
  if (!destinoOk || !origenOk || !montoOk) {
    return { ok: false, monto, motivo: 'no_coincide' }
  }
  return { ok: true, monto }
}
