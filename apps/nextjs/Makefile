
all:
	pnpm i
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

# ── E2E (REQ/66) ───────────────────────────────────────────────────────
# Targets export IPDES/PUERTOPRU/CHAIN_ID so a bare `bin/m test:e2e` (which
# defaults to production: learn.tg/443/42220) never hits the wrong site with.
E2E_ENV = IPDES=sivel.xyz PUERTOPRU=9001 CHAIN_ID=11142220

test-smoke:
	./bin/m test:e2e --smoke

test-e2e:
	$(E2E_ENV) ./bin/m test:e2e

test-e2e-spec:
	$(E2E_ENV) ./bin/m test:e2e "$(SPEC)"

test-e2e-retry:
	$(E2E_ENV) E2E_RETRIES=$${E2E_RETRIES:-2} ./bin/m test:e2e --retry $${E2E_RETRIES:-2}

test-e2e-summary:
	./bin/m test:e2e:summary $(LOGS)

