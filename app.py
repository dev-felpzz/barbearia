import os
import sqlite3
from functools import wraps
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from authlib.integrations.flask_client import OAuth

load_dotenv()  # carrega o .env

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "troque-em-producao")

DB_PATH = Path(__file__).parent / "database.db"

# ===== OAUTH =====
oauth = OAuth(app)

oauth.register(
    name="google",
    client_id=os.environ.get("GOOGLE_CLIENT_ID"),
    client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

oauth.register(
    name="facebook",
    client_id=os.environ.get("FACEBOOK_CLIENT_ID"),
    client_secret=os.environ.get("FACEBOOK_CLIENT_SECRET"),
    access_token_url="https://graph.facebook.com/oauth/access_token",
    authorize_url="https://www.facebook.com/dialog/oauth",
    api_base_url="https://graph.facebook.com/",
    client_kwargs={"scope": "email public_profile"},
)


# ===== BANCO =====
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            senha_hash TEXT,
            oauth_provider TEXT,
            oauth_id TEXT,
            tipo TEXT NOT NULL DEFAULT 'cliente',
            foto_url TEXT,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    _garantir_colunas_novas(conn)
    conn.commit()
    conn.close()


def _garantir_colunas_novas(conn):
    """Migração leve: adiciona colunas novas (tipo, foto_url) em bancos
    que já existiam antes dessas colunas serem criadas. Idempotente."""
    colunas = {row["name"] for row in conn.execute("PRAGMA table_info(usuarios)")}
    if "tipo" not in colunas:
        conn.execute("ALTER TABLE usuarios ADD COLUMN tipo TEXT NOT NULL DEFAULT 'cliente'")
    if "foto_url" not in colunas:
        conn.execute("ALTER TABLE usuarios ADD COLUMN foto_url TEXT")


def _logar_usuario(usuario):
    """Centraliza o que vai pra sessão ao autenticar (login, cadastro ou
    OAuth) — evita repetir essas 4 linhas em 3 lugares diferentes."""
    session["usuario_email"] = usuario["email"]
    session["usuario_nome"] = usuario["nome"]
    session["usuario_tipo"] = usuario["tipo"] or "cliente"
    session["usuario_foto_url"] = usuario["foto_url"]


def login_required(view):
    """Protege rotas que exigem usuário autenticado."""
    @wraps(view)
    def wrapper(*args, **kwargs):
        if not session.get("usuario_email"):
            return redirect(url_for("login_page"))
        return view(*args, **kwargs)
    return wrapper


def upsert_oauth_user(nome, email, provider, oauth_id):
    """Cria o usuário se não existir, ou apenas loga se já existir."""
    conn = get_db()
    usuario = conn.execute(
        "SELECT * FROM usuarios WHERE email = ?", (email,)
    ).fetchone()

    if not usuario:
        conn.execute(
            "INSERT INTO usuarios (nome, email, oauth_provider, oauth_id) VALUES (?, ?, ?, ?)",
            (nome, email, provider, oauth_id),
        )
        conn.commit()
        usuario = conn.execute(
            "SELECT * FROM usuarios WHERE email = ?", (email,)
        ).fetchone()

    conn.close()
    _logar_usuario(usuario)


# ===== INICIALIZAÇÃO DO BANCO =====
# Roda na importação do módulo (e não só dentro de "__main__") para que
# `flask run` / Gunicorn também criem/migrem as tabelas corretamente.
init_db()


@app.context_processor
def injetar_usuario_atual():
    """Disponibiliza `current_user` em TODOS os templates automaticamente,
    sem precisar passar usuario_logado=... manualmente em cada rota."""
    if not session.get("usuario_email"):
        return {"current_user": None}

    nome = session.get("usuario_nome") or ""
    return {
        "current_user": {
            "nome": nome,
            "email": session.get("usuario_email"),
            "tipo": session.get("usuario_tipo", "cliente"),
            "foto_url": session.get("usuario_foto_url"),
            "iniciais": nome[:1].upper() if nome else "?",
        }
    }


# ===== PÁGINAS =====
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/login")
def login_page():
    if session.get("usuario_email"):
        return redirect(url_for("home"))
    return render_template("login.html")

@app.route("/cadastro")
def cadastro_page():
    if session.get("usuario_email"):
        return redirect(url_for("home"))
    return render_template("cadastro.html")

@app.route("/agendamento")
def agendamento_page():
    return render_template("agendamento.html")


# ===== PÁGINAS INTERNAS (protegidas) =====
# Ainda em construção — existem agora para o Header Global ter destinos
# reais (nada de link quebrado) enquanto cada uma é desenvolvida nas
# próximas etapas.
@app.route("/perfil")
@login_required
def perfil_page():
    return render_template("em_construcao.html", titulo="Meu Perfil")

@app.route("/configuracoes")
@login_required
def configuracoes_page():
    return render_template("em_construcao.html", titulo="Configurações")

@app.route("/meus-agendamentos")
@login_required
def meus_agendamentos_page():
    return render_template("em_construcao.html", titulo="Meus Agendamentos")

@app.route("/agendamentos-do-dia")
@login_required
def agendamentos_dia_page():
    return render_template("em_construcao.html", titulo="Agendamentos do Dia")

@app.route("/clientes")
@login_required
def clientes_page():
    return render_template("em_construcao.html", titulo="Clientes")

@app.route("/servicos")
@login_required
def servicos_page():
    return render_template("em_construcao.html", titulo="Serviços")

@app.route("/financeiro")
@login_required
def financeiro_page():
    return render_template("em_construcao.html", titulo="Financeiro")


# ===== AUTH GOOGLE =====
@app.route("/auth/google")
def auth_google():
    redirect_uri = url_for("auth_google_callback", _external=True)
    print("Redirect URI:", redirect_uri)
    return oauth.google.authorize_redirect(redirect_uri)

@app.route("/auth/google/callback")
def auth_google_callback():
    token = oauth.google.authorize_access_token()
    user_info = token.get("userinfo")  # openid já retorna direto

    if not user_info or not user_info.get("email"):
        return redirect(url_for("login_page"))

    upsert_oauth_user(
        nome=user_info["name"],
        email=user_info["email"],
        provider="google",
        oauth_id=user_info["sub"],
    )
    return redirect(url_for("home"))


# ===== AUTH FACEBOOK =====
@app.route("/auth/facebook")
def auth_facebook():
    redirect_uri = url_for("auth_facebook_callback", _external=True)
    return oauth.facebook.authorize_redirect(redirect_uri)

@app.route("/auth/facebook/callback")
def auth_facebook_callback():
    token = oauth.facebook.authorize_access_token()
    resp = oauth.facebook.get(
        "me",
        token=token,
        params={"fields": "id,name,email"},
    )
    user_info = resp.json()

    email = user_info.get("email")
    if not email:
        # Facebook pode não retornar email se o usuário não tiver confirmado
        return redirect(url_for("login_page"))

    upsert_oauth_user(
        nome=user_info["name"],
        email=email,
        provider="facebook",
        oauth_id=user_info["id"],
    )
    return redirect(url_for("home"))


# ===== API LOGIN/CADASTRO =====
@app.route("/api/cadastro", methods=["POST"])
def cadastro():
    dados = request.get_json(silent=True) or {}
    nome  = (dados.get("nome") or "").strip()
    email = (dados.get("email") or "").strip().lower()
    senha = dados.get("senha") or ""

    if not nome or len(nome) < 2:
        return jsonify({"erro": "Informe um nome válido."}), 400
    if "@" not in email:
        return jsonify({"erro": "Informe um e-mail válido."}), 400
    if len(senha) < 6:
        return jsonify({"erro": "A senha precisa ter no mínimo 6 caracteres."}), 400

    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)",
            (nome, email, generate_password_hash(senha)),
        )
        conn.commit()
        usuario = conn.execute(
            "SELECT * FROM usuarios WHERE email = ?", (email,)
        ).fetchone()
    except sqlite3.IntegrityError:
        return jsonify({"erro": "Este e-mail já está cadastrado."}), 409
    finally:
        conn.close()

    _logar_usuario(usuario)
    return jsonify({"ok": True, "nome": usuario["nome"]}), 201


@app.route("/api/login", methods=["POST"])
def login():
    dados = request.get_json(silent=True) or {}
    email = (dados.get("email") or "").strip().lower()
    senha = dados.get("senha") or ""

    conn = get_db()
    usuario = conn.execute(
        "SELECT * FROM usuarios WHERE email = ?", (email,)
    ).fetchone()
    conn.close()

    if not usuario or not usuario["senha_hash"] or \
       not check_password_hash(usuario["senha_hash"], senha):
        return jsonify({"erro": "E-mail ou senha incorretos."}), 401

    session.clear()
    _logar_usuario(usuario)
    return jsonify({"ok": True, "nome": usuario["nome"]}), 200


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(debug=True)