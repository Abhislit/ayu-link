def test_login_success(client):
    res = client.post("/api/auth/login", json={"email": "driver@ayu.test", "password": "ayu12345"})
    assert res.status_code == 200
    body = res.json()
    assert body["token"]
    assert body["user"]["email"] == "driver@ayu.test"
    assert body["user"]["role"] == "ambulance_driver"


def test_login_wrong_password(client):
    res = client.post("/api/auth/login", json={"email": "driver@ayu.test", "password": "nope"})
    assert res.status_code == 401


def test_login_unknown_email(client):
    res = client.post("/api/auth/login", json={"email": "ghost@ayu.test", "password": "ayu12345"})
    assert res.status_code == 401


def test_me_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_with_token(client):
    token = client.post(
        "/api/auth/login", json={"email": "hospital@ayu.test", "password": "ayu12345"}
    ).json()["token"]
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["role"] == "hospital_staff"


def test_password_hash_roundtrip():
    from app.security import hash_password, verify_password

    stored = hash_password("ayu12345")
    assert "ayu12345" not in stored
    assert verify_password("ayu12345", stored)
    assert not verify_password("wrong", stored)


def test_seed_is_idempotent(client):
    from app.database import SessionLocal
    from app.models import User
    from app.seed import seed_demo

    with SessionLocal() as db:
        seed_demo(db)
        seed_demo(db)
        assert db.query(User).count() == 5
