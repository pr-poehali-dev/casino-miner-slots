"""Переводы между игроками казино по ID."""
import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    path = event.get('path', '/')
    method = event.get('httpMethod', 'GET')
    body = json.loads(event.get('body') or '{}')

    conn = get_conn()
    cur = conn.cursor()

    try:
        if path.endswith('/send') and method == 'POST':
            from_id = body.get('from_user_id')
            to_id = body.get('to_user_id')
            amount = float(body.get('amount', 0))

            if not from_id or not to_id or amount <= 0:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Неверные данные'})}

            if from_id == to_id:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нельзя переводить самому себе'})}

            if amount < 1:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Минимальный перевод 1 К'})}

            cur.execute("SELECT balance, username FROM casino_users WHERE user_id = %s", (from_id,))
            sender = cur.fetchone()
            if not sender:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Отправитель не найден'})}

            if float(sender[0]) < amount:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Недостаточно средств'})}

            cur.execute("SELECT username FROM casino_users WHERE user_id = %s AND is_banned = FALSE", (to_id,))
            receiver = cur.fetchone()
            if not receiver:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Получатель не найден'})}

            cur.execute("UPDATE casino_users SET balance = balance - %s WHERE user_id = %s RETURNING balance", (amount, from_id))
            new_balance = float(cur.fetchone()[0])
            cur.execute("UPDATE casino_users SET balance = balance + %s WHERE user_id = %s", (amount, to_id))
            cur.execute(
                "INSERT INTO casino_transactions (from_user_id, to_user_id, amount, type, description) VALUES (%s, %s, %s, 'transfer', %s)",
                (from_id, to_id, amount, f'Перевод: {sender[1]} → {receiver[0]}')
            )
            conn.commit()

            return {
                'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'success': True, 'balance': new_balance, 'to_username': receiver[0], 'amount': amount})
            }

        # Поиск пользователя по ID
        if path.endswith('/find') and method == 'GET':
            params = event.get('queryStringParameters') or {}
            target_id = params.get('user_id', '')

            cur.execute("SELECT user_id, username FROM casino_users WHERE user_id = %s AND is_banned = FALSE", (target_id,))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Пользователь не найден'})}

            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'user_id': row[0], 'username': row[1]})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}

    finally:
        cur.close()
        conn.close()
