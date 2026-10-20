.PHONY: all install env-check build test type check update-skills

# `all` vive en la raíz del workspace: una sola instalación para todas las apps.
all: install env-check build

install:
	pnpm i

# Avisos de variables de entorno renombradas (informativo, no falla).
env-check:
	@./apps/web/bin/m env:check || true

# Next 16 con Webpack: V8 crashea (Trace/BPT trap) con el límite de data por
# defecto en adJ/OpenBSD, así que el build sube a 7G.
build:
	@(cd apps/web && sh -c 'ulimit -d 7340032 && pnpm build')

test:
	@echo "Running tests in apps/web..."
	@(cd apps/web && $(MAKE) test)
	@echo "Running tests in apps/contracts..."
	@(cd apps/contracts && $(MAKE) test)
	@[ -d .agents/skills/celopedia-skill ] || echo "⚠️  Skills not installed. Run: make update-skills"

type:
	@echo "Type-checking in apps/web..."
	@(cd apps/web && $(MAKE) type)
	@echo "Type-checking in apps/contracts..."
	@(cd apps/contracts && $(MAKE) type)

# Estructura (REQ/53 y 56) y direcciones de despliegue (REQ/60).
# `contract:checkdeploy` necesita `deployments/PasosDeJesusCredentials/`, que es
# gitignored y sólo existe donde se desplegaron las credenciales.
check:
	@./apps/web/bin/m m:check
	@if [ -d apps/contracts/deployments/PasosDeJesusCredentials ]; then 		./apps/web/bin/m contract:checkdeploy; 	else 		echo "[SKIP] contract:checkdeploy: falta apps/contracts/deployments/PasosDeJesusCredentials (gitignored)"; 	fi

update-skills:
	npx skills add celo-org/celopedia-skills
