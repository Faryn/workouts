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
    body = create.json()
    assert body['error']['code'] == 'exercise_not_visible'
    assert other_owned.id in body['error']['message']



def test_template_patch_missing_template_returns_app_error(client, seeded_user):
    headers = _auth(client, seeded_user.email, 'secret123')
    patched = client.patch('/v1/templates/not-a-real-template', json={'name': 'Nope'}, headers=headers)
    assert patched.status_code == 404
    assert patched.json()['error']['code'] == 'template_not_found'


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


def test_schedule_pattern_interval_and_weekday(client, seeded_user):
    headers = _auth(client, seeded_user.email, 'secret123')
    t = client.post('/v1/templates/', json={'name': 'Pattern A'}, headers=headers).json()

    interval = client.post('/v1/scheduled-workouts/pattern', json={
        'athlete_id': seeded_user.id,
        'template_id': t['id'],
        'start_date': '2026-03-01',
        'end_date': '2026-03-07',
        'pattern_type': 'interval_days',
        'interval_days': 2,
    }, headers=headers)
    assert interval.status_code == 200
    interval_dates = [x['date'] for x in interval.json()]
    assert interval_dates == ['2026-03-01', '2026-03-03', '2026-03-05', '2026-03-07']

    weekday = client.post('/v1/scheduled-workouts/pattern', json={
        'athlete_id': seeded_user.id,
        'template_id': t['id'],
        'start_date': '2026-03-01',
        'end_date': '2026-03-20',
        'pattern_type': 'weekday',
        'weekday': 'tuesday',
    }, headers=headers)
    assert weekday.status_code == 200
    weekday_dates = [x['date'] for x in weekday.json()]
    assert weekday_dates == ['2026-03-03', '2026-03-10', '2026-03-17']



def test_schedule_bulk_move_skip_and_replace_template(client, seeded_user):
    headers = _auth(client, seeded_user.email, 'secret123')
    original = client.post('/v1/templates/', json={'name': 'Bulk Original'}, headers=headers).json()
    replacement = client.post('/v1/templates/', json={'name': 'Bulk Replacement'}, headers=headers).json()

    for day in ['2026-03-05', '2026-03-06', '2026-03-07']:
        created = client.post('/v1/scheduled-workouts/', json={
            'athlete_id': seeded_user.id,
            'template_id': original['id'],
            'date': day,
        }, headers=headers)
        assert created.status_code == 200

    moved = client.post('/v1/scheduled-workouts/bulk/move', json={
        'athlete_id': seeded_user.id,
        'from_date': '2026-03-05',
        'to_date': '2026-03-06',
        'shift_days': 7,
    }, headers=headers)
    assert moved.status_code == 200
    moved_body = moved.json()
    assert moved_body['matched_count'] == 2
    assert moved_body['created'] == []
    assert [x['date'] for x in moved_body['updated']] == ['2026-03-12', '2026-03-13']

    replaced = client.post('/v1/scheduled-workouts/bulk/replace-template', json={
        'athlete_id': seeded_user.id,
        'from_date': '2026-03-12',
        'to_date': '2026-03-13',
        'template_id': replacement['id'],
    }, headers=headers)
    assert replaced.status_code == 200
    replaced_body = replaced.json()
    assert replaced_body['matched_count'] == 2
    assert len(replaced_body['updated']) == 2
    assert len(replaced_body['created']) == 2
    assert all(x['status'] == 'skipped' for x in replaced_body['updated'])
    assert all(x['template_id'] == replacement['id'] and x['status'] == 'planned' for x in replaced_body['created'])

    skipped = client.post('/v1/scheduled-workouts/bulk/skip', json={
        'athlete_id': seeded_user.id,
        'from_date': '2026-03-07',
        'to_date': '2026-03-13',
    }, headers=headers)
    assert skipped.status_code == 200
    skipped_body = skipped.json()
    assert skipped_body['matched_count'] == 3
    assert skipped_body['created'] == []
    assert all(x['status'] == 'skipped' for x in skipped_body['updated'])

    listed = client.get(f'/v1/scheduled-workouts/?athlete_id={seeded_user.id}', headers=headers)
    assert listed.status_code == 200
    all_items = listed.json()
    planned_items = [x for x in all_items if x['status'] == 'planned']
    assert planned_items == []
    skipped_dates = sorted(x['date'] for x in all_items if x['status'] == 'skipped')
    assert skipped_dates == ['2026-03-07', '2026-03-12', '2026-03-12', '2026-03-13', '2026-03-13']



def test_schedule_bulk_range_validation_and_missing_template(client, seeded_user):
    headers = _auth(client, seeded_user.email, 'secret123')

    invalid_range = client.post('/v1/scheduled-workouts/bulk/skip', json={
        'athlete_id': seeded_user.id,
        'from_date': '2026-03-10',
        'to_date': '2026-03-09',
    }, headers=headers)
    assert invalid_range.status_code == 400
    assert invalid_range.json()['error']['code'] == 'invalid_date_range'

    missing_template = client.post('/v1/scheduled-workouts/bulk/replace-template', json={
        'athlete_id': seeded_user.id,
        'from_date': '2026-03-10',
        'to_date': '2026-03-11',
        'template_id': 'missing-template',
    }, headers=headers)
    assert missing_template.status_code == 404
    assert missing_template.json()['error']['code'] == 'template_not_found'
