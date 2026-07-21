def _auth(client, email, password, athlete_ids=None):
    payload = {'email': email, 'password': password}
    if athlete_ids is not None:
        payload['athlete_ids'] = athlete_ids
    res = client.post('/v1/auth/login', json=payload)
    assert res.status_code == 200
    return {'Authorization': f"Bearer {res.json()['access_token']}"}


def test_exercises_requires_auth(client):
    res = client.get('/v1/exercises/')
    assert res.status_code == 401


def test_exercises_returns_global_only_pool(client, seeded_user, seeded_exercises):
    headers = _auth(client, seeded_user.email, 'secret123')
    res = client.get('/v1/exercises/', headers=headers)
    assert res.status_code == 200

    names = {x['name'] for x in res.json()}
    assert 'Bench Press' in names
    assert 'My Custom Curl' not in names
    assert 'Other User Exercise' not in names


def test_athletes_cannot_create_global_exercises(client, seeded_user, seeded_trainer_and_assignment):
    headers = _auth(client, seeded_user.email, 'secret123')

    denied = client.post('/v1/exercises/', json={
        'name': 'Cable Lateral Raise',
        'type': 'strength',
        'notes': 'Strict form',
    }, headers=headers)
    assert denied.status_code == 403

    trainer, _ = seeded_trainer_and_assignment
    trainer_headers = _auth(client, trainer.email, 'secret123')
    created = client.post('/v1/exercises/', json={
        'name': 'Cable Lateral Raise',
        'type': 'strength',
        'notes': 'Strict form',
    }, headers=trainer_headers)
    assert created.status_code == 200
    body = created.json()
    assert body['owner_scope'] == 'global'
    assert body['owner_id'] is None

    listed = client.get('/v1/exercises/', headers=headers)
    assert listed.status_code == 200
    assert 'Cable Lateral Raise' in {x['name'] for x in listed.json()}


def test_athlete_cannot_modify_global_exercise(client, seeded_user, seeded_exercises):
    headers = _auth(client, seeded_user.email, 'secret123')
    global_ex = next(x for x in seeded_exercises if x.owner_scope == 'global')

    patched = client.patch(f'/v1/exercises/{global_ex.id}', json={'name': 'Nope'}, headers=headers)
    assert patched.status_code == 403

    deleted = client.delete(f'/v1/exercises/{global_ex.id}', headers=headers)
    assert deleted.status_code == 403
