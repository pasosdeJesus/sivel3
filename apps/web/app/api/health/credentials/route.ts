import path from 'path'
import { NextResponse } from 'next/server'
import { createPublicClient, http, type Chain } from 'viem'
import { celo, celoSepolia, base, baseSepolia } from 'viem/chains'
import {
  getBaseCredentialsAddress,
  getCeloCredentialsAddress,
} from '@pasosdejesus/m/blockchain/deployments'
import pasosDeJesusCredentialsAbi from '@/abis/PasosDeJesusCredentials.json'
import { getChainId } from '@/lib/credentials'

const deploymentsDir = path.join(
  process.cwd(),
  '..',
  'contracts',
  'deployments',
  'PasosDeJesusCredentials'
)

const CELO_CHAINS: Record<string, Chain> = { celo, celoSepolia }
const BASE_CHAINS: Record<string, Chain> = { base, baseSepolia }

const rpcTransport = (url: string | undefined) =>
  http((url || '').replace(/"/g, '') || undefined)

async function checkChain(
  address: `0x${string}` | null,
  chain: Chain,
  rpcUrl: string | undefined
): Promise<boolean> {
  if (!address) return false
  try {
    const client = createPublicClient({ chain, transport: rpcTransport(rpcUrl) })
    await client.readContract({
      address,
      abi: pasosDeJesusCredentialsAbi,
      functionName: 'nextTokenId',
    })
    return true
  } catch {
    return false
  }
}

export async function GET() {
  const celoNetwork = getChainId()
  const baseNetwork = process.env.NEXT_PUBLIC_BASE_NETWORK === 'base' ? 'base' : 'baseSepolia'

  const results = {
    celo: await checkChain(
      getCeloCredentialsAddress(deploymentsDir),
      CELO_CHAINS[celoNetwork],
      process.env.NEXT_PUBLIC_RPC_URL
    ),
    base: await checkChain(
      getBaseCredentialsAddress(deploymentsDir),
      BASE_CHAINS[baseNetwork],
      process.env.NEXT_PUBLIC_BASE_RPC_URL
    ),
    timestamp: new Date().toISOString(),
  }

  const healthy = results.celo || results.base
  return NextResponse.json(results, { status: healthy ? 200 : 503 })
}
