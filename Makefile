.PHONY: start stop build backup logs setup dev-backend dev-frontend

start:
	docker compose up -d

stop:
	docker compose down

build:
	docker compose build

backup:
	@mkdir -p ./data/backups
	@cp ./data/vaultix.db ./data/backups/vaultix_backup_$(shell date +%Y%m%d_%H%M%S).db
	@echo "Backup created in ./data/backups/"

logs:
	docker compose logs -f

setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		python3 -c "import secrets; f=open('.env','a'); f.write('JWT_SECRET=' + secrets.token_hex(32) + '\n'); f.write('DB_KEY=' + secrets.token_hex(32) + '\n'); f.close()"; \
		echo ".env created with generated secrets"; \
	else \
		echo ".env already exists, skipping"; \
	fi

dev-backend:
	cd backend && pip install -r requirements.txt && uvicorn main:app --reload --host 127.0.0.1 --port 8000

dev-frontend:
	cd frontend && npm install && npm run dev
