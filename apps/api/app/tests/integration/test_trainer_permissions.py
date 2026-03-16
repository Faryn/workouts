def _auth(client, email, password, athlete_ids=None):
    payload = {'email': email, 'password': password}
    if athlete_ids is not None:
        payload['athlete_ids'] = athlete_ids
    res = client.post('/v1/auth/login', json=payload)
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


def test_trainer_can_read_assigned_athlete_templates(client, seeded_user, seeded_trainer_and_assignment):
    trainer, _ = seeded_trainer_and_assignment
    trainer_headers = _auth(client, trainer.email, 'secret123')
    athlete_headers = _auth(client, seeded_user.email, 'secret123')

    created = client.post('/v1/templates/', json={'name': 'Athlete Plan'}, headers=athlete_headers)
    assert created.status_code == 200

    got = client.get(f'/v1/templates/?athlete_id={seeded_user.id}', headers=trainer_headers)
    assert got.status_code == 200
    names = [x['name'] for x in got.json()]
    assert 'Athlete Plan' in names


def test_athlete_can_read_assigned_trainer_templates(client, seeded_user, seeded_trainer_and_assignment, db_session):
    from app.models.exercise import Exercise

    trainer, _ = seeded_trainer_and_assignment
    trainer_headers = _auth(client, trainer.email, 'secret123')
    athlete_headers = _auth(client, seeded_user.email, 'secret123')

    trainer_ex = Exercise(
        name='Trainer Custom Bench',
        type='strength',
        owner_scope='trainer',
        owner_id=trainer.id,
    )
    db_session.add(trainer_ex)
    db_session.commit()
    db_session.refresh(trainer_ex)

    created = client.post('/v1/templates/', json={
        'name': 'Trainer Plan',
        'exercises': [{'exercise_id': trainer_ex.id, 'planned_sets': 3, 'planned_reps': 5}],
    }, headers=trainer_headers)
    assert created.status_code == 200

    got = client.get('/v1/templates/', headers=athlete_headers)
    assert got.status_code == 200
    plans = got.json()
    names = [x['name'] for x in plans]
    assert 'Trainer Plan' in names

    trainer_plan = next(x for x in plans if x['name'] == 'Trainer Plan')
    assert trainer_plan['exercises'][0]['exercise_name'] == 'Trainer Custom Bench'


def test_trainer_can_edit_assigned_athlete_template(client, seeded_user, seeded_trainer_and_assignment):
    trainer, _ = seeded_trainer_and_assignment
    trainer_headers = _auth(client, trainer.email, 'secret123')
    athlete_headers = _auth(client, seeded_user.email, 'secret123')

    created = client.post('/v1/templates/', json={'name': 'Athlete Editable'}, headers=athlete_headers)
    assert created.status_code == 200
    template_id = created.json()['id']

    patched = client.patch(f'/v1/templates/{template_id}', json={'name': 'Athlete Edited By Trainer'}, headers=trainer_headers)
    assert patched.status_code == 200
    assert patched.json()['name'] == 'Athlete Edited By Trainer'



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


def test_trainer_scoped_token_enforced_on_assigned_athlete_routes(client, seeded_user, seeded_trainer_and_assignment, db_session):
    from app.core.security import hash_password
    from app.models.user import User

    trainer, _ = seeded_trainer_and_assignment
    second_athlete = User(
        email='athlete-scope@example.com',
        password_hash=hash_password('secret123'),
        role='athlete',
        active=True,
    )
    db_session.add(second_athlete)
    db_session.commit()
    db_session.refresh(second_athlete)

    # assign trainer to second athlete too
    from app.models.assignment import TrainerAssignment

    db_session.add(TrainerAssignment(trainer_id=trainer.id, athlete_id=second_athlete.id))
    db_session.commit()

    scoped_headers = _auth(client, trainer.email, 'secret123', athlete_ids=[seeded_user.id])

    allowed = client.get(f'/v1/scheduled-workouts/?athlete_id={seeded_user.id}', headers=scoped_headers)
    assert allowed.status_code == 200

    blocked = client.get(f'/v1/scheduled-workouts/?athlete_id={second_athlete.id}', headers=scoped_headers)
    assert blocked.status_code == 403
    assert blocked.json()['error']['code'] == 'token_scope_forbidden'


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



def test_trainer_scoped_token_bulk_schedule_endpoints(client, seeded_user, seeded_trainer_and_assignment):
    trainer, _ = seeded_trainer_and_assignment
    athlete_headers = _auth(client, seeded_user.email, 'secret123')
    scoped_headers = _auth(client, trainer.email, 'secret123', athlete_ids=[seeded_user.id])

    original = client.post('/v1/templates/', json={'name': 'Trainer Bulk Original'}, headers=athlete_headers)
    assert original.status_code == 200
    original_template = original.json()

    replacement = client.post('/v1/templates/', json={'name': 'Trainer Bulk Replacement'}, headers=athlete_headers)
    assert replacement.status_code == 200
    replacement_template = replacement.json()

    for day in ['2026-03-05', '2026-03-06']:
        created = client.post(
            '/v1/scheduled-workouts/',
            json={'athlete_id': seeded_user.id, 'template_id': original_template['id'], 'date': day},
            headers=athlete_headers,
        )
        assert created.status_code == 200

    moved = client.post(
        '/v1/scheduled-workouts/bulk/move',
        json={
            'athlete_id': seeded_user.id,
            'from_date': '2026-03-05',
            'to_date': '2026-03-06',
            'shift_days': 3,
        },
        headers=scoped_headers,
    )
    assert moved.status_code == 200
    assert moved.json()['matched_count'] == 2
    assert [x['date'] for x in moved.json()['updated']] == ['2026-03-08', '2026-03-09']

    replaced = client.post(
        '/v1/scheduled-workouts/bulk/replace-template',
        json={
            'athlete_id': seeded_user.id,
            'from_date': '2026-03-08',
            'to_date': '2026-03-09',
            'template_id': replacement_template['id'],
        },
        headers=scoped_headers,
    )
    assert replaced.status_code == 200
    assert replaced.json()['matched_count'] == 2
    assert len(replaced.json()['created']) == 2
    assert all(x['template_id'] == replacement_template['id'] for x in replaced.json()['created'])

    skipped = client.post(
        '/v1/scheduled-workouts/bulk/skip',
        json={
            'athlete_id': seeded_user.id,
            'from_date': '2026-03-08',
            'to_date': '2026-03-09',
        },
        headers=scoped_headers,
    )
    assert skipped.status_code == 200
    assert skipped.json()['matched_count'] == 2
    assert all(x['status'] == 'skipped' for x in skipped.json()['updated'])



def test_trainer_scoped_token_bulk_schedule_endpoints_forbid_out_of_scope_athlete(client, seeded_user, seeded_trainer_and_assignment, db_session):
    from app.core.security import hash_password
    from app.models.assignment import TrainerAssignment
    from app.models.user import User

    trainer, _ = seeded_trainer_and_assignment
    second_athlete = User(
        email='bulk-scope-athlete@example.com',
        password_hash=hash_password('secret123'),
        role='athlete',
        active=True,
    )
    db_session.add(second_athlete)
    db_session.commit()
    db_session.refresh(second_athlete)

    db_session.add(TrainerAssignment(trainer_id=trainer.id, athlete_id=second_athlete.id))
    db_session.commit()

    scoped_headers = _auth(client, trainer.email, 'secret123', athlete_ids=[seeded_user.id])

    for path, payload in [
        (
            '/v1/scheduled-workouts/bulk/move',
            {
                'athlete_id': second_athlete.id,
                'from_date': '2026-03-05',
                'to_date': '2026-03-06',
                'shift_days': 2,
            },
        ),
        (
            '/v1/scheduled-workouts/bulk/replace-template',
            {
                'athlete_id': second_athlete.id,
                'from_date': '2026-03-05',
                'to_date': '2026-03-06',
                'template_id': 'irrelevant-here',
            },
        ),
        (
            '/v1/scheduled-workouts/bulk/skip',
            {
                'athlete_id': second_athlete.id,
                'from_date': '2026-03-05',
                'to_date': '2026-03-06',
            },
        ),
    ]:
        denied = client.post(path, json=payload, headers=scoped_headers)
        assert denied.status_code == 403
        assert denied.json()['error']['code'] == 'token_scope_forbidden'
