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

## 4. Deploy and Verify

See `apps/hardhat/README.md` sections 3.3–3.5 and `bin/{deployPdJCredentials,PdJCredentialsSourceVerification,verifyPdJCredentials}`.

## 5. Post-Deployment (`scripts/adminCredentials.ts`)

Run from `apps/nextjs/`:

### Grant MINTER_ROLE

```bash
# learn.tg on Celo (course SBTs)
npx tsx scripts/adminCredentials.ts grant-minter --network celo --address $LEARNTG_ADDRESS

# sivel.xyz on Celo (role SBTs)
npx tsx scripts/adminCredentials.ts grant-minter --network celo --address $NEXT_PUBLIC_ADDRESS

# sivel.xyz on Base (NFTs)
npx tsx scripts/adminCredentials.ts grant-minter --network base --address $NEXT_PUBLIC_ADDRESS
```

### Register Credential Types

Provide an SVG icon (`--icon`) for the credential image. The script validates the SVG (512×512, no scripts/remote resources), then composes the final badge with programmatic layers (colored border, site logo, lock/star overlays) and generates both SVG source and PNG.

```bash
# SBT with icon (achievement, infinite supply)
npx tsx scripts/adminCredentials.ts register-type \
  --network celo --site sivel.xyz --type achievement \
  --display "Connector" --soulbound true \
  --icon public/img/credential/source/connector.svg

# Free course
npx tsx scripts/adminCredentials.ts register-type \
  --network celo --site learn.tg --type course_completion \
  --display "Basic Course" --soulbound true --course-id 1

# Premium course
npx tsx scripts/adminCredentials.ts register-type \
  --network celo --site learn.tg --type course_completion \
  --display "Premium Course" --soulbound true --course-id 2 --premium true

# Founder User (sivel.xyz, role, maxSupply=50)
npx tsx scripts/adminCredentials.ts register-type \
  --network celo --site sivel.xyz --type role \
  --display "Founder User" --soulbound true

# Collectible NFT
npx tsx scripts/adminCredentials.ts register-type \
  --network base --site sivel.xyz --type nft \
  --display "Bible Verse" --soulbound false
```

### Re-compose Credential Image

Regenerates SVG and PNG for an existing credential type (e.g., to update the icon or logo).

```bash
npx tsx scripts/adminCredentials.ts recompose-image \
  --token-id 2 \
  --icon public/img/credential/source/connector.svg
```

Reads metadata from `credential_metadata` cache (no RPC calls).

### Sync Cache from Blockchain

Backfills `credential_metadata` from on-chain data for all registered tokens.

```bash
npx tsx scripts/adminCredentials.ts sync-cache --network celo
```

### Set maxSupply

```bash
npx tsx scripts/adminCredentials.ts set-max-supply --network celo --token-id 1 --max 50
```

### List Registered Types

```bash
npx tsx scripts/adminCredentials.ts list-types --network celo
npx tsx scripts/adminCredentials.ts list-types --network base
```

### Update Site baseURI

```bash
npx tsx scripts/adminCredentials.ts set-site-base-uri \
  --network celo --site stable-sl.pdJ.app --uri "https://stable-sl.pdJ.app/api/credential/"
```

## 6. Registered Credentials

| tokenId | Network | Site | Type | Name | Soulbound | Premium | maxSupply |
|---------|---------|------|------|------|-----------|---------|-----------|
| 1 | Celo Sepolia | sivel.xyz | role | Founder User | ✅ | — | 50 |
| 2 | Celo Sepolia | sivel.xyz | achievement | Connector | ✅ | — | 0 (∞) |

## 7. Minting Flow

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

## 8. Revocation

Revocation is governed by the **[Terms of Service](../../TERMS_OF_SERVICE.md)**. Causes:
- Illegal or anti-Christian content in NFTs
- Terms of use violation
- Impersonation or fraud
- Request by regional validator (role SBTs)

```bash
# Revoke MINTER_ROLE (emergency)
npx tsx scripts/adminCredentials.ts revoke-minter --network celo --address <COMPROMISED_WALLET>

# Revoke credential from user (backend with MINTER_ROLE)
# Contract exposes: revokeCredential(address account, uint256 tokenId, uint256 amount)
```

## 9. Emergency — Compromised Minter Wallet

1. Revoke `MINTER_ROLE` immediately:
   ```bash
   npx tsx scripts/adminCredentials.ts revoke-minter --network celo --address 0xCOMPROMISED
   npx tsx scripts/adminCredentials.ts revoke-minter --network base --address 0xCOMPROMISED
   ```
2. Rotate private key in `.env`
3. Grant `MINTER_ROLE` to the new wallet
4. Run `list-types` to verify no unauthorized credentials
5. If unauthorized tokens were minted, the backend calls `revokeCredential` to burn them

## 10. Integration

### stable-sl

Queries premium SBTs via learn.tg API (not on-chain):
```
GET https://learn.tg/api/users/{wallet}/premium-sbt-count
```

Tiers: 0 SBTs → 100 SLE/day, 1 SBT → 200 SLE/day, 2+ SBTs → 400 SLE/day.

### sivel.xyz

Uses `lib/credentials.ts` to interact with the contract on both networks.
Admin operations via `scripts/adminCredentials.ts`.

### Image Composition

**Site logos** are auto-detected from `public/img/logo-{short}.svg`:

| Site | Short name | Logo file |
|------|-----------|-----------|
| sivel.xyz | `sivel` | `public/img/logo-sivel.svg` |
| learn.tg | `learntg` | `public/img/logo-learntg.svg` |
| stable-sl.pdJ.app | `stablesl` | `public/img/logo-stablesl.svg` |

Logo specs: SVG, scaled to fit 64×64 px area in the bottom-right corner of the 512×512 badge.

The badge is composed programmatically from the user's icon (512×512 SVG) plus:

| Layer | Trigger | Position |
|-------|---------|----------|
| Colored border | By `type`: achievement=#10B981, role=#F59E0B, course=#3B82F6, nft=#8B5CF6 | Full frame |
| Site logo | Auto-detected from `public/img/logo-{short}.svg` (e.g. `logo-sivel.svg`) | Bottom-right 64×64 |
| Lock overlay | `isSoulbound = true` | Top-left 48×48 |
| Star overlay | `isPremium = true` | Top-right 48×48 |

**Icon requirements:** SVG, viewBox `0 0 512 512`, no scripts, no remote resources.
Output: `public/img/credential/source/{tokenId}.svg` + `public/img/credential/{tokenId}.png` (via `rsvg-convert`).

### Metadata

Each site serves `GET /api/credential/{tokenId}.json` reading from `credential_metadata` cache.
Sivel.xyz returns: `name`, `description`, `image` (PNG URL), `attributes` (Collection, Type, Premium).
