import type { Kysely } from 'kysely'

/**
 * Backfill pre-existing Learning Points awards into the transaction table.
 *
 * Before this migration, LP awards were sent to learn.tg but never recorded
 * in the local transaction table. These 8 records were collected from
 * learn.tg logs and the donation flow.
 */
export async function up(db: Kysely<any>): Promise<void> {
  const records = [
    { fecha: '2026-04-26 14:07:48', wallet: '0x2e2c4ac19c93d0984840cdd8e7f77500e2ef978e', txHash: '0xde15e7e6584ad7b8ff3201eb321b227deeda365d6d8aab5ec49a4aebbc83c289' },
    { fecha: '2026-04-26 14:08:15', wallet: '0x2e2c4ac19c93d0984840cdd8e7f77500e2ef978e', txHash: '0x43295a53aadbf1afc1672ba29453a09899a27f3e75734cc1caa5faaf2bf446ea' },
    { fecha: '2026-04-26 14:08:49', wallet: '0x2e2c4ac19c93d0984840cdd8e7f77500e2ef978e', txHash: '0x1a28222b9963956d5806862cc99ff7c540d1002714a46f80395ab7beecb58828' },
    { fecha: '2026-04-26 15:30:35', wallet: '0x2e2c4ac19c93d0984840cdd8e7f77500e2ef978e', txHash: '0x4be2835da1de6542816428be41a49cbf5aabb850977c4253b83fe521f7e655e5' },
    { fecha: '2026-04-26 19:38:22', wallet: '0x2e2c4ac19c93d0984840cdd8e7f77500e2ef978e', txHash: '0xa2cffaec28186dbe020ef584acc90eeae6a739ee7dd1a2f2036d25dc36c06179' },
    { fecha: '2026-04-28 09:11:01', wallet: '0x2e2c4ac19c93d0984840cdd8e7f77500e2ef978e', txHash: '0x868f0617db2ea2270528d91e42bde1fdeb25961c5bf9c4a4549697c476aa336f' },
    { fecha: '2026-04-29 08:24:38', wallet: '0x2e2c4ac19c93d0984840cdd8e7f77500e2ef978e', txHash: '0xc650a5e5553849d3ddd8de7d89119138dba5157ec9996d3e201ad98e335d5457' },
    { fecha: '2026-05-10 14:11:49', wallet: '0x2e2c4ac19c93d0984840cdd8e7f77500e2ef978e', txHash: '0xdc37393ea5c44428be9d06964588d91cfbcedd178a311a5502340b9e9d3ae37e' },
  ]

  for (const r of records) {
    // Skip if already inserted (dedup by hash)
    const existing = await db
      .selectFrom('transaction').select('id')
      .where('hash_tx', '=', r.txHash)
      .where('crypto', '=', 'learningpoint')
      .executeTakeFirst()

    if (existing) {
      console.log(`  Skipped (already exists): ${r.txHash.substring(0, 16)}...`)
      continue
    }

    await db.insertInto('transaction').values({
      wallet: r.wallet,
      fecha: new Date(r.fecha),
      tipo: 'earning',
      crypto: 'learningpoint',
      cantidad: '1.000000',
      impacto_balance: '1.000000',
      hash_tx: r.txHash,
      lp_success: true,
    } as any).execute()

    console.log(`  Inserted LP: ${r.txHash.substring(0, 16)}...`)
  }

  console.log(`Backfill complete: ${records.length} LP records processed.`)
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.deleteFrom('transaction')
    .where('crypto', '=', 'learningpoint')
    .execute()
}
