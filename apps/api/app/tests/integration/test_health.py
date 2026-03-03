def test_health(client):
    res = client.get('/v1/health')
    assert res.status_code == 200
    assert res.json()['ok'] is True
