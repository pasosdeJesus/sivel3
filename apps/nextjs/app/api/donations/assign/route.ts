import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, getContract } from 'viem'
import { celo, celoSepolia } from 'viem/chains'

// Logger simple para el servidor (no usar el logger del cliente)
const serverLog = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  success: (...args: any[]) => console.log('[SUCCESS]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
}

// ABIs
const ERC20_ABI = [
  {
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' }
    ],
    name: 'Transfer',
    type: 'event'
  }
] as const

const REGIONAL_DONATION_V2_ABI = [
  {
    inputs: [
      { name: '_regionId', type: 'uint256' },
      { name: '_donor', type: 'address' },
      { name: '_amount', type: 'uint256' },
      { name: '_txHash', type: 'bytes32' }
    ],
    name: 'assignDonation',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

// Función para verificar la transacción y extraer la región del data
async function verifyTransferAndGetRegion(
  txHash: string,
  expectedDonor: string,
  expectedAmount: string,
  expectedContract: string
): Promise<{ isValid: boolean; regionId: number | null }> {
  const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!
  const NETWORK = process.env.NEXT_PUBLIC_NETWORK!

  const publicClient = createPublicClient({
    chain: NETWORK == 'celo' ? celo : celoSepolia,
    transport: http(RPC_URL),
  })

  try {
    // Obtener la transacción completa (para acceder al data)
    const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` })
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` })
    
    if (!receipt || !tx) {
      logger.error(`Transacción no encontrada: ${txHash}`, 'DonationAssign')
      return { isValid: false, regionId: null }
    }

    // Extraer regionId del data de la transacción
    let regionId: number | null = null
    if (tx.input && tx.input !== '0x' && tx.input.length >= 66) {
      // El data tiene formato: 0x + 64 hex (32 bytes) con el regionId al final
      // Asumimos que el regionId está en los últimos 64 caracteres (32 bytes) del data
      const dataHex = tx.input
      // Tomar los últimos 64 caracteres (32 bytes) después de '0x'
      const regionIdHex = dataHex.length >= 66 ? '0x' + dataHex.slice(-64) : '0x0'
      regionId = parseInt(regionIdHex, 16)
      serverLog.info(`RegionId extraído del data: ${regionId} (hex: ${regionIdHex})`)
    }

    // Buscar eventos Transfer de USDT
    const transferEventTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    const transferLog = receipt.logs.find(log => 
      log.topics[0] === transferEventTopic &&
      log.address.toLowerCase() === process.env.NEXT_PUBLIC_USDT_ADDRESS?.toLowerCase()
    )

    if (!transferLog) {
      logger.error(`No se encontró evento Transfer en la transacción: ${txHash}`, 'DonationAssign')
      return { isValid: false, regionId: null }
    }

    // Decodificar el evento Transfer (verificar que topics existan)
    if (!transferLog.topics || transferLog.topics.length < 3) {
      logger.error(`Evento Transfer con topics insuficientes: ${txHash}`, 'DonationAssign')
      return { isValid: false, regionId: null }
    }
    
    const topic1 = transferLog.topics[1]
    const topic2 = transferLog.topics[2]
    
    if (!topic1 || !topic2) {
      logger.error(`Topics de Transfer incompletos: ${txHash}`, 'DonationAssign')
      return { isValid: false, regionId: null }
    }
    
    // Los topics son bytes32, la dirección está en los últimos 20 bytes (40 chars)
    const from = `0x${topic1.slice(26)}` as `0x${string}`
    const to = `0x${topic2.slice(26)}` as `0x${string}`
    const value = BigInt(transferLog.data)

    const expectedAmountBigInt = BigInt(Math.floor(parseFloat(expectedAmount) * 1_000_000))

    logger.info(`Verificando transferencia - From: ${from}, To: ${to}, Value: ${value}`, 'DonationAssign')
    logger.info(`Esperado - Donor: ${expectedDonor}, Contract: ${expectedContract}, Amount: ${expectedAmountBigInt}`, 'DonationAssign')

    // Verificar transferencia
    const isValid = from.toLowerCase() === expectedDonor.toLowerCase() &&
                    to.toLowerCase() === expectedContract.toLowerCase() &&
                    value === expectedAmountBigInt

    if (isValid && regionId !== null && (regionId === 1 || regionId === 2)) {
      logger.success(`Transferencia verificada correctamente: ${txHash} - Región ${regionId}`, 'DonationAssign')
      return { isValid: true, regionId }
    } else if (isValid && (regionId === null || (regionId !== 1 && regionId !== 2))) {
      logger.error(`Región inválida en data: ${regionId}`, 'DonationAssign')
      return { isValid: false, regionId: null }
    }

    logger.error(`Transferencia inválida: ${txHash}`, 'DonationAssign')
    return { isValid: false, regionId: null }
  } catch (error) {
    logger.error(`Error verificando transferencia: ${error}`, 'DonationAssign')
    return { isValid: false, regionId: null }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { regionId, donor, amount, txHash } = body

    serverLog.info(`Solicitud de asignación de donación: región=${regionId}, donor=${donor}, amount=${amount}, txHash=${txHash}`)

    // Validar parámetros
    if (!regionId || !donor || !amount || !txHash) {
      return NextResponse.json(
        { error: 'Faltan parámetros: regionId, donor, amount, txHash' },
        { status: 400 }
      )
    }

    // Verificar que la transacción sea válida y extraer región
    const contractAddress = process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS!
    const { isValid, regionId: extractedRegionId } = await verifyTransferAndGetRegion(
      txHash, 
      donor, 
      amount, 
      contractAddress
    )

    if (!isValid) {
      return NextResponse.json(
        { error: 'Transacción no válida o no verificada' },
        { status: 400 }
      )
    }

    // Usar la región extraída del data (ignorar la que envió el frontend por seguridad)
    const finalRegionId = extractedRegionId || parseInt(regionId, 10)
    logger.info(`Región final para asignación: ${finalRegionId}`, 'DonationAssign')

    // Conectar al contrato V2
    const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!
    const NETWORK = process.env.NEXT_PUBLIC_NETWORK!
    const PRIVATE_KEY = process.env.PRIVATE_KEY! as `0x${string}`

    const viem = await import('viem')
    const viemAccounts = await import('viem/accounts')
    
    const account = viemAccounts.privateKeyToAccount(PRIVATE_KEY)
    const walletClient = viem.createWalletClient({
      account,
      chain: NETWORK == 'celo' ? celo : celoSepolia,
      transport: viem.http(RPC_URL),
    })

    const contract = getContract({
      address: contractAddress as `0x${string}`,
      abi: REGIONAL_DONATION_V2_ABI,
      client: walletClient,
    })

    // Llamar a assignDonation con la región extraída
    logger.info(`Llamando a assignDonation en el contrato...`, 'DonationAssign')
    const hash = await contract.write.assignDonation([
      BigInt(finalRegionId),
      donor as `0x${string}`,
      BigInt(Math.floor(parseFloat(amount) * 1_000_000)),
      txHash as `0x${string}`,
    ])

    logger.success(`Donación asignada correctamente. TX: ${hash}`, 'DonationAssign')

    return NextResponse.json({
      success: true,
      message: 'Donación asignada correctamente',
      txHash: hash,
    })

  } catch (error) {
    serverLog.error(`Error en POST /api/donations/assign: ${error}`)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}