// lib/credentials.ts
// Pure functions for PasosDeJesusCredentials contract interactions.
// To be extracted to @pasosdejesus/m/blockchain/credentials.
//
// All functions receive WalletClient/PublicClient and contractAddress
// as parameters. The caller (learn.tg, sivel3) wires its own keys,
// networks, and contract address.

import type { PublicClient, WalletClient } from 'viem'
import pasosDeJesusCredentialsAbi from '@/abis/PasosDeJesusCredentials.json'

// ====================  COURSE SBTs (learn.tg — Celo)  ====================

/**
 * Get tokenId from courseId (reads from contract).
 */
export async function getTokenIdByCourseId(
  publicClient: PublicClient,
  contractAddress: `0x${string}`,
  courseId: number
): Promise<number> {
  const tokenId = await publicClient.readContract({
    address: contractAddress,
    abi: pasosDeJesusCredentialsAbi,
    functionName: 'courseIdToTokenId',
    args: [BigInt(courseId)],
  })
  return Number(tokenId)
}

/**
 * Mint a course completion SBT (calls mintCourseCompletion).
 */
export async function mintCourseSBT(
  walletClient: WalletClient,
  contractAddress: `0x${string}`,
  userAddress: `0x${string}`,
  courseId: number,
  courseName: string,
  isPremium: boolean
): Promise<string> {
  return await walletClient.writeContract({
    address: contractAddress,
    abi: pasosDeJesusCredentialsAbi,
    functionName: 'mintCourseCompletion',
    args: [userAddress, BigInt(courseId), courseName, isPremium],
    chain: walletClient.chain,
    account: walletClient.account,
  } as any)
}

// ====================  ROLE / ACHIEVEMENT SBTs (sivel.xyz — Celo)  ====================

/**
 * Mint a role or achievement SBT (calls mintCredential).
 */
export async function mintRoleSBT(
  walletClient: WalletClient,
  contractAddress: `0x${string}`,
  userAddress: `0x${string}`,
  tokenId: number
): Promise<string> {
  return await walletClient.writeContract({
    address: contractAddress,
    abi: pasosDeJesusCredentialsAbi,
    functionName: 'mintCredential',
    args: [userAddress, BigInt(tokenId), BigInt(1)],
    chain: walletClient.chain,
    account: walletClient.account,
  } as any)
}

// ====================  NFTs (learn.tg — Base)  ====================

/**
 * Mint an NFT on Base (calls mintCredential).
 */
export async function mintNFT(
  walletClient: WalletClient,
  contractAddress: `0x${string}`,
  userAddress: `0x${string}`,
  tokenId: number
): Promise<string> {
  return await walletClient.writeContract({
    address: contractAddress,
    abi: pasosDeJesusCredentialsAbi,
    functionName: 'mintCredential',
    args: [userAddress, BigInt(tokenId), BigInt(1)],
    chain: walletClient.chain,
    account: walletClient.account,
  } as any)
}

// ====================  COMMON  ====================

/**
 * Check if an address already holds a credential (reads from contract).
 */
export async function hasCredentialOnChain(
  publicClient: PublicClient,
  contractAddress: `0x${string}`,
  account: `0x${string}`,
  tokenId: number
): Promise<boolean> {
  try {
    return await publicClient.readContract({
      address: contractAddress,
      abi: pasosDeJesusCredentialsAbi,
      functionName: 'hasCredential',
      args: [account, BigInt(tokenId)],
    }) as boolean
  } catch {
    return false
  }
}

/**
 * Revoke (burn) a credential from a user.
 */
export async function revokeCredential(
  walletClient: WalletClient,
  contractAddress: `0x${string}`,
  userAddress: `0x${string}`,
  tokenId: number,
  amount: number
): Promise<string> {
  return await walletClient.writeContract({
    address: contractAddress,
    abi: pasosDeJesusCredentialsAbi,
    functionName: 'revokeCredential',
    args: [userAddress, BigInt(tokenId), BigInt(amount)],
    chain: walletClient.chain,
    account: walletClient.account,
  } as any)
}
