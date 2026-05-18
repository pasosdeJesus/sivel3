import { NextRequest, NextResponse } from 'next/server'
import { newKyselyPostgresql } from '@/.config/kysely.config'

/**
 * GET /api/credential/[tokenId].json
 *
 * Returns ERC-1155 metadata JSON for the given tokenId.
 * Reads from credential_metadata cache table.
 * Response is immutable (credentials don't change after registration).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId: tokenIdStr } = await params
  const tokenId = parseInt(tokenIdStr, 10)
  if (isNaN(tokenId) || tokenId < 1) {
    return NextResponse.json({ error: 'Invalid tokenId' }, { status: 400 })
  }

  const db = newKyselyPostgresql()

  const row = await db
    .selectFrom('credential_metadata')
    .selectAll()
    .where('token_id', '=', tokenId)
    .executeTakeFirst()

  if (!row) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }

  const typeLabels: Record<string, string> = {
    course_completion: 'Course Completion',
    role: 'Role',
    achievement: 'Achievement',
    nft: 'NFT',
  }

  const siteLabels: Record<string, string> = {
    'learn.tg': 'learn.tg Courses',
    'sivel.xyz': 'SIVeL 3 Credentials',
    'stable-sl.pdJ.app': 'stable-sl Credentials',
  }

  const baseUrl = process.env.NEXT_PUBLIC_SELF_ENDPOINT?.replace(/\/api\/self-verify$/, '') ||
    `https://${_request.headers.get('host') || 'sivel.xyz'}`

  const metadata = {
    name: row.name,
    description: `${siteLabels[row.site] || row.site} — ${typeLabels[row.type] || row.type}`,
    image: row.image_url.startsWith('http') ? row.image_url : `${baseUrl}/${row.image_url}`,
    attributes: [
      { trait_type: 'Collection', value: siteLabels[row.site] || row.site },
      { trait_type: 'Type', value: typeLabels[row.type] || row.type },
      ...(row.is_premium ? [{ trait_type: 'Premium', value: true }] : []),
    ],
  }

  return NextResponse.json(metadata, {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
