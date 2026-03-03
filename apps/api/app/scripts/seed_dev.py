from app.core.db import SessionLocal
from app.models.user import User
from app.models.assignment import TrainerAssignment
from app.core.security import hash_password


def upsert_user(db, email: str, password: str, role: str):
    row = db.query(User).filter(User.email == email).first()
    if row:
        row.role = role
        row.active = True
        if password:
            row.password_hash = hash_password(password)
    else:
        row = User(email=email, password_hash=hash_password(password), role=role, active=True)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def main():
    db = SessionLocal()
    try:
        admin = upsert_user(db, "admin@example.com", "secret123", "admin")
        trainer = upsert_user(db, "trainer@example.com", "secret123", "trainer")
        athlete = upsert_user(db, "athlete@example.com", "secret123", "athlete")

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
        print(f"trainer : {trainer.email} / secret123")
        print(f"athlete : {athlete.email} / secret123")
    finally:
        db.close()


if __name__ == "__main__":
    main()
