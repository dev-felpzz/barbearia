"""
app.py — Backend Flask da Elite Barber
Responsável por: criação do banco SQLite, cadastro, login e sessão do usuário.
"""

import sqlite3
from pathlib import Path

from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

# Chave usada para assinar o cookie de sessão. Em produção, troque por uma
# variável de ambiente (ex: os.environ["SECRET_KEY"]) — nunca deixe fixa.
app.secret_key = "troque-esta-chave-em-producao"

DB_PATH = Path(__file__).parent / "database.db"


# ===== BANCO DE DADOS =====

def get_db():
    """Abre uma conexão com o SQLite, retornando linhas como dicionários."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Cria a tabela de usuários caso ainda não exista. Chamado uma vez no startup."""
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            senha_hash TEXT NOT NULL,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


# ===== PÁGINAS =====

@app.route("/")
def home():
    usuario_logado = session.get("usuario_nome")
    return render_template("index.html", usuario_logado=usuario_logado)


@app.route("/login")
def login_page():
    # se já estiver logado, não faz sentido mostrar a tela de login de novo
    if session.get("usuario_email"):
        return redirect(url_for("home"))
    return render_template("login.html")


@app.route("/cadastro")
def cadastro_page():
    if session.get("usuario_email"):
        return redirect(url_for("home"))
    return render_template("cadastro.html")


# ===== API DE AUTENTICAÇÃO (usada pelo modal via fetch) =====

@app.route("/api/cadastro", methods=["POST"])
def cadastro():
    dados = request.get_json(silent=True) or {}
    nome = (dados.get("nome") or "").strip()
    email = (dados.get("email") or "").strip().lower()
    senha = dados.get("senha") or ""

    # validação básica no servidor (nunca confie só na validação do front)
    if not nome or len(nome) < 2:
        return jsonify({"erro": "Informe um nome válido."}), 400
    if "@" not in email or "." not in email:
        return jsonify({"erro": "Informe um e-mail válido."}), 400
    if len(senha) < 6:
        return jsonify({"erro": "A senha precisa ter no mínimo 6 caracteres."}), 400

    senha_hash = generate_password_hash(senha)

    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)",
            (nome, email, senha_hash),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        # a coluna email é UNIQUE — cai aqui se já existir um cadastro com o mesmo e-mail
        return jsonify({"erro": "Este e-mail já está cadastrado."}), 409
    finally:
        conn.close()

    # loga o usuário automaticamente após o cadastro
    session["usuario_email"] = email
    session["usuario_nome"] = nome
    return jsonify({"ok": True, "nome": nome}), 201


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

    # mensagem genérica de propósito: não revelamos se o erro foi
    # "email não existe" ou "senha errada" (evita enumeração de e-mails)
    if not usuario or not check_password_hash(usuario["senha_hash"], senha):
        return jsonify({"erro": "E-mail ou senha incorretos."}), 401

    session["usuario_email"] = usuario["email"]
    session["usuario_nome"] = usuario["nome"]
    return jsonify({"ok": True, "nome": usuario["nome"]}), 200


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})


if __name__ == "__main__":
    init_db()
    app.run(debug=True)