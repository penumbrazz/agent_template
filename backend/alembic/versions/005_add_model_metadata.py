"""add model metadata columns

Revision ID: 005
Revises: 004
Create Date: 2026-06-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '005'
down_revision: Union[str, Sequence[str], None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "llm_models",
        sa.Column("model_type", sa.String(20), nullable=False, server_default="llm"),
    )
    op.add_column(
        "llm_models",
        sa.Column("context_length", sa.Integer(), nullable=True),
    )
    op.add_column(
        "llm_models",
        sa.Column("max_output_tokens", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("llm_models", "max_output_tokens")
    op.drop_column("llm_models", "context_length")
    op.drop_column("llm_models", "model_type")
