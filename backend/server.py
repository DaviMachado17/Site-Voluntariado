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
        "name": "Gestão e Programação de Sistemas Informáticos",
        "course": "Técnico de Gestão e Programação de Sistemas Informáticos",
        "year": "2024/2025",
        "description": "Turma envolvida em campanhas digitais de sensibilização e apoio tecnológico a instituições locais.",
        "members_count": 22,
        "image": "https://images.pexels.com/photos/7475425/pexels-photo-7475425.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
    {
        "name": "Apoio à Infância",
        "course": "Técnico de Apoio à Infância",
        "year": "2024/2025",
        "description": "Turma dedicada à organização de atividades lúdicas e educativas para crianças em situação de vulnerabilidade.",
        "members_count": 18,
        "image": "https://images.pexels.com/photos/7156162/pexels-photo-7156162.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
    {
        "name": "Restauração e Bar",
        "course": "Técnico de Restauração — Variante Restaurante/Bar",
        "year": "2024/2025",
        "description": "Turma que confeciona e distribui refeições solidárias em parceria com associações da Figueira da Foz.",
        "members_count": 20,
        "image": "https://images.unsplash.com/photo-1545886082-e66c6b9e011a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwzfHx0ZWFtd29yayUyMHN0dWRlbnRzJTIwY2hhcml0eXxlbnwwfHx8fDE3Nzc1NTIyMzV8MA&ixlib=rb-4.1.0&q=85",
    },
    {
        "name": "Turismo Ambiental e Rural",
        "course": "Técnico de Turismo Ambiental e Rural",
        "year": "2024/2025",
        "description": "Turma ativa em ações de limpeza costeira e promoção do património natural da região.",
        "members_count": 16,
        "image": "https://images.pexels.com/photos/7156178/pexels-photo-7156178.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
    {
        "name": "Apoio Psicossocial",
        "course": "Técnico de Apoio Psicossocial",
        "year": "2024/2025",
        "description": "Turma com forte presença em lares e centros de dia, promovendo o envelhecimento ativo e a inclusão social.",
        "members_count": 19,
        "image": "https://images.unsplash.com/photo-1560220604-1985ebfe28b1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwxfHx2b2x1bnRlZXJpbmclMjBzdHVkZW50cyUyMGNvbW11bml0eXxlbnwwfHx8fDE3Nzc1NTIyMzV8MA&ixlib=rb-4.1.0&q=85",
    },
]

SEED_POSTS = [
    {
        "title": "Limpeza da Praia da Claridade: a costa agradece",
        "excerpt": "A turma de Turismo Ambiental e Rural recolheu mais de 40 kg de resíduos numa manhã de solidariedade pelo oceano.",
        "content": "Numa iniciativa conjunta com a Câmara Municipal da Figueira da Foz, os alunos do curso de Turismo Ambiental e Rural passaram o sábado a limpar um troço da Praia da Claridade.\n\nAo fim da manhã foram recolhidos mais de 40 kg de resíduos, na sua maioria plásticos, embalagens e restos de material de pesca. A ação contou com o apoio de pais, professores e membros da comunidade local.\n\nEste é o segundo ano consecutivo em que a turma realiza a iniciativa, reforçando o compromisso da escola com a sustentabilidade ambiental.",
        "image": "https://images.pexels.com/photos/7156178/pexels-photo-7156178.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "turma_slug": "turismo-ambiental-e-rural",
        "author": "Prof. Ana Martins",
        "featured": True,
    },
    {
        "title": "Recolha de bens para o Banco Alimentar",
        "excerpt": "A turma de Restauração e Bar organizou uma campanha que recolheu 320 kg de alimentos não perecíveis.",
        "content": "Durante uma semana, os alunos do 2.º ano de Restauração e Bar transformaram o átrio da escola num ponto de recolha de bens essenciais.\n\nForam recolhidos 320 kg de alimentos não perecíveis, que foram entregues ao Banco Alimentar Contra a Fome — delegação de Coimbra. A ação envolveu toda a comunidade escolar e culminou com um almoço solidário confecionado pelos próprios alunos.",
        "image": "https://images.pexels.com/photos/7156162/pexels-photo-7156162.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "turma_slug": "restauracao-e-bar",
        "author": "Prof. João Silva",
        "featured": False,
    },
    {
        "title": "Tardes de leitura no Lar S. José",
        "excerpt": "A turma de Apoio Psicossocial visita semanalmente o Lar S. José para partilhar histórias e afetos.",
        "content": "Todas as quartas-feiras à tarde, os alunos de Apoio Psicossocial deslocam-se ao Lar S. José para um momento de leitura partilhada com os idosos residentes.\n\nA iniciativa, que começou como um projeto de turma, transformou-se numa rotina esperada por toda a comunidade do lar. Já foram lidos mais de 20 livros em conjunto e foram recolhidas dezenas de histórias de vida dos residentes.",
        "image": "https://images.unsplash.com/photo-1560220604-1985ebfe28b1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwxfHx2b2x1bnRlZXJpbmclMjBzdHVkZW50cyUyMGNvbW11bml0eXxlbnwwfHx8fDE3Nzc1NTIyMzV8MA&ixlib=rb-4.1.0&q=85",
        "turma_slug": "apoio-psicossocial",
        "author": "Prof. Cláudia Ribeiro",
        "featured": False,
    },
    {
        "title": "Oficina de Natal para crianças do Bairro Social",
        "excerpt": "A turma de Apoio à Infância levou jogos, prendas e muita alegria a 30 crianças do Bairro Social da Tavarede.",
        "content": "No âmbito da semana da solidariedade, os alunos de Apoio à Infância organizaram uma oficina de Natal para crianças do Bairro Social da Tavarede.\n\nDurante uma tarde inteira houve jogos, pintura, construção de enfeites e a visita especial do Pai Natal. Cada criança recebeu um presente preparado pelos alunos e pelos funcionários da escola.",
        "image": "https://images.pexels.com/photos/7475425/pexels-photo-7475425.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "turma_slug": "apoio-a-infancia",
        "author": "Prof. Marta Sousa",
        "featured": False,
    },
    {
        "title": "App de voluntariado desenvolvida pelos alunos",
        "excerpt": "Alunos de Informática criaram uma plataforma web que liga voluntários a instituições da Figueira da Foz.",
        "content": "Como projeto integrador, os alunos do 3.º ano do curso de Gestão e Programação de Sistemas Informáticos desenvolveram uma plataforma web que permite ligar voluntários a instituições locais.\n\nA plataforma, batizada de \"Mãos Dadas\", já conta com 8 instituições parceiras e mais de 50 voluntários inscritos. O projeto foi apresentado publicamente na semana aberta da escola e foi entregue a título gratuito às instituições envolvidas.",
        "image": "https://images.pexels.com/photos/7475425/pexels-photo-7475425.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "turma_slug": "gestao-e-programacao-de-sistemas-informaticos",
        "author": "Prof. Ricardo Mendes",
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
