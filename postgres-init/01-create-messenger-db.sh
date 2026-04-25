#!/bin/bash
# This script runs inside the postgres container on first startup.
# It creates the kayi_messenger database if it does not already exist.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  SELECT 'CREATE DATABASE kayi_messenger'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kayi_messenger')\gexec
EOSQL

echo "[init-db] kayi_messenger database ready."
