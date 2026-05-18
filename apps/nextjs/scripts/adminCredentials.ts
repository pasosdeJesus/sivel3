// scripts/adminCredentials.ts
// Administrative operations for PasosDeJesusCredentials.
// Portable functions (can be extracted to @pasosdejesus/m).
// CLI for sivel.xyz project-specific wiring.
//
// Usage: npx tsx scripts/adminCredentials.ts <command> [args]

import { createPublicClient, createWalletClient, http, PublicClient, WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo, celoSepolia, base, baseSepolia } from 'viem/chains'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

// ==================== SVG ASSETS (inline) ====================

const LOCK_SVG = `<g transform="translate(36,36) scale(0.7)">
  <rect x="0" y="16" width="48" height="32" rx="4" fill="#ffffffcc" stroke="#00000044" stroke-width="2"/>
  <path d="M12 16V12a12 12 0 0 1 24 0v4" fill="none" stroke="#00000044" stroke-width="2"/>
</g>`

const STAR_SVG = `<g transform="translate(44,36) scale(0.5)">
  <polygon points="24,0 30,18 48,18 33,30 39,48 24,36 9,48 15,30 0,18 18,18"
    fill="#fbbf24" stroke="#d97706" stroke-width="1"/>
</g>`

const SITE_LOGOS: Record<string, string> = {
  'learn.tg': `<rect x="0" y="0" width="64" height="64" rx="12" fill="#7c3aed"/>
    <text x="32" y="42" text-anchor="middle" font-size="28" fill="white" font-family="sans-serif" font-weight="bold">LT</text>`,
  'sivel.xyz': `<rect x="0" y="0" width="64" height="64" rx="12" fill="#0891b2"/>
    <text x="32" y="42" text-anchor="middle" font-size="24" fill="white" font-family="sans-serif" font-weight="bold">S3</text>`,
  'stable-sl.pdJ.app': `<rect x="0" y="0" width="64" height="64" rx="12" fill="#059669"/>
    <text x="32" y="42" text-anchor="middle" font-size="24" fill="white" font-family="sans-serif" font-weight="bold">SL</text>`,
}

const TYPE_COLORS: Record<string, string> = {
  course_completion: '#3b82f6', // blue
  role: '#f59e0b',              // gold
  achievement: '#10b981',       // green
  nft: '#8b5cf6',               // purple
}

// ==================== SVG COMPOSITION ====================

interface ComposeParams {
  userSvgPath: string
  tokenId: number
  site: string
  type: string
  isSoulbound: boolean
  isPremium: boolean
}

/**
 * Extract inner content of user's SVG (everything between <svg> tags),
 * preserving all attributes except the root ones we override.
 */
function extractSvgInner(svgText: string): string {
  const match = svgText.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)
  if (!match) throw new Error('Invalid SVG: no <svg> root found')
  return match[1].trim()
}

/**
 * Validate user's SVG file before composition.
 */
function validateSvg(svgText: string, filePath: string): void {
  if (!/<svg[\s\S]*viewBox\s*=\s*["']0 0 512 512["']/i.test(svgText)) {
    throw new Error('SVG must have viewBox="0 0 512 512"')
  }
  const forbidden = [
    /<script/i,
    /href\s*=\s*["']https?:\/\//i,
    /xlink:href\s*=\s*["']https?:\/\//i,
    /data:image\/svg\+xml/i,
    /foreignObject/i,
  ]
  for (const pattern of forbidden) {
    if (pattern.test(svgText)) {
      throw new Error(`SVG contains forbidden content: ${pattern.source}`)
    }
  }
  const inner = extractSvgInner(svgText)
  if (inner.length < 50 || inner.length > 50000) {
    throw new Error(`SVG content size out of range (${inner.length} chars)`)
  }
}

/**
 * Compose credential image by layering user's SVG icon with
 * programmatic elements (border, site logo, lock/star overlays).
 */
export async function composeCredentialImage(params: ComposeParams) {
  const { userSvgPath, tokenId, site, type, isSoulbound, isPremium } = params

  // 1. Read and validate user SVG
  if (!fs.existsSync(userSvgPath)) {
    throw new Error(`SVG file not found: ${userSvgPath}`)
  }
  const rawSvg = fs.readFileSync(userSvgPath, 'utf-8')
  validateSvg(rawSvg, userSvgPath)
  const userInner = extractSvgInner(rawSvg)

  const color = TYPE_COLORS[type] || '#64748b'
  const siteLogo = SITE_LOGOS[site]
  if (!siteLogo) throw new Error(`Unknown site: ${site}`)

  const sourceDir = path.join('public', 'img', 'credential', 'source')
  const pngDir = path.join('public', 'img', 'credential')
  fs.mkdirSync(sourceDir, { recursive: true })
  fs.mkdirSync(pngDir, { recursive: true })

  // 2. Compose layers
  const layers: string[] = [
    // Border
    `<rect x="0" y="0" width="512" height="512" rx="28" fill="none" stroke="${color}" stroke-width="14"/>`,
    // User icon (scaled 78%, centered)
    `<g transform="translate(56,56) scale(0.78)">${userInner}</g>`,
    // Site logo (bottom-right)
    `<g transform="translate(432,432)">${siteLogo}</g>`,
  ]

  if (isSoulbound) {
    layers.push(LOCK_SVG)
  }
  if (isPremium) {
    layers.push(STAR_SVG)
  }

  const composedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
${layers.join('\n')}
</svg>
`

  // 3. Write composed SVG
  const svgPath = path.join(sourceDir, `${tokenId}.svg`)
  fs.writeFileSync(svgPath, composedSvg, 'utf-8')

  // 4. Convert to PNG via ImageMagick
  const pngPath = path.join(pngDir, `${tokenId}.png`)
  execSync(`convert -background none -size 512x512 "${svgPath}" "${pngPath}"`, {
    stdio: 'pipe',
    timeout: 10000,
  })

  if (!fs.existsSync(pngPath)) {
    throw new Error('PNG conversion failed — check ImageMagick `convert` availability')
  }

  return { svgPath, pngPath: `img/credential/${tokenId}.png` }
}

// ==================== IMPORT TYPES (matching current pattern) ====================

import credentialsAbi from '@/abis/PasosDeJesusCredentials.json'

// ==================== ON-CHAIN ADMIN FUNCTIONS ====================

export async function grantMinter(
  walletClient: WalletClient,
  contractAddress: `0x${string}`,
  address: `0x${string}`
): Promise<string> {
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: credentialsAbi,
    functionName: 'grantRole',
    args: ['0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6' as `0x${string}`, address],
    chain: walletClient.chain,
    account: walletClient.account,
  } as any)
  return hash
}

export async function revokeMinter(
  walletClient: WalletClient,
  contractAddress: `0x${string}`,
  address: `0x${string}`
): Promise<string> {
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: credentialsAbi,
    functionName: 'revokeRole',
    args: ['0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6' as `0x${string}`, address],
    chain: walletClient.chain,
    account: walletClient.account,
  } as any)
  return hash
}

export async function registerCredentialType(params: {
  walletClient: WalletClient
  contractAddress: `0x${string}`
  publicClient: PublicClient
  siteName: string
  typeName: string
  displayName: string
  soulbound: boolean
  courseId?: number
  premium?: boolean
  iconPath?: string
}): Promise<number> {
  const { walletClient, contractAddress, publicClient, siteName, typeName, displayName, soulbound, courseId, premium, iconPath } = params

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: credentialsAbi,
    functionName: 'registerCredentialType',
    args: [siteName, typeName, displayName, soulbound, BigInt(courseId || 0), premium || false],
    chain: walletClient.chain,
    account: walletClient.account,
  } as any)

  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  // Parse tokenId from CredentialTypeRegistered event
  let tokenId = 0
  for (const log of receipt.logs) {
    try {
      const topics = log.topics
      if (topics.length >= 2) {
        tokenId = Number(BigInt(topics[1]))
        break
      }
    } catch {}
  }

  if (tokenId === 0) {
    // Fallback: nextTokenId - 1
    const nextId = await publicClient.readContract({
      address: contractAddress,
      abi: credentialsAbi,
      functionName: 'nextTokenId',
    }) as bigint
    tokenId = Number(nextId) - 1
  }

  // Compose image if icon provided
  if (iconPath) {
    try {
      await composeCredentialImage({
        userSvgPath: iconPath,
        tokenId,
        site: siteName,
        type: typeName,
        isSoulbound: soulbound,
        isPremium: premium || false,
      })
    } catch (err: any) {
      console.warn(`Image composition failed (tokenId ${tokenId}): ${err.message}`)
    }
  }

  return tokenId
}

export async function setMaxSupply(
  walletClient: WalletClient,
  contractAddress: `0x${string}`,
  tokenId: number,
  max: number
): Promise<string> {
  return await walletClient.writeContract({
    address: contractAddress,
    abi: credentialsAbi,
    functionName: 'setMaxSupply',
    args: [BigInt(tokenId), BigInt(max)],
    chain: walletClient.chain,
    account: walletClient.account,
  } as any)
}

export async function setSiteBaseURI(
  walletClient: WalletClient,
  contractAddress: `0x${string}`,
  siteName: string,
  uri: string
): Promise<string> {
  return await walletClient.writeContract({
    address: contractAddress,
    abi: credentialsAbi,
    functionName: 'setSiteBaseURI',
    args: [siteName, uri],
    chain: walletClient.chain,
    account: walletClient.account,
  } as any)
}

// ==================== CLI ====================

function usage() {
  console.log('Usage: npx tsx scripts/adminCredentials.ts <command> [args]')
  console.log('')
  console.log('Commands:')
  console.log('  grant-minter    --network <net> --address <wallet>')
  console.log('  revoke-minter   --network <net> --address <wallet>')
  console.log('  register-type   --network <net> --site <name> --type <name> --display <name>')
  console.log('                  --soulbound <true|false> [--course-id <id>] [--premium]')
  console.log('                  [--icon public/img/credential/source/myicon.svg]')
  console.log('  set-max-supply  --network <net> --token-id <id> --max <n>')
  console.log('  set-site-uri    --network <net> --site <name> --uri <url>')
  console.log('  list-types      --network <net>')
  console.log('')
  console.log('Networks: celo, celoSepolia, base, baseSepolia')
}

function getChain(network: string) {
  switch (network) {
    case 'celo': return celo
    case 'celoSepolia': return celoSepolia
    case 'base': return base
    case 'baseSepolia': return baseSepolia
    default: throw new Error(`Unknown network: ${network}`)
  }
}

function getContractAddress(network: string): `0x${string}` {
  const deploymentsDir = path.join(__dirname, '..', 'hardhat', 'deployments')
  const file = path.join(deploymentsDir, `${network}.json`)
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf-8')).address as `0x${string}`
  }
  const envKey = network.startsWith('base') ? 'NEXT_PUBLIC_PDJCREDENTIALS_BASE_ADDRESS' : 'NEXT_PUBLIC_PDJCREDENTIALS_CELO_ADDRESS'
  const addr = process.env[envKey]
  if (!addr) throw new Error(`No deployment found for ${network}. Deploy first or set ${envKey} in .env`)
  return addr as `0x${string}`
}

async function getWalletClient(network: string): Promise<WalletClient> {
  const key = process.env.CREDENTIALS_PRIVATE_KEY || process.env.PRIVATE_KEY
  if (!key) throw new Error('CREDENTIALS_PRIVATE_KEY or PRIVATE_KEY not set in apps/.env')
  const account = privateKeyToAccount(key as `0x${string}`)
  return createWalletClient({ chain: getChain(network), transport: http(), account })
}

async function getPublicClient(network: string): Promise<PublicClient> {
  return createPublicClient({ chain: getChain(network), transport: http() })
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) { usage(); process.exit(1) }

  const command = args[0]
  const getArg = (name: string) => {
    const idx = args.indexOf(name)
    return idx >= 0 ? args[idx + 1] : null
  }

  try {
    switch (command) {
      case 'grant-minter': {
        const net = getArg('--network')
        const addr = getArg('--address')
        if (!net || !addr) throw new Error('--network and --address required')
        const wc = await getWalletClient(net)
        const hash = await grantMinter(wc, getContractAddress(net), addr as `0x${string}`)
        console.log(`MINTER_ROLE granted to ${addr} on ${net}. TX: ${hash}`)
        break
      }
      case 'revoke-minter': {
        const net = getArg('--network')
        const addr = getArg('--address')
        if (!net || !addr) throw new Error('--network and --address required')
        const wc = await getWalletClient(net)
        const hash = await revokeMinter(wc, getContractAddress(net), addr as `0x${string}`)
        console.log(`MINTER_ROLE revoked from ${addr} on ${net}. TX: ${hash}`)
        break
      }
      case 'register-type': {
        const net = getArg('--network')
        const site = getArg('--site')
        const type = getArg('--type')
        const display = getArg('--display')
        const sb = getArg('--soulbound') === 'true'
        const courseId = parseInt(getArg('--course-id') || '0')
        const premium = args.includes('--premium')
        const icon = getArg('--icon')
        if (!net || !site || !type || !display) throw new Error('--network, --site, --type, --display required')
        const wc = await getWalletClient(net)
        const pc = await getPublicClient(net)
        const tokenId = await registerCredentialType({
          walletClient: wc, contractAddress: getContractAddress(net), publicClient: pc,
          siteName: site, typeName: type, displayName: display,
          soulbound: sb, courseId, premium, iconPath: icon || undefined,
        })
        console.log(`Credential type registered. tokenId: ${tokenId} site: ${site} type: ${type} name: ${display}`)
        break
      }
      case 'set-max-supply': {
        const net = getArg('--network')
        const tokenId = parseInt(getArg('--token-id') || '')
        const max = parseInt(getArg('--max') || '')
        if (!net || isNaN(tokenId) || isNaN(max)) throw new Error('--network, --token-id, --max required')
        const wc = await getWalletClient(net)
        const hash = await setMaxSupply(wc, getContractAddress(net), tokenId, max)
        console.log(`maxSupply set. tokenId: ${tokenId} max: ${max} TX: ${hash}`)
        break
      }
      case 'set-site-uri': {
        const net = getArg('--network')
        const site = getArg('--site')
        const uri = getArg('--uri')
        if (!net || !site || !uri) throw new Error('--network, --site, --uri required')
        const wc = await getWalletClient(net)
        const hash = await setSiteBaseURI(wc, getContractAddress(net), site, uri)
        console.log(`siteBaseURI set. site: ${site} uri: ${uri} TX: ${hash}`)
        break
      }
      case 'list-types': {
        const net = getArg('--network') || 'celoSepolia'
        const pc = await getPublicClient(net)
        const addr = getContractAddress(net)
        const nextId = await pc.readContract({ address: addr, abi: credentialsAbi, functionName: 'nextTokenId' }) as bigint
        console.log(`Credential types on ${net} (nextTokenId: ${nextId}):`)
        for (let i = 1; i < Number(nextId); i++) {
          try {
            const name = await pc.readContract({ address: addr, abi: credentialsAbi, functionName: 'tokenNames', args: [BigInt(i)] })
            const sb = await pc.readContract({ address: addr, abi: credentialsAbi, functionName: 'isSoulbound', args: [BigInt(i)] })
            const max = await pc.readContract({ address: addr, abi: credentialsAbi, functionName: 'maxSupply', args: [BigInt(i)] })
            console.log(`  ${i}: ${name} (soulbound: ${sb}, maxSupply: ${max})`)
          } catch { /* skip unconfigured */ }
        }
        break
      }
      default:
        console.error(`Unknown command: ${command}`)
        usage()
        process.exit(1)
    }
  } catch (err: any) {
    console.error('Error:', err.message || err)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
