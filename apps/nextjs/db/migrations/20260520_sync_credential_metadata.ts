import type { Kysely } from 'kysely'
import { createPublicClient, http } from 'viem'
import { celo, celoSepolia } from 'viem/chains'
import pasosDeJesusCredentialsAbi from '../../abis/PasosDeJesusCredentials.json'
import path from 'path'
import fs from 'fs'

const siteMap: Record<string, string> = {
  '0x616d78ebe5052eab0de25afa2c90b2cd8e550c70dfa0859ede7a9902335187ba': 'learn.tg',
  '0x2eb33b8b6fa0a4cfa9282cd213f79e291a0a473487dd04b15bc4c9f11bffc6d9': 'sivel.xyz',
  '0xc881844ff5e225c937d57807a73752d627e798112994cb398c38727eb732e580': 'stable-sl.pdJ.app',
}

const typeMap: Record<string, string> = {
  '0x65a58990984f61f252fd6868ac0e9acb3befaf5d04a573bd155fc6c2e4159d9c': 'course_completion',
  '0xa0a8be0a778a94eac2488e69eb5cf6921d2c02275d181a1189a6745aa6626f87': 'role',
  '0x7a4833216f98c32023a615acdd8ead93c40086e7f9ba61c1d0d47dc1e8f0f174': 'achievement',
  '0x7dd481eb4b63b94bb55e6b98aabb06c3b8484f82a4d656d6bca0b0cf9b446be0': 'nft',
}

export async function up(db: Kysely<any>): Promise<void> {
  const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'celoSepolia'
  const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL
  const CHAIN_ID = NETWORK.includes('base') ? 'base' : 'celo'

  if (!RPC_URL) throw new Error('NEXT_PUBLIC_RPC_URL not set in .env')

  // Resolve contract address from deployment file or env var
  const deploymentsDir = path.join(process.cwd(), '..', 'hardhat', 'deployments', 'PasosDeJesusCredentials')
  const deploymentFile = path.join(deploymentsDir, `${NETWORK}.json`)
  let contractAddress: `0x${string}`
  if (fs.existsSync(deploymentFile)) {
    contractAddress = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8')).address as `0x${string}`
  } else {
    const envAddr = process.env.NEXT_PUBLIC_PDJCREDENTIALS_CELO_ADDRESS
    if (!envAddr) throw new Error('NEXT_PUBLIC_PDJCREDENTIALS_CELO_ADDRESS not set and no deployment file found')
    contractAddress = envAddr as `0x${string}`
  }

  console.log('Verificando contrato en', NETWORK, contractAddress)

  // 1. Verify contract is deployed and reachable
  const publicClient = createPublicClient({
    chain: NETWORK === 'celo' ? celo : celoSepolia,
    transport: http(RPC_URL),
  })

  let nextTokenId: bigint
  try {
    nextTokenId = await publicClient.readContract({
      address: contractAddress,
      abi: pasosDeJesusCredentialsAbi,
      functionName: 'nextTokenId',
    }) as bigint
  } catch (err: any) {
    throw new Error(`Contract not reachable on ${NETWORK}: ${err.message}`)
  }

  if (nextTokenId <= 1n) {
    console.log('No hay tipos registrados (nextTokenId=1). Nada que sincronizar.')
    return
  }

  console.log(`Contrato verificado. nextTokenId: ${nextTokenId}. Sincronizando cache...`)

  // 2. Backfill credential_metadata from contract
  let synced = 0
  for (let i = 1; i < Number(nextTokenId); i++) {
    try {
      const [name, sb, premium, siteHash, typeHash] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: pasosDeJesusCredentialsAbi,
          functionName: 'tokenNames',
          args: [BigInt(i)],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: pasosDeJesusCredentialsAbi,
          functionName: 'isSoulbound',
          args: [BigInt(i)],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: pasosDeJesusCredentialsAbi,
          functionName: 'isPremiumCourse',
          args: [BigInt(i)],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: pasosDeJesusCredentialsAbi,
          functionName: 'tokenSiteHash',
          args: [BigInt(i)],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: pasosDeJesusCredentialsAbi,
          functionName: 'tokenTypeHash',
          args: [BigInt(i)],
        }),
      ]) as [string, boolean, boolean, string, string]

      if (!name || name === '') continue

      const site = siteMap[siteHash] || 'unknown'
      const type = typeMap[typeHash] || 'unknown'

      await db
        .insertInto('credential_metadata')
        .values({
          token_id: i,
          name: name as string,
          type,
          site,
          is_premium: premium as boolean,
          is_soulbound: sb as boolean,
          image_url: `img/credential/${i}.png`,
          chain_id: CHAIN_ID,
        })
        .onConflict((oc) => oc.columns(['token_id', 'chain_id']).doUpdateSet({
          name: name as string,
          type,
          site,
          is_soulbound: sb as boolean,
          is_premium: premium as boolean,
          updated_at: new Date(),
        }))
        .execute()

      synced++
      console.log(`  Token ${i}: ${name} (${site}/${type})`)
    } catch {
      // Unconfigured token — skip
    }
  }

  console.log(`Cache sincronizada: ${synced} tipos registrados en ${NETWORK}.`)
}

export async function down(_db: Kysely<any>): Promise<void> {
  console.error('Migración irreversible. La cache credential_metadata puede regenerarse desde el contrato.')
}
