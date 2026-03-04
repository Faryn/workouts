def _auth(client, email, password):
    res = client.post('/v1/auth/login', json={'email': email, 'password': password})
    assert res.status_code == 200
    return {'Authorization': f"Bearer {res.json()['access_token']}"}


def test_templates_crud_owner_scoped_with_exercises(client, seeded_user, db_session):
    from app.models.exercise import Exercise

    bench = Exercise(name='Bench Press', type='strength', owner_scope='global')
    squat = Exercise(name='Squat', type='strength', owner_scope='global')
    db_session.add_all([bench, squat])
    db_session.commit()
    db_session.refresh(bench)
    db_session.refresh(squat)

    headers = _auth(client, seeded_user.email, 'secret123')

    create = client.post(
        '/v1/templates/',
        json={
            'name': 'Upper A',
            'notes': 'push focus',
            'exercises': [
                {
                    'exercise_id': bench.id,
                    'sort_order': 1,
                    'planned_sets': 3,
                    'planned_reps': 5,
                    'planned_weight': 80.0,
                    'rest_seconds': 120,
                },
                {
                    'exercise_id': squat.id,
                    'sort_order': 2,
                    'planned_sets': 2,
                    'planned_reps': 8,
                    'rest_seconds': 90,
                    'notes': 'light backoff',
                },
            ],
        },
        headers=headers,
    )
    assert create.status_code == 200
    created = create.json()
    tid = created['id']
    assert len(created['exercises']) == 2
    assert created['exercises'][0]['planned_reps'] == 5

    listed = client.get('/v1/templates/', headers=headers)
    assert listed.status_code == 200
    found = next(t for t in listed.json() if t['id'] == tid)
    assert len(found['exercises']) == 2

    patched = client.patch(
        f'/v1/templates/{tid}',
        json={
            'name': 'Upper A v2',
            'exercises': [
                {
                    'exercise_id': bench.id,
                    'sort_order': 1,
                    'planned_sets': 4,
                    'planned_reps': 4,
                    'planned_weight': 82.5,
                }
            ],
        },
        headers=headers,
    )
    assert patched.status_code == 200
    assert patched.json()['name'] == 'Upper A v2'
    assert len(patched.json()['exercises']) == 1
    assert patched.json()['exercises'][0]['planned_sets'] == 4

    deleted = client.delete(f'/v1/templates/{tid}', headers=headers)
    assert deleted.status_code == 200

    listed2 = client.get('/v1/templates/', headers=headers)
    assert all(t['id'] != tid for t in listed2.json())


def test_template_create_rejects_invisible_exercise(client, seeded_user, db_session):
    from app.models.exercise import Exercise

    other_owned = Exercise(
        name='Private Other Lift',
        type='strength',
        owner_scope='athlete',
        owner_id='someone-else',
    )
    db_session.add(other_owned)
    db_session.commit()
    db_session.refresh(other_owned)

    headers = _auth(client, seeded_user.email, 'secret123')
    create = client.post(
        '/v1/templates/',
        json={
            'name': 'Bad Template',
            'exercises': [
                {
                    'exercise_id': other_owned.id,
                    'planned_sets': 3,
                    'planned_reps': 5,
                }
            ],
        },
        headers=headers,
    )
    assert create.status_code == 400


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

    skip = client.post(f'/v1/scheduled-workouts/{sid}/skip', headers=headers)
    assert skip.status_code == 200
    assert skip.json()['status'] == 'skipped'

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
