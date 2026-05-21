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
bin/m credentials:grant-minter --network celoSepolia --address $LEARNTG_ADDRESS
bin/m credentials:grant-minter --network celoSepolia --address $NEXT_PUBLIC_ADDRESS

# Register all SBT types (order matters — tokenIds are sequential)
bin/m credentials:register-type \
  --network celoSepolia --site sivel.xyz --type achievement \
  --display "Connector" --soulbound true --max-supply 0 \
  --icon public/img/credential/source/connector.svg

bin/m credentials:register-type \
  --network celoSepolia --site sivel.xyz --type achievement \
  --display "Donor" --soulbound true --max-supply 0 \
  --icon public/img/credential/source/donor.svg

bin/m credentials:register-type \
  --network celoSepolia --site sivel.xyz --type achievement \
  --display "Bronze Donor" --soulbound true --max-supply 0 \
  --icon public/img/credential/source/donor-bronze.svg

bin/m credentials:register-type \
  --network celoSepolia --site sivel.xyz --type achievement \
  --display "Silver Donor" --soulbound true --max-supply 0 \
  --icon public/img/credential/source/donor-silver.svg

bin/m credentials:register-type \
  --network celoSepolia --site sivel.xyz --type achievement \
  --display "Gold Donor" --soulbound true --max-supply 0 \
  --icon public/img/credential/source/donor-gold.svg

bin/m credentials:register-type \
  --network celoSepolia --site sivel.xyz --type achievement \
  --display "Diamond Donor" --soulbound true --max-supply 0 \
  --icon public/img/credential/source/donor-diamond.svg

bin/m credentials:register-type \
  --network celoSepolia --site sivel.xyz --type achievement \
  --display "Global Founder" --soulbound true --max-supply 0 \
  --icon public/img/credential/source/global-founder.svg

bin/m credentials:register-type \
  --network celoSepolia --site sivel.xyz --type achievement \
  --display "Explorer" --soulbound true --max-supply 0 \
  --icon public/img/credential/source/explorer.svg

# Set maxSupply for Global Founder (tokenId 7 on fresh deployment)
bin/m credentials:set-max-supply --network celoSepolia --token-id 7 --max 50

# Verify types
bin/m credentials:list-types --network celoSepolia
```

**Note:** `--custom-uri` is optional — pass an IPFS/Arweave URL for NFTs. `--max-supply` defaults to 0 (unlimited). TokenIds are sequential across registrations (1-8 for the above).

## 5. Start Development Server

```bash
cd apps/nextjs
bin/dev   # runs on port 9001
```

## 6. Test SBT Flow

Expected tokenIds on fresh deployment:

| tokenId | Name |
|---------|------|
| 1 | Connector |
| 2 | Donor |
| 3 | Bronze Donor |
| 4 | Silver Donor |
| 5 | Gold Donor |
| 6 | Diamond Donor |
| 7 | Global Founder |
| 8 | Explorer |

### 6.1 Manual Mint Test

```bash
cd apps/nextjs

# Mint Connector to a wallet
bin/m credentials:mint \
  --network celoSepolia --token-id 1 --address 0xYOUR_WALLET

# Mint Explorer (after ≥3 case views)
bin/m credentials:mint \
  --network celoSepolia --token-id 8 --address 0xYOUR_WALLET
```

### 6.2 Wallet Connection → Connector

1. Open `https://sivel.xyz:9001/en/cases/osmmap`
2. Connect wallet
3. Check Blockscout: `https://celo-sepolia.blockscout.com/address/<WALLET>/tokens`
4. Should see Connector SBT (tokenId 1)

### 6.3 Case Views → Explorer

1. With wallet connected, open 3 different case markers on the map
2. Check if Explorer SBT is minted (Blockscout or `/stats` page)

### 6.4 Donation → Donor SBTs

1. Donate ≥ $0.02 USDT on Celo testnet
2. Verify Donor SBT appears (tokenId 2)
3. Cumulative: $5 → Bronze (3), $20 → Silver (4), $50 → Gold (5), $100 → Diamond (6)

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
bin/m credentials:recompose-image \
  --network celoSepolia --token-id 1 --icon public/img/credential/source/connector.svg

# Verify files exist
ls -la public/img/credential/{1.png,generated/1.svg}
```

## 11. Run Tests

```bash
cd apps/nextjs
npx vitest run tests/credential-api.test.ts tests/credential-metadata.test.ts tests/deployments.test.ts
```

## 12. Revoke a Credential

```bash
# Burn a credential from a user (MINTER_ROLE required)
bin/m credentials:revoke-credential \
  --network celoSepolia --token-id 1 --address 0xWALLET --amount 1
```

## 13. Cleanup Test Data (optional)

```bash
# Revoke MINTER_ROLE from a wallet
bin/m credentials:revoke-minter --network celoSepolia --address 0xWALLET
```
