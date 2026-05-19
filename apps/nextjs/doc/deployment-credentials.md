# Deployment & Testing Checklist — Development Environment

## 1. Prerequisites

- adJ/OpenBSD environment
- `apps/.env` configured with valid keys
- PostgreSQL running
- Node.js + pnpm installed

## 2. Smart Contracts

```bash
cd apps/hardhat

# Platform setup (first time only)
bin/prepadJ.sh

# Compile + sync ABIs
yarn build

# Deploy to testnets
bin/deployPdJCredentials celoSepolia
bin/deployPdJCredentials baseSepolia

# Verify source
bin/PdJCredentialsSourceVerification celoSepolia
bin/PdJCredentialsSourceVerification baseSepolia

# Functional check
bin/verifyPdJCredentials celoSepolia
bin/verifyPdJCredentials baseSepolia
```

## 3. Database Migrations

```bash
cd apps/nextjs
bin/m db:migrate
```

Expected tables: `credential_emission`, `credential_metadata`. Explorer tracking uses existing `web_event` table (wallet + pathname like '/cases/%').

## 4. Register SBT Types + Images

```bash
cd apps/nextjs

# Grant MINTER_ROLE to backends
npx tsx scripts/adminCredentials.ts grant-minter --network celoSepolia --address $LEARNTG_ADDRESS
npx tsx scripts/adminCredentials.ts grant-minter --network celoSepolia --address $NEXT_PUBLIC_ADDRESS

# Register all SBT types with icons
for icon in connector donor donor-bronze donor-silver donor-gold donor-diamond global-founder explorer; do
  display=$(echo "$icon" | sed 's/-/ /g' | sed 's/\b./\U&/g')
  npx tsx scripts/adminCredentials.ts register-type \
    --network celoSepolia --site sivel.xyz --type achievement \
    --display "$display" --soulbound true \
    --icon public/img/credential/source/$icon.svg
done

# Set maxSupply for Global Founder
npx tsx scripts/adminCredentials.ts set-max-supply --network celoSepolia --token-id 12 --max 50

# Verify types
npx tsx scripts/adminCredentials.ts list-types --network celoSepolia

# OPTIONAL: Backfill cache if tokens exist from before cache code was added
# npx tsx scripts/adminCredentials.ts sync-cache --network celoSepolia
```

## 5. Start Development Server

```bash
cd apps/nextjs
bin/dev   # runs on port 9001
```

## 6. Test SBT Flow

### 6.1 Manual Mint Test

```bash
cd apps/nextjs

# Mint Connector to a wallet
npx tsx scripts/adminCredentials.ts mint \
  --network celoSepolia --token-id 2 --address 0xYOUR_WALLET

# Mint Explorer (after ≥3 case views)
npx tsx scripts/adminCredentials.ts mint \
  --network celoSepolia --token-id 13 --address 0xYOUR_WALLET
```

### 6.2 Wallet Connection → Connector

1. Open `https://sivel.xyz:9001/en/cases/osmmap`
2. Connect wallet
3. Check Blockscout: `https://celo-sepolia.blockscout.com/address/<WALLET>/tokens`
4. Should see Connector SBT (token ID 2)

### 6.3 Case Views → Explorer

1. With wallet connected, open 3 different case markers on the map
2. Check if Explorer SBT is minted (Blockscout or `/stats` page)

### 6.4 Donation → Donor SBTs

1. Donate ≥ $0.02 USDT on Celo testnet
2. Verify Donor SBT appears (token ID 7)
3. Cumulative: $5 → Bronze (8), $20 → Silver (9), $50 → Gold (10), $100 → Diamond (11)

## 7. Check `/stats` Page

Open `https://sivel.xyz:9001/en/stats`
- Total SBTs Minted KPI
- SBT Breakdown (badges with counts)
- Top Donors leaderboard table

## 8. Check Wallet Profile

Open `https://sivel.xyz:9001/en/wallet/0xYOUR_WALLET`
- SBT badges grid
- Total donated
- Donation count
- First activity date
- Share button

## 9. API Health Check

```bash
curl -s https://sivel.xyz:9001/api/health/credentials | json_pp
curl -s https://sivel.xyz:9001/api/credential/breakdown | json_pp
curl -s https://sivel.xyz:9001/api/credential/leaderboard?limit=5 | json_pp
curl -s https://sivel.xyz:9001/en/api/credential/2.json | json_pp
```

## 10. Test Image Composition

```bash
# Recompose a single token's image
npx tsx scripts/adminCredentials.ts recompose-image \
  --token-id 2 --icon public/img/credential/source/connector.svg

# Verify files exist
ls -la public/img/credential/{2.png,generated/2.svg}
```

## 11. Run Tests

```bash
cd apps/nextjs
npx vitest run tests/credentials.test.ts tests/sbt-api.test.ts tests/deployments.test.ts
```

## 12. Revoke a Credential

```bash
# Burn a credential from a user (MINTER_ROLE required)
npx tsx scripts/adminCredentials.ts revoke-credential \
  --network celoSepolia --token-id 2 --address 0xWALLET --amount 1
```

## 13. Cleanup Test Data (optional)

```bash
# Revoke MINTER_ROLE from a wallet
npx tsx scripts/adminCredentials.ts revoke-minter --network celoSepolia --address 0xWALLET

```
