import { createPublicClient, createWalletClient, http, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { chainFor, networkName, rpcFor } from './lib/chain.mjs'

const token = process.env.USDT_ADDRES || process.env.USDT_ADDRESS
const spender = process.env.DEPLOYED_ADDRESS
if (!token || !spender) {
  console.error('USDT_ADDRES/USDT_ADDRESS and DEPLOYED_ADDRESS are required')
  process.exit(1)
}

const privateKey = process.env.PRIVATE_KEY
if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
  console.error('PRIVATE_KEY missing or not 32 bytes')
  process.exit(1)
}

const network = networkName()
const chain = chainFor(network)
const rpc = rpcFor(network)
const account = privateKeyToAccount(privateKey)
const wallet = createWalletClient({ account, chain, transport: http(rpc) })
const publicClient = createPublicClient({ chain, transport: http(rpc) })

const decimals = Number(process.env.NEXT_PUBLIC_USDT_DECIMALS || 6)
const amount = parseUnits(process.env.APPROVE_AMOUNT || '1000', decimals)
const abi = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
]

console.log(`Approving ${amount} to ${spender} on ${network}...`)
const hash = await wallet.writeContract({
  address: token,
  abi,
  functionName: 'approve',
  args: [spender, amount],
})
await publicClient.waitForTransactionReceipt({ hash })
console.log(`Approved! Transaction hash: ${hash}`)
