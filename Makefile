.PHONY: test type

test:
	@echo "Running tests in apps/nextjs..."
	@(cd apps/nextjs && $(MAKE) test)
	@echo "Running tests in apps/hardhat..."
	@(cd apps/hardhat && $(MAKE) test)
	@[ -d .agents/skills/celopedia-skill ] || echo "⚠️  Skills not installed. Run: make update-skills"

type:
	@echo "Type-checking in apps/nextjs..."
	@(cd apps/nextjs && $(MAKE) type)
	@echo "Type-checking in apps/hardhat..."
	@(cd apps/hardhat && $(MAKE) type)

update-skills:
	npx skills add celo-org/celopedia-skills