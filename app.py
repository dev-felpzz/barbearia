import os
from functools import wraps

import pymysql
import pymysql.cursors
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from authlib.integrations.flask_client import OAuth

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "troque-em-producao")


# =============================================================
#  BANCO — MySQL / MariaDB via PyMySQL
# =============================================================
def get_db():
    return pymysql.connect(
        host="localhost",
        port=3306,
        user="root",        # ou o usuário que você usa
        password="",        # sem senha
        database="elite_barber",
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


# =============================================================
#  OAUTH
# =============================================================
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


# =============================================================
#  HELPERS DE AUTENTICAÇÃO
# =============================================================
def _logar_usuario(usuario):
    """Centraliza o que vai pra sessão ao autenticar."""
    session["usuario_email"]    = usuario["email"]
    session["usuario_nome"]     = usuario["nome"]
    session["usuario_tipo"]     = usuario["tipo"] or "cliente"
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
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM usuarios WHERE email = %s", (email,))
            usuario = cur.fetchone()

            if not usuario:
                cur.execute(
                    "INSERT INTO usuarios (nome, email, oauth_provider, oauth_id) "
                    "VALUES (%s, %s, %s, %s)",
                    (nome, email, provider, oauth_id),
                )
                conn.commit()
                cur.execute("SELECT * FROM usuarios WHERE email = %s", (email,))
                usuario = cur.fetchone()
    finally:
        conn.close()

    _logar_usuario(usuario)


# =============================================================
#  CONTEXT PROCESSOR — current_user em todos os templates
# =============================================================
@app.context_processor
def injetar_usuario_atual():
    if not session.get("usuario_email"):
        return {"current_user": None}

    nome = session.get("usuario_nome") or ""
    return {
        "current_user": {
            "nome":      nome,
            "email":     session.get("usuario_email"),
            "tipo":      session.get("usuario_tipo", "cliente"),
            "foto_url":  session.get("usuario_foto_url"),
            "iniciais":  nome[:1].upper() if nome else "?",
        }
    }


# =============================================================
#  PÁGINAS PÚBLICAS
# =============================================================
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


# =============================================================
#  PÁGINAS PROTEGIDAS
# =============================================================
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


# =============================================================
#  AUTH GOOGLE
# =============================================================
@app.route("/auth/google")
def auth_google():
    redirect_uri = url_for("auth_google_callback", _external=True)
    print("Redirect URI:", redirect_uri)
    return oauth.google.authorize_redirect(redirect_uri)

@app.route("/auth/google/callback")
def auth_google_callback():
    token     = oauth.google.authorize_access_token()
    user_info = token.get("userinfo")

    if not user_info or not user_info.get("email"):
        return redirect(url_for("login_page"))

    upsert_oauth_user(
        nome=user_info["name"],
        email=user_info["email"],
        provider="google",
        oauth_id=user_info["sub"],
    )
    return redirect(url_for("home"))


# =============================================================
#  AUTH FACEBOOK
# =============================================================
@app.route("/auth/facebook")
def auth_facebook():
    redirect_uri = url_for("auth_facebook_callback", _external=True)
    return oauth.facebook.authorize_redirect(redirect_uri)

@app.route("/auth/facebook/callback")
def auth_facebook_callback():
    token     = oauth.facebook.authorize_access_token()
    resp      = oauth.facebook.get("me", token=token, params={"fields": "id,name,email"})
    user_info = resp.json()

    email = user_info.get("email")
    if not email:
        return redirect(url_for("login_page"))

    upsert_oauth_user(
        nome=user_info["name"],
        email=email,
        provider="facebook",
        oauth_id=user_info["id"],
    )
    return redirect(url_for("home"))


# =============================================================
#  API — CADASTRO
# =============================================================
@app.route("/api/cadastro", methods=["POST"])
def cadastro():
    dados = request.get_json(silent=True) or {}
    nome  = (dados.get("nome")  or "").strip()
    email = (dados.get("email") or "").strip().lower()
    senha =  dados.get("senha") or ""

    if not nome or len(nome) < 2:
        return jsonify({"erro": "Informe um nome válido."}), 400
    if "@" not in email:
        return jsonify({"erro": "Informe um e-mail válido."}), 400
    if len(senha) < 6:
        return jsonify({"erro": "A senha precisa ter no mínimo 6 caracteres."}), 400

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO usuarios (nome, email, senha_hash) VALUES (%s, %s, %s)",
                (nome, email, generate_password_hash(senha)),
            )
            conn.commit()
            cur.execute("SELECT * FROM usuarios WHERE email = %s", (email,))
            usuario = cur.fetchone()
    except pymysql.err.IntegrityError:
        return jsonify({"erro": "Este e-mail já está cadastrado."}), 409
    finally:
        conn.close()

    _logar_usuario(usuario)
    return jsonify({"ok": True, "nome": usuario["nome"]}), 201


# =============================================================
#  API — LOGIN
# =============================================================
@app.route("/api/login", methods=["POST"])
def login():
    dados = request.get_json(silent=True) or {}
    email = (dados.get("email") or "").strip().lower()
    senha =  dados.get("senha") or ""

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM usuarios WHERE email = %s", (email,))
            usuario = cur.fetchone()
    finally:
        conn.close()

    if not usuario or not usuario["senha_hash"] or \
       not check_password_hash(usuario["senha_hash"], senha):
        return jsonify({"erro": "E-mail ou senha incorretos."}), 401

    session.clear()
    _logar_usuario(usuario)
    return jsonify({"ok": True, "nome": usuario["nome"]}), 200


# =============================================================
#  API — LOGOUT
# =============================================================
@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})


# =============================================================
#  API — AGENDAMENTO
# =============================================================
@app.route("/api/agendamento", methods=["POST"])
def criar_agendamento():
    """Cria um novo agendamento.

    Body JSON esperado:
    {
        "barbeiro_id": 1,
        "servico_id":  2,
        "data":        "2025-07-10",   (YYYY-MM-DD)
        "slot_id":     3,
        "whatsapp":    "11999998888",
        "observacoes": "..."           (opcional)
    }
    """
    if not session.get("usuario_email"):
        return jsonify({"erro": "Faça login para agendar."}), 401

    dados       = request.get_json(silent=True) or {}
    barbeiro_id = dados.get("barbeiro_id")
    servico_id  = dados.get("servico_id")
    data        = dados.get("data")
    slot_id     = dados.get("slot_id")
    whatsapp    = (dados.get("whatsapp") or "").strip()
    observacoes = (dados.get("observacoes") or "").strip() or None

    if not all([barbeiro_id, servico_id, data, slot_id, whatsapp]):
        return jsonify({"erro": "Preencha todos os campos obrigatórios."}), 400

    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Busca o id do cliente pelo e-mail da sessão
            cur.execute(
                "SELECT id FROM usuarios WHERE email = %s",
                (session["usuario_email"],),
            )
            cliente = cur.fetchone()
            if not cliente:
                return jsonify({"erro": "Usuário não encontrado."}), 404

            cur.execute(
                """
                INSERT INTO agendamentos
                    (cliente_id, whatsapp, barbeiro_id, servico_id, data, slot_id, observacoes)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (cliente["id"], whatsapp, barbeiro_id, servico_id, data, slot_id, observacoes),
            )
            conn.commit()
            agendamento_id = cur.lastrowid

    except pymysql.err.IntegrityError:
        # UNIQUE (barbeiro_id, data, slot_id) violado → horário já ocupado
        return jsonify({"erro": "Este horário já está reservado. Escolha outro."}), 409
    finally:
        conn.close()

    return jsonify({"ok": True, "agendamento_id": agendamento_id}), 201


@app.route("/api/slots-disponiveis", methods=["GET"])
def slots_disponiveis():
    """Retorna os slots livres para um barbeiro em uma data.

    Query params: barbeiro_id, data (YYYY-MM-DD)
    """
    barbeiro_id = request.args.get("barbeiro_id")
    data        = request.args.get("data")

    if not barbeiro_id or not data:
        return jsonify({"erro": "Informe barbeiro_id e data."}), 400

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT sh.id, sh.horario
                FROM slots_horario sh
                WHERE sh.id NOT IN (
                    SELECT slot_id FROM agendamentos
                    WHERE barbeiro_id = %s
                      AND data = %s
                      AND status != 'cancelado'
                )
                ORDER BY sh.horario
                """,
                (barbeiro_id, data),
            )
            slots = cur.fetchall()
    finally:
        conn.close()

    # Formata TIME (timedelta) como string "HH:MM"
    resultado = [
        {"id": s["id"], "horario": str(s["horario"])[:5]}
        for s in slots
    ]
    return jsonify(resultado), 200


@app.route("/api/servicos", methods=["GET"])
def listar_servicos():
    """Retorna todos os serviços ativos."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, nome, descricao, preco, duracao_min "
                "FROM servicos WHERE ativo = 1 ORDER BY nome",
            )
            servicos = cur.fetchall()
    finally:
        conn.close()

    return jsonify(servicos), 200


@app.route("/api/barbeiros", methods=["GET"])
def listar_barbeiros():
    """Retorna todos os barbeiros ativos com nome e foto."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT b.id, u.nome, u.foto_url, b.bio, b.especialidades
                FROM barbeiros b
                JOIN usuarios u ON u.id = b.usuario_id
                WHERE b.ativo = 1
                ORDER BY u.nome
                """,
            )
            barbeiros = cur.fetchall()
    finally:
        conn.close()

    return jsonify(barbeiros), 200


if __name__ == "__main__":
    app.run(debug=True)