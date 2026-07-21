from datetime import date, datetime, timedelta, timezone


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
    assert body['version'] == 1
    assert len(body['logged_exercises']) == 1
    assert len(body['logged_exercises'][0]['sets']) == 3
    assert body['logged_exercises'][0]['sets'][0]['planned_reps'] == 5
    assert body['logged_exercises'][0]['sets'][0]['planned_weight'] == 80.0
    assert body['logged_exercises'][0]['sets'][0]['status'] == 'pending'


def test_duplicate_session_start_reuses_existing_for_same_scheduled_workout(client, seeded_user, db_session):
    from app.models.exercise import Exercise
    from app.models.template import WorkoutTemplate, WorkoutTemplateExercise
    from app.models.schedule import ScheduledWorkout

    ex = Exercise(name='Squat', type='strength', owner_scope='global')
    db_session.add(ex); db_session.commit(); db_session.refresh(ex)

    tpl = WorkoutTemplate(owner_id=seeded_user.id, name='Lower A')
    db_session.add(tpl); db_session.commit(); db_session.refresh(tpl)
    db_session.add(WorkoutTemplateExercise(template_id=tpl.id, exercise_id=ex.id, sort_order=1, planned_sets=1, planned_reps=5, planned_weight=100.0))
    db_session.commit()

    sched = ScheduledWorkout(athlete_id=seeded_user.id, template_id=tpl.id, date=date(2026, 3, 5), status='planned', source='api')
    db_session.add(sched); db_session.commit(); db_session.refresh(sched)

    headers = _auth(client, seeded_user.email, 'secret123')
    first = client.post('/v1/sessions/start', json={'scheduled_workout_id': sched.id}, headers=headers)
    second = client.post('/v1/sessions/start', json={'scheduled_workout_id': sched.id}, headers=headers)
    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()['id'] == first.json()['id']


def test_untouched_pending_sets_do_not_count_as_done(client, seeded_user, db_session):
    from app.models.exercise import Exercise
    from app.models.template import WorkoutTemplate, WorkoutTemplateExercise

    ex = Exercise(name='Row', type='strength', owner_scope='global')
    db_session.add(ex); db_session.commit(); db_session.refresh(ex)

    tpl = WorkoutTemplate(owner_id=seeded_user.id, name='Row Day')
    db_session.add(tpl); db_session.commit(); db_session.refresh(tpl)
    db_session.add(WorkoutTemplateExercise(template_id=tpl.id, exercise_id=ex.id, sort_order=1, planned_sets=2, planned_reps=8, planned_weight=50.0))
    db_session.commit()

    headers = _auth(client, seeded_user.email, 'secret123')
    start = client.post('/v1/sessions/start', json={'template_id': tpl.id}, headers=headers)
    assert start.status_code == 200
    body = start.json()
    statuses = [st['status'] for st in body['logged_exercises'][0]['sets']]
    assert statuses == ['pending', 'pending']


def test_session_start_rejects_another_athletes_private_template(client, seeded_user, db_session):
    from app.core.security import hash_password
    from app.models.exercise import Exercise
    from app.models.template import WorkoutTemplate, WorkoutTemplateExercise
    from app.models.user import User

    other = User(email='other@example.com', password_hash=hash_password('secret123'), role='athlete', active=True)
    ex = Exercise(name='Private Lift', type='strength', owner_scope='global')
    db_session.add_all([other, ex]); db_session.commit(); db_session.refresh(other); db_session.refresh(ex)
    private_template = WorkoutTemplate(owner_id=other.id, name='Private Program')
    db_session.add(private_template); db_session.commit(); db_session.refresh(private_template)
    db_session.add(WorkoutTemplateExercise(
        template_id=private_template.id,
        exercise_id=ex.id,
        sort_order=1,
        planned_sets=1,
        planned_reps=5,
    ))
    db_session.commit()

    headers = _auth(client, seeded_user.email, 'secret123')
    response = client.post('/v1/sessions/start', json={'template_id': private_template.id}, headers=headers)
    assert response.status_code == 404
    assert response.json()['error']['code'] == 'template_not_found'


def test_duplicate_session_start_blocks_new_session_when_other_in_progress_exists(client, seeded_user, db_session):
    from app.models.exercise import Exercise
    from app.models.template import WorkoutTemplate, WorkoutTemplateExercise

    ex1 = Exercise(name='Squat', type='strength', owner_scope='global')
    ex2 = Exercise(name='Bench', type='strength', owner_scope='global')
    db_session.add_all([ex1, ex2]); db_session.commit(); db_session.refresh(ex1); db_session.refresh(ex2)

    tpl1 = WorkoutTemplate(owner_id=seeded_user.id, name='Lower A')
    tpl2 = WorkoutTemplate(owner_id=seeded_user.id, name='Upper A')
    db_session.add_all([tpl1, tpl2]); db_session.commit(); db_session.refresh(tpl1); db_session.refresh(tpl2)
    db_session.add_all([
        WorkoutTemplateExercise(template_id=tpl1.id, exercise_id=ex1.id, sort_order=1, planned_sets=1, planned_reps=5, planned_weight=100.0),
        WorkoutTemplateExercise(template_id=tpl2.id, exercise_id=ex2.id, sort_order=1, planned_sets=1, planned_reps=5, planned_weight=80.0),
    ])
    db_session.commit()

    headers = _auth(client, seeded_user.email, 'secret123')
    first = client.post('/v1/sessions/start', json={'template_id': tpl1.id}, headers=headers)
    blocked = client.post('/v1/sessions/start', json={'template_id': tpl2.id}, headers=headers)
    assert first.status_code == 200
    assert blocked.status_code == 409
    assert blocked.json()['error']['code'] == 'session_already_in_progress'


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
    start_body = start.json()
    session_id = start_body['id']
    logged_exercise_id = start_body['logged_exercises'][0]['id']

    log_set = client.post(f'/v1/sessions/{session_id}/sets', json={
        'logged_exercise_id': logged_exercise_id,
        'set_number': 1,
        'actual_weight': 102.5,
        'actual_reps': 4,
        'status': 'done',
        'session_version': start_body['version'],
    }, headers=headers)
    assert log_set.status_code == 200
    s = log_set.json()
    assert s['planned_weight'] == 100.0
    assert s['planned_reps'] == 5
    assert s['actual_weight'] == 102.5
    assert s['actual_reps'] == 4
    assert s['session_version'] == 2


def test_session_rejects_stale_write_versions(client, seeded_user, db_session):
    from app.models.exercise import Exercise
    from app.models.template import WorkoutTemplate, WorkoutTemplateExercise

    ex = Exercise(name='Press', type='strength', owner_scope='global')
    db_session.add(ex); db_session.commit(); db_session.refresh(ex)
    tpl = WorkoutTemplate(owner_id=seeded_user.id, name='Press Day')
    db_session.add(tpl); db_session.commit(); db_session.refresh(tpl)
    db_session.add(WorkoutTemplateExercise(template_id=tpl.id, exercise_id=ex.id, sort_order=1, planned_sets=1, planned_reps=5, planned_weight=40.0))
    db_session.commit()

    headers = _auth(client, seeded_user.email, 'secret123')
    start = client.post('/v1/sessions/start', json={'template_id': tpl.id}, headers=headers).json()
    session_id = start['id']
    logged_exercise_id = start['logged_exercises'][0]['id']

    ok = client.post(f'/v1/sessions/{session_id}/sets', json={
        'logged_exercise_id': logged_exercise_id,
        'set_number': 1,
        'actual_weight': 42.5,
        'actual_reps': 5,
        'status': 'done',
        'session_version': start['version'],
    }, headers=headers)
    assert ok.status_code == 200

    stale = client.post(f'/v1/sessions/{session_id}/autosave', json={'notes': 'late write', 'session_version': start['version']}, headers=headers)
    assert stale.status_code == 409
    assert stale.json()['error']['code'] == 'session_conflict'


def test_session_invalid_values_are_rejected(client, seeded_user, db_session):
    from app.models.exercise import Exercise
    from app.models.template import WorkoutTemplate, WorkoutTemplateExercise

    ex = Exercise(name='Row', type='strength', owner_scope='global')
    db_session.add(ex); db_session.commit(); db_session.refresh(ex)
    tpl = WorkoutTemplate(owner_id=seeded_user.id, name='Row Day')
    db_session.add(tpl); db_session.commit(); db_session.refresh(tpl)
    db_session.add(WorkoutTemplateExercise(template_id=tpl.id, exercise_id=ex.id, sort_order=1, planned_sets=1, planned_reps=8, planned_weight=50.0))
    db_session.commit()

    headers = _auth(client, seeded_user.email, 'secret123')
    start = client.post('/v1/sessions/start', json={'template_id': tpl.id}, headers=headers).json()
    session_id = start['id']
    logged_exercise_id = start['logged_exercises'][0]['id']

    bad = client.post(f'/v1/sessions/{session_id}/sets', json={
        'logged_exercise_id': logged_exercise_id,
        'set_number': 0,
        'actual_weight': -1,
        'actual_reps': -2,
        'status': 'done',
        'session_version': start['version'],
    }, headers=headers)
    assert bad.status_code == 422


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
    started_body = started.json()
    session_id = started_body['id']
    logged_exercise_id = started_body['logged_exercises'][0]['id']

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
        'session_version': started_body['version'],
    }, headers=headers)
    assert set_log.status_code == 200
    payload = set_log.json()
    assert payload['planned_reps'] == 5
    assert payload['planned_weight'] == 50.0


def test_session_autosave_and_recovery_keeps_latest_progress(client, seeded_user, db_session):
    from app.models.exercise import Exercise
    from app.models.template import WorkoutTemplate, WorkoutTemplateExercise

    ex = Exercise(name='Front Squat', type='strength', owner_scope='global')
    db_session.add(ex); db_session.commit(); db_session.refresh(ex)

    tpl = WorkoutTemplate(owner_id=seeded_user.id, name='Leg Day')
    db_session.add(tpl); db_session.commit(); db_session.refresh(tpl)

    tx = WorkoutTemplateExercise(template_id=tpl.id, exercise_id=ex.id, sort_order=1, planned_sets=2, planned_reps=5, planned_weight=70.0)
    db_session.add(tx); db_session.commit()

    headers = _auth(client, seeded_user.email, 'secret123')
    start = client.post('/v1/sessions/start', json={'template_id': tpl.id}, headers=headers)
    assert start.status_code == 200

    body = start.json()
    session_id = body['id']
    logged_exercise_id = body['logged_exercises'][0]['id']

    first_save = body['last_saved_at']
    assert first_save is not None

    log_set = client.post(f'/v1/sessions/{session_id}/sets', json={
        'logged_exercise_id': logged_exercise_id,
        'set_number': 1,
        'actual_weight': 72.5,
        'actual_reps': 5,
        'status': 'done',
        'session_version': body['version'],
    }, headers=headers)
    assert log_set.status_code == 200

    autosave = client.post(f'/v1/sessions/{session_id}/autosave', json={'notes': 'Felt good', 'session_version': log_set.json()['session_version']}, headers=headers)
    assert autosave.status_code == 200
    assert autosave.json()['notes'] == 'Felt good'

    resumed = client.get(f'/v1/sessions/in-progress?athlete_id={seeded_user.id}', headers=headers)
    assert resumed.status_code == 200
    resumed_body = resumed.json()
    assert resumed_body['id'] == session_id
    assert resumed_body['notes'] == 'Felt good'
    assert resumed_body['last_saved_at'] is not None
    assert resumed_body['version'] >= 3

    detailed = client.get(f'/v1/sessions/{session_id}', headers=headers)
    assert detailed.status_code == 200
    set_payload = detailed.json()['logged_exercises'][0]['sets'][0]
    assert set_payload['actual_weight'] == 72.5
    assert set_payload['actual_reps'] == 5


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
    version = start.json()['version']

    done = client.post(f'/v1/sessions/{session_id}/finish', json={'session_version': version}, headers=headers)
    assert done.status_code == 200
    assert done.json()['status'] == 'completed'
    assert done.json()['scheduled_workout_status'] == 'completed'


def test_session_finish_marks_remaining_pending_sets_skipped(client, seeded_user, db_session):
    from app.models.exercise import Exercise
    from app.models.template import WorkoutTemplate, WorkoutTemplateExercise

    ex = Exercise(name='Incline Press', type='strength', owner_scope='global')
    db_session.add(ex); db_session.commit(); db_session.refresh(ex)

    tpl = WorkoutTemplate(owner_id=seeded_user.id, name='Press Day')
    db_session.add(tpl); db_session.commit(); db_session.refresh(tpl)
    db_session.add(WorkoutTemplateExercise(template_id=tpl.id, exercise_id=ex.id, sort_order=1, planned_sets=3, planned_reps=8, planned_weight=60.0))
    db_session.commit()

    headers = _auth(client, seeded_user.email, 'secret123')
    start = client.post('/v1/sessions/start', json={'template_id': tpl.id}, headers=headers)
    assert start.status_code == 200
    start_body = start.json()
    session_id = start_body['id']
    logged_exercise_id = start_body['logged_exercises'][0]['id']

    first_set = client.post(f'/v1/sessions/{session_id}/sets', json={
        'logged_exercise_id': logged_exercise_id,
        'set_number': 1,
        'actual_weight': 62.5,
        'actual_reps': 8,
        'status': 'done',
        'session_version': start_body['version'],
    }, headers=headers)
    assert first_set.status_code == 200

    done = client.post(f'/v1/sessions/{session_id}/finish', json={'session_version': first_set.json()['session_version']}, headers=headers)
    assert done.status_code == 200
    assert done.json()['status'] == 'completed'

    detail = client.get(f'/v1/sessions/{session_id}', headers=headers)
    assert detail.status_code == 200
    statuses = [st['status'] for st in detail.json()['logged_exercises'][0]['sets']]
    assert statuses == ['done', 'skipped', 'skipped']


def test_logging_set_rebases_stale_session_start_time(client, seeded_user, db_session):
    from app.models.exercise import Exercise
    from app.models.template import WorkoutTemplate, WorkoutTemplateExercise
    from app.models.session import WorkoutSession

    ex = Exercise(name='Lat Pulldown', type='strength', owner_scope='global')
    db_session.add(ex); db_session.commit(); db_session.refresh(ex)

    tpl = WorkoutTemplate(owner_id=seeded_user.id, name='Back Day')
    db_session.add(tpl); db_session.commit(); db_session.refresh(tpl)
    db_session.add(WorkoutTemplateExercise(template_id=tpl.id, exercise_id=ex.id, sort_order=1, planned_sets=1, planned_reps=10, planned_weight=45.0))
    db_session.commit()

    headers = _auth(client, seeded_user.email, 'secret123')
    start = client.post('/v1/sessions/start', json={'template_id': tpl.id}, headers=headers)
    assert start.status_code == 200
    start_body = start.json()
    session_id = start_body['id']
    logged_exercise_id = start_body['logged_exercises'][0]['id']

    ws = db_session.get(WorkoutSession, session_id)
    ws.started_at = datetime.now(timezone.utc) - timedelta(days=2)
    db_session.commit()

    logged = client.post(f'/v1/sessions/{session_id}/sets', json={
        'logged_exercise_id': logged_exercise_id,
        'set_number': 1,
        'actual_weight': 47.5,
        'actual_reps': 10,
        'status': 'done',
        'session_version': start_body['version'],
    }, headers=headers)
    assert logged.status_code == 200

    refreshed = db_session.get(WorkoutSession, session_id)
    started = refreshed.started_at.replace(tzinfo=timezone.utc) if refreshed.started_at.tzinfo is None else refreshed.started_at.astimezone(timezone.utc)
    assert started > datetime.now(timezone.utc) - timedelta(minutes=1)



def test_finish_rebases_stale_duration_to_recent_activity(client, seeded_user, db_session):
    from app.models.exercise import Exercise
    from app.models.template import WorkoutTemplate, WorkoutTemplateExercise
    from app.models.session import WorkoutSession

    ex = Exercise(name='Cable Row', type='strength', owner_scope='global')
    db_session.add(ex); db_session.commit(); db_session.refresh(ex)

    tpl = WorkoutTemplate(owner_id=seeded_user.id, name='Row Day')
    db_session.add(tpl); db_session.commit(); db_session.refresh(tpl)
    db_session.add(WorkoutTemplateExercise(template_id=tpl.id, exercise_id=ex.id, sort_order=1, planned_sets=1, planned_reps=12, planned_weight=35.0))
    db_session.commit()

    headers = _auth(client, seeded_user.email, 'secret123')
    start = client.post('/v1/sessions/start', json={'template_id': tpl.id}, headers=headers)
    assert start.status_code == 200
    start_body = start.json()
    session_id = start_body['id']

    stale_started = datetime.now(timezone.utc) - timedelta(days=4)
    recent_saved = datetime.now(timezone.utc) - timedelta(minutes=7)
    ws = db_session.get(WorkoutSession, session_id)
    ws.started_at = stale_started
    ws.last_saved_at = recent_saved
    db_session.commit()

    done = client.post(f'/v1/sessions/{session_id}/finish', json={'session_version': start_body['version']}, headers=headers)
    assert done.status_code == 200
    assert 0 <= done.json()['duration_seconds'] <= 10 * 60
