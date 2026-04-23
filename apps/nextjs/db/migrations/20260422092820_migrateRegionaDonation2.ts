import { config } from 'dotenv'
import { resolve } from 'path'
import { Kysely } from 'kysely'
import { createPublicClient, createWalletClient, getContract, http, formatUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo, celoSepolia } from 'viem/chains'

// Cargar .env desde apps/ (porque estamos en apps/nextjs/db/migrations/)
config({ path: resolve(__dirname, '../../../.env') })

// ABIs
const RegionalDonationAbi = [
    { inputs: [{ name: '_regionId', type: 'uint256' }], name: 'regionalBalances', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'emergencyWithdraw', outputs: [], stateMutability: 'nonpayable', type: 'function' }
] as const

const SIVeL3RegionalDonationV2Abi = [
    { inputs: [{ name: '_regionId', type: 'uint256' }, { name: '_amount', type: 'uint256' }], name: 'setRegionalBalance', outputs: [], stateMutability: 'nonpayable', type: 'function' }
] as const

const Erc20Abi = [
    { inputs: [{ name: '_account', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
    { inputs: [{ name: '_to', type: 'address' }, { name: '_amount', type: 'uint256' }], name: 'transfer', outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' }
] as const

export async function up(db: Kysely<any>): Promise<void> {
    console.log('🔄 Migrando RegionalDonation V1 a V2')

    const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!
    const PRIVATE_KEY = process.env.PRIVATE_KEY! as `0x${string}`
    const OLD_CONTRACT = process.env.NEXT_PUBLIC_REGIONALDONATION_V1_ADDRESS! as `0x${string}`
    const NEW_CONTRACT = process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS! as `0x${string}`
    const USDT_ADDRESS = process.env.NEXT_PUBLIC_USDT_ADDRESS! as `0x${string}`
    const NETWORK = process.env.NEXT_PUBLIC_NETWORK!

    console.log(`   Old contract (V1): ${OLD_CONTRACT}`)
    console.log(`   New contract (V2): ${NEW_CONTRACT}`)

    const publicClient = createPublicClient({
        chain: NETWORK == 'celo' ? celo : celoSepolia,
        transport: http(RPC_URL),
    })

    const account = privateKeyToAccount(PRIVATE_KEY)
    const walletClient = createWalletClient({
        account,
        chain: NETWORK == 'celo' ? celo : celoSepolia,
        transport: http(RPC_URL),
    })

    const usdt = getContract({ address: USDT_ADDRESS, abi: Erc20Abi, client: { public: publicClient, wallet: walletClient } })
    const oldContract = getContract({ address: OLD_CONTRACT, abi: RegionalDonationAbi, client: { public: publicClient, wallet: walletClient } })
    const newContract = getContract({ address: NEW_CONTRACT, abi: SIVeL3RegionalDonationV2Abi, client: { public: publicClient, wallet: walletClient } })

    // 1. Leer balances del contrato viejo
    console.log('📊 Leyendo balances del contrato V1...')
    const regionIds = [1, 2]
    const oldBalances: Record<number, bigint> = {}
    for (const id of regionIds) {
        oldBalances[id] = await oldContract.read.regionalBalances([BigInt(id)]) as bigint
        console.log(`   Región ${id}: ${formatUnits(oldBalances[id], 6)} USDT`)
    }

    // 2. Drenar contrato viejo
    const oldBalance = await usdt.read.balanceOf([OLD_CONTRACT]) as bigint
    if (oldBalance > 0n) {
        console.log(`💰 Drenando ${formatUnits(oldBalance, 6)} USDT del contrato V1...`)
        const tx = await oldContract.write.emergencyWithdraw()
        console.log(`   emergencyWithdraw tx: ${tx}`)
        await publicClient.waitForTransactionReceipt({ hash: tx })
        console.log('   ✅ Contrato V1 drenado')
    } else if (oldBalances[1] > 0n || oldBalances[2] > 0n) {
      console.log('   Ya fue drenado')
      return
    } else {
        console.log('   No hay fondos en el contrato V1')
    }

    // 3. Transferir USDT al nuevo contrato
    const ownerBalance = await usdt.read.balanceOf([account.address]) as bigint
    if (ownerBalance > 0n) {
        console.log(`🔄 Transfiriendo ${formatUnits(ownerBalance, 6)} USDT al contrato V2...`)
        const tx = await usdt.write.transfer([NEW_CONTRACT, ownerBalance])
        console.log(`   transfer tx: ${tx}`)
        await publicClient.waitForTransactionReceipt({ hash: tx })
        console.log('   ✅ USDT transferido')
    }

    // 4. Establecer balances en el nuevo contrato
    console.log('📝 Estableciendo balances en el contrato V2...')
    for (const [id, balance] of Object.entries(oldBalances)) {
        if (balance > 0n) {
            console.log(`   Región ${id}: ${formatUnits(balance, 6)} USDT`)
            const tx = await newContract.write.setRegionalBalance([BigInt(id), balance])
            console.log(`   setRegionalBalance tx: ${tx}`)
            await publicClient.waitForTransactionReceipt({ hash: tx })
        }
    }

    // 5. Verificar balances finales
    console.log('\n✅ Verificando balances finales...')
    const finalBalance = await usdt.read.balanceOf([NEW_CONTRACT]) as bigint
    console.log(`💰 Balance final del contrato V2: ${formatUnits(finalBalance, 6)} USDT`)

    console.log('\n🎉 ¡MIGRACIÓN COMPLETA!')
}

export async function down(db: Kysely<any>): Promise<void> {
    console.error('⚠️ Esta migración es irreversible')
    console.error('   Los fondos ya están en el nuevo contrato')
    console.error('   No se puede revertir automáticamente')
}
