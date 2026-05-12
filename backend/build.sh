#!/usr/bin/env bash
# Build del servicio web Django en Render (rootDir = backend).
# Build command sugerido: bash build.sh
set -euo pipefail

cd "$(dirname "$0")"

echo "==> [backend] Python: $(python --version 2>&1)"
echo "==> [backend] Upgrading pip"
python -m pip install --upgrade pip

echo "==> [backend] Installing requirements.txt"
pip install -r requirements.txt

echo "==> [backend] Installing gunicorn"
pip install "gunicorn==23.0.0"

echo "==> [backend] makemigrations --noinput"
# En Render el FS del build es efímero: migraciones nuevas no van al repo. Sigue siendo el flujo recomendado: makemigrations en local + commit.
python manage.py makemigrations --noinput

echo "==> [backend] migrate --noinput (requiere DATABASE_URL / Postgres enlazado en Render)"
python manage.py migrate --noinput

echo "==> [backend] Build OK"
