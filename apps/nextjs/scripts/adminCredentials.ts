// scripts/adminCredentials.ts
// Administrative operations for PasosDeJesusCredentials.
// Portable functions (can be extracted to @pasosdejesus/m).
// CLI for sivel.xyz project-specific wiring.
//
// Usage: npx tsx scripts/adminCredentials.ts <command> [args]

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

import { createPublicClient, createWalletClient, http, PublicClient, WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo, celoSepolia, base, baseSepolia } from 'viem/chains'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

// ==================== SVG ASSETS (inline) ====================

let lockSvgContent: string | null = null
let lockSbtSvgContent: string | null = null
let pdjSvgContent: string | null = null

function getLockSvg(color: string): string {
  if (!lockSbtSvgContent) {
    const lockPath = path.join('public', 'img', 'lock-sbt.svg')
    if (fs.existsSync(lockPath)) {
      lockSbtSvgContent = extractSvgInner(fs.readFileSync(lockPath, 'utf-8'))
    }
  }
  if (lockSbtSvgContent) {
    const colored = lockSbtSvgContent.replace(/#10b981/gi, color)
    return `<g transform="translate(410,0) scale(2.0)">${colored}</g>`
  }
  // Fallback: old inline lock (left side)
  if (!lockSvgContent) {
    const lockPath = path.join('public', 'img', 'lock.svg')
    if (fs.existsSync(lockPath)) {
      lockSvgContent = extractSvgInner(fs.readFileSync(lockPath, 'utf-8'))
    }
  }
  if (lockSvgContent) {
    const colored = lockSvgContent.replace(/#10b981/gi, color)
    return `<g transform="translate(24,24)">${colored}</g>`
  }
  return `<g transform="translate(30,30) scale(0.8)">
  <rect x="0" y="16" width="48" height="32" rx="4" fill="${color}22" stroke="${color}" stroke-width="2"/>
  <path d="M14 16V10a10 10 0 0 1 20 0v6" fill="none" stroke="${color}" stroke-width="2"/>
</g>`
}

function getPdJLogo(color: string): string {
  if (!pdjSvgContent) {
    const pdjPath = path.join('public', 'img', 'PdJ-badge.svg')
    if (fs.existsSync(pdjPath)) {
      pdjSvgContent = extractSvgInner(fs.readFileSync(pdjPath, 'utf-8'))
    }
  }
  if (pdjSvgContent) {
    const colored = pdjSvgContent.replace(/#currentColor/gi, color)
    return `<g transform="translate(-60,-80) scale(3.5)" opacity="0.85">${colored}</g>`
  }
  return ''
}

const FONT_FAMILY = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

const STAR_SVG = `<g transform="translate(430,220) scale(1.5)">
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

/**
 * Get site logo SVG content. Tries `public/img/logo-{short}.svg` first
 * (site short names: learn.tg→learntg, sivel.xyz→sivel, stable-sl.pdJ.app→stable-sl),
 * falls back to inline default.
 */
function getSiteLogo(site: string): string {
  const shortNames: Record<string, string> = {
    'learn.tg': 'learntg',
    'sivel.xyz': 'sivel',
    'stable-sl.pdJ.app': 'stablesl',
  }
  const short = shortNames[site] || site
  const logoPath = path.join('public', 'img', `logo-${short}.svg`)
  if (fs.existsSync(logoPath)) {
    const svg = fs.readFileSync(logoPath, 'utf-8')
    let w = 256, h = 256
    const vb = svg.match(/viewBox\s*=\s*["']0\s+0\s+([\d.]+)\s+([\d.]+)/i)
    if (vb) { w = parseFloat(vb[1]); h = parseFloat(vb[2]) }
    const maxDim = Math.max(w, h)
    const scale = maxDim > 0 ? (64 / maxDim).toFixed(4) : '0.25'
    return `<g transform="scale(${scale})">${extractSvgInner(svg)}</g>`
  }
  return SITE_LOGOS[site] || ''
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
  siteName: string
  type: string
  isSoulbound: boolean
  isPremium: boolean
  displayName: string
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
  const { userSvgPath, tokenId, site, siteName, type, isSoulbound, isPremium, displayName } = params

  // 1. Read and validate user SVG
  if (!fs.existsSync(userSvgPath)) {
    throw new Error(`SVG file not found: ${userSvgPath}`)
  }
  const rawSvg = fs.readFileSync(userSvgPath, 'utf-8')
  validateSvg(rawSvg, userSvgPath)
  const userInner = extractSvgInner(rawSvg)

  const color = TYPE_COLORS[type] || '#64748b'
  const siteLogo = getSiteLogo(site)
  if (!siteLogo) throw new Error(`Unknown site: ${site}`)

  const sourceDir = path.join('public', 'img', 'credential', 'source')
  const pngDir = path.join('public', 'img', 'credential')
  fs.mkdirSync(sourceDir, { recursive: true })
  fs.mkdirSync(pngDir, { recursive: true })

  // 2. Compose layers (bottom to top)
  const layers: string[] = [
    // Background (solid white so wallets don't show transparency artifacts)
    `<rect x="0" y="0" width="512" height="512" rx="28" fill="#ffffff"/>`,
    // Border
    `<rect x="0" y="0" width="512" height="512" rx="28" fill="none" stroke="${color}" stroke-width="14"/>`,
    // PdJ logo (top-left, scaled up for wallet legibility)
    getPdJLogo(color),
    // User icon (centered)
    `<g transform="translate(12,12) scale(0.95)">${userInner}</g>`,
    // Footer background bar
    `<rect x="0" y="464" width="512" height="48" rx="0" fill="${color}" opacity="0.15"/>`,
    // Footer bottom line (thin)
    `<rect x="0" y="464" width="512" height="3" rx="0" fill="${color}" opacity="0.6"/>`,
    // Site logo (bottom-right)
    `<g transform="translate(410,370)">${siteLogo}</g>`,
    // Site name (right side, same baseline as SBT name)
    `<text x="500" y="498" font-family="${FONT_FAMILY}" font-weight="700" font-size="32" fill="${color}" text-anchor="end">${siteName}</text>`,
    // Credential name (left side, ~15 chars max to avoid overlap)
    `<text x="8" y="498" font-family="${FONT_FAMILY}" font-weight="700" font-size="36" fill="${color}">${displayName}</text>`,
  ]

  if (isSoulbound) {
    layers.push(getLockSvg(color))
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

  // 4. Convert to PNG via rsvg-convert (librsvg, more faithful than ImageMagick)
  const pngPath = path.join(pngDir, `${tokenId}.png`)
  execSync(`rsvg-convert -w 512 -h 512 -o "${pngPath}" "${svgPath}"`, {
    stdio: 'pipe',
    timeout: 10000,
  })

  if (!fs.existsSync(pngPath)) {
    throw new Error('PNG conversion failed — check rsvg-convert availability')
  }

  return { svgPath, pngPath: `img/credential/${tokenId}.png` }
}

// ==================== IMPORT TYPES (matching current pattern) ====================

import credentialsAbi from '../abis/PasosDeJesusCredentials.json'
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'

function newDb() {
  return new Kysely<any>({
    dialect: new PostgresDialect({
      pool: new Pool({
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        port: 5432,
      }),
    }),
  })
}

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
        siteName,
        type: typeName,
        isSoulbound: soulbound,
        isPremium: premium || false,
        displayName,
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
  console.log('  recompose-image --token-id <id> --icon <path>')
  console.log('  sync-cache      --network <net>')
  console.log('  mint            --network <net> --token-id <id> --address <wallet> [--amount <n>]')
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
  const deploymentsDir = path.join(__dirname, '..', '..', 'hardhat', 'deployments')
  const file = path.join(deploymentsDir, `${network}.json`)
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf-8')).address as `0x${string}`
  }
  const envKey = network.startsWith('base') ? 'NEXT_PUBLIC_PDJCREDENTIALS_BASE_ADDRESS' : 'NEXT_PUBLIC_PDJCREDENTIALS_CELO_ADDRESS'
  const addr = process.env[envKey]
  if (!addr) throw new Error(`No deployment found for ${network}. Deploy first or set ${envKey} in .env`)
  return addr as `0x${string}`
}

async function getWalletClient(network: string, asAdmin = false): Promise<WalletClient> {
  const key = asAdmin
    ? (process.env.CREDENTIALS_PRIVATE_KEY || process.env.PRIVATE_KEY)
    : (process.env.PRIVATE_KEY || process.env.CREDENTIALS_PRIVATE_KEY)
  if (!key) throw new Error('PRIVATE_KEY or CREDENTIALS_PRIVATE_KEY not set in apps/.env')
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
        const wc = await getWalletClient(net, true)
        const hash = await grantMinter(wc, getContractAddress(net), addr as `0x${string}`)
        console.log(`MINTER_ROLE granted to ${addr} on ${net}. TX: ${hash}`)
        break
      }
      case 'revoke-minter': {
        const net = getArg('--network')
        const addr = getArg('--address')
        if (!net || !addr) throw new Error('--network and --address required')
        const wc = await getWalletClient(net, true)
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
        const wc = await getWalletClient(net, true)
        const pc = await getPublicClient(net)
        const tokenId = await registerCredentialType({
          walletClient: wc, contractAddress: getContractAddress(net), publicClient: pc,
          siteName: site, typeName: type, displayName: display,
          soulbound: sb, courseId, premium, iconPath: icon || undefined,
        })
        console.log(`Credential type registered. tokenId: ${tokenId} site: ${site} type: ${type} name: ${display}`)
        // Save to cache for fast recompose-image
        try {
          const db = newDb()
          await db
            .insertInto('credential_metadata')
            .values({
              token_id: tokenId,
              name: display,
              type,
              site,
              is_premium: premium,
              is_soulbound: sb,
              image_url: `img/credential/${tokenId}.png`,
            })
            .onConflict((oc) => oc.column('token_id').doUpdateSet({
              name: display, type, site,
              is_premium: premium, is_soulbound: sb,
              updated_at: new Date(),
            }))
            .execute()
        } catch (err: any) {
          console.warn(`Cache update failed: ${err.message}`)
        }
        break
      }
      case 'set-max-supply': {
        const net = getArg('--network')
        const tokenId = parseInt(getArg('--token-id') || '')
        const max = parseInt(getArg('--max') || '')
        if (!net || isNaN(tokenId) || isNaN(max)) throw new Error('--network, --token-id, --max required')
        const wc = await getWalletClient(net, true)
        const hash = await setMaxSupply(wc, getContractAddress(net), tokenId, max)
        console.log(`maxSupply set. tokenId: ${tokenId} max: ${max} TX: ${hash}`)
        break
      }
      case 'set-site-uri': {
        const net = getArg('--network')
        const site = getArg('--site')
        const uri = getArg('--uri')
        if (!net || !site || !uri) throw new Error('--network, --site, --uri required')
        const wc = await getWalletClient(net, true)
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
      case 'recompose-image': {
        const tokenId = parseInt(getArg('--token-id') || '')
        const icon = getArg('--icon')
        if (isNaN(tokenId) || !icon) throw new Error('--token-id and --icon required')

        // Read metadata from credential_metadata cache (no RPC)
        const db = newDb()
        const row = await db
          .selectFrom('credential_metadata')
          .selectAll()
          .where('token_id', '=', tokenId)
          .executeTakeFirst()

        if (!row) throw new Error(`Token ${tokenId} not found in credential_metadata cache. Register first with register-type.`)
        const { svgPath, pngPath } = await composeCredentialImage({
          userSvgPath: icon,
          tokenId,
          site: row.site as string,
          siteName: row.site as string,
          type: row.type as string,
          isSoulbound: (row as any).is_soulbound ?? true,
          isPremium: row.is_premium as boolean,
          displayName: row.name,
        })
        console.log(`Image recomposed for token ${tokenId} (${row.name})`)
        console.log(`  SVG: ${svgPath}`)
        console.log(`  PNG: ${pngPath}`)
        break
      }
      case 'mint': {
        const net = getArg('--network')
        const tokenId = parseInt(getArg('--token-id') || '')
        const addr = getArg('--address')
        const amount = parseInt(getArg('--amount') || '1')
        if (!net || isNaN(tokenId) || !addr) throw new Error('--network, --token-id, --address required')
        // Use PRIVATE_KEY for minting (must have MINTER_ROLE)
        const key = process.env.PRIVATE_KEY
        if (!key) throw new Error('PRIVATE_KEY not set')
        const account = privateKeyToAccount(key as `0x${string}`)
        const wc = createWalletClient({ chain: getChain(net), transport: http(), account })
        const hash = await wc.writeContract({
          address: getContractAddress(net),
          abi: credentialsAbi,
          functionName: 'mintCredential',
          args: [addr as `0x${string}`, BigInt(tokenId), BigInt(amount)],
          chain: wc.chain,
          account: wc.account,
        } as any)
        console.log(`Minted token ${tokenId} x${amount} to ${addr} on ${net}. TX: ${hash}`)
        break
      }
      case 'sync-cache': {
        const net = getArg('--network') || 'celoSepolia'
        const pc = await getPublicClient(net)
        const addr = getContractAddress(net)
        const db = newDb()
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
        let count = 0
        const nextId = await pc.readContract({ address: addr, abi: credentialsAbi, functionName: 'nextTokenId' }) as bigint
        for (let i = 1; i < Number(nextId); i++) {
          try {
            const [name, sb, premium, siteHash, typeHash] = await Promise.all([
              pc.readContract({ address: addr, abi: credentialsAbi, functionName: 'tokenNames', args: [BigInt(i)] }),
              pc.readContract({ address: addr, abi: credentialsAbi, functionName: 'isSoulbound', args: [BigInt(i)] }),
              pc.readContract({ address: addr, abi: credentialsAbi, functionName: 'isPremiumCourse', args: [BigInt(i)] }),
              pc.readContract({ address: addr, abi: credentialsAbi, functionName: 'tokenSiteHash', args: [BigInt(i)] }),
              pc.readContract({ address: addr, abi: credentialsAbi, functionName: 'tokenTypeHash', args: [BigInt(i)] }),
            ]) as [string, boolean, boolean, string, string]
            if (!name || name === '') continue
            const site = siteMap[siteHash] || 'unknown'
            const type = typeMap[typeHash] || 'unknown'
            await db
              .insertInto('credential_metadata')
              .values({
                token_id: i, name: name as string, type, site,
                is_premium: premium as boolean, is_soulbound: sb as boolean,
                image_url: `img/credential/${i}.png`,
              })
              .onConflict((oc) => oc.column('token_id').doUpdateSet({
                name: name as string, type, site,
                is_soulbound: sb as boolean, is_premium: premium as boolean,
                updated_at: new Date(),
              }))
              .execute()
            count++
            console.log(`  Cached token ${i}: ${name}`)
          } catch (e: any) { /* skip */ }
        }
        console.log(`Sync complete. ${count} tokens cached on ${net}.`)
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

// Run CLI if executed directly (not imported)
const isMain = process.argv[1] && (
  process.argv[1].endsWith('adminCredentials.ts') ||
  process.argv[1].endsWith('adminCredentials.js')
)
if (isMain) {
  main()
}
