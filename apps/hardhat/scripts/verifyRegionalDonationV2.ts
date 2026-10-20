// Read-only verification of SIVeL3RegionalDonationV2.
//
// Runs on OpenBSD without `hardhat` (the analyzer native addon is not needed):
// the ABI comes from the compiled artifact and the RPC from the environment.
//
//   bin/verifyRegionalDonationV2            # uses NEXT_PUBLIC_NETWORK
//   bin/verifyRegionalDonationV2 celo
//   REGION_MAX=20 bin/verifyRegionalDonationV2 celo
//
// The address comes from the deployment file written by deploy.ts
// (deployments/SIVeL3RegionalDonationV2/V1/<network>.json), never from .env.

import fs from 'fs'
import path from 'path'

import dotenv from 'dotenv'
import {
  createPublicClient,
  formatUnits,
  getAddress,
  http,
  isAddress,
  zeroAddress,
  type Abi,
  type Address,
} from 'viem'
import { celo, celoSepolia } from 'viem/chains'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const ERC20_ABI = [
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

const NETWORKS = ['celo', 'celoSepolia'] as const
const DEFAULT_RPC: Record<(typeof NETWORKS)[number], string> = {
  celo: 'https://forno.celo.org',
  celoSepolia: 'https://forno.celo-sepolia.celo-testnet.org/',
}

function loadJson(file: string): any {
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`)
    process.exit(1)
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

async function main() {
  const networkName = (process.argv[2] ?? process.env.NEXT_PUBLIC_NETWORK ?? 'celoSepolia') as
    | (typeof NETWORKS)[number]
    | string
  if (!NETWORKS.includes(networkName as any)) {
    console.error(`Unknown network "${networkName}". Use one of: ${NETWORKS.join(', ')}`)
    process.exit(1)
  }

  const deploymentFile = path.resolve(
    __dirname,
    '../deployments/SIVeL3RegionalDonationV2/V1',
    `${networkName}.json`,
  )
  const deployment = loadJson(deploymentFile)
  if (!isAddress(deployment.address)) {
    console.error(`Invalid address in ${deploymentFile}: ${deployment.address}`)
    process.exit(1)
  }
  const address = getAddress(deployment.address) as Address

  const artifactFile = path.resolve(
    __dirname,
    '../artifacts/contracts/SIVeL3RegionalDonationV2.sol/SIVeL3RegionalDonationV2.json',
  )
  const { abi } = loadJson(artifactFile) as { abi: Abi }

  const chain = networkName === 'celo' ? celo : celoSepolia
  const rpc =
    (networkName === 'celo' ? process.env.CELO_RPC_URL : process.env.NEXT_PUBLIC_RPC_URL) ||
    DEFAULT_RPC[networkName as (typeof NETWORKS)[number]]
  const client = createPublicClient({ chain, transport: http(rpc) })

  const networkChainId = await client.getChainId()
  console.log(`Verifying SIVeL3RegionalDonationV2 on ${networkName} (chain ${networkChainId})`)
  console.log(`Address:  ${address}`)
  console.log(`From:     ${deploymentFile}`)
  console.log(`RPC:      ${rpc}`)
  if (deployment.chainId && BigInt(deployment.chainId) !== BigInt(networkChainId)) {
    console.log(`⚠️  Deployment file says chain ${deployment.chainId}, RPC says ${networkChainId}`)
  }

  const code = await client.getCode({ address })
  if (!code || code === '0x') {
    console.error('❌ No contract code at that address on this network')
    process.exitCode = 1
    return
  }
  console.log('✅ Contract code present')

  const read = <T>(functionName: string, args?: readonly unknown[]): Promise<T> =>
    client.readContract({ address, abi, functionName, args } as any) as Promise<T>

  const owner = await read<Address>('owner')
  const backend = await read<Address>('backendAddress')
  const token = await read<Address>('donationToken')

  console.log('')
  console.log(`✅ owner:           ${owner}`)
  console.log(`✅ backendAddress:  ${backend}`)
  console.log(`✅ donationToken:   ${token}`)

  if (backend === zeroAddress) {
    console.log('⚠️  backendAddress is the zero address (assignDonation would fail)')
  }
  if (
    deployment.usdtAddress &&
    isAddress(deployment.usdtAddress) &&
    getAddress(deployment.usdtAddress) !== getAddress(token)
  ) {
    console.log(`⚠️  Deployment file usdtAddress ${deployment.usdtAddress} ≠ on-chain ${token}`)
  }

  let decimals = 6
  try {
    decimals = Number(
      await client.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }),
    )
    const symbol = await client.readContract({ address: token, abi: ERC20_ABI, functionName: 'symbol' })
    console.log(`✅ USDT:            ${symbol} (${decimals} decimals)`)
  } catch {
    console.log(`⚠️  Could not read token metadata; assuming ${decimals} decimals`)
  }

  const contractBalance = await client.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  })
  console.log(`✅ Contract USDT:   ${formatUnits(contractBalance, decimals)}`)

  console.log('')
  console.log('Regions:')
  const max = Number(process.env.REGION_MAX ?? 10)
  let sum = 0n
  let found = 0
  for (let id = 1; id <= max; id++) {
    const name = await read<string>('regionNames', [BigInt(id)])
    const balance = await read<bigint>('regionalBalances', [BigInt(id)])
    if (!name && balance === 0n) continue
    found++
    sum += balance
    console.log(`   #${id} ${name || '(sin nombre)'}: ${formatUnits(balance, decimals)} USDT`)
  }
  if (found === 0) {
    console.log(`   (no regions in 1..${max}; raise REGION_MAX if the contract has more)`)
  }

  console.log('')
  if (sum === contractBalance) {
    console.log('✅ Regional balances add up to the contract USDT balance')
  } else {
    console.log(
      `⚠️  Regional balances ${formatUnits(sum, decimals)} ≠ contract ${formatUnits(contractBalance, decimals)} (unassigned or withdrawn funds)`,
    )
  }

  console.log('')
  console.log('✅ Read-only verification complete.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
