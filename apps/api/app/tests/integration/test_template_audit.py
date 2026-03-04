def _auth(client, email, password):
    res = client.post('/v1/auth/login', json={'email': email, 'password': password})
    assert res.status_code == 200
    return {'Authorization': f"Bearer {res.json()['access_token']}"}


def test_template_changes_write_audit_events(client, db_session, seeded_user):
    from app.models.audit import AuditEvent

    headers = _auth(client, seeded_user.email, 'secret123')

    created = client.post('/v1/templates/', json={'name': 'Audit Plan'}, headers=headers)
    assert created.status_code == 200
    template_id = created.json()['id']

    patched = client.patch(f'/v1/templates/{template_id}', json={'notes': 'updated'}, headers=headers)
    assert patched.status_code == 200

    deleted = client.delete(f'/v1/templates/{template_id}', headers=headers)
    assert deleted.status_code == 200

    events = db_session.query(AuditEvent).filter(AuditEvent.entity_id == template_id).order_by(AuditEvent.created_at.asc()).all()
    assert [e.action for e in events] == ['template.create', 'template.patch', 'template.delete']
