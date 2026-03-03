from datetime import date


def _auth(client, email, password):
    res = client.post('/v1/auth/login', json={'email': email, 'password': password})
    assert res.status_code == 200
    return {'Authorization': f"Bearer {res.json()['access_token']}"}


def test_templates_crud_owner_scoped(client, seeded_user):
    headers = _auth(client, seeded_user.email, 'secret123')

    create = client.post('/v1/templates/', json={'name': 'Upper A', 'notes': 'push focus'}, headers=headers)
    assert create.status_code == 200
    tid = create.json()['id']

    listed = client.get('/v1/templates/', headers=headers)
    assert listed.status_code == 200
    assert any(t['id'] == tid for t in listed.json())

    patched = client.patch(f'/v1/templates/{tid}', json={'name': 'Upper A v2'}, headers=headers)
    assert patched.status_code == 200
    assert patched.json()['name'] == 'Upper A v2'

    deleted = client.delete(f'/v1/templates/{tid}', headers=headers)
    assert deleted.status_code == 200

    listed2 = client.get('/v1/templates/', headers=headers)
    assert all(t['id'] != tid for t in listed2.json())


def test_schedule_create_move_copy_for_own_items(client, seeded_user):
    headers = _auth(client, seeded_user.email, 'secret123')
    t = client.post('/v1/templates/', json={'name': 'Lower A'}, headers=headers).json()

    created = client.post('/v1/scheduled-workouts/', json={
        'athlete_id': seeded_user.id,
        'template_id': t['id'],
        'date': '2026-03-05'
    }, headers=headers)
    assert created.status_code == 200
    sid = created.json()['id']

    move = client.post(f'/v1/scheduled-workouts/{sid}/move', json={'to_date': '2026-03-06'}, headers=headers)
    assert move.status_code == 200
    assert move.json()['date'] == '2026-03-06'

    copy = client.post(f'/v1/scheduled-workouts/{sid}/copy', json={'to_date': '2026-03-07'}, headers=headers)
    assert copy.status_code == 200
    copied_id = copy.json()['id']
    assert copied_id != sid

    listed = client.get('/v1/scheduled-workouts/?athlete_id=' + seeded_user.id, headers=headers)
    assert listed.status_code == 200
    dates = {x['date'] for x in listed.json()}
    assert '2026-03-06' in dates
    assert '2026-03-07' in dates


def test_schedule_denies_other_athlete_write(client, seeded_user, db_session):
    from app.models.user import User
    from app.core.security import hash_password

    other = User(email='other@example.com', password_hash=hash_password('secret123'), role='athlete', active=True)
    db_session.add(other)
    db_session.commit(); db_session.refresh(other)

    headers = _auth(client, seeded_user.email, 'secret123')
    t = client.post('/v1/templates/', json={'name': 'Denied Plan'}, headers=headers).json()

    denied = client.post('/v1/scheduled-workouts/', json={
        'athlete_id': other.id,
        'template_id': t['id'],
        'date': '2026-03-05'
    }, headers=headers)
    assert denied.status_code == 403
