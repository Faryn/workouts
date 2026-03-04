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


def test_exercises_returns_global_and_owned_only(client, seeded_user, seeded_exercises):
    headers = _auth(client, seeded_user.email, 'secret123')
    res = client.get('/v1/exercises/', headers=headers)
    assert res.status_code == 200

    names = {x['name'] for x in res.json()}
    assert 'Bench Press' in names
    assert 'My Custom Curl' in names
    assert 'Other User Exercise' not in names


def test_athlete_can_create_patch_delete_own_exercise(client, seeded_user):
    headers = _auth(client, seeded_user.email, 'secret123')

    created = client.post('/v1/exercises/', json={
        'name': 'Cable Lateral Raise',
        'type': 'strength',
        'notes': 'Strict form',
    }, headers=headers)
    assert created.status_code == 200
    body = created.json()
    assert body['owner_scope'] == 'athlete'
    assert body['owner_id'] == seeded_user.id

    patched = client.patch(f"/v1/exercises/{body['id']}", json={'notes': 'Strict form only'}, headers=headers)
    assert patched.status_code == 200
    assert patched.json()['notes'] == 'Strict form only'

    deleted = client.delete(f"/v1/exercises/{body['id']}", headers=headers)
    assert deleted.status_code == 200
    assert deleted.json()['ok'] is True


def test_athlete_cannot_modify_global_exercise(client, seeded_user, seeded_exercises):
    headers = _auth(client, seeded_user.email, 'secret123')
    global_ex = next(x for x in seeded_exercises if x.owner_scope == 'global')

    patched = client.patch(f'/v1/exercises/{global_ex.id}', json={'name': 'Nope'}, headers=headers)
    assert patched.status_code == 403

    deleted = client.delete(f'/v1/exercises/{global_ex.id}', headers=headers)
    assert deleted.status_code == 403
