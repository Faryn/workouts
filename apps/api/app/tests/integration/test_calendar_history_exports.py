from datetime import date


def _auth(client, email, password):
    res = client.post('/v1/auth/login', json={'email': email, 'password': password})
    assert res.status_code == 200
    return {'Authorization': f"Bearer {res.json()['access_token']}"}


def test_calendar_feed_includes_strength_and_cardio(client, seeded_user, db_session):
    from app.models.cardio import CardioSession
    from app.models.exercise import Exercise
    from app.models.schedule import ScheduledWorkout
    from app.models.template import WorkoutTemplate, WorkoutTemplateExercise

    ex = Exercise(name='Bench Press', type='strength', owner_scope='global')
    db_session.add(ex)
    db_session.commit(); db_session.refresh(ex)

    tpl = WorkoutTemplate(owner_id=seeded_user.id, name='Upper A')
    db_session.add(tpl)
    db_session.commit(); db_session.refresh(tpl)

    tx = WorkoutTemplateExercise(template_id=tpl.id, exercise_id=ex.id, sort_order=1, planned_sets=3, planned_reps=5)
    db_session.add(tx)

    sw = ScheduledWorkout(athlete_id=seeded_user.id, template_id=tpl.id, date=date(2026, 3, 10), status='planned', source='api')
    db_session.add(sw)

    c = CardioSession(athlete_id=seeded_user.id, date=date(2026, 3, 11), type='running', duration_seconds=1800, distance=5.0)
    db_session.add(c)
    db_session.commit()

    headers = _auth(client, seeded_user.email, 'secret123')
    res = client.get(
        f'/v1/scheduled-workouts/calendar?athlete_id={seeded_user.id}&from_date=2026-03-09&to_date=2026-03-12',
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert any(x['kind'] == 'strength' for x in data)
    assert any(x['kind'] == 'cardio' for x in data)


def test_sessions_history_and_detail(client, seeded_user, db_session):
    from app.models.exercise import Exercise

    ex = Exercise(name='Squat', type='strength', owner_scope='global')
    db_session.add(ex)
    db_session.commit(); db_session.refresh(ex)

    headers = _auth(client, seeded_user.email, 'secret123')
    tpl = client.post('/v1/templates/', json={
        'name': 'Lower',
        'exercises': [
            {'exercise_id': ex.id, 'planned_sets': 1, 'planned_reps': 5, 'planned_weight': 100.0}
        ],
    }, headers=headers).json()

    started = client.post('/v1/sessions/start', json={'template_id': tpl['id']}, headers=headers)
    assert started.status_code == 200
    sid = started.json()['id']

    done = client.post(f'/v1/sessions/{sid}/finish', headers=headers)
    assert done.status_code == 200

    listed = client.get(f'/v1/sessions/?athlete_id={seeded_user.id}', headers=headers)
    assert listed.status_code == 200
    assert any(s['id'] == sid for s in listed.json())

    detail = client.get(f'/v1/sessions/{sid}', headers=headers)
    assert detail.status_code == 200
    assert detail.json()['id'] == sid
    assert len(detail.json()['logged_exercises']) == 1


def test_exports_csv_endpoints(client, seeded_user, db_session):
    from app.models.cardio import CardioSession
    from app.models.exercise import Exercise

    ex = Exercise(name='Deadlift', type='strength', owner_scope='global')
    db_session.add(ex)
    db_session.commit(); db_session.refresh(ex)

    headers = _auth(client, seeded_user.email, 'secret123')
    tpl = client.post('/v1/templates/', json={
        'name': 'Pull',
        'exercises': [
            {'exercise_id': ex.id, 'planned_sets': 1, 'planned_reps': 3, 'planned_weight': 120.0}
        ],
    }, headers=headers).json()

    started = client.post('/v1/sessions/start', json={'template_id': tpl['id']}, headers=headers).json()
    sid = started['id']
    le = started['logged_exercises'][0]['id']
    client.post(f'/v1/sessions/{sid}/sets', json={
        'logged_exercise_id': le,
        'set_number': 1,
        'actual_weight': 125.0,
        'actual_reps': 3,
        'status': 'done',
    }, headers=headers)
    client.post(f'/v1/sessions/{sid}/finish', headers=headers)

    cardio = CardioSession(athlete_id=seeded_user.id, date=date(2026, 3, 10), type='walking', duration_seconds=1200, distance=2.0)
    db_session.add(cardio)
    db_session.commit()

    s_csv = client.get(f'/v1/exports/sessions.csv?athlete_id={seeded_user.id}', headers=headers)
    assert s_csv.status_code == 200
    assert 'text/csv' in s_csv.headers['content-type']
    assert 'session_id' in s_csv.text

    e_csv = client.get(f'/v1/exports/exercise-history.csv?athlete_id={seeded_user.id}', headers=headers)
    assert e_csv.status_code == 200
    assert 'exercise_name' in e_csv.text

    c_csv = client.get(f'/v1/exports/cardio.csv?athlete_id={seeded_user.id}', headers=headers)
    assert c_csv.status_code == 200
    assert 'duration_seconds' in c_csv.text
