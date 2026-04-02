"""Админ панель казино: управление пользователями, выдача монет, назначение администраторов."""
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

def check_admin(cur, user_id):
    cur.execute("SELECT is_admin FROM casino_users WHERE user_id = %s", (user_id,))
    row = cur.fetchone()
    return row and row[0]

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    path = event.get('path', '/')
    method = event.get('httpMethod', 'GET')
    body = json.loads(event.get('body') or '{}')
    params = event.get('queryStringParameters') or {}

    conn = get_conn()
    cur = conn.cursor()

    try:
        admin_id = body.get('admin_id') or params.get('admin_id')

        # Список всех пользователей
        if path.endswith('/users') and method == 'GET':
            if not check_admin(cur, admin_id):
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет доступа'})}

            cur.execute("""
                SELECT u.user_id, u.username, u.balance, u.is_admin, u.is_banned, u.created_at,
                    (SELECT COUNT(*) FROM casino_game_sessions WHERE user_id = u.user_id) as games_count,
                    (SELECT COALESCE(SUM(bet_amount), 0) FROM casino_game_sessions WHERE user_id = u.user_id) as total_bet
                FROM casino_users u
                ORDER BY u.created_at DESC
            """)
            users = []
            for r in cur.fetchall():
                users.append({
                    'user_id': r[0], 'username': r[1], 'balance': float(r[2]),
                    'is_admin': r[3], 'is_banned': r[4], 'created_at': str(r[5]),
                    'games_count': r[6], 'total_bet': float(r[7])
                })
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'users': users})}

        # Статистика
        if path.endswith('/stats') and method == 'GET':
            if not check_admin(cur, admin_id):
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет доступа'})}

            cur.execute("SELECT COUNT(*) FROM casino_users")
            total_users = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM casino_game_sessions")
            total_games = cur.fetchone()[0]
            cur.execute("SELECT COALESCE(SUM(bet_amount), 0) FROM casino_game_sessions")
            total_bets = float(cur.fetchone()[0])
            cur.execute("SELECT COALESCE(SUM(win_amount), 0) FROM casino_game_sessions WHERE result = 'win'")
            total_wins = float(cur.fetchone()[0])

            return {
                'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'total_users': total_users, 'total_games': total_games, 'total_bets': total_bets, 'total_wins': total_wins})
            }

        # Выдать монеты пользователю
        if path.endswith('/give-coins') and method == 'POST':
            if not check_admin(cur, admin_id):
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет доступа'})}

            target_id = body.get('target_user_id')
            amount = float(body.get('amount', 0))

            cur.execute("UPDATE casino_users SET balance = balance + %s WHERE user_id = %s RETURNING balance", (amount, target_id))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Пользователь не найден'})}

            cur.execute("INSERT INTO casino_transactions (to_user_id, from_user_id, amount, type, description) VALUES (%s, %s, %s, 'bonus', 'Выдача монет администратором')", (target_id, admin_id, amount))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'new_balance': float(row[0])})}

        # Назначить/снять администратора
        if path.endswith('/set-admin') and method == 'POST':
            if not check_admin(cur, admin_id):
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет доступа'})}

            target_id = body.get('target_user_id')
            is_admin = body.get('is_admin', False)

            cur.execute("UPDATE casino_users SET is_admin = %s WHERE user_id = %s RETURNING user_id", (is_admin, target_id))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Пользователь не найден'})}

            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'success': True})}

        # Забанить/разбанить
        if path.endswith('/ban') and method == 'POST':
            if not check_admin(cur, admin_id):
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет доступа'})}

            target_id = body.get('target_user_id')
            is_banned = body.get('is_banned', True)

            cur.execute("UPDATE casino_users SET is_banned = %s WHERE user_id = %s RETURNING user_id", (is_banned, target_id))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Пользователь не найден'})}

            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'success': True})}

        # Первичная установка первого администратора (по секретному коду)
        if path.endswith('/init-admin') and method == 'POST':
            secret = body.get('secret')
            target_id = body.get('user_id')

            if secret != os.environ.get('ADMIN_SECRET', 'kazakh2024secret'):
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Неверный секрет'})}

            cur.execute("UPDATE casino_users SET is_admin = TRUE WHERE user_id = %s RETURNING user_id", (target_id,))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Пользователь не найден'})}

            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'success': True})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}

    finally:
        cur.close()
        conn.close()
