# PasosDeJesusCredentials — Administration

## 1. Environment Variables (`apps/.env`)

| Variable | Purpose |
|----------|---------|
| `CREDENTIALS_PRIVATE_KEY` | Deployer + `DEFAULT_ADMIN_ROLE`. Register types, set supply, update URIs, grant/revoke roles |
| `PRIVATE_KEY` | sivel.xyz backend (`MINTER_ROLE`). Mints NFTs on Base and role SBTs on Celo |
| `LEARNTG_ADDRESS` | learn.tg backend (public address). Receives `MINTER_ROLE` for minting course SBTs on Celo |
| `NEXT_PUBLIC_BASE_NETWORK` | Base network: `base` (mainnet) or `baseSepolia` (testnet) |
| `NEXT_PUBLIC_BASE_RPC_URL` | Base RPC endpoint |
| `BLOCKSCOUT_API_KEY` | Celo contract verification |
| `BASESCAN_API_KEY` | Base contract verification |

## 2. Deployed Addresses

| Network | Address | Explorer |
|---------|---------|----------|
| Celo Mainnet | _pending_ | [Celoscan](https://celoscan.io) |
| Base Mainnet | _pending_ | [Basescan](https://basescan.org) |
| Celo Sepolia | _pending_ | [Blockscout](https://celo-sepolia.blockscout.com) |
| Base Sepolia | _pending_ | [Basescan](https://sepolia.basescan.org) |

## 3. Assigned Roles

| Role | Network | Wallet | Purpose |
|------|---------|--------|---------|
| `DEFAULT_ADMIN_ROLE` | Celo, Base | `CREDENTIALS_PRIVATE_KEY` | Manage types, supply, URIs |
| `MINTER_ROLE` | Celo | learn.tg backend | Mint course completion SBTs |
| `MINTER_ROLE` | Celo | sivel.xyz backend | Mint role SBTs (Documenter, Validator, Founder User) |
| `MINTER_ROLE` | Base | sivel.xyz backend | Mint purchased NFTs |

## 4. Deployment

```bash
cd apps/hardhat

# Testnet
bin/deployPdJCredentials celoSepolia
bin/deployPdJCredentials baseSepolia

# Mainnet
bin/deployPdJCredentials celo
bin/deployPdJCredentials base
```

The script saves the address to `deployments/<network>.json`.

## 5. Verification

### 5.1 Source Code

```bash
# Testnet
bin/PdJCredentialsSourceVerification celoSepolia
bin/PdJCredentialsSourceVerification baseSepolia

# Mainnet
bin/PdJCredentialsSourceVerification celo
bin/PdJCredentialsSourceVerification base
```

### 5.2 Functionality Check

```bash
# Testnet
bin/verifyPdJCredentials celoSepolia
bin/verifyPdJCredentials baseSepolia

# Mainnet
bin/verifyPdJCredentials celo
bin/verifyPdJCredentials base
```

## 6. Post-Deployment (`adminPdJCredentials.js`)

### Grant MINTER_ROLE

```bash
# learn.tg on Celo (course SBTs)
node scripts/adminPdJCredentials.js grant-minter --network celo --address $LEARNTG_ADDRESS

# sivel.xyz on Celo (role SBTs)
node scripts/adminPdJCredentials.js grant-minter --network celo --address $NEXT_PUBLIC_ADDRESS

# sivel.xyz on Base (NFTs)
node scripts/adminPdJCredentials.js grant-minter --network base --address $NEXT_PUBLIC_ADDRESS
```

### Register Credential Types

```bash
# Free course
node scripts/adminPdJCredentials.js register-type \
  --network celo --site learn.tg --type course_completion \
  --display "Basic Course" --soulbound true --course-id 1

# Premium course
node scripts/adminPdJCredentials.js register-type \
  --network celo --site learn.tg --type course_completion \
  --display "Premium Course" --soulbound true --course-id 2 --premium true

# Founder User (sivel.xyz, role, maxSupply=50)
node scripts/adminPdJCredentials.js register-type \
  --network celo --site sivel.xyz --type role \
  --display "Founder User" --soulbound true

# Collectible NFT
node scripts/adminPdJCredentials.js register-type \
  --network base --site sivel.xyz --type nft \
  --display "Bible Verse" --soulbound false
```

### Set maxSupply

```bash
node scripts/adminPdJCredentials.js set-max-supply --network celo --token-id 1 --max 50
```

### List Registered Types

```bash
node scripts/adminPdJCredentials.js list-types --network celo
node scripts/adminPdJCredentials.js list-types --network base
```

### Update Site baseURI

```bash
node scripts/adminPdJCredentials.js set-site-base-uri \
  --network celo --site stable-sl.pdJ.app --uri "https://stable-sl.pdJ.app/api/credential/"
```

## 7. Registered Credentials

| tokenId | Network | Site | Type | Name | Soulbound | Premium | maxSupply |
|---------|---------|------|------|------|-----------|---------|-----------|
| _pending_ | | | | | | | |

## 8. Minting Flow

### Course SBT (Celo)

```
User completes 100% of a course on learn.tg
  → Backend checks credential_emission (off-chain) + hasCredential (on-chain)
  → If none exists: calls mintCourseCompletion(account, courseId, courseName, premium)
  → Inserts row into credential_emission with chain_id = 'celo'
```

### NFT (Base)

```
User pays with SLEARN or USDT
  → Backend verifies payment off-chain (SLEARN burned or USDT in treasury)
  → Calls mintCredential(account, tokenId, 1) on Base contract
  → Inserts row into credential_emission with chain_id = 'base'
```

### Role SBT (Celo)

```
sivel.xyz admin assigns role (Documenter, Validator)
  → Backend calls mintCredential(account, tokenId, 1) on Celo
  → Inserts row into credential_emission with chain_id = 'celo'
```

## 9. Revocation

Revocation is governed by the **[Terms of Service](../../TERMS_OF_SERVICE.md)**. Causes:
- Illegal or anti-Christian content in NFTs
- Terms of use violation
- Impersonation or fraud
- Request by regional validator (role SBTs)

```bash
# Revoke MINTER_ROLE (emergency)
node scripts/adminPdJCredentials.js revoke-minter --network celo --address <COMPROMISED_WALLET>

# Revoke credential from user (backend with MINTER_ROLE)
# Contract exposes: revokeCredential(address account, uint256 tokenId, uint256 amount)
```

## 10. Emergency — Compromised Minter Wallet

1. Revoke `MINTER_ROLE` immediately:
   ```bash
   node scripts/adminPdJCredentials.js revoke-minter --network celo --address 0xCOMPROMISED
   node scripts/adminPdJCredentials.js revoke-minter --network base --address 0xCOMPROMISED
   ```
2. Rotate private key in `.env`
3. Grant `MINTER_ROLE` to the new wallet
4. Run `list-types` to verify no unauthorized credentials
5. If unauthorized tokens were minted, the backend calls `revokeCredential` to burn them

## 11. Integration

### stable-sl

Queries premium SBTs via learn.tg API (not on-chain):
```
GET https://learn.tg/api/users/{wallet}/premium-sbt-count
```

Tiers: 0 SBTs → 100 SLE/day, 1 SBT → 200 SLE/day, 2+ SBTs → 400 SLE/day.

### sivel.xyz

Uses `apps/nextjs/lib/credentials.ts` to interact with the contract on both networks.

### Metadata

Each site serves `GET /api/credential/{tokenId}.json` with attributes (Collection, Type, Premium).
