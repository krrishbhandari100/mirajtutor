from sqlmodel import Field, SQLModel, create_engine, Session, select, text
import uuid
import jwt

JWT_SECRET = '2f5ca9b6ff3f7dbf2dff679d9d8e5fd1d0dc9c2e447fbc8847041ce04b67b8d9b7de61eb11857cf13363b277a580e4a9a2d2'
JWT_ALGO = 'HS256'
SALT = '2f5ca9b6ff3f7dbf2dff679d9d8e5fd1d0dc9c2e447fbc8847041ce04b67b8d9b7de61eb11857cf13363b277a580e4a9a2d2'


class User(SQLModel, table=True):
    userId: str | None = Field(default=None, primary_key=True)
    first_name: str
    last_name: str
    email: str
    password: str


class Room(SQLModel, table=True):
    roomId: str | None = Field(default=None, primary_key=True)
    userId: int | None = Field(default=None, foreign_key="user.userId", ondelete="SET NULL")
    roomname: str
    topic: str = Field(default=None)    # Canonical room field (alias for previous subject)
    prompt: str = Field(default=None)   # AI tutor instructions


sqlite_url = "sqlite:///aiTutordb.db"
engine = create_engine(sqlite_url, echo=True)

SQLModel.metadata.create_all(engine)

with engine.connect() as connection:
    connection.execute(text("PRAGMA foreign_keys=ON"))  # SQLite only

    # Note: subject field has been removed; topic is the canonical field


def add_user(first_name: str, last_name: str, email: str, password: str):
    myUser = User(
        userId=uuid.uuid4().hex,
        first_name=first_name,
        last_name=last_name,
        email=email,
        password=password,
    )
    session = Session(engine)
    try:
        session.add(myUser)
        session.commit()
        session.refresh(myUser)
        return {"msg": "Success", "status": "success"}
    except Exception:
        return {"msg": "Some problem while signing up", "status": "error"}


def check_exists(email: str, password: str = ""):
    with Session(engine) as session:
        statement = select(User).where(User.email == email).where(User.password == password)
        results = session.exec(statement).all()
        res = []
        print(results)
        if len(results) == 1:
            for user in results:
                res.append(user)
            return True, res
        for user in results:
            res.append(user)
        return False, res


def add_room(token: str, prompt: str, roomname: str, topic: str):
    with Session(engine) as session:
        room_id = uuid.uuid4().hex
        decoded_payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        statement = select(User).where(User.email == decoded_payload['email'])
        results = session.exec(statement).all()
        userId = results[0].userId

        print("The user id is", userId)

        myRoom = Room(
            roomId=room_id,
            roomname=roomname,
            prompt=prompt,
            userId=userId,
            topic=topic,
        )

        # Open a fresh session for the write operation
        with Session(engine) as write_session:
            try:
                write_session.add(myRoom)
                write_session.commit()
                write_session.refresh(myRoom)
                return {"msg": "Success", "status": "success", "room_id": room_id}
            except Exception as e:
                return {"msg": "Some problem while adding room", "status": str(e)}


def get_rooms(token: str = None, userId: str = None):
    with Session(engine) as session:
        fetched_userId = None

        if token:
            decoded_payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
            statement = select(User).where(User.email == decoded_payload['email'])
            results = session.exec(statement).all()
            print("The results are", results)
            if len(results) > 0:
                fetched_userId = results[0].userId
        elif userId:
            fetched_userId = userId

        statement = select(Room).where(Room.userId == fetched_userId)
        results = session.exec(statement)
        records = []
        for room in results:
            records.append({
                "roomId": room.roomId,
                "roomname": room.roomname,
                "topic": room.topic or '',
                "prompt": room.prompt or '',
            })

        return records


def get_rooms_by_id(id: str):
    with Session(engine) as session:
        statement = select(Room).where(Room.roomId == id)
        results = session.exec(statement)
        room_obj = results.first()

        if room_obj is not None:
            return {
                "roomId": room_obj.roomId,
                "roomname": room_obj.roomname,
                "topic": room_obj.topic or '',
                "prompt": room_obj.prompt or '',
            }
        else:
            return {"error": "Room not found"}
