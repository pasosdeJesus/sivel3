import { NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { celo, celoSepolia, base, baseSepolia } from 'viem/chains'
import pasosDeJesusCredentialsAbi from '@/abis/PasosDeJesusCredentials.json'

function getChain(network: string) {
  switch (network) {
    case 'celo': return celo
    case 'celoSepolia': return celoSepolia
    case 'base': return base
    case 'baseSepolia': return baseSepolia
    default: return celoSepolia
  }
}

async function checkChain(addr: string | undefined, network: string): Promise<boolean> {
  if (!addr) return false
  try {
    const client = createPublicClient({ chain: getChain(network), transport: http() })
    await client.readContract({
      address: addr as `0x${string}`,
      abi: pasosDeJesusCredentialsAbi,
      functionName: 'nextTokenId',
    })
    return true
  } catch {
    return false
  }
}

export async function GET() {
  const celoNetwork = process.env.NEXT_PUBLIC_NETWORK === 'celo' ? 'celo' : 'celoSepolia'
  const baseNetwork = process.env.NEXT_PUBLIC_BASE_NETWORK === 'base' ? 'base' : 'baseSepolia'

  const results = {
    celo: await checkChain(
      process.env.NEXT_PUBLIC_PDJCREDENTIALS_CELO_ADDRESS,
      celoNetwork
    ),
    base: await checkChain(
      process.env.NEXT_PUBLIC_PDJCREDENTIALS_BASE_ADDRESS,
      baseNetwork
    ),
    timestamp: new Date().toISOString(),
  }

  const healthy = results.celo || results.base
  return NextResponse.json(results, { status: healthy ? 200 : 503 })
}
