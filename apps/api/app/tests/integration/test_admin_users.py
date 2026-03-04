def _auth(client, email, password):
    res = client.post('/v1/auth/login', json={'email': email, 'password': password})
    assert res.status_code == 200
    return {'Authorization': f"Bearer {res.json()['access_token']}"}


def test_admin_can_crud_users_and_reset_password(client, seeded_admin):
    admin_headers = _auth(client, seeded_admin.email, 'secret123')

    created = client.post('/v1/admin/users/', json={
        'email': 'new-athlete@example.com',
        'role': 'athlete',
        'password': 'newpass123',
        'active': True,
    }, headers=admin_headers)
    assert created.status_code == 200
    user_id = created.json()['id']

    listed = client.get('/v1/admin/users/', headers=admin_headers)
    assert listed.status_code == 200
    assert any(u['id'] == user_id for u in listed.json())

    patched = client.patch(f'/v1/admin/users/{user_id}', json={'role': 'trainer', 'active': False}, headers=admin_headers)
    assert patched.status_code == 200
    assert patched.json()['role'] == 'trainer'
    assert patched.json()['active'] is False

    reset = client.post(f'/v1/admin/users/{user_id}/password', json={'password': 'changed123'}, headers=admin_headers)
    assert reset.status_code == 200
    assert reset.json()['ok'] is True

    relogin = client.post('/v1/auth/login', json={'email': 'new-athlete@example.com', 'password': 'changed123'})
    assert relogin.status_code == 401  # inactive after patch


def test_non_admin_cannot_access_admin_users(client, seeded_user):
    athlete_headers = _auth(client, seeded_user.email, 'secret123')
    res = client.get('/v1/admin/users/', headers=athlete_headers)
    assert res.status_code == 403
    assert res.json()['error']['code'] == 'forbidden'
