import asyncio
from sqlalchemy import select
from app.database import async_session_maker
from app.models import Script

async def check_scripts():
    async with async_session_maker() as session:
        result = await session.execute(select(Script))
        scripts = result.scalars().all()
        for s in scripts:
            print(f"ID: {s.id}, Name: {s.name}")

if __name__ == "__main__":
    asyncio.run(check_scripts())
