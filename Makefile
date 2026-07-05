IMAGE ?= ghcr.io/autotests-dev/simulator
TAG   ?= local

.DEFAULT_GOAL := help
.PHONY: help install dev build preview fmt fmt-check lint typecheck validate test check \
        up down logs image push install-git-hooks clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies (frozen lockfile)
	pnpm install --frozen-lockfile

dev: ## Run the dev server (http://localhost:5173)
	pnpm dev

build: ## Build the static site to apps/site/dist
	pnpm build

preview: ## Serve the production build locally
	pnpm preview

fmt: ## Format the codebase with Prettier
	pnpm format

fmt-check: ## Check formatting without writing
	pnpm format:check

lint: ## Lint with ESLint
	pnpm lint

typecheck: ## Type-check every package
	pnpm typecheck

validate: ## Validate simulator.config against its schema
	pnpm validate

test: ## Run the Playwright suite
	pnpm test

check: fmt-check validate lint typecheck build test ## Run every gate (what CI runs)

up: ## Build and serve the container (http://localhost:8080)
	docker compose up -d --build

down: ## Stop and remove the container
	docker compose down

logs: ## Tail container logs
	docker compose logs -f

image: ## Build the production image ($(IMAGE):$(TAG))
	docker build -t $(IMAGE):$(TAG) .

push: image ## Push the production image to the registry
	docker push $(IMAGE):$(TAG)

install-git-hooks: ## Point git at the tracked hooks in .githooks/
	git config core.hooksPath .githooks
	@echo "Git hooks installed (core.hooksPath -> .githooks)."

clean: ## Remove build and test artifacts
	rm -rf apps/site/dist test-results playwright-report blob-report
