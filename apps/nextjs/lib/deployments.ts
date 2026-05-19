// lib/deployments.ts
// Read contract addresses from deployment JSON files.
// To be extracted to @pasosdejesus/m/blockchain/deployments.
//
// Deployment files live in apps/hardhat/deployments/{network}.json
// and are .gitignore'd (created by deployPdJCredentials.ts).

import fs from 'fs'
import path from 'path'

export interface Deployment {
  contract: string
  address: string
  chainId: number
  network: string
  transactionHash: string
  deployedAt: string
}

/**
 * Resolve the deployments directory relative to the caller.
 * @param relativePath Path from caller to apps/hardhat/deployments/
 */
function getDeploymentsDir(relativePath: string): string {
  return path.join(relativePath, '..', 'hardhat', 'deployments')
}

/**
 * Read a single deployment by network name.
 * @param network e.g. "celoSepolia", "baseSepolia", "celo", "base"
 * @param relativePath Path from caller to apps/ (default: works from apps/nextjs/)
 */
export function readDeployment(
  network: string,
  relativePath = '.'
): Deployment | null {
  const dir = getDeploymentsDir(relativePath)
  const file = path.join(dir, `${network}.json`)
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf-8'))
}

/**
 * Get contract address for a specific network.
 * Falls back to environment variable if deployment file not found.
 * @param network Network name
 * @param envVar Environment variable for fallback
 */
export function getContractAddress(
  network: string,
  envVar: string
): `0x${string}` | null {
  const deployment = readDeployment(network)
  if (deployment) return deployment.address as `0x${string}`

  const addr = process.env[envVar]
  if (addr) return addr as `0x${string}`

  return null
}

/**
 * Get Celo contract address (from deployment or env).
 */
export function getCeloCredentialsAddress(): `0x${string}` | null {
  const network = process.env.NEXT_PUBLIC_NETWORK === 'celo' ? 'celo' : 'celoSepolia'
  return getContractAddress(network, 'NEXT_PUBLIC_PDJCREDENTIALS_CELO_ADDRESS')
}

/**
 * Get Base contract address (from deployment or env).
 */
export function getBaseCredentialsAddress(): `0x${string}` | null {
  const network = process.env.NEXT_PUBLIC_BASE_NETWORK === 'base' ? 'base' : 'baseSepolia'
  return getContractAddress(network, 'NEXT_PUBLIC_PDJCREDENTIALS_BASE_ADDRESS')
}
