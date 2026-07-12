from sqlmodel import Field, SQLModel
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select, event
import uuid
import jwt
from os import environ
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / '.env')

JWT_SECRET = environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET environment variable is not set. "
        "Copy api/.env.example to api/.env and set a secure random value."
    )
JWT_ALGO = environ.get('JWT_ALGO', 'HS256')


class User(SQLModel, table=True):
    userId: str | None = Field(default=None, primary_key=True)
    first_name: str
    last_name: str
    email: str
    password: str


class Room(SQLModel, table=True):
    roomId: str | None = Field(default=None, primary_key=True)
    userId: str | None = Field(default=None, foreign_key="user.userId", ondelete="SET NULL")
    roomname: str
    topic: str = Field(default=None)
    prompt: str = Field(default=None)


DATABASE_URL = environ.get("DATABASE_URL", "sqlite+aiosqlite:///aiTutordb.db")
print(f"🔍 Using DATABASE_URL: {DATABASE_URL}")

connect_args = {}
if DATABASE_URL.startswith("postgresql"):
    # Required if you're using Supabase's Transaction pooler (port 6543).
    # Safe to leave in even for direct/session connections.
    connect_args = {"statement_cache_size": 0}

engine = create_async_engine(DATABASE_URL, echo=True, connect_args=connect_args)

if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def add_user(first_name: str, last_name: str, email: str, password: str):
    myUser = User(
        userId=uuid.uuid4().hex,
        first_name=first_name,
        last_name=last_name,
        email=email,
        password=password,
    )
    async with AsyncSession(engine) as session:
        try:
            session.add(myUser)
            await session.commit()
            await session.refresh(myUser)
            return {"msg": "Success", "status": "success"}
        except Exception:
            return {"msg": "Some problem while signing up", "status": "error"}


async def check_exists(email: str, password: str = ""):
    async with AsyncSession(engine) as session:
        statement = select(User).where(User.email == email).where(User.password == password)
        results = await session.execute(statement)
        users = results.scalars().all()
        if len(users) == 1:
            return True, list(users)
        return False, list(users)


async def add_room(token: str, prompt: str, roomname: str, topic: str):
    room_id = uuid.uuid4().hex
    decoded_payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    async with AsyncSession(engine) as session:
        statement = select(User).where(User.email == decoded_payload['email'])
        results = await session.execute(statement)
        user = results.scalars().first()
        if not user:
            return {"msg": "User not found", "status": "error"}
        userId = user.userId

        print("The user id is", userId)

        myRoom = Room(
            roomId=room_id,
            roomname=roomname,
            prompt=prompt,
            userId=userId,
            topic=topic,
        )

        try:
            session.add(myRoom)
            await session.commit()
            await session.refresh(myRoom)
            return {"msg": "Success", "status": "success", "room_id": room_id}
        except Exception as e:
            return {"msg": "Some problem while adding room", "status": str(e)}


async def get_rooms(token: str = None, userId: str = None):
    async with AsyncSession(engine) as session:
        fetched_userId = None

        if token:
            decoded_payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
            statement = select(User).where(User.email == decoded_payload['email'])
            results = await session.execute(statement)
            users = results.scalars().all()
            print("The results are", users)
            if users:
                fetched_userId = users[0].userId
        elif userId:
            fetched_userId = userId

        statement = select(Room).where(Room.userId == fetched_userId)
        results = await session.execute(statement)
        rooms = results.scalars().all()
        records = []
        for room in rooms:
            records.append({
                "roomId": room.roomId,
                "roomname": room.roomname,
                "topic": room.topic or '',
                "prompt": room.prompt or '',
            })

        return records


async def delete_room(token: str, room_id: str):
    async with AsyncSession(engine) as session:
        decoded_payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        statement = select(User).where(User.email == decoded_payload['email'])
        results = await session.execute(statement)
        user = results.scalars().first()
        if not user:
            return {"status": "error", "msg": "User not found"}
        userId = user.userId

        room_statement = select(Room).where(Room.roomId == room_id, Room.userId == userId)
        results = await session.execute(room_statement)
        room = results.scalars().first()
        if not room:
            return {"status": "error", "msg": "Room not found or unauthorized"}
        await session.delete(room)
        await session.commit()
        return {"status": "success", "msg": "Room deleted"}


async def get_rooms_by_id(id: str):
    async with AsyncSession(engine) as session:
        statement = select(Room).where(Room.roomId == id)
        results = await session.execute(statement)
        room_obj = results.scalars().first()

        if room_obj is not None:
            return {
                "roomId": room_obj.roomId,
                "roomname": room_obj.roomname,
                "topic": room_obj.topic or '',
                "prompt": room_obj.prompt or '',
            }
        else:
            return {"error": "Room not found"}
