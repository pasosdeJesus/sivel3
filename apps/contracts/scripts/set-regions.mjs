import fs from 'node:fs'
import path from 'node:path'
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { chainFor, networkName, rpcFor } from './lib/chain.mjs'

const network = networkName()
const candidates = [
  path.join('deployments', 'SIVeL3RegionalDonationV2', `${network}.json`),
  path.join('deployments', 'SIVeL3RegionalDonationV2', 'V1', `${network}.json`),
]
const file = candidates.find((candidate) => fs.existsSync(candidate))
if (!file) {
  console.error(`Missing deployment for SIVeL3RegionalDonationV2 on ${network}`)
  process.exit(1)
}
const { address } = JSON.parse(fs.readFileSync(file, 'utf8'))

const privateKey = process.env.PRIVATE_KEY
if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
  console.error('PRIVATE_KEY missing or not 32 bytes')
  process.exit(1)
}

const account = privateKeyToAccount(privateKey)
const chain = chainFor(network)
const rpc = rpcFor(network)
const wallet = createWalletClient({ account, chain, transport: http(rpc) })
const publicClient = createPublicClient({ chain, transport: http(rpc) })

const abi = [
  {
    name: 'setRegion',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'regionId', type: 'uint256' },
      { name: 'regionName', type: 'string' },
    ],
    outputs: [],
  },
]

for (const [id, name] of [
  [1, 'Colombia'],
  [2, 'Israel/Palestina'],
]) {
  console.log(`Setting region ${id}: ${name}...`)
  const hash = await wallet.writeContract({
    address,
    abi,
    functionName: 'setRegion',
    args: [BigInt(id), name],
  })
  await publicClient.waitForTransactionReceipt({ hash })
  console.log(`Region ${id} set. Transaction: ${hash}`)
}
