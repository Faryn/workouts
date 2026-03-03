def test_login_success_returns_token(client, seeded_user):
    res = client.post('/v1/auth/login', json={'email': seeded_user.email, 'password': 'secret123'})
    assert res.status_code == 200
    body = res.json()
    assert body['token_type'] == 'bearer'
    assert isinstance(body['access_token'], str) and len(body['access_token']) > 20


def test_login_invalid_credentials(client, seeded_user):
    res = client.post('/v1/auth/login', json={'email': seeded_user.email, 'password': 'wrong'})
    assert res.status_code == 401


def test_me_requires_auth(client):
    res = client.get('/v1/auth/me')
    assert res.status_code == 401


def test_me_returns_current_user(client, seeded_user):
    login = client.post('/v1/auth/login', json={'email': seeded_user.email, 'password': 'secret123'})
    token = login.json()['access_token']
    res = client.get('/v1/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    assert res.json()['email'] == seeded_user.email
