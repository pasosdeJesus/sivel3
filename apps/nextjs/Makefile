
all:
	pnpm i
	pnpm build

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

