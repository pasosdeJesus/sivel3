import {
  createPublicClient,
  decodeEventLog,
  formatUnits,
  http,
  parseAbiItem,
} from 'viem'
import { chainFor, networkName, rpcFor } from './lib/chain.mjs'

const [tx, token] = process.argv.slice(2)
if (!tx || !token) {
  console.error('usage: node scripts/check-transfer.mjs <tx> <token>')
  process.exit(1)
}

const network = networkName()
const client = createPublicClient({
  chain: chainFor(network),
  transport: http(rpcFor(network)),
})

const receipt = await client.getTransactionReceipt({ hash: tx })
const transferEvent = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
)
const decimals = await client.readContract({
  address: token,
  abi: [
    {
      name: 'decimals',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint8' }],
    },
  ],
  functionName: 'decimals',
})

let found = 0
for (const log of receipt.logs) {
  if (log.address.toLowerCase() !== token.toLowerCase()) continue
  try {
    const { args } = decodeEventLog({
      abi: [transferEvent],
      data: log.data,
      topics: log.topics,
    })
    console.log(
      `Transfer ${args.from} -> ${args.to}: ${formatUnits(args.value, decimals)}`,
    )
    found++
  } catch {
    // Not a Transfer event from this token.
  }
}

if (found === 0) {
  console.log('No Transfer event found')
  process.exit(1)
}
