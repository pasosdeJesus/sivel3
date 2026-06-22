import { NextRequest, NextResponse } from 'next/server'
import { privateKeyToAccount } from 'viem/accounts'
import { keccak256, encodePacked } from 'viem'

function getVerifyUrl(): string {
  return process.env.NEXT_PUBLIC_NETWORK === 'celo'
    ? 'https://learn.tg'
    : 'https://learn.tg:9001'
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const wallet = url.searchParams.get('wallet')
    if (!wallet) {
      return NextResponse.json({ error: 'wallet required' }, { status: 400 })
    }

    const pk = process.env.PRIVATE_KEY
    if (!pk) {
      return NextResponse.json({ verified: false })
    }

    const account = privateKeyToAccount(pk as `0x${string}`)
    const timestamp = Math.floor(Date.now() / 1000)

    // learn.tg uses hashMessage(keccak256(encodePacked(...))) → EIP-191
    // signMessage applies the same EIP-191 wrapping internally
    const message = keccak256(
      encodePacked(['address', 'uint256'], [wallet as `0x${string}`, BigInt(timestamp)]),
    )
    const signature = await account.signMessage({ message })

    const verifyUrl = `${getVerifyUrl()}/api/verify?wallet=${wallet}&timestamp=${timestamp}&signature=${signature}`
    const res = await fetch(verifyUrl)
    if (!res.ok) return NextResponse.json({ verified: false })

    const data = await res.json()
    return NextResponse.json({ verified: !!data.verified })
  } catch {
    return NextResponse.json({ verified: false })
  }
}
