# PasosDeJesusCredentials — Administración

## 1. Variables de entorno (`apps/.env`)

| Variable | Propósito |
|----------|-----------|
| `ADMIN_PRIVATE_KEY` | Deployer + `DEFAULT_ADMIN_ROLE`. Permite registrar tipos, fijar supply, cambiar URIs, grant/revoke roles |
| `PRIVATE_KEY` | sivel.xyz backend (`MINTER_ROLE`). Mintea NFTs en Base y SBTs de rol en Celo |
| `LEARNTG_MINTER_ADDRESS` | learn.tg backend (dirección pública). Recibe `MINTER_ROLE` para mintear SBTs de cursos en Celo |
| `NEXT_PUBLIC_BASE_NETWORK` | Red Base: `base` (mainnet) o `baseSepolia` (testnet) |
| `NEXT_PUBLIC_BASE_RPC_URL` | RPC de Base |
| `BLOCKSCOUT_API_KEY` | Verificación en Celo |
| `BASESCAN_API_KEY` | Verificación en Base |

## 2. Direcciones desplegadas

| Red | Dirección | Explorer |
|-----|-----------|----------|
| Celo Mainnet | _pendiente_ | [Celoscan](https://celoscan.io) |
| Base Mainnet | _pendiente_ | [Basescan](https://basescan.org) |
| Celo Sepolia | _pendiente_ | [Blockscout](https://celo-sepolia.blockscout.com) |
| Base Sepolia | _pendiente_ | [Basescan](https://sepolia.basescan.org) |

## 3. Roles asignados

| Rol | Red | Wallet | Propósito |
|-----|-----|--------|-----------|
| `DEFAULT_ADMIN_ROLE` | Celo, Base | `ADMIN_PRIVATE_KEY` | Administrar tipos, supply, URIs |
| `MINTER_ROLE` | Celo | learn.tg backend | Mintea SBTs al completar cursos |
| `MINTER_ROLE` | Celo | sivel.xyz backend | Mintea roles (Documenter, Validator, Founder User) |
| `MINTER_ROLE` | Base | sivel.xyz backend | Mintea NFTs comprados |

## 4. Despliegue

```bash
cd apps/hardhat

# Testnet
npx hardhat run scripts/deployPdJCredentials.ts --network celoSepolia
npx hardhat run scripts/deployPdJCredentials.ts --network baseSepolia

# Mainnet
npx hardhat run scripts/deployPdJCredentials.ts --network celo
npx hardhat run scripts/deployPdJCredentials.ts --network base
```

El script guarda la dirección en `deployments/<red>.json` y sugiere actualizar `apps/.env`.

## 5. Verificación

```bash
# Verificar en explorer
npx hardhat verify --network celo <DIRECCION> "https://sivel.xyz/api/credential/"
npx hardhat verify --network base <DIRECCION> "https://sivel.xyz/api/credential/"

# Verificar estado on-chain
npx hardhat run scripts/verifyPdJCredentials.ts --network celo
npx hardhat run scripts/verifyPdJCredentials.ts --network base
```

## 6. Post-despliegue (`adminPdJCredentials.js`)

### Otorgar MINTER_ROLE

```bash
# learn.tg en Celo (SBTs de cursos)
node scripts/adminPdJCredentials.js grant-minter --network celo --address <LEARNTG_MINTER_ADDRESS>

# sivel.xyz en Celo (SBTs de roles)
node scripts/adminPdJCredentials.js grant-minter --network celo --address <SIVEL3_ADDRESS>

# sivel.xyz en Base (NFTs)
node scripts/adminPdJCredentials.js grant-minter --network base --address <SIVEL3_ADDRESS>
```

### Registrar credenciales

```bash
# Curso gratuito
node scripts/adminPdJCredentials.js register-type \
  --network celo --site learn.tg --type course_completion \
  --display "Curso Básico" --soulbound true --course-id 1

# Curso premium
node scripts/adminPdJCredentials.js register-type \
  --network celo --site learn.tg --type course_completion \
  --display "Curso Premium" --soulbound true --course-id 2 --premium true

# Founder User (sivel.xyz, rol, maxSupply=50)
node scripts/adminPdJCredentials.js register-type \
  --network celo --site sivel.xyz --type role \
  --display "Founder User" --soulbound true

# NFT coleccionable
node scripts/adminPdJCredentials.js register-type \
  --network base --site sivel.xyz --type nft \
  --display "Versículo Bíblico" --soulbound false
```

### Fijar maxSupply

```bash
node scripts/adminPdJCredentials.js set-max-supply --network celo --token-id 3 --max 50
```

### Listar tipos registrados

```bash
node scripts/adminPdJCredentials.js list-types --network celo
node scripts/adminPdJCredentials.js list-types --network base
```

### Cambiar baseURI de un sitio

```bash
node scripts/adminPdJCredentials.js set-site-base-uri \
  --network celo --site stable-sl.pdJ.app --uri "https://stable-sl.pdJ.app/api/credential/"
```

## 7. Credenciales registradas

_Completar tras el despliegue._

| tokenId | Red | Sitio | Tipo | Nombre | Soulbound | Premium | maxSupply |
|---------|-----|-------|------|--------|-----------|---------|-----------|
| _pendiente_ | | | | | | | |

## 8. Flujo de minteo

### SBT de curso (Celo)

```
Usuario completa 100% de un curso en learn.tg
  → Backend verifica credential_emission (off-chain) + hasCredential (on-chain)
  → Si no existe: llama mintCourseCompletion(account, courseId, courseName, premium)
  → Inserta fila en credential_emission con chain_id = 'celo'
```

### NFT (Base)

```
Usuario paga con SLEARN o USDT
  → Backend verifica pago off-chain (SLEARN quemado o USDT en treasury)
  → Llama mintCredential(account, tokenId, 1) en contrato de Base
  → Inserta fila en credential_emission con chain_id = 'base'
```

### SBT de rol (Celo)

```
Admin de sivel.xyz asigna rol (Documenter, Validator)
  → Backend llama mintCredential(account, tokenId, 1) en Celo
  → Inserta fila en credential_emission con chain_id = 'celo'
```

## 9. Revocación

La revocación se rige por los **[Términos de Servicio](../../TERMS_OF_SERVICE.md)**. Causas:
- Contenido ilegal o anti-cristiano en NFTs
- Violación de términos de uso
- Suplantación de identidad
- Solicitud de verificador regional (SBTs de rol)

```bash
# Revocar MINTER_ROLE (emergencia)
node scripts/adminPdJCredentials.js revoke-minter --network celo --address <WALLET_COMPROMETIDA>

# Revocar credencial a usuario (desde backend con MINTER_ROLE)
# El contrato expone: revokeCredential(address account, uint256 tokenId, uint256 amount)
```

## 10. Emergencia — billetera minter comprometida

1. Revocar `MINTER_ROLE` inmediatamente:
   ```bash
   node scripts/adminPdJCredentials.js revoke-minter --network celo --address 0xCOMPROMETIDA
   node scripts/adminPdJCredentials.js revoke-minter --network base --address 0xCOMPROMETIDA
   ```
2. Rotar clave privada en `.env`
3. Otorgar `MINTER_ROLE` a la nueva billetera
4. Verificar `list-types` que no haya credenciales no autorizadas
5. Si se mintearon tokens indebidos, el backend llama `revokeCredential` para quemarlos

## 11. Integración con otros sistemas

### stable-sl

Consulta SBTs premium vía API de learn.tg (no on-chain):
```
GET https://learn.tg/api/users/{wallet}/premium-sbt-count
```

Tiers: 0 SBTs → 100 SLE/día, 1 SBT → 200 SLE/día, 2+ SBTs → 400 SLE/día.

### sivel.xyz

Usa `apps/nextjs/lib/credentials.ts` para interactuar con el contrato en ambas redes.

### Metadata

Cada sitio sirve `GET /api/credential/{tokenId}.json` con atributos (Collection, Type, Premium).
