import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.db import Base, get_db
from app.core.security import hash_password
from app.models.assignment import TrainerAssignment
from app.models.exercise import Exercise
from app.models.user import User


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def seeded_user(db_session):
    user = User(
        email="athlete@example.com",
        password_hash=hash_password("secret123"),
        role="athlete",
        active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def seeded_trainer_and_assignment(db_session, seeded_user):
    trainer = User(
        email="trainer@example.com",
        password_hash=hash_password("secret123"),
        role="trainer",
        active=True,
    )
    db_session.add(trainer)
    db_session.commit()
    db_session.refresh(trainer)

    link = TrainerAssignment(trainer_id=trainer.id, athlete_id=seeded_user.id)
    db_session.add(link)
    db_session.commit()
    return trainer, link


@pytest.fixture()
def seeded_exercises(db_session, seeded_user):
    rows = [
        Exercise(name="Bench Press", type="strength", owner_scope="global"),
        Exercise(
            name="My Custom Curl",
            type="strength",
            owner_scope="athlete",
            owner_id=seeded_user.id,
        ),
        Exercise(
            name="Other User Exercise",
            type="strength",
            owner_scope="athlete",
            owner_id="someone-else",
        ),
    ]
    db_session.add_all(rows)
    db_session.commit()
    return rows
