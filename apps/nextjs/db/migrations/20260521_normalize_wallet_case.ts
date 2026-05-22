import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Normalize wallet addresses to lowercase on insert/update.
  // Ethereum addresses are case-insensitive (EIP-55 checksummed),
  // but PostgreSQL VARCHAR is case-sensitive. This prevents
  // duplicate entries like 0xABC... and 0xabc...

  // 1. Normalize existing data
  await sql`UPDATE transaction SET wallet = LOWER(wallet) WHERE wallet IS NOT NULL`.execute(db)
  await sql`UPDATE credential_emission SET wallet_address = LOWER(wallet_address) WHERE wallet_address IS NOT NULL`.execute(db)
  await sql`UPDATE web_event SET wallet = LOWER(wallet) WHERE wallet IS NOT NULL`.execute(db)

  // 2. Create trigger function
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

  // 3. Attach triggers
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
