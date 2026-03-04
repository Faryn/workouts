from datetime import date


def _auth(client, email, password):
    res = client.post('/v1/auth/login', json={'email': email, 'password': password})
    assert res.status_code == 200
    return {'Authorization': f"Bearer {res.json()['access_token']}"}


def test_trainer_to_athlete_workflow_with_export(client, seeded_user, seeded_trainer_and_assignment, db_session):
    from app.models.exercise import Exercise

    trainer, _ = seeded_trainer_and_assignment
    trainer_headers = _auth(client, trainer.email, 'secret123')
    athlete_headers = _auth(client, seeded_user.email, 'secret123')

    ex = Exercise(name='Bench Press', type='strength', owner_scope='global')
    db_session.add(ex)
    db_session.commit()
    db_session.refresh(ex)

    # Trainer creates template for assigned athlete scope
    created_tpl = client.post('/v1/templates/', json={
        'name': 'Upper A',
        'exercises': [
            {
                'exercise_id': ex.id,
                'planned_sets': 2,
                'planned_reps': 5,
                'planned_weight': 80.0,
            }
        ],
    }, headers=trainer_headers)
    assert created_tpl.status_code == 200
    tpl_id = created_tpl.json()['id']

    # Trainer schedules workout
    scheduled = client.post('/v1/scheduled-workouts/', json={
        'athlete_id': seeded_user.id,
        'template_id': tpl_id,
        'date': date(2026, 3, 6).isoformat(),
    }, headers=trainer_headers)
    assert scheduled.status_code == 200
    scheduled_id = scheduled.json()['id']

    # Athlete starts session from schedule and logs one set
    started = client.post('/v1/sessions/start', json={'scheduled_workout_id': scheduled_id}, headers=athlete_headers)
    assert started.status_code == 200
    session_id = started.json()['id']
    logged_exercise_id = started.json()['logged_exercises'][0]['id']

    logged = client.post(f'/v1/sessions/{session_id}/sets', json={
        'logged_exercise_id': logged_exercise_id,
        'set_number': 1,
        'actual_weight': 82.5,
        'actual_reps': 5,
        'status': 'done',
    }, headers=athlete_headers)
    assert logged.status_code == 200

    finished = client.post(f'/v1/sessions/{session_id}/finish', headers=athlete_headers)
    assert finished.status_code == 200
    assert finished.json()['status'] == 'completed'

    # Trainer can review athlete history
    hist = client.get(f'/v1/sessions/?athlete_id={seeded_user.id}', headers=trainer_headers)
    assert hist.status_code == 200
    assert any(x['id'] == session_id for x in hist.json())

    # CSV export available
    export = client.get(f'/v1/exports/sessions.csv?athlete_id={seeded_user.id}', headers=athlete_headers)
    assert export.status_code == 200
    body = export.text
    assert 'session_id' in body
    assert session_id in body
