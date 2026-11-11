"""
Unit Tests for Database Models & Async Session Operations
"""
import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy import select
from src.backend.core.database import Base, async_engine, async_session_factory
from src.backend.models import User, Exchange, Instrument, DailyPrice, Portfolio, Holding

@pytest.mark.asyncio
async def test_database_table_creation_and_crud():
    """Verify schema creation and basic relational entity persistence."""
    # Ensure tables exist
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        # 1. Create Exchange
        exchange = Exchange(
            mic_code="XNGS",
            name="NASDAQ - All Markets",
            country="United States",
            currency="USD",
            timezone="America/New_York"
        )
        session.add(exchange)
        await session.flush()

        # 2. Create Instrument
        instrument = Instrument(
            symbol="NVDA",
            exchange_mic="XNGS",
            company_name="NVIDIA Corporation",
            asset_type="Common Stock",
            trading_currency="USD",
            cik="0001045810"
        )
        session.add(instrument)
        await session.flush()

        # 3. Create DailyPrice record
        price = DailyPrice(
            instrument_id=instrument.id,
            trade_date=date(2026, 11, 10),
            open=Decimal("173.97"),
            high=Decimal("174.69"),
            low=Decimal("165.89"),
            close=Decimal("168.89"),
            volume=421638876,
            currency="USD",
            provider="twelve_data",
            freshness="END_OF_DAY"
        )
        session.add(price)

        # 4. Create User & Portfolio
        user = User(
            email="test_analyst@inkvector.com",
            hashed_password="mock_hashed_pw"
        )
        session.add(user)
        await session.flush()

        portfolio = Portfolio(
            user_id=user.id,
            name="Tech Growth Model",
            base_currency="USD"
        )
        session.add(portfolio)
        await session.flush()

        # 5. Create Holding
        holding = Holding(
            portfolio_id=portfolio.id,
            instrument_id=instrument.id,
            quantity=Decimal("50.000000"),
            average_cost_basis=Decimal("130.5000"),
            acquisition_date=date(2026, 1, 15),
            cost_currency="USD"
        )
        session.add(holding)
        await session.commit()

        # 6. Verify Queries
        query_inst = await session.execute(select(Instrument).where(Instrument.symbol == "NVDA"))
        fetched_inst = query_inst.scalar_one()
        assert fetched_inst.company_name == "NVIDIA Corporation"
        assert fetched_inst.cik == "0001045810"

        query_price = await session.execute(select(DailyPrice).where(DailyPrice.instrument_id == fetched_inst.id))
        fetched_price = query_price.scalar_one()
        assert fetched_price.close == Decimal("168.8900")
        assert fetched_price.volume == 421638876

        query_port = await session.execute(select(Portfolio).where(Portfolio.user_id == user.id))
        fetched_port = query_port.scalar_one()
        assert fetched_port.name == "Tech Growth Model"
