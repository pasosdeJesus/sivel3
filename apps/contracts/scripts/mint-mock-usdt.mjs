import fs from 'node:fs'
import path from 'node:path'
import { createPublicClient, createWalletClient, http, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { chainFor, networkName, rpcFor } from './lib/chain.mjs'

const network = networkName()
const file = path.join('deployments', 'MockUSDT', `${network}.json`)
if (!fs.existsSync(file)) {
  console.error(`Missing ${file}; run contract:deploy first`)
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
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
]

const amount = parseUnits('10000000000', 6)
console.log(`Minting ${amount} MUSDT to ${account.address} at ${address}...`)
const hash = await wallet.writeContract({
  address,
  abi,
  functionName: 'mint',
  args: [account.address, amount],
})
await publicClient.waitForTransactionReceipt({ hash })
console.log(`Minted. MOCK_USDT_ADDRESS="${address}"`)
