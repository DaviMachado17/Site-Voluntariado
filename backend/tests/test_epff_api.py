"""EPFF-INTEP backend API tests."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cursos-profissionais.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@epff-intep.pt"
ADMIN_PASSWORD = "epff2025"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---- public ----
def test_stats(s):
    r = s.get(f"{API}/stats", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["turmas"] == 5
    assert d["posts"] == 5


def test_turmas_list(s):
    r = s.get(f"{API}/turmas", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 5
    slugs = {t["slug"] for t in data}
    assert "gestao-e-programacao-de-sistemas-informaticos" in slugs
    assert "apoio-a-infancia" in slugs
    assert "restauracao-e-bar" in slugs
    assert "turismo-ambiental-e-rural" in slugs
    assert "apoio-psicossocial" in slugs


def test_posts_list_and_turma_name(s):
    r = s.get(f"{API}/posts", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 5
    for p in data:
        assert p.get("turma_name"), f"missing turma_name for {p['slug']}"


def test_posts_filter_by_turma(s):
    r = s.get(f"{API}/posts", params={"turma": "restauracao-e-bar"}, timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    assert all(p["turma_slug"] == "restauracao-e-bar" for p in data)


def test_get_post_by_slug(s):
    list_r = s.get(f"{API}/posts", timeout=30).json()
    slug = list_r[0]["slug"]
    r = s.get(f"{API}/posts/{slug}", timeout=30)
    assert r.status_code == 200
    assert r.json()["slug"] == slug


# ---- auth ----
def test_login_wrong(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=30)
    assert r.status_code == 401


def test_auth_me(s, auth):
    r = s.get(f"{API}/auth/me", headers=auth, timeout=30)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


def test_admin_required(s):
    r = s.post(f"{API}/posts", json={"title": "x", "excerpt": "x", "content": "x",
                                      "turma_slug": "restauracao-e-bar"}, timeout=30)
    assert r.status_code == 401


# ---- comments ----
def test_comments_flow(s, auth):
    posts = s.get(f"{API}/posts", timeout=30).json()
    post_id = posts[0]["id"]

    # public GET before (should be empty)
    r0 = s.get(f"{API}/posts/{post_id}/comments", timeout=30)
    assert r0.status_code == 200
    baseline = len(r0.json())

    # create comment
    suffix = uuid.uuid4().hex[:6]
    payload = {"author_name": f"TEST_User_{suffix}", "message": "TEST_Comment mensagem de teste"}
    c = s.post(f"{API}/posts/{post_id}/comments", json=payload, timeout=30)
    assert c.status_code == 200, c.text
    comment = c.json()
    assert comment["approved"] is False

    # still not visible publicly
    r1 = s.get(f"{API}/posts/{post_id}/comments", timeout=30)
    assert len(r1.json()) == baseline

    # admin lists
    a = s.get(f"{API}/admin/comments", headers=auth, timeout=30)
    assert a.status_code == 200
    ids = [x["id"] for x in a.json()]
    assert comment["id"] in ids

    # approve
    ap = s.put(f"{API}/admin/comments/{comment['id']}", params={"approved": "true"}, headers=auth, timeout=30)
    assert ap.status_code == 200
    assert ap.json()["approved"] is True

    # now public sees it
    r2 = s.get(f"{API}/posts/{post_id}/comments", timeout=30)
    assert len(r2.json()) == baseline + 1

    # delete
    d = s.delete(f"{API}/admin/comments/{comment['id']}", headers=auth, timeout=30)
    assert d.status_code == 200


# ---- admin CRUD posts & turmas ----
def test_post_crud(s, auth):
    suffix = uuid.uuid4().hex[:6]
    payload = {"title": f"TEST_Post_{suffix}", "excerpt": "ex", "content": "conteudo",
               "turma_slug": "apoio-a-infancia"}
    c = s.post(f"{API}/posts", json=payload, headers=auth, timeout=30)
    assert c.status_code == 200, c.text
    post = c.json()
    pid = post["id"]

    g = s.get(f"{API}/posts/{post['slug']}", timeout=30)
    assert g.status_code == 200

    u = s.put(f"{API}/posts/{pid}", json={**payload, "title": f"TEST_Post_Upd_{suffix}"}, headers=auth, timeout=30)
    assert u.status_code == 200
    assert u.json()["title"] == f"TEST_Post_Upd_{suffix}"

    d = s.delete(f"{API}/posts/{pid}", headers=auth, timeout=30)
    assert d.status_code == 200


def test_turma_crud(s, auth):
    suffix = uuid.uuid4().hex[:6]
    payload = {"name": f"TEST_Turma_{suffix}", "course": "c", "year": "2024/2025",
               "description": "d", "members_count": 5, "image": ""}
    c = s.post(f"{API}/turmas", json=payload, headers=auth, timeout=30)
    assert c.status_code == 200, c.text
    tid = c.json()["id"]

    u = s.put(f"{API}/turmas/{tid}", json={**payload, "description": "updated"}, headers=auth, timeout=30)
    assert u.status_code == 200
    assert u.json()["description"] == "updated"

    d = s.delete(f"{API}/turmas/{tid}", headers=auth, timeout=30)
    assert d.status_code == 200
