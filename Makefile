.PHONY: all test backend frontend cli-run cli-compare demo-data build docker-up

all: test build

test:
	python -m pytest backend/tests -v

backend:
	python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm run dev

cli-run:
	python backend/cli.py --seed 42 --strategy greedy --size 25 --energy 220

cli-compare:
	python backend/cli.py --compare --runs 5

demo-data:
	python sample_data/generate_demo_data.py

build:
	cd frontend && npm run build

docker-up:
	docker compose up --build
