def _auth(client, email, password):
    res = client.post('/v1/auth/login', json={'email': email, 'password': password})
    assert res.status_code == 200
    return {'Authorization': f"Bearer {res.json()['access_token']}"}


def test_trainer_can_read_assigned_athlete_schedule(client, seeded_user, seeded_trainer_and_assignment):
    trainer, _ = seeded_trainer_and_assignment
    trainer_headers = _auth(client, trainer.email, 'secret123')
    athlete_headers = _auth(client, seeded_user.email, 'secret123')

    t = client.post('/v1/templates/', json={'name': 'A1'}, headers=athlete_headers).json()
    c = client.post(
        '/v1/scheduled-workouts/',
        json={'athlete_id': seeded_user.id, 'template_id': t['id'], 'date': '2026-03-05'},
        headers=athlete_headers,
    )
    assert c.status_code == 200

    got = client.get(f'/v1/scheduled-workouts/?athlete_id={seeded_user.id}', headers=trainer_headers)
    assert got.status_code == 200
    assert len(got.json()) >= 1


def test_trainer_forbidden_for_unassigned_athlete(client, seeded_trainer_and_assignment, db_session):
    from app.core.security import hash_password
    from app.models.user import User

    trainer, _ = seeded_trainer_and_assignment
    unassigned = User(
        email='athlete2@example.com',
        password_hash=hash_password('secret123'),
        role='athlete',
        active=True,
    )
    db_session.add(unassigned)
    db_session.commit()
    db_session.refresh(unassigned)

    trainer_headers = _auth(client, trainer.email, 'secret123')
    denied = client.get(
        f'/v1/scheduled-workouts/?athlete_id={unassigned.id}',
        headers=trainer_headers,
    )
    assert denied.status_code == 403
    body = denied.json()
    assert body['error']['code'] == 'forbidden'
