def _auth(client, email, password):
    res = client.post('/v1/auth/login', json={'email': email, 'password': password})
    assert res.status_code == 200
    return {'Authorization': f"Bearer {res.json()['access_token']}"}


def test_assigned_athletes_endpoint(client, seeded_user, seeded_trainer_and_assignment):
    trainer, _ = seeded_trainer_and_assignment
    trainer_headers = _auth(client, trainer.email, 'secret123')
    got = client.get('/v1/auth/assigned-athletes', headers=trainer_headers)
    assert got.status_code == 200
    assert any(x['id'] == seeded_user.id for x in got.json())


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


def test_trainer_can_read_assigned_athlete_sessions(client, seeded_user, seeded_trainer_and_assignment, db_session):
    from app.models.exercise import Exercise

    trainer, _ = seeded_trainer_and_assignment
    trainer_headers = _auth(client, trainer.email, 'secret123')
    athlete_headers = _auth(client, seeded_user.email, 'secret123')

    ex = Exercise(name='Bench', type='strength', owner_scope='global')
    db_session.add(ex)
    db_session.commit(); db_session.refresh(ex)

    tpl = client.post('/v1/templates/', json={
        'name': 'A1',
        'exercises': [{'exercise_id': ex.id, 'planned_sets': 1, 'planned_reps': 5}],
    }, headers=athlete_headers).json()

    started = client.post('/v1/sessions/start', json={'template_id': tpl['id']}, headers=athlete_headers)
    assert started.status_code == 200
    session_id = started.json()['id']

    listed = client.get(f'/v1/sessions/?athlete_id={seeded_user.id}', headers=trainer_headers)
    assert listed.status_code == 200
    assert any(s['id'] == session_id for s in listed.json())

    detail = client.get(f'/v1/sessions/{session_id}', headers=trainer_headers)
    assert detail.status_code == 200

    latest = client.get(f'/v1/sessions/in-progress?athlete_id={seeded_user.id}', headers=trainer_headers)
    assert latest.status_code == 200
    assert latest.json()['id'] == session_id


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

    denied_sessions = client.get(
        f'/v1/sessions/?athlete_id={unassigned.id}',
        headers=trainer_headers,
    )
    assert denied_sessions.status_code == 403

    denied_latest = client.get(
        f'/v1/sessions/in-progress?athlete_id={unassigned.id}',
        headers=trainer_headers,
    )
    assert denied_latest.status_code == 403
