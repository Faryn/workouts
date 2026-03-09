def test_login_success_returns_token(client, seeded_user):
    res = client.post('/v1/auth/login', json={'email': seeded_user.email, 'password': 'secret123'})
    assert res.status_code == 200
    body = res.json()
    assert body['token_type'] == 'bearer'
    assert isinstance(body['access_token'], str) and len(body['access_token']) > 20
    assert 'workout_access_token=' in res.headers.get('set-cookie', '')
    assert res.headers.get('x-request-id')


def test_login_invalid_credentials(client, seeded_user):
    res = client.post('/v1/auth/login', json={'email': seeded_user.email, 'password': 'wrong'})
    assert res.status_code == 401


def test_request_id_is_echoed_from_inbound_header(client, seeded_user):
    res = client.post(
        '/v1/auth/login',
        json={'email': seeded_user.email, 'password': 'secret123'},
        headers={'X-Request-ID': 'req-test-123'},
    )
    assert res.status_code == 200
    assert res.headers.get('x-request-id') == 'req-test-123'


def test_login_email_is_case_insensitive(client, seeded_user):
    res = client.post('/v1/auth/login', json={'email': seeded_user.email.upper(), 'password': 'secret123'})
    assert res.status_code == 200
    body = res.json()
    assert body['token_type'] == 'bearer'


def test_me_requires_auth(client):
    res = client.get('/v1/auth/me')
    assert res.status_code == 401


def test_me_returns_current_user(client, seeded_user):
    login = client.post('/v1/auth/login', json={'email': seeded_user.email, 'password': 'secret123'})
    token = login.json()['access_token']
    res = client.get('/v1/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    assert res.json()['email'] == seeded_user.email


def test_me_accepts_auth_cookie(client, seeded_user):
    login = client.post('/v1/auth/login', json={'email': seeded_user.email, 'password': 'secret123'})
    assert login.status_code == 200
    res = client.get('/v1/auth/me')
    assert res.status_code == 200
    assert res.json()['email'] == seeded_user.email


def test_logout_clears_auth_cookie(client, seeded_user):
    login = client.post('/v1/auth/login', json={'email': seeded_user.email, 'password': 'secret123'})
    assert login.status_code == 200
    out = client.post('/v1/auth/logout')
    assert out.status_code == 200
    res = client.get('/v1/auth/me')
    assert res.status_code == 401


def test_trainer_login_rejects_unassigned_scope(client, seeded_trainer_and_assignment):
    trainer, _ = seeded_trainer_and_assignment
    bad = client.post('/v1/auth/login', json={
        'email': trainer.email,
        'password': 'secret123',
        'athlete_ids': ['not-assigned-id'],
    })
    assert bad.status_code == 403


def test_login_rate_limits_repeated_failures(client, seeded_user):
    for _ in range(5):
        res = client.post('/v1/auth/login', json={'email': seeded_user.email, 'password': 'wrong'})
        assert res.status_code == 401

    limited = client.post('/v1/auth/login', json={'email': seeded_user.email, 'password': 'wrong'})
    assert limited.status_code == 429
    body = limited.json()
    assert body['error']['code'] == 'rate_limited'
    assert body['error']['details']['retry_after_seconds'] >= 1
    assert body['error']['details']['request_id'] == limited.headers.get('x-request-id')
