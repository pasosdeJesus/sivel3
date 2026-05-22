import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Normalize wallet addresses to lowercase on insert/update.
  // Ethereum addresses are case-insensitive (EIP-55 checksummed),
  // but PostgreSQL VARCHAR is case-sensitive. This prevents
  // duplicate entries like 0xABC... and 0xabc...

  // 1. Drop duplicates before lowering (avoid unique constraint violations)
  // credential_emission: keep earliest by id for each (wallet_address_lower, token_id, chain_id)
  await sql`
    DELETE FROM credential_emission WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY LOWER(wallet_address), token_id, chain_id ORDER BY id
        ) AS rn
        FROM credential_emission
      ) sub WHERE rn > 1
    )
  `.execute(db)

  // transaction: keep earliest by id for each (wallet_lower, tipo)
  await sql`
    DELETE FROM transaction WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY LOWER(wallet), tipo ORDER BY id
        ) AS rn
        FROM transaction WHERE wallet IS NOT NULL
      ) sub WHERE rn > 1
    )
  `.execute(db)

  // web_event: keep earliest by id for each (wallet_lower, event_type, created_at)
  await sql`
    DELETE FROM web_event WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY LOWER(wallet), event_type, created_at ORDER BY id
        ) AS rn
        FROM web_event WHERE wallet IS NOT NULL
      ) sub WHERE rn > 1
    )
  `.execute(db)

  // 2. Normalize existing data to lowercase
  await sql`UPDATE transaction SET wallet = LOWER(wallet) WHERE wallet IS NOT NULL`.execute(db)
  await sql`UPDATE credential_emission SET wallet_address = LOWER(wallet_address) WHERE wallet_address IS NOT NULL`.execute(db)
  await sql`UPDATE web_event SET wallet = LOWER(wallet) WHERE wallet IS NOT NULL`.execute(db)

  // 3. Create trigger function
  await sql`
    CREATE OR REPLACE FUNCTION normalize_wallet() RETURNS trigger AS $$
    BEGIN
      IF TG_TABLE_NAME = 'credential_emission' THEN
        NEW.wallet_address = LOWER(NEW.wallet_address);
      ELSE
        NEW.wallet = LOWER(NEW.wallet);
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `.execute(db)

  // 4. Attach triggers
  await sql`
    CREATE TRIGGER trg_normalize_wallet_transaction
    BEFORE INSERT OR UPDATE ON transaction
    FOR EACH ROW EXECUTE FUNCTION normalize_wallet()
  `.execute(db)

  await sql`
    CREATE TRIGGER trg_normalize_wallet_credential_emission
    BEFORE INSERT OR UPDATE ON credential_emission
    FOR EACH ROW EXECUTE FUNCTION normalize_wallet()
  `.execute(db)

  await sql`
    CREATE TRIGGER trg_normalize_wallet_web_event
    BEFORE INSERT OR UPDATE ON web_event
    FOR EACH ROW EXECUTE FUNCTION normalize_wallet()
  `.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TRIGGER IF EXISTS trg_normalize_wallet_transaction ON transaction`.execute(db)
  await sql`DROP TRIGGER IF EXISTS trg_normalize_wallet_credential_emission ON credential_emission`.execute(db)
  await sql`DROP TRIGGER IF EXISTS trg_normalize_wallet_web_event ON web_event`.execute(db)
  await sql`DROP FUNCTION IF EXISTS normalize_wallet()`.execute(db)
}
