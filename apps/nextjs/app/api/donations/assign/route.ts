import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, getContract, parseAbi } from 'viem'
import { celo, celoSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { mintSlearnCashback, getCashbackPercent } from '@/lib/slearn'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import { recordEvent } from '@/lib/web-analytics'
import { mintSBT, getDonorThresholds, getChainId } from '@/lib/credentials'
import { getCredentialMetadata } from '@pasosdejesus/m/blockchain'

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
      serverLog.error(`Transacción no encontrada: ${txHash}`)
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
      serverLog.error(`No se encontró evento Transfer en la transacción: ${txHash}`)
      return { isValid: false, regionId: null }
    }

    // Decodificar el evento Transfer (verificar que topics existan)
    if (!transferLog.topics || transferLog.topics.length < 3) {
      serverLog.error(`Evento Transfer con topics insuficientes: ${txHash}`)
      return { isValid: false, regionId: null }
    }
    
    const topic1 = transferLog.topics[1]
    const topic2 = transferLog.topics[2]
    
    if (!topic1 || !topic2) {
      serverLog.error(`Topics de Transfer incompletos: ${txHash}`)
      return { isValid: false, regionId: null }
    }
    
    // Los topics son bytes32, la dirección está en los últimos 20 bytes (40 chars)
    const from = `0x${topic1.slice(26)}` as `0x${string}`
    const to = `0x${topic2.slice(26)}` as `0x${string}`
    const value = BigInt(transferLog.data)

    const expectedAmountBigInt = BigInt(Math.floor(parseFloat(expectedAmount) * 1_000_000))

    serverLog.info(`Verificando transferencia - From: ${from}, To: ${to}, Value: ${value}`)
    serverLog.info(`Esperado - Donor: ${expectedDonor}, Contract: ${expectedContract}, Amount: ${expectedAmountBigInt}`)

    // Verificar transferencia
    const isValid = from.toLowerCase() === expectedDonor.toLowerCase() &&
                    to.toLowerCase() === expectedContract.toLowerCase() &&
                    value === expectedAmountBigInt

    if (isValid && regionId !== null && (regionId === 1 || regionId === 2)) {
      serverLog.success(`Transferencia verificada correctamente: ${txHash} - Región ${regionId}`)
      return { isValid: true, regionId }
    } else if (isValid && (regionId === null || (regionId !== 1 && regionId !== 2))) {
      serverLog.error(`Región inválida en data: ${regionId}`)
      return { isValid: false, regionId: null }
    }

    serverLog.error(`Transferencia inválida: ${txHash}`)
    return { isValid: false, regionId: null }
  } catch (error) {
    serverLog.error(`Error verificando transferencia: ${error}`)
    return { isValid: false, regionId: null }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { regionId, amount, txHash } = body
    const donor = (body.donor || '').toLowerCase()

    serverLog.info(`Solicitud de asignación de donación: región=${regionId}, donor=${donor}, amount=${amount}, txHash=${txHash}`)

    // Validar parámetros
    if (!regionId || !donor || !amount || !txHash) {
      return NextResponse.json(
        { error: 'Faltan parámetros: regionId, donor, amount, txHash' },
        { status: 400 }
      )
    }

    // Derive backend address (user sends donation to backend, backend splits 90/10)
    const PRIVATE_KEY = process.env.PRIVATE_KEY! as `0x${string}`
    const backendAddress = privateKeyToAccount(PRIVATE_KEY).address.toLowerCase()

    const { isValid, regionId: extractedRegionId } = await verifyTransferAndGetRegion(
      txHash, 
      donor, 
      amount, 
      backendAddress
    )

    if (!isValid) {
      return NextResponse.json(
        { error: 'Transacción no válida o no verificada' },
        { status: 400 }
      )
    }

    // Usar la región extraída del data (ignorar la que envió el frontend por seguridad)
    const finalRegionId = extractedRegionId || parseInt(regionId, 10)
    serverLog.info(`Región final para asignación: ${finalRegionId}`)

    // ============================================================
    // Split: 10% to SLEARN for verified users (via mintSlearnCashback)
    // Not verified: 100% to RegionalDonation
    // ============================================================
    const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!
    const NETWORK = process.env.NEXT_PUBLIC_NETWORK!
    const regionalDonationAddress = process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS!

    const account = privateKeyToAccount(PRIVATE_KEY)
    const chain = NETWORK == 'celo' ? celo : celoSepolia

    const viem = await import('viem')
    const walletClient = viem.createWalletClient({ account, chain, transport: viem.http(RPC_URL) })

    const donationAmount = parseFloat(amount)
    const amountInSmallest = BigInt(Math.floor(donationAmount * 1_000_000))

    let slearnResult: any = { success: false, message: 'Not attempted' }
    let assignAmount = amountInSmallest

    try {
      // mintSlearnCashback handles: verify on learn.tg → transfer USDT to SLEARN → mintAndReserve
      const cashback = await mintSlearnCashback(donor, donationAmount)

      if (cashback) {
        const slearnUsdt = BigInt(Math.round(donationAmount * 0.1 * 1_000_000))
        assignAmount = amountInSmallest - slearnUsdt
        slearnResult = { success: true, usdtToReserve: cashback.usdtToReserve, slearnMinted: cashback.slearnMinted, txHash: cashback.txHash }
        serverLog.success(`Split: ${cashback.usdtToReserve} USDT → SLEARN, ${(Number(assignAmount)/1_000_000).toFixed(2)} USDT → RegionalDonation`)
      } else {
        serverLog.info('Not verified or no SLEARN — 100% to RegionalDonation')
      }
    } catch (slearnError) {
      serverLog.error(`SLEARN cashback error: ${slearnError}`)
    }

    // Transfer USDT from backend to RegionalDonation (90% or 100%)
    const usdtAddress = process.env.NEXT_PUBLIC_USDT_ADDRESS!
    const usdtAbi = parseAbi(['function transfer(address to, uint256 amount) returns (bool)'])
    await walletClient.writeContract({
      address: usdtAddress as `0x${string}`, abi: usdtAbi,
      functionName: 'transfer', args: [regionalDonationAddress as `0x${string}`, assignAmount],
      chain, account,
    })

    // Call assignDonation
    const contract = getContract({
      address: regionalDonationAddress as `0x${string}`,
      abi: REGIONAL_DONATION_V2_ABI,
      client: walletClient,
    })

    serverLog.info(`assignDonation: ${(Number(assignAmount)/1_000_000).toFixed(2)} USDT, region=${finalRegionId}`)
    const hash = await contract.write.assignDonation([
      BigInt(finalRegionId),
      donor as `0x${string}`,
      assignAmount,
      txHash as `0x${string}`,
    ])
    
    serverLog.success(`Donación asignada. TX: ${hash}`)

    // ============================================================
    // Record donation in web_event (analytics)
    // ============================================================
    recordEvent({
      event_type: 'donation_completed',
      wallet: donor,
      metadata: { region_id: finalRegionId, amount, tx_hash: txHash },
    })

    // ============================================================
    // Record donation in transaction
    // ============================================================
    try {
      const txDb = newKyselyPostgresql()
      await txDb
        .insertInto('transaction')
        .values({
          wallet: donor,
          type: 'donation',
          crypto: 'usdt',
          amount: amount,
          balance_impact: (-parseFloat(amount)).toString(),
          region_id: finalRegionId,
          hash_tx: txHash,
          hash_assign: hash,
        })
        .execute()
      serverLog.success(`Donation recorded in transaction: ${txHash}`)
    } catch (txError) {
      // Non-critical: log but don't fail the donation
      serverLog.error(`Error recording donation in transaction: ${txError}`)
    }

    // ============================================================
    // Record SLEARN transaction if minted
    // ============================================================
    if (slearnResult.success && slearnResult.txHash) {
      try {
        const sDb = newKyselyPostgresql()
        await sDb.insertInto('transaction').values({
          wallet: donor,
          type: 'earning',
          crypto: 'slearn',
          amount: slearnResult.slearnMinted,
          balance_impact: slearnResult.slearnMinted,
          region_id: finalRegionId,
          hash_tx: slearnResult.txHash,
        } as any).execute()
        serverLog.success(`SLEARN transaction recorded: ${slearnResult.txHash}`)
      } catch (sTxError) {
        serverLog.error(`Error recording SLEARN transaction: ${sTxError}`)
      }
    }

    // ============================================================
    // Mint donation SBTs if threshold reached
    // ============================================================
    const chainId = getChainId()
    let mintedSbts: { name: string; imageUrl: string }[] = []
    try {
      const sbtDb = newKyselyPostgresql()
      const totalRow = await sbtDb
        .selectFrom('transaction')
        .select(sbtDb.fn.sum('amount').as('total'))
        .where('wallet', '=', donor)
        .where('type', '=', 'donation')
        .where('crypto', '=', 'usdt')
        .executeTakeFirst()
      const total = parseFloat((totalRow?.total as string) || '0')

      const thresholds = await getDonorThresholds(sbtDb, chainId)

      const existingRows = await sbtDb
        .selectFrom('credential_emission')
        .select('token_id')
        .where('wallet_address', '=', donor)
        .where('chain_id', '=', chainId)
        .execute()
      const existingIds = new Set(existingRows.map(r => r.token_id))

      serverLog.info(`[SBT] Total donado: ${total}, thresholds encontrados: ${thresholds.length}, chainId=${chainId}`)
      if (thresholds.length === 0) {
        serverLog.warn('[SBT] No se encontraron thresholds de donación en credential_metadata')
      }
      for (const t of thresholds) {
        serverLog.info(`[SBT] Threshold: ${t.name} (tokenId=${t.tokenId}) min=${t.minUsdt} total=${total} tiene=${existingIds.has(t.tokenId)}`)
        if (total >= t.minUsdt && !existingIds.has(t.tokenId)) {
          try {
            await mintSBT(donor, t.tokenId, chainId)
            serverLog.success(`Donation SBT minted: tokenId=${t.tokenId} for ${donor}`)
            const meta = await getCredentialMetadata(sbtDb as any, t.tokenId, chainId)
            if (meta) mintedSbts.push({ name: meta.name, imageUrl: meta.image_url })
          } catch (e: any) { serverLog.warn(`Donation SBT mint failed: tokenId=${t.tokenId} ${e.message || e}`) }
        }
      }
    } catch (sbtError) {
      serverLog.warn(`Donation SBT check failed: ${sbtError}`)
    }

    // ============================================================
    // Connector + Global Founder: every donor gets them
    // ============================================================
    const CONNECTOR_ID = 2
    const MAX_FOUNDERS = 50
    try {
      const sbtDb2 = newKyselyPostgresql()
      // Resolve Connector tokenId dynamically
      const connRow = await sbtDb2
        .selectFrom('credential_metadata')
        .select('token_id')
        .where('name', '=', 'Connector')
        .where('chain_id', '=', chainId)
        .executeTakeFirst()
      if (connRow) {
        const r = await mintSBT(donor, connRow.token_id, chainId)
        if (r) {
          serverLog.success(`Connector SBT minted for donor ${donor}`)
          const meta = await getCredentialMetadata(sbtDb2 as any, connRow.token_id, chainId)
          if (meta) mintedSbts.push({ name: meta.name, imageUrl: meta.image_url })
        }
      }
      // Global Founder (if < 50 total)
      const founderRow = await sbtDb2
        .selectFrom('credential_metadata')
        .select('token_id')
        .where('name', '=', 'Global Founder')
        .where('chain_id', '=', chainId)
        .executeTakeFirst()
      if (founderRow) {
        const founderCount = await sbtDb2
          .selectFrom('credential_emission')
          .select(sbtDb2.fn.countAll().as('count'))
          .where('token_id', '=', founderRow.token_id)
          .where('chain_id', '=', chainId)
          .executeTakeFirst()
        if (Number(founderCount?.count || 0) < MAX_FOUNDERS) {
          const r2 = await mintSBT(donor, founderRow.token_id, chainId)
          if (r2) {
            serverLog.success(`Global Founder SBT minted for donor ${donor}`)
            const meta = await getCredentialMetadata(sbtDb2 as any, founderRow.token_id, chainId)
            if (meta) mintedSbts.push({ name: meta.name, imageUrl: meta.image_url })
          }
        }
      }
    } catch { /* best effort */ }

    // ============================================================
    // All done — skip deprecated LP transaction recording
    // ============================================================

    return NextResponse.json({
      success: true,
      message: 'Donación asignada correctamente',
      txHash: hash,
      slearn: slearnResult,
      mintedSbts,
    })
  } catch (error) {
    serverLog.error(`Error en POST /api/donations/assign: ${error}`)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}