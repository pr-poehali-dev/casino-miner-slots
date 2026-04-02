"""Аутентификация казино: регистрация, вход, получение профиля."""
import json
import os
import random
import string
import hashlib
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_user_id() -> str:
    return ''.join(random.choices(string.digits, k=8))

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    body = json.loads(event.get('body') or '{}')
    params = event.get('queryStringParameters') or {}

    # Определяем действие из тела или query
    action = body.get('action') or params.get('action', '')

    conn = get_conn()
    cur = conn.cursor()

    try:
        # Регистрация
        if action == 'register' and method == 'POST':
            username = body.get('username', '').strip()
            password = body.get('password', '')

            if not username or not password:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Заполните все поля'})}

            if len(username) < 3:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Имя минимум 3 символа'})}

            cur.execute("SELECT id FROM casino_users WHERE username = %s", (username,))
            if cur.fetchone():
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Имя уже занято'})}

            user_id = generate_user_id()
            for _ in range(10):
                cur.execute("SELECT id FROM casino_users WHERE user_id = %s", (user_id,))
                if not cur.fetchone():
                    break
                user_id = generate_user_id()

            pw_hash = hash_password(password)
            cur.execute(
                "INSERT INTO casino_users (user_id, username, password_hash, balance) VALUES (%s, %s, %s, 1000.00) RETURNING user_id, username, balance, is_admin",
                (user_id, username, pw_hash)
            )
            row = cur.fetchone()
            conn.commit()
            return {
                'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'user_id': row[0], 'username': row[1], 'balance': float(row[2]), 'is_admin': row[3]})
            }

        # Вход
        if action == 'login' and method == 'POST':
            username = body.get('username', '').strip()
            password = body.get('password', '')
            pw_hash = hash_password(password)

            cur.execute(
                "SELECT user_id, username, balance, is_admin, is_banned FROM casino_users WHERE username = %s AND password_hash = %s",
                (username, pw_hash)
            )
            row = cur.fetchone()
            if not row:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Неверный логин или пароль'})}
            if row[4]:
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Аккаунт заблокирован'})}

            return {
                'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'user_id': row[0], 'username': row[1], 'balance': float(row[2]), 'is_admin': row[3]})
            }

        # Получить профиль
        if action == 'profile' and method == 'GET':
            user_id = params.get('user_id')
            if not user_id:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'user_id required'})}

            cur.execute(
                "SELECT user_id, username, balance, is_admin, created_at FROM casino_users WHERE user_id = %s",
                (user_id,)
            )
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Пользователь не найден'})}

            cur.execute(
                "SELECT type, amount, description, created_at FROM casino_transactions WHERE from_user_id = %s OR to_user_id = %s ORDER BY created_at DESC LIMIT 20",
                (user_id, user_id)
            )
            txs = [{'type': r[0], 'amount': float(r[1]), 'description': r[2], 'created_at': str(r[3])} for r in cur.fetchall()]

            return {
                'statusCode': 200, 'headers': CORS,
                'body': json.dumps({
                    'user_id': row[0], 'username': row[1], 'balance': float(row[2]),
                    'is_admin': row[3], 'created_at': str(row[4]), 'transactions': txs
                })
            }

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found', 'action': action})}

    finally:
        cur.close()
        conn.close()
