from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr


# ---------------------------------------------------------------------------
# Config / DB
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[áàâã]", "a", text)
    text = re.sub(r"[éèê]", "e", text)
    text = re.sub(r"[íì]", "i", text)
    text = re.sub(r"[óòôõ]", "o", text)
    text = re.sub(r"[úù]", "u", text)
    text = re.sub(r"[ç]", "c", text)
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Não autenticado")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Tipo de token inválido")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=401, detail="Administrador não encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str


class LoginOut(BaseModel):
    token: str
    user: UserOut


class TurmaIn(BaseModel):
    name: str
    course: str
    year: str
    description: str
    members_count: int = 0
    image: str = ""


class Turma(TurmaIn):
    id: str
    slug: str
    created_at: str


class PostIn(BaseModel):
    title: str
    excerpt: str
    content: str
    image: str = ""
    turma_slug: str
    author: str = "Redação EPFF-INTEP"
    featured: bool = False


class Post(PostIn):
    id: str
    slug: str
    date: str
    turma_name: Optional[str] = None


class CommentIn(BaseModel):
    author_name: str = Field(min_length=2, max_length=60)
    message: str = Field(min_length=2, max_length=1000)


class Comment(BaseModel):
    id: str
    post_id: str
    post_title: Optional[str] = None
    author_name: str
    message: str
    date: str
    approved: bool


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="EPFF-INTEP Voluntariado API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("epff")


# ---------------------------------------------------------------------------
# Seed data on startup
# ---------------------------------------------------------------------------
SEED_TURMAS = [
    {
        "name": "11.º PI",
        "course": "11.º Ano — PI",
        "year": "2024/2025",
        "description": "Venderam tote bags personalizadas para angariar fundos a favor da APAFF — Associação de Pais e Amigos das Crianças com Necessidades Especiais de Coimbra.",
        "members_count": 20,
        "image": "https://images.pexels.com/photos/7475425/pexels-photo-7475425.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
    {
        "name": "CEF 9.º — Cuidador de Crianças e Jovens",
        "course": "CEF — Cuidador de Crianças e Jovens",
        "year": "2024/2025",
        "description": "Confecionaram bonecos de pano para serem enviados a crianças do continente africano, em parceria com o projeto Reino Mágico — Mães do Mundo.",
        "members_count": 16,
        "image": "https://customer-assets.emergentagent.com/job_cursos-profissionais/artifacts/s676uw1y_WhatsApp%20Image%202026-04-30%20at%204.28.35%20PM.jpeg",
    },
    {
        "name": "12.º TEAC / CAB",
        "course": "12.º Ano — TEAC/CAB",
        "year": "2024/2025",
        "description": "Organizaram uma campanha de recolha de bens alimentares e de higiene para apoiar a reconstrução e a população afetada em Leiria.",
        "members_count": 22,
        "image": "https://images.unsplash.com/photo-1545886082-e66c6b9e011a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwzfHx0ZWFtd29yayUyMHN0dWRlbnRzJTIwY2hhcml0eXxlbnwwfHx8fDE3Nzc1NTIyMzV8MA&ixlib=rb-4.1.0&q=85",
    },
    {
        "name": "12.º TT / CAB / TEAC",
        "course": "12.º Ano — TT/CAB/TEAC",
        "year": "2024/2025",
        "description": "Recolheram alimentos e confecionaram mantas para entregar à GADAFF e à APAFF, apoiando famílias e utentes destas instituições.",
        "members_count": 24,
        "image": "https://images.pexels.com/photos/7156178/pexels-photo-7156178.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
]

SEED_POSTS = [
    {
        "title": "Tote bags solidárias a favor da APAFF Coimbra",
        "excerpt": "A turma do 11.º PI lançou uma coleção de tote bags personalizadas cuja receita reverteu integralmente para a APAFF Coimbra.",
        "content": "A turma do 11.º PI abraçou este ano um desafio solidário: desenhar, produzir e vender uma coleção de tote bags personalizadas para angariar fundos para a APAFF — Associação de Pais e Amigos das Crianças com Necessidades Especiais de Coimbra.\n\nAo longo de várias semanas, os alunos ficaram responsáveis por todas as etapas do projeto — do design à produção, passando pela divulgação e pelas vendas junto da comunidade escolar e das famílias. A adesão foi grande e a totalidade do valor angariado foi entregue à APAFF.\n\nMais do que um resultado financeiro, a iniciativa permitiu à turma conhecer de perto o trabalho da APAFF e a importância do apoio às crianças e jovens com necessidades especiais e às suas famílias.",
        "image": "https://images.pexels.com/photos/7475425/pexels-photo-7475425.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "turma_slug": "11-pi",
        "author": "Turma 11.º PI",
        "featured": True,
    },
    {
        "title": "Bonecos de pano para crianças do continente africano",
        "excerpt": "Os alunos do CEF 9.º — Cuidador de Crianças e Jovens confecionaram bonecos de pano para crianças de África, em parceria com o Reino Mágico — Mães do Mundo.",
        "content": "A turma do CEF 9.º ano — Cuidador de Crianças e Jovens desenvolveu um projeto de costura solidária: a confeção, à mão, de bonecos de pano destinados a crianças do continente africano.\n\nA iniciativa foi realizada em parceria com o projeto Reino Mágico — Mães do Mundo, que se encarregou de fazer chegar os bonecos aos seus destinatários. Cada boneco é único, pensado e costurado por cada aluno como um pequeno gesto de carinho que viaja continentes.\n\nO projeto integrou-se nas competências do curso, permitindo aos alunos colocar em prática conhecimentos de trabalhos manuais e, ao mesmo tempo, refletir sobre as diferentes realidades da infância no mundo.",
        "image": "https://customer-assets.emergentagent.com/job_cursos-profissionais/artifacts/v3r7m22v_WhatsApp%20Image%202026-04-30%20at%204.28.36%20PM.jpeg",
        "turma_slug": "cef-9-cuidador-de-criancas-e-jovens",
        "author": "Turma CEF 9.º",
        "featured": False,
    },
    {
        "title": "Reerguer Leiria: recolha de bens essenciais",
        "excerpt": "A turma do 12.º TEAC/CAB organizou uma campanha de recolha de alimentos e bens de higiene para apoiar a população de Leiria.",
        "content": "Face às dificuldades sentidas por famílias da região de Leiria, a turma do 12.º ano TEAC/CAB mobilizou-se para dar resposta concreta.\n\nDurante uma semana, o átrio da escola transformou-se num ponto de recolha de bens alimentares não perecíveis e de produtos de higiene. Professores, alunos, funcionários e famílias contribuíram com o que podiam, e o resultado foi uma quantidade expressiva de bens prontos a serem entregues a instituições locais que apoiam a recuperação de Leiria.\n\nA turma acompanhou toda a logística — da sensibilização à entrega final — fazendo deste um projeto de solidariedade com impacto tangível.",
        "image": "https://images.unsplash.com/photo-1545886082-e66c6b9e011a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwzfHx0ZWFtd29yayUyMHN0dWRlbnRzJTIwY2hhcml0eXxlbnwwfHx8fDE3Nzc1NTIyMzV8MA&ixlib=rb-4.1.0&q=85",
        "turma_slug": "12-teac-cab",
        "author": "Turma 12.º TEAC/CAB",
        "featured": False,
    },
    {
        "title": "Mantas e alimentos para a GADAFF e APAFF",
        "excerpt": "A turma do 12.º TT/CAB/TEAC recolheu alimentos e confecionou mantas, entregues à GADAFF e à APAFF para apoiar utentes e famílias.",
        "content": "A turma do 12.º ano TT/CAB/TEAC juntou duas ações numa só iniciativa solidária: a recolha de alimentos e a confeção de mantas.\n\nO trabalho dividiu-se entre tempo de aula e tempo livre dos alunos. As mantas foram produzidas com tecidos cedidos e trabalho de todos os colegas da turma, enquanto a recolha de alimentos envolveu a comunidade escolar.\n\nNo final, os bens foram entregues a duas instituições parceiras — a GADAFF e a APAFF — que canalizaram o apoio para utentes, crianças e famílias acompanhadas pelas suas equipas. Um gesto simples que, multiplicado por uma turma inteira, faz a diferença no dia-a-dia de quem recebe.",
        "image": "https://images.pexels.com/photos/7156178/pexels-photo-7156178.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "turma_slug": "12-tt-cab-teac",
        "author": "Turma 12.º TT/CAB/TEAC",
        "featured": False,
    },
]


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@epff-intep.pt")
    admin_password = os.environ.get("ADMIN_PASSWORD", "epff2025")
    existing = await db.users.find_one({"email": admin_email}, {"_id": 0})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Administrador",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin seeded: %s", admin_email)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )
        logger.info("Admin password updated: %s", admin_email)


async def seed_turmas_and_posts():
    turmas_count = await db.turmas.count_documents({})
    if turmas_count == 0:
        for t in SEED_TURMAS:
            doc = {
                **t,
                "id": str(uuid.uuid4()),
                "slug": slugify(t["name"]),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.turmas.insert_one(doc)
        logger.info("Seeded %d turmas", len(SEED_TURMAS))

    posts_count = await db.posts.count_documents({})
    if posts_count == 0:
        for idx, p in enumerate(SEED_POSTS):
            base_date = datetime.now(timezone.utc) - timedelta(days=idx * 4)
            doc = {
                **p,
                "id": str(uuid.uuid4()),
                "slug": slugify(p["title"]),
                "date": base_date.isoformat(),
            }
            await db.posts.insert_one(doc)
        logger.info("Seeded %d posts", len(SEED_POSTS))


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.turmas.create_index("slug", unique=True)
    await db.posts.create_index("slug", unique=True)
    await seed_admin()
    await seed_turmas_and_posts()


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api.post("/auth/login", response_model=LoginOut)
async def login(body: LoginIn):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = create_access_token(user["id"], user["email"])
    return LoginOut(
        token=token,
        user=UserOut(id=user["id"], email=user["email"], name=user["name"], role=user["role"]),
    )


@api.get("/auth/me", response_model=UserOut)
async def me(admin=Depends(get_current_admin)):
    return UserOut(**admin)


# ---------------------------------------------------------------------------
# Turmas
# ---------------------------------------------------------------------------
@api.get("/turmas", response_model=List[Turma])
async def list_turmas():
    docs = await db.turmas.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    return docs


@api.get("/turmas/{slug}", response_model=Turma)
async def get_turma(slug: str):
    doc = await db.turmas.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return doc


@api.post("/turmas", response_model=Turma)
async def create_turma(body: TurmaIn, admin=Depends(get_current_admin)):
    slug = slugify(body.name)
    if await db.turmas.find_one({"slug": slug}):
        raise HTTPException(status_code=400, detail="Já existe uma turma com esse nome")
    doc = {
        **body.model_dump(),
        "id": str(uuid.uuid4()),
        "slug": slug,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.turmas.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/turmas/{turma_id}", response_model=Turma)
async def update_turma(turma_id: str, body: TurmaIn, admin=Depends(get_current_admin)):
    existing = await db.turmas.find_one({"id": turma_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    new_slug = slugify(body.name)
    update = {**body.model_dump(), "slug": new_slug}
    await db.turmas.update_one({"id": turma_id}, {"$set": update})
    doc = await db.turmas.find_one({"id": turma_id}, {"_id": 0})
    return doc


@api.delete("/turmas/{turma_id}")
async def delete_turma(turma_id: str, admin=Depends(get_current_admin)):
    result = await db.turmas.delete_one({"id": turma_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Posts
# ---------------------------------------------------------------------------
async def _attach_turma_name(post: dict) -> dict:
    turma = await db.turmas.find_one({"slug": post.get("turma_slug")}, {"_id": 0, "name": 1})
    post["turma_name"] = turma["name"] if turma else None
    return post


@api.get("/posts", response_model=List[Post])
async def list_posts(turma: Optional[str] = None, limit: int = 50):
    q = {}
    if turma:
        q["turma_slug"] = turma
    docs = await db.posts.find(q, {"_id": 0}).sort("date", -1).to_list(limit)
    for d in docs:
        await _attach_turma_name(d)
    return docs


@api.get("/posts/{slug}", response_model=Post)
async def get_post(slug: str):
    doc = await db.posts.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Artigo não encontrado")
    await _attach_turma_name(doc)
    return doc


@api.post("/posts", response_model=Post)
async def create_post(body: PostIn, admin=Depends(get_current_admin)):
    turma = await db.turmas.find_one({"slug": body.turma_slug}, {"_id": 0})
    if not turma:
        raise HTTPException(status_code=400, detail="Turma inexistente")
    base_slug = slugify(body.title)
    slug = base_slug
    counter = 2
    while await db.posts.find_one({"slug": slug}):
        slug = f"{base_slug}-{counter}"
        counter += 1
    doc = {
        **body.model_dump(),
        "id": str(uuid.uuid4()),
        "slug": slug,
        "date": datetime.now(timezone.utc).isoformat(),
    }
    await db.posts.insert_one(doc)
    doc.pop("_id", None)
    await _attach_turma_name(doc)
    return doc


@api.put("/posts/{post_id}", response_model=Post)
async def update_post(post_id: str, body: PostIn, admin=Depends(get_current_admin)):
    existing = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Artigo não encontrado")
    turma = await db.turmas.find_one({"slug": body.turma_slug}, {"_id": 0})
    if not turma:
        raise HTTPException(status_code=400, detail="Turma inexistente")
    update = {**body.model_dump()}
    await db.posts.update_one({"id": post_id}, {"$set": update})
    doc = await db.posts.find_one({"id": post_id}, {"_id": 0})
    await _attach_turma_name(doc)
    return doc


@api.delete("/posts/{post_id}")
async def delete_post(post_id: str, admin=Depends(get_current_admin)):
    result = await db.posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Artigo não encontrado")
    await db.comments.delete_many({"post_id": post_id})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------
@api.get("/posts/{post_id}/comments", response_model=List[Comment])
async def list_comments(post_id: str):
    docs = await db.comments.find(
        {"post_id": post_id, "approved": True}, {"_id": 0}
    ).sort("date", -1).to_list(200)
    return docs


@api.post("/posts/{post_id}/comments", response_model=Comment)
async def create_comment(post_id: str, body: CommentIn):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Artigo não encontrado")
    doc = {
        "id": str(uuid.uuid4()),
        "post_id": post_id,
        "post_title": post["title"],
        "author_name": body.author_name.strip(),
        "message": body.message.strip(),
        "date": datetime.now(timezone.utc).isoformat(),
        "approved": False,
    }
    await db.comments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/admin/comments", response_model=List[Comment])
async def admin_list_comments(
    approved: Optional[bool] = None,
    admin=Depends(get_current_admin),
):
    q = {}
    if approved is not None:
        q["approved"] = approved
    docs = await db.comments.find(q, {"_id": 0}).sort("date", -1).to_list(500)
    return docs


@api.put("/admin/comments/{comment_id}", response_model=Comment)
async def admin_update_comment(
    comment_id: str,
    approved: bool,
    admin=Depends(get_current_admin),
):
    existing = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Comentário não encontrado")
    await db.comments.update_one({"id": comment_id}, {"$set": {"approved": approved}})
    doc = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    return doc


@api.delete("/admin/comments/{comment_id}")
async def admin_delete_comment(comment_id: str, admin=Depends(get_current_admin)):
    result = await db.comments.delete_one({"id": comment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comentário não encontrado")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Stats (public)
# ---------------------------------------------------------------------------
@api.get("/stats")
async def stats():
    turmas = await db.turmas.count_documents({})
    posts = await db.posts.count_documents({})
    comments = await db.comments.count_documents({"approved": True})
    return {"turmas": turmas, "posts": posts, "comments": comments}


@api.get("/")
async def root():
    return {"message": "EPFF-INTEP Voluntariado API"}


# ---------------------------------------------------------------------------
# Mount
# ---------------------------------------------------------------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
