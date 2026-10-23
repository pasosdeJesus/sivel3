
all:
	./bin/m env:check
	pnpm i
	$(MAKE) eng-build
	sh -c 'ulimit -d 7340032 && pnpm build'

type:
	pnpm typecheck

type-check-tests:
	pnpm tsc --noEmit -p tsconfig.test.json

format:
	pnpm format

test:
	pnpm test

dev:
	./bin/dev

prod:
	sh -c 'ulimit -d 7340032 && pnpm build'
	./bin/start > prod.log 2>&1 &

# ── Engines (R-#68) ────────────────────────────────────────────────────
# Vendored engines (packages/generated/<motor>) are derived copies — like
# node_modules: regenerate with `eng-sync`, never edit by hand. The copies are taken
# from a **git ref** of `m` (PROVENANCE records kind/origin/ref/path, so the tree is
# reproducible without a local checkout); `packages/generated/*` are workspace
# packages (pnpm-workspace.yaml) so `generated-<motor>` imports resolve.
M_GIT ?= https://gitlab.com/pasosdeJesus/m.git
MSIP_TAG ?= v0.37.2
WALLET_TAG ?= wallet-v0.1.1
ENGINES = msip wallet
# Opcional: checkout local de `m` para medir drift contra las fuentes.
M_FROM ?=
FROM_ARG = $(if $(M_FROM),--from $(M_FROM),)

eng-sync:
	@for e in $(ENGINES); do \
	  case $$e in \
	    msip) ref=$(MSIP_TAG) ;; \
	    wallet) ref=$(WALLET_TAG) ;; \
	    *) ref=$(MSIP_TAG) ;; \
	  esac; \
	  ./bin/m eng:sync --vendor --prepare \
	    --from-git $(M_GIT)#$$ref --path packages/$$e \
	    --out packages/generated/$$e || exit 1; \
	done

# Compiles the vendored engines to their `dist/` (what `generated-<motor>/…`
# imports resolve to). `dist/` is ignored by the root `.gitignore`, so it must be
# built after `pnpm install` on a fresh checkout — hence it is part of `all` and `dev`.
eng-build:
	@for e in $(ENGINES); do pnpm exec tsc -b packages/generated/$$e; done

# Guard de las copias (R-#68). Se verifica **motor por motor**: sin argumento
# `eng:verify` también analiza `apps/web` como motor y reporta sus alias `@/*`
# (`UNDECLARED_IMPORT`), que son rutas del tsconfig de la app, no paquetes.
eng-verify:
	@for e in $(ENGINES); do ./bin/m eng:verify $$e; done

# Guard de conformidad (R-#68): drift de las copias, autocontención de tablas y
# carga real (`--runtime`), sin la conformidad de la BD (`--no-db`) porque el
# esquema de sivel3 es el Rails compartido y su drift con la base `msip` no se
# reconcilia a propósito. Ese drift se consulta aparte con `db-check`.
eng-check:
	./bin/m eng:check --runtime --no-db $(FROM_ARG)

db-check:
	-./bin/m eng:check $(FROM_ARG)

# ── E2E (REQ/66) ───────────────────────────────────────────────────────
# Targets export IPDES/PUERTOPRU/CHAIN_ID so a bare `bin/m test:e2e` (which
# defaults to production: learn.tg/443/42220) never hits the wrong site with.
E2E_ENV = IPDES=sivel.xyz PUERTOPRU=9001 CHAIN_ID=11142220

test-smoke:
	$(E2E_ENV) ./bin/m test:e2e --smoke

test-e2e:
	$(E2E_ENV) ./bin/m test:e2e

test-e2e-spec:
	$(E2E_ENV) ./bin/m test:e2e "$(SPEC)"

test-e2e-retry:
	$(E2E_ENV) E2E_RETRIES=$${E2E_RETRIES:-2} ./bin/m test:e2e --retry $${E2E_RETRIES:-2}

test-e2e-summary:
	./bin/m test:e2e:summary $(LOGS)

