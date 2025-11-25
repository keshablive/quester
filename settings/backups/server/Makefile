# Makefile for Quester Server
.PHONY: help run test seed-badges seed-badges-force clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

run: ## Run the server
	go run cmd/server/main.go

test: ## Run all tests
	go test ./... -v

test-unit: ## Run unit tests only
	go test ./tests/unit/... -v

test-integration: ## Run integration tests only
	go test ./tests/integration/... -v

test-contract: ## Run contract tests only
	go test ./tests/contract/... -v

test-coverage: ## Run tests with coverage
	go test ./... -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

seed-badges: ## Seed initial badge data (tenant_id=1)
	go run scripts/seed/badges.go

seed-badges-force: ## Force re-seed badges (delete and recreate)
	SEED_FORCE=true go run scripts/seed/badges.go

seed-badges-tenant: ## Seed badges for specific tenant (usage: make seed-badges-tenant TENANT_ID=2)
	SEED_TENANT_ID=$(TENANT_ID) go run scripts/seed/badges.go

build: ## Build the server binary
	go build -o bin/server cmd/server/main.go

build-windows: ## Build for Windows
	GOOS=windows GOARCH=amd64 go build -o server.exe cmd/server/main.go

clean: ## Clean build artifacts
	rm -rf bin/
	rm -f coverage.out coverage.html
	rm -f server.exe

lint: ## Run golangci-lint
	golangci-lint run

fmt: ## Format Go code
	go fmt ./...

# ============================================================================
# Feature #002: Property & Classified Ads
# ============================================================================

db-setup: ## Setup database with Docker Compose
	docker-compose up -d postgres redis
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 5
	@echo "Running migrations..."
	$(MAKE) db-migrate

db-migrate: ## Run all migrations
	docker-compose exec -T postgres psql -U quester_user -d quester_db -f /docker-entrypoint-initdb.d/009_create_property_tables.up.sql
	docker-compose exec -T postgres psql -U quester_user -d quester_db -f /docker-entrypoint-initdb.d/010_create_classified_ads.up.sql
	@echo "✅ Migrations completed"

db-migrate-down: ## Rollback migrations
	docker-compose exec -T postgres psql -U quester_user -d quester_db -f /docker-entrypoint-initdb.d/010_create_classified_ads.down.sql
	docker-compose exec -T postgres psql -U quester_user -d quester_db -f /docker-entrypoint-initdb.d/009_create_property_tables.down.sql
	@echo "✅ Migrations rolled back"

db-status: ## Check database tables
	docker-compose exec postgres psql -U quester_user -d quester_db -c "\dt"

db-shell: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U quester_user -d quester_db

redis-shell: ## Open Redis CLI
	docker-compose exec redis redis-cli

docker-up: ## Start all services (PostgreSQL + Redis)
	docker-compose up -d
	@echo "✅ Services started"
	@echo "PostgreSQL: localhost:5432"
	@echo "Redis: localhost:6379"
	@echo "Redis Commander: http://localhost:8081"

docker-down: ## Stop all services
	docker-compose down
	@echo "✅ Services stopped"

docker-logs: ## View service logs
	docker-compose logs -f

docker-clean: ## Remove all containers and volumes
	docker-compose down -v
	@echo "✅ Containers and volumes removed"

test-api: ## Test Feature #002 API endpoints
	@chmod +x test-api-endpoints.sh
	./test-api-endpoints.sh

server-dev: ## Run server with live reload (requires air)
	air

server-prod: ## Run server in production mode
	ENV=production ./server.exe

setup: ## Complete setup (Docker + Migrations + Build)
	@echo "🚀 Setting up Quester Server..."
	$(MAKE) docker-up
	@sleep 5
	$(MAKE) db-migrate
	$(MAKE) build-windows
	@echo "✅ Setup complete! Run 'make server-dev' to start"

help-feature002: ## Show Feature #002 specific commands
	@echo "Feature #002: Property & Classified Ads"
	@echo "========================================"
	@echo ""
	@echo "Setup Commands:"
	@echo "  make setup           - Complete setup (recommended for first time)"
	@echo "  make db-setup        - Setup database only"
	@echo "  make db-migrate      - Run migrations"
	@echo ""
	@echo "Development Commands:"
	@echo "  make docker-up       - Start PostgreSQL + Redis"
	@echo "  make server-dev      - Run server with hot reload"
	@echo "  make test-api        - Test all API endpoints"
	@echo ""
	@echo "Database Commands:"
	@echo "  make db-shell        - PostgreSQL CLI"
	@echo "  make db-status       - List tables"
	@echo "  make redis-shell     - Redis CLI"
	@echo ""
	@echo "Cleanup Commands:"
	@echo "  make docker-down     - Stop services"
	@echo "  make docker-clean    - Remove all containers"
	@echo "  make clean           - Clean build artifacts"

migrate-up: ## Run database migrations
	@echo "Migrations are run automatically on server start"

migrate-create: ## Create a new migration (usage: make migrate-create NAME=create_users)
	@if [ -z "$(NAME)" ]; then \
		echo "Error: NAME is required. Usage: make migrate-create NAME=create_users"; \
		exit 1; \
	fi
	@echo "Creating migration: $(NAME)"
	@touch internal/migrations/$(shell date +%Y%m%d%H%M%S)_$(NAME).up.sql
	@touch internal/migrations/$(shell date +%Y%m%d%H%M%S)_$(NAME).down.sql
	@echo "Created migration files in internal/migrations/"

docker-up: ## Start Docker services (PostgreSQL, Redis)
	docker-compose up -d

docker-down: ## Stop Docker services
	docker-compose down

docker-logs: ## View Docker logs
	docker-compose logs -f

dev: docker-up ## Start dev environment (Docker + Server)
	@echo "Waiting for database to be ready..."
	@sleep 3
	$(MAKE) run
