from datetime import datetime


def _auth(client, email, password):
    res = client.post('/v1/auth/login', json={'email': email, 'password': password})
    assert res.status_code == 200
    return {'Authorization': f"Bearer {res.json()['access_token']}"}


def test_cardio_create_and_list(client, seeded_user):
    headers = _auth(client, seeded_user.email, 'secret123')

    created = client.post(
        '/v1/cardio-sessions/',
        json={
            'athlete_id': seeded_user.id,
            'date': '2026-03-06',
            'type': 'running',
            'duration_seconds': 1800,
            'distance': 5.2,
            'notes': 'easy pace',
        },
        headers=headers,
    )
    assert created.status_code == 200

    listed = client.get(f'/v1/cardio-sessions/?athlete_id={seeded_user.id}', headers=headers)
    assert listed.status_code == 200
    assert any(x['type'] == 'running' for x in listed.json())


def test_weights_over_time_stats(client, seeded_user, db_session):
    from app.models.exercise import Exercise
    from app.models.session import LoggedExercise, LoggedSet, WorkoutSession

    ex = Exercise(name='Bench Press', type='strength', owner_scope='global')
    db_session.add(ex)
    db_session.commit()
    db_session.refresh(ex)

    s1 = WorkoutSession(athlete_id=seeded_user.id, status='completed')
    db_session.add(s1)
    db_session.commit()
    db_session.refresh(s1)
    s1.started_at = datetime(2026, 3, 1, 10, 0, 0)

    le1 = LoggedExercise(session_id=s1.id, exercise_id=ex.id, sort_order=1)
    db_session.add(le1)
    db_session.commit()
    db_session.refresh(le1)
    db_session.add(LoggedSet(logged_exercise_id=le1.id, set_number=1, actual_weight=80, actual_reps=5, status='done'))
    db_session.add(LoggedSet(logged_exercise_id=le1.id, set_number=2, actual_weight=82.5, actual_reps=4, status='done'))

    s2 = WorkoutSession(athlete_id=seeded_user.id, status='completed')
    db_session.add(s2)
    db_session.commit()
    db_session.refresh(s2)
    s2.started_at = datetime(2026, 3, 3, 10, 0, 0)
    le2 = LoggedExercise(session_id=s2.id, exercise_id=ex.id, sort_order=1)
    db_session.add(le2)
    db_session.commit()
    db_session.refresh(le2)
    db_session.add(LoggedSet(logged_exercise_id=le2.id, set_number=1, actual_weight=85, actual_reps=3, status='done'))
    db_session.commit()

    headers = _auth(client, seeded_user.email, 'secret123')
    res = client.get(
        f'/v1/stats/exercises/{ex.id}/weights-over-time?athlete_id={seeded_user.id}',
        headers=headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body['exercise_id'] == ex.id
    assert len(body['points']) >= 1
