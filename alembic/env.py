import os
import sys
from logging.config import fileConfig
from pathlib import Path
 
# Make sure `backend/` is importable when running from repo root
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
 
from alembic import context
from sqlalchemy import engine_from_config, pool
 
# ── Import your models so Alembic can see the schema ────────────
from backend.services.database_service import Base  # noqa: E402
# SecurityFinding, ComplianceStatus, PerformanceMetric are all on Base
 
target_metadata = Base.metadata
# ────────────────────────────────────────────────────────────────
 
config = context.config
 
if config.config_file_name is not None:
    fileConfig(config.config_file_name)
 
# Override the DB URL with the env var used by docker-compose
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set.\n"
        "Set it to: postgresql://postgres:password@db:5432/cybersecurity_db"
    )
 
config.set_main_option("sqlalchemy.url", DATABASE_URL)
 
 
def run_migrations_offline() -> None:
    """Generate SQL without a live DB connection (useful for review/audit)."""
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()
 
 
def run_migrations_online() -> None:
    """Apply migrations against the live Postgres database."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
 
 
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
 