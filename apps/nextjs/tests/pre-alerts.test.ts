import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'

// ============================================================
// Kysely chain mock
// ============================================================
const mockExecute = vi.fn()
const mockExecuteTakeFirst = vi.fn()

const mockSql = vi.fn(() => ({
  as: vi.fn().mockReturnValue({}),
  execute: vi.fn(),
  val: vi.fn((v: any) => v),
}))

function makeBuilder(): Record<string, any> {
  return {
    selectFrom: () => makeBuilder(),
    select: () => makeBuilder(),
    selectAll: () => makeBuilder(),
    where: () => makeBuilder(),
    orderBy: () => makeBuilder(),
    limit: () => makeBuilder(),
    offset: () => makeBuilder(),
    insertInto: () => makeBuilder(),
    values: () => makeBuilder(),
    updateTable: () => makeBuilder(),
    set: () => makeBuilder(),
    returning: () => makeBuilder(),
    returningAll: () => makeBuilder(),
    execute: () => mockExecute(),
    executeTakeFirst: () => mockExecuteTakeFirst(),
    executeTakeFirstOrThrow: () => mockExecuteTakeFirst(),
  }
}

vi.mock('@/.config/kysely.config', () => ({
  newKyselyPostgresql: vi.fn(() => makeBuilder()),
}))

vi.mock('kysely', () => ({
  Kysely: vi.fn(() => makeBuilder()),
  PostgresDialect: vi.fn(),
  sql: mockSql,
}))

// ============================================================
// viem mock
// ============================================================
const mockVerifyMessage = vi.fn().mockResolvedValue(true)
const mockGetTransaction = vi.fn()
const mockGetTransactionReceipt = vi.fn()

vi.mock('viem', async () => {
  const actual = await vi.importActual('viem')
  return {
    ...actual,
    verifyMessage: mockVerifyMessage,
    createPublicClient: vi.fn(() => ({
      getTransaction: mockGetTransaction,
      getTransactionReceipt: mockGetTransactionReceipt,
    })),
    createWalletClient: vi.fn(() => ({ writeContract: vi.fn() })),
    http: vi.fn(() => ({})),
    parseAbi: vi.fn((x: any) => x),
  }
})

vi.mock('viem/chains', () => ({
  celo: { id: 42220, name: 'Celo' },
  celoSepolia: { id: 11142220, name: 'Celo Sepolia' },
}))

vi.mock('@pasosdejesus/m/blockchain/deployments', () => ({
  readDeployment: vi.fn(() => ({ address: '0x892373D6930dd38Cb54A28Ea8573e6d838570426' })),
}))

// ============================================================
// Constants
// ============================================================
const AGENT_WALLET = '0x8c88169977c180f6380c01daaa9c7f31894c20dc'
const BUYER_WALLET = '0x383b1cc3ddb5d02c8c3b0dc8ea7e5f3a2b1c0d9e'
const DOCUMENTER_WALLET = '0xabc0000000000000000000000000000000000001'
const EVENT_HASH = '0xabcd123400000000000000000000000000000000000000000000000000000000'

function nowISO() {
  return new Date().toISOString()
}

let syncPOST: (req: Request) => Promise<Response>
let alertsGET: (req: Request) => Promise<Response>
let alertGET: (req: Request, params: { params: { id: string } }) => Promise<Response>
let buyPOST: (req: Request, params: { params: { id: string } }) => Promise<Response>
let convertPOST: (req: Request) => Promise<Response>
let queueGET: (req: Request) => Promise<Response>
let scorePOST: (req: Request, params: { params: { id: string } }) => Promise<Response>

describe('Pre-Alerts API', () => {
  beforeAll(async () => {
    process.env.AGENT_WALLET_ADDRESS = AGENT_WALLET
    process.env.DOCUMENTER_WALLETS = DOCUMENTER_WALLET

    const syncMod = await import('@/app/api/pre-alerts/sync/route')
    syncPOST = syncMod.POST as unknown as (req: Request) => Promise<Response>

    const alertsMod = await import('@/app/api/pre-alerts/route')
    alertsGET = alertsMod.GET as unknown as (req: Request) => Promise<Response>

    const alertMod = await import('@/app/api/pre-alerts/[id]/route')
    alertGET = alertMod.GET as unknown as (req: Request, params: { params: { id: string } }) => Promise<Response>

    const buyMod = await import('@/app/api/pre-alerts/[id]/buy/route')
    buyPOST = buyMod.POST as unknown as (req: Request, params: { params: { id: string } }) => Promise<Response>

    const convertMod = await import('@/app/api/pre-alerts/convert/route')
    convertPOST = convertMod.POST as unknown as (req: Request) => Promise<Response>

    const queueMod = await import('@/app/api/pre-alerts/queue/route')
    queueGET = queueMod.GET as unknown as (req: Request) => Promise<Response>

    const scoreMod = await import('@/app/api/pre-alerts/[id]/score/route')
    scorePOST = scoreMod.POST as unknown as (req: Request, params: { params: { id: string } }) => Promise<Response>
  })

  beforeEach(() => {
    vi.restoreAllMocks()
    mockExecute.mockReset()
    mockExecuteTakeFirst.mockReset()
    mockVerifyMessage.mockReset()
    mockVerifyMessage.mockResolvedValue(true)
    mockGetTransaction.mockReset()
    mockGetTransactionReceipt.mockReset()
  })

  // ==========================================================
  // POST /api/pre-alerts/sync
  // ==========================================================
  describe('POST /api/pre-alerts/sync', () => {
    function makeSyncReq(overrides: Record<string, any> = {}) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Agent-Signature': overrides.signature ?? '0xvalidsig',
        'X-Agent-Timestamp': overrides.timestamp ?? nowISO(),
      }
      if (overrides.skipHeaders) {
        delete headers['X-Agent-Signature']
        delete headers['X-Agent-Timestamp']
      }
      return new Request('http://localhost/api/pre-alerts/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event_hash: overrides.event_hash ?? EVENT_HASH,
          json_data: overrides.json_data ?? { titulo: 'Test', hechos: 'Test event', fecha: '2026-01-01', departamento: 'Putumayo', municipio: 'Mocoa' },
          publisher_wallet: overrides.publisher_wallet ?? AGENT_WALLET,
          source_urls: overrides.source_urls ?? ['https://example.com/news'],
          source_summary: overrides.source_summary ?? 'Example',
        }),
      })
    }

    it('returns 401 when X-Agent-Signature header is missing', async () => {
      const req = makeSyncReq({ skipHeaders: true })
      const res = await syncPOST(req)
      expect(res.status).toBe(401)
    })

    it('returns 401 when timestamp is outside window', async () => {
      const req = makeSyncReq({ timestamp: '2020-01-01T00:00:00Z' })
      const res = await syncPOST(req)
      expect(res.status).toBe(401)
    })

    it('returns 400 when required fields are missing', async () => {
      const req = makeSyncReq({ event_hash: '', json_data: null, publisher_wallet: '' })
      const res = await syncPOST(req)
      expect(res.status).toBe(400)
    })

    it('returns 400 when source_urls is empty', async () => {
      const req = makeSyncReq({ source_urls: [] })
      const res = await syncPOST(req)
      expect(res.status).toBe(400)
    })

    it('returns 400 when json_data lacks titulo or hechos', async () => {
      const req = makeSyncReq({ json_data: { fecha: '2026-01-01' } })
      const res = await syncPOST(req)
      expect(res.status).toBe(400)
    })

    it('returns 401 when signature is invalid', async () => {
      mockVerifyMessage.mockRejectedValue(new Error('Invalid signature'))
      const req = makeSyncReq()
      const res = await syncPOST(req)
      expect(res.status).toBe(401)
    })

    it('returns 409 on duplicate event_hash', async () => {
      mockVerifyMessage.mockResolvedValue(true)
      mockExecuteTakeFirst.mockResolvedValue({ id: 5 })
      const req = makeSyncReq()
      const res = await syncPOST(req)
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.pre_alert_id).toBe(5)
    })

    it('returns 201 on successful sync', async () => {
      mockVerifyMessage.mockResolvedValue(true)
      mockExecuteTakeFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 42 })
      const req = makeSyncReq()
      const res = await syncPOST(req)
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.pre_alert_id).toBe(42)
      expect(body.status).toBe('pending')
    })
  })

  // ==========================================================
  // GET /api/pre-alerts
  // ==========================================================
  describe('GET /api/pre-alerts', () => {
    function makeListReq(search: string = '') {
      const req = new Request(`http://localhost/api/pre-alerts${search}`) as any
      req.nextUrl = new URL(`http://localhost/api/pre-alerts${search}`)
      return req
    }

    it('returns paginated list of pending pre-alerts', async () => {
      mockExecuteTakeFirst.mockResolvedValueOnce({ total: '2' })
      mockExecute.mockResolvedValue([
        {
          id: 1,
          status: 'pending',
          titulo: 'Evento A',
          fecha: '2026-01-01',
          departamento: 'Putumayo',
          municipio: 'Mocoa',
          source_urls: ['https://example.com/a'],
          source_summary: 'Example A',
        },
        {
          id: 2,
          status: 'pending',
          titulo: 'Evento B',
          fecha: '2026-01-02',
          departamento: 'Cauca',
          municipio: 'Popayán',
          source_urls: ['https://example.com/b'],
          source_summary: 'Example B',
        },
      ])

      const req = makeListReq('?page=1&limit=20')
      const res = await alertsGET(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.total).toBe(2)
      expect(body.pre_alerts).toHaveLength(2)
      expect(body.pre_alerts[0].titulo).toBe('Evento A')
      expect(body.pre_alerts[0].source_urls).toEqual(['https://example.com/a'])
    })

    it('returns 200 with empty list when no pending pre-alerts', async () => {
      mockExecuteTakeFirst.mockResolvedValueOnce({ total: '0' })
      mockExecute.mockResolvedValue([])

      const req = makeListReq()
      const res = await alertsGET(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.total).toBe(0)
      expect(body.pre_alerts).toHaveLength(0)
    })
  })

  // ==========================================================
  // GET /api/pre-alerts/[id]
  // ==========================================================
  describe('GET /api/pre-alerts/[id]', () => {
    it('returns 400 for invalid ID', async () => {
      const req = new Request('http://localhost/api/pre-alerts/abc?wallet=0x123') as any
      const res = await alertGET(req, { params: { id: 'abc' } })
      expect(res.status).toBe(400)
    })

    it('returns 404 when not found', async () => {
      mockExecuteTakeFirst.mockResolvedValue(undefined)
      const req = new Request('http://localhost/api/pre-alerts/999?wallet=0x123') as any
      const res = await alertGET(req, { params: { id: '999' } })
      expect(res.status).toBe(404)
    })

    it('returns pre-purchase view without json_data', async () => {
      mockExecuteTakeFirst.mockResolvedValue({
        id: 1,
        status: 'pending',
        json_data: { titulo: 'Test', fecha: '2026-01-01', departamento: 'Putumayo', municipio: 'Mocoa', hechos: 'detail' },
        source_urls: ['https://example.com'],
        source_summary: 'Example',
        buyer_wallet: null,
        bought_at: null,
        conversion_deadline: null,
      })

      const req = new Request('http://localhost/api/pre-alerts/1') as any
      const res = await alertGET(req, { params: { id: '1' } })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.titulo).toBe('Test')
      expect(body.can_purchase).toBe(true)
      expect(body.json_data).toBeUndefined()
    })

    it('returns post-purchase view with json_data when wallet matches', async () => {
      mockExecuteTakeFirst.mockResolvedValue({
        id: 1,
        status: 'reserved',
        json_data: { titulo: 'Test', fecha: '2026-01-01', hechos: 'detail' },
        source_urls: ['https://example.com'],
        source_summary: 'Example',
        buyer_wallet: BUYER_WALLET,
        bought_at: '2026-06-17T00:00:00Z',
        conversion_deadline: '2026-06-24T00:00:00Z',
      })

      const req = new Request(`http://localhost/api/pre-alerts/1?wallet=${BUYER_WALLET}`) as any
      const res = await alertGET(req, { params: { id: '1' } })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.json_data).toBeDefined()
      expect(body.json_data.titulo).toBe('Test')
      expect(body.status).toBe('reserved')
    })
  })

  // ==========================================================
  // POST /api/pre-alerts/[id]/buy
  // ==========================================================
  describe('POST /api/pre-alerts/[id]/buy', () => {
    it('returns 400 when buyer_wallet is missing', async () => {
      const req = new Request('http://localhost/api/pre-alerts/1/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const res = await buyPOST(req, { params: { id: '1' } })
      expect(res.status).toBe(400)
    })

    it('returns 404 when pre-alert not found', async () => {
      mockExecuteTakeFirst.mockResolvedValue(undefined)
      const req = new Request('http://localhost/api/pre-alerts/999/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_wallet: BUYER_WALLET }),
      })
      const res = await buyPOST(req, { params: { id: '999' } })
      expect(res.status).toBe(404)
    })

    it('returns 409 when pre-alert is not pending', async () => {
      mockExecuteTakeFirst.mockResolvedValue({ id: 1, status: 'reserved' })
      const req = new Request('http://localhost/api/pre-alerts/1/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_wallet: BUYER_WALLET }),
      })
      const res = await buyPOST(req, { params: { id: '1' } })
      expect(res.status).toBe(409)
    })

    it('returns 200 on successful purchase', async () => {
      mockExecuteTakeFirst.mockResolvedValue({ id: 1, status: 'pending' })
      mockExecute.mockResolvedValue(undefined)
      // Mock on-chain verification: Transfer event from buyer to PreAlertMarket
      const preAlertIdHex = BigInt(1).toString(16).padStart(64, '0')
      mockGetTransaction.mockResolvedValue({
        input: '0xa9059cbb' + '00'.repeat(64) + '00'.repeat(64) + preAlertIdHex,
      })
      process.env.NEXT_PUBLIC_USDT_ADDRESS = '0x4806b6ab179050326070ccbd3c1f5b0c7a1b5e6f'
      mockGetTransactionReceipt.mockResolvedValue({
        logs: [{
          address: '0x4806b6ab179050326070ccbd3c1f5b0c7a1b5e6f',
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x000000000000000000000000' + BUYER_WALLET.slice(2).toLowerCase(),
            '0x000000000000000000000000' + '892373D6930dd38Cb54A28Ea8573e6d838570426'.toLowerCase(),
          ],
          data: '0x00000000000000000000000000000000000000000000000000000000000f4240', // 1 USDT
        }],
      })
      const req = new Request('http://localhost/api/pre-alerts/1/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_wallet: BUYER_WALLET, tx_hash: '0xabc' }),
      })
      const res = await buyPOST(req, { params: { id: '1' } })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.status).toBe('reserved')
      expect(body.expires_at).toBeDefined()
    })
  })

  // ==========================================================
  // POST /api/pre-alerts/convert
  // ==========================================================
  describe('POST /api/pre-alerts/convert', () => {
    it('returns 400 when pre_alert_id or buyer_wallet missing', async () => {
      const req = new Request('http://localhost/api/pre-alerts/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const res = await convertPOST(req)
      expect(res.status).toBe(400)
    })

    it('returns 404 when not found', async () => {
      mockExecuteTakeFirst.mockResolvedValue(undefined)
      const req = new Request('http://localhost/api/pre-alerts/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pre_alert_id: 999, buyer_wallet: BUYER_WALLET }),
      })
      const res = await convertPOST(req)
      expect(res.status).toBe(404)
    })

    it('returns 409 when not reserved', async () => {
      mockExecuteTakeFirst.mockResolvedValue({
        id: 1, status: 'pending', buyer_wallet: BUYER_WALLET,
        conversion_deadline: '2026-12-31T00:00:00Z',
      })
      const req = new Request('http://localhost/api/pre-alerts/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pre_alert_id: 1, buyer_wallet: BUYER_WALLET }),
      })
      const res = await convertPOST(req)
      expect(res.status).toBe(409)
    })

    it('returns 403 when buyer_wallet does not match', async () => {
      mockExecuteTakeFirst.mockResolvedValue({
        id: 1, status: 'reserved', buyer_wallet: '0xOTHER',
        conversion_deadline: '2026-12-31T00:00:00Z',
      })
      const req = new Request('http://localhost/api/pre-alerts/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pre_alert_id: 1, buyer_wallet: BUYER_WALLET }),
      })
      const res = await convertPOST(req)
      expect(res.status).toBe(403)
    })

    it('returns 410 when deadline expired', async () => {
      mockExecuteTakeFirst.mockResolvedValue({
        id: 1, status: 'reserved', buyer_wallet: BUYER_WALLET,
        conversion_deadline: '2020-01-01T00:00:00Z',
      })
      const req = new Request('http://localhost/api/pre-alerts/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pre_alert_id: 1, buyer_wallet: BUYER_WALLET }),
      })
      const res = await convertPOST(req)
      expect(res.status).toBe(410)
    })

    it('returns 200 on successful conversion', async () => {
      mockExecuteTakeFirst.mockResolvedValue({
        id: 1, status: 'reserved', buyer_wallet: BUYER_WALLET,
        conversion_deadline: '2026-12-31T00:00:00Z',
      })
      mockExecute.mockResolvedValue(undefined)
      const req = new Request('http://localhost/api/pre-alerts/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pre_alert_id: 1, buyer_wallet: BUYER_WALLET }),
      })
      const res = await convertPOST(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.status).toBe('converted')
    })
  })

  // ==========================================================
  // GET /api/pre-alerts/queue
  // ==========================================================
  describe('GET /api/pre-alerts/queue', () => {
    it('returns 400 when wallet param is missing', async () => {
      const req = new Request('http://localhost/api/pre-alerts/queue') as any
      req.nextUrl = new URL('http://localhost/api/pre-alerts/queue')
      const res = await queueGET(req)
      expect(res.status).toBe(400)
    })

    it('returns 403 when wallet is not a documenter', async () => {
      process.env.DOCUMENTER_WALLETS = DOCUMENTER_WALLET
      const req = new Request(`http://localhost/api/pre-alerts/queue?wallet=0xunknown`) as any
      req.nextUrl = new URL(`http://localhost/api/pre-alerts/queue?wallet=0xunknown`)
      const res = await queueGET(req)
      expect(res.status).toBe(403)
    })

    it('returns 200 with converted pre-alerts for documenter', async () => {
      mockExecute.mockResolvedValue([
        {
          id: 1, json_data: { titulo: 'Test' }, source_urls: ['https://x.com'],
          source_summary: 'X', buyer_wallet: BUYER_WALLET,
          bought_at: '2026-06-17T00:00:00Z', converted_at: '2026-06-17T12:00:00Z', status: 'converted',
        },
      ])

      const req = new Request(`http://localhost/api/pre-alerts/queue?wallet=${DOCUMENTER_WALLET}`) as any
      req.nextUrl = new URL(`http://localhost/api/pre-alerts/queue?wallet=${DOCUMENTER_WALLET}`)
      const res = await queueGET(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.pending).toHaveLength(1)
      expect(body.total).toBe(1)
    })
  })

  // ==========================================================
  // POST /api/pre-alerts/[id]/score
  // ==========================================================
  describe('POST /api/pre-alerts/[id]/score', () => {
    const sig = '0xabc123'

    it('returns 400 when score or documenter_wallet missing', async () => {
      const req = new Request('http://localhost/api/pre-alerts/1/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const res = await scorePOST(req, { params: { id: '1' } })
      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid score (1)', async () => {
      const ts = Math.floor(Date.now() / 1000)
      const req = new Request('http://localhost/api/pre-alerts/1/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: 1, documenter_wallet: DOCUMENTER_WALLET, timestamp: ts, signature: sig, feedback: 'test' }),
      })
      const res = await scorePOST(req, { params: { id: '1' } })
      expect(res.status).toBe(400)
    })

    it('returns 403 when not a documenter', async () => {
      const ts = Math.floor(Date.now() / 1000)
      const req = new Request('http://localhost/api/pre-alerts/1/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: 3, documenter_wallet: '0xunknown', timestamp: ts, signature: sig, feedback: 'test' }),
      })
      const res = await scorePOST(req, { params: { id: '1' } })
      expect(res.status).toBe(403)
    })

    it('returns 404 when pre-alert not found', async () => {
      const ts = Math.floor(Date.now() / 1000)
      mockExecuteTakeFirst.mockResolvedValue(undefined)
      const req = new Request('http://localhost/api/pre-alerts/999/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: 3, documenter_wallet: DOCUMENTER_WALLET, timestamp: ts, signature: sig, feedback: 'test' }),
      })
      const res = await scorePOST(req, { params: { id: '999' } })
      expect(res.status).toBe(404)
    })

    it('returns 409 when pre-alert is not converted', async () => {
      const ts = Math.floor(Date.now() / 1000)
      mockExecuteTakeFirst.mockResolvedValue({
        id: 1, status: 'pending', buyer_wallet: BUYER_WALLET,
      })
      const req = new Request('http://localhost/api/pre-alerts/1/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: 3, documenter_wallet: DOCUMENTER_WALLET, timestamp: ts, signature: sig, feedback: 'test' }),
      })
      const res = await scorePOST(req, { params: { id: '1' } })
      expect(res.status).toBe(409)
    })

    it('returns 200 on rejection (score 0)', async () => {
      const ts = Math.floor(Date.now() / 1000)
      mockExecuteTakeFirst.mockResolvedValue({
        id: 1, status: 'converted', buyer_wallet: BUYER_WALLET,
      })
      mockExecute.mockResolvedValue(undefined)
      const req = new Request('http://localhost/api/pre-alerts/1/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: 0, documenter_wallet: DOCUMENTER_WALLET,
          feedback: 'Unreliable sources',
          timestamp: ts, signature: sig,
        }),
      })
      const res = await scorePOST(req, { params: { id: '1' } })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('rejected')
      expect(body.score).toBe(0)
      expect(body.citizen_reward).toBe('0 USDT')
    })

    it('returns 200 on score 4 (falls back to pending_reward without PRIVATE_KEY)', async () => {
      const ts = Math.floor(Date.now() / 1000)
      mockExecuteTakeFirst.mockResolvedValue({
        id: 1, status: 'converted', buyer_wallet: BUYER_WALLET,
      })
      mockExecute.mockResolvedValue(undefined)
      delete process.env.PRIVATE_KEY
      const req = new Request('http://localhost/api/pre-alerts/1/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: 4, documenter_wallet: DOCUMENTER_WALLET,
          feedback: 'Good documentation',
          timestamp: ts, signature: sig,
        }),
      })
      const res = await scorePOST(req, { params: { id: '1' } })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('pending_reward')
      expect(body.score).toBe(4)
    })
  })
})
