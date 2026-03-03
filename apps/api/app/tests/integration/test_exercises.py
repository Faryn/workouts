def test_exercises_requires_auth(client):
    res = client.get('/v1/exercises/')
    assert res.status_code == 401


def test_exercises_returns_global_and_owned_only(client, seeded_user, seeded_exercises):
    login = client.post('/v1/auth/login', json={'email': seeded_user.email, 'password': 'secret123'})
    token = login.json()['access_token']

    res = client.get('/v1/exercises/', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200

    names = {x['name'] for x in res.json()}
    assert 'Bench Press' in names
    assert 'My Custom Curl' in names
    assert 'Other User Exercise' not in names
