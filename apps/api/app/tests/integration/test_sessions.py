from datetime import date


def _auth(client, email, password):
    res = client.post('/v1/auth/login', json={'email': email, 'password': password})
    assert res.status_code == 200
    return {'Authorization': f"Bearer {res.json()['access_token']}"}


def test_session_start_from_scheduled_copies_planned_sets(client, seeded_user, db_session):
    from app.models.exercise import Exercise
    from app.models.template import WorkoutTemplate, WorkoutTemplateExercise
    from app.models.schedule import ScheduledWorkout

    ex = Exercise(name='Bench Press', type='strength', owner_scope='global')
    db_session.add(ex); db_session.commit(); db_session.refresh(ex)

    tpl = WorkoutTemplate(owner_id=seeded_user.id, name='Upper A')
    db_session.add(tpl); db_session.commit(); db_session.refresh(tpl)

    tx = WorkoutTemplateExercise(
        template_id=tpl.id,
        exercise_id=ex.id,
        sort_order=1,
        planned_sets=3,
        planned_reps=5,
        planned_weight=80.0,
        rest_seconds=120,
    )
    db_session.add(tx); db_session.commit()

    sched = ScheduledWorkout(athlete_id=seeded_user.id, template_id=tpl.id, date=date(2026, 3, 5), status='planned', source='api')
    db_session.add(sched); db_session.commit(); db_session.refresh(sched)

    headers = _auth(client, seeded_user.email, 'secret123')
    start = client.post('/v1/sessions/start', json={'scheduled_workout_id': sched.id}, headers=headers)
    assert start.status_code == 200
    body = start.json()
    assert body['status'] == 'in_progress'
    assert len(body['logged_exercises']) == 1
    assert len(body['logged_exercises'][0]['sets']) == 3
    assert body['logged_exercises'][0]['sets'][0]['planned_reps'] == 5
    assert body['logged_exercises'][0]['sets'][0]['planned_weight'] == 80.0


def test_session_log_set_keeps_planned_and_stores_actual(client, seeded_user, db_session):
    from app.models.exercise import Exercise
    from app.models.template import WorkoutTemplate, WorkoutTemplateExercise

    ex = Exercise(name='Squat', type='strength', owner_scope='global')
    db_session.add(ex); db_session.commit(); db_session.refresh(ex)

    tpl = WorkoutTemplate(owner_id=seeded_user.id, name='Lower A')
    db_session.add(tpl); db_session.commit(); db_session.refresh(tpl)

    tx = WorkoutTemplateExercise(template_id=tpl.id, exercise_id=ex.id, sort_order=1, planned_sets=1, planned_reps=5, planned_weight=100.0)
    db_session.add(tx); db_session.commit()

    headers = _auth(client, seeded_user.email, 'secret123')
    start = client.post('/v1/sessions/start', json={'template_id': tpl.id}, headers=headers)
    assert start.status_code == 200
    session_id = start.json()['id']
    logged_exercise_id = start.json()['logged_exercises'][0]['id']

    log_set = client.post(f'/v1/sessions/{session_id}/sets', json={
        'logged_exercise_id': logged_exercise_id,
        'set_number': 1,
        'actual_weight': 102.5,
        'actual_reps': 4,
        'status': 'done'
    }, headers=headers)
    assert log_set.status_code == 200
    s = log_set.json()
    assert s['planned_weight'] == 100.0
    assert s['planned_reps'] == 5
    assert s['actual_weight'] == 102.5
    assert s['actual_reps'] == 4


def test_template_changes_do_not_mutate_existing_session_planned_values(client, seeded_user, db_session):
    from app.models.exercise import Exercise

    ex = Exercise(name='Overhead Press', type='strength', owner_scope='global')
    db_session.add(ex); db_session.commit(); db_session.refresh(ex)

    headers = _auth(client, seeded_user.email, 'secret123')
    created = client.post('/v1/templates/', json={
        'name': 'Press Day',
        'exercises': [
            {
                'exercise_id': ex.id,
                'planned_sets': 1,
                'planned_reps': 5,
                'planned_weight': 50.0,
            }
        ],
    }, headers=headers)
    assert created.status_code == 200
    tid = created.json()['id']

    started = client.post('/v1/sessions/start', json={'template_id': tid}, headers=headers)
    assert started.status_code == 200
    session_id = started.json()['id']
    logged_exercise_id = started.json()['logged_exercises'][0]['id']

    patch = client.patch(f'/v1/templates/{tid}', json={
        'exercises': [
            {
                'exercise_id': ex.id,
                'planned_sets': 1,
                'planned_reps': 3,
                'planned_weight': 60.0,
            }
        ]
    }, headers=headers)
    assert patch.status_code == 200

    set_log = client.post(f'/v1/sessions/{session_id}/sets', json={
        'logged_exercise_id': logged_exercise_id,
        'set_number': 1,
        'actual_weight': 52.5,
        'actual_reps': 5,
        'status': 'done',
    }, headers=headers)
    assert set_log.status_code == 200
    payload = set_log.json()
    assert payload['planned_reps'] == 5
    assert payload['planned_weight'] == 50.0


def test_session_finish_marks_scheduled_completed(client, seeded_user, db_session):
    from app.models.exercise import Exercise
    from app.models.template import WorkoutTemplate, WorkoutTemplateExercise
    from app.models.schedule import ScheduledWorkout

    ex = Exercise(name='Deadlift', type='strength', owner_scope='global')
    db_session.add(ex); db_session.commit(); db_session.refresh(ex)

    tpl = WorkoutTemplate(owner_id=seeded_user.id, name='Pull A')
    db_session.add(tpl); db_session.commit(); db_session.refresh(tpl)

    tx = WorkoutTemplateExercise(template_id=tpl.id, exercise_id=ex.id, sort_order=1, planned_sets=1, planned_reps=3, planned_weight=120.0)
    db_session.add(tx); db_session.commit()

    sched = ScheduledWorkout(athlete_id=seeded_user.id, template_id=tpl.id, date=date(2026, 3, 5), status='planned', source='api')
    db_session.add(sched); db_session.commit(); db_session.refresh(sched)

    headers = _auth(client, seeded_user.email, 'secret123')
    start = client.post('/v1/sessions/start', json={'scheduled_workout_id': sched.id}, headers=headers)
    session_id = start.json()['id']

    done = client.post(f'/v1/sessions/{session_id}/finish', headers=headers)
    assert done.status_code == 200
    assert done.json()['status'] == 'completed'
    assert done.json()['scheduled_workout_status'] == 'completed'
