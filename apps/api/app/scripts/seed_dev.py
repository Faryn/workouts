from app.core.config import settings
from app.core.db import SessionLocal
from app.models.user import User
from app.models.assignment import TrainerAssignment
from app.core.security import hash_password


def upsert_user(db, email: str, password: str, role: str, name: str | None = None):
    row = db.query(User).filter(User.email == email).first()
    if row:
        row.role = role
        row.active = True
        if name is not None:
            row.name = name
        if password:
            row.password_hash = hash_password(password)
    else:
        row = User(email=email, name=name, password_hash=hash_password(password), role=role, active=True)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def main():
    db = SessionLocal()
    try:
        admin = upsert_user(db, "admin@example.com", "secret123", "admin", name="Admin")
        trainer = None
        athlete = None

        if settings.seed_default_trainer_and_athlete:
            trainer = upsert_user(db, "trainer@example.com", "secret123", "trainer", name="Trainer")
            athlete = upsert_user(db, "athlete@example.com", "secret123", "athlete", name="Athlete")

            link = (
                db.query(TrainerAssignment)
                .filter(TrainerAssignment.trainer_id == trainer.id, TrainerAssignment.athlete_id == athlete.id)
                .first()
            )
            if not link:
                db.add(TrainerAssignment(trainer_id=trainer.id, athlete_id=athlete.id))
                db.commit()

        print("Seed complete")
        print(f"admin   : {admin.email} / secret123")
        if trainer and athlete:
            print(f"trainer : {trainer.email} / secret123")
            print(f"athlete : {athlete.email} / secret123")
        else:
            print("trainer : skipped by config")
            print("athlete : skipped by config")
    finally:
        db.close()


if __name__ == "__main__":
    main()
