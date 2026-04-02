"""Игровые эндпоинты казино: минёр, краш, слоты."""
import json
import os
import random
import psycopg2
from decimal import Decimal

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
        # === МИНЁР ===
        if path.endswith('/miner/start') and method == 'POST':
            user_id = body.get('user_id')
            bet = float(body.get('bet', 0))
            mines_count = int(body.get('mines', 3))

            if mines_count < 1 or mines_count > 20:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Мин от 1 до 20'})}

            cur.execute("SELECT balance FROM casino_users WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            if not row or float(row[0]) < bet:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Недостаточно средств'})}

            # Списываем ставку
            cur.execute("UPDATE casino_users SET balance = balance - %s WHERE user_id = %s RETURNING balance", (bet, user_id))
            new_balance = float(cur.fetchone()[0])

            # Генерируем поле 5x5 = 25 клеток
            positions = list(range(25))
            mine_positions = random.sample(positions, mines_count)

            cur.execute(
                "INSERT INTO casino_transactions (from_user_id, amount, type, description) VALUES (%s, %s, 'bet', 'Минёр: ставка')",
                (user_id, bet)
            )

            game_data = {'mines': mine_positions, 'mines_count': mines_count, 'bet': bet, 'revealed': []}
            cur.execute(
                "INSERT INTO casino_game_sessions (user_id, game_type, bet_amount, result, game_data) VALUES (%s, 'miner', %s, 'active', %s) RETURNING id",
                (user_id, bet, json.dumps(game_data))
            )
            session_id = cur.fetchone()[0]
            conn.commit()

            return {
                'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'session_id': session_id, 'balance': new_balance, 'mines_count': mines_count})
            }

        if path.endswith('/miner/reveal') and method == 'POST':
            user_id = body.get('user_id')
            session_id = body.get('session_id')
            cell = int(body.get('cell', 0))

            cur.execute("SELECT game_data, bet_amount FROM casino_game_sessions WHERE id = %s AND user_id = %s AND result = 'active'", (session_id, user_id))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Сессия не найдена'})}

            game_data = row[0]
            bet = float(row[1])

            if cell in game_data['mines']:
                # Попал на мину
                cur.execute("UPDATE casino_game_sessions SET result = 'lose', game_data = %s WHERE id = %s", (json.dumps({**game_data, 'revealed': game_data['revealed'] + [cell]}), session_id))
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'result': 'mine', 'mines': game_data['mines']})}

            revealed = game_data['revealed'] + [cell]
            safe_count = 25 - game_data['mines_count']
            revealed_count = len(revealed)

            # Множитель
            multiplier = 1.0
            for i in range(revealed_count):
                multiplier *= (25 - game_data['mines_count'] - i) / (25 - i)
            multiplier = max(round(1.0 / multiplier * 0.97, 2), 1.01)

            win_amount = round(bet * multiplier, 2)
            game_data['revealed'] = revealed
            cur.execute("UPDATE casino_game_sessions SET game_data = %s WHERE id = %s", (json.dumps(game_data), session_id))
            conn.commit()

            return {
                'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'result': 'safe', 'revealed': revealed, 'multiplier': multiplier, 'potential_win': win_amount, 'can_cashout': True})
            }

        if path.endswith('/miner/cashout') and method == 'POST':
            user_id = body.get('user_id')
            session_id = body.get('session_id')

            cur.execute("SELECT game_data, bet_amount FROM casino_game_sessions WHERE id = %s AND user_id = %s AND result = 'active'", (session_id, user_id))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Сессия не найдена'})}

            game_data = row[0]
            bet = float(row[1])
            revealed_count = len(game_data['revealed'])

            if revealed_count == 0:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Откройте хотя бы одну клетку'})}

            multiplier = 1.0
            for i in range(revealed_count):
                multiplier *= (25 - game_data['mines_count'] - i) / (25 - i)
            multiplier = max(round(1.0 / multiplier * 0.97, 2), 1.01)
            win_amount = round(bet * multiplier, 2)

            cur.execute("UPDATE casino_users SET balance = balance + %s WHERE user_id = %s RETURNING balance", (win_amount, user_id))
            new_balance = float(cur.fetchone()[0])
            cur.execute("UPDATE casino_game_sessions SET result = 'win', win_amount = %s WHERE id = %s", (win_amount, session_id))
            cur.execute("INSERT INTO casino_transactions (to_user_id, amount, type, description) VALUES (%s, %s, 'win', 'Минёр: выигрыш')", (user_id, win_amount))
            conn.commit()

            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'win': win_amount, 'multiplier': multiplier, 'balance': new_balance})}

        # === КРАШ ===
        if path.endswith('/crash/start') and method == 'POST':
            user_id = body.get('user_id')
            bet = float(body.get('bet', 0))

            cur.execute("SELECT balance FROM casino_users WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            if not row or float(row[0]) < bet:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Недостаточно средств'})}

            cur.execute("UPDATE casino_users SET balance = balance - %s WHERE user_id = %s RETURNING balance", (bet, user_id))
            new_balance = float(cur.fetchone()[0])

            # Генерируем точку краша (взвешенное распределение)
            r = random.random()
            if r < 0.33:
                crash_at = round(random.uniform(1.0, 1.5), 2)
            elif r < 0.6:
                crash_at = round(random.uniform(1.5, 3.0), 2)
            elif r < 0.8:
                crash_at = round(random.uniform(3.0, 7.0), 2)
            elif r < 0.93:
                crash_at = round(random.uniform(7.0, 20.0), 2)
            else:
                crash_at = round(random.uniform(20.0, 100.0), 2)

            cur.execute("INSERT INTO casino_transactions (from_user_id, amount, type, description) VALUES (%s, %s, 'bet', 'Краш: ставка')", (user_id, bet))
            cur.execute(
                "INSERT INTO casino_game_sessions (user_id, game_type, bet_amount, result, game_data) VALUES (%s, 'crash', %s, 'active', %s) RETURNING id",
                (user_id, bet, json.dumps({'crash_at': crash_at, 'bet': bet}))
            )
            session_id = cur.fetchone()[0]
            conn.commit()

            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'session_id': session_id, 'balance': new_balance, 'crash_at': crash_at})}

        if path.endswith('/crash/cashout') and method == 'POST':
            user_id = body.get('user_id')
            session_id = body.get('session_id')
            cashout_at = float(body.get('cashout_at', 1.0))

            cur.execute("SELECT game_data, bet_amount FROM casino_game_sessions WHERE id = %s AND user_id = %s AND result = 'active'", (session_id, user_id))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Сессия не найдена'})}

            game_data = row[0]
            bet = float(row[1])
            crash_at = game_data['crash_at']

            if cashout_at > crash_at:
                cur.execute("UPDATE casino_game_sessions SET result = 'lose' WHERE id = %s", (session_id,))
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'result': 'crash', 'crash_at': crash_at})}

            win_amount = round(bet * cashout_at, 2)
            cur.execute("UPDATE casino_users SET balance = balance + %s WHERE user_id = %s RETURNING balance", (win_amount, user_id))
            new_balance = float(cur.fetchone()[0])
            cur.execute("UPDATE casino_game_sessions SET result = 'win', win_amount = %s WHERE id = %s", (win_amount, session_id))
            cur.execute("INSERT INTO casino_transactions (to_user_id, amount, type, description) VALUES (%s, %s, 'win', 'Краш: выигрыш')", (user_id, win_amount))
            conn.commit()

            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'result': 'win', 'win': win_amount, 'balance': new_balance})}

        # === СЛОТ КЛАССИЧЕСКИЙ ===
        if path.endswith('/slot/spin') and method == 'POST':
            user_id = body.get('user_id')
            bet = float(body.get('bet', 0))

            cur.execute("SELECT balance FROM casino_users WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            if not row or float(row[0]) < bet:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Недостаточно средств'})}

            cur.execute("UPDATE casino_users SET balance = balance - %s WHERE user_id = %s RETURNING balance", (bet, user_id))
            new_balance = float(cur.fetchone()[0])

            symbols = ['🍋', '🍊', '🍇', '🍒', '⭐', '💎', '7️⃣']
            weights = [25, 22, 18, 15, 10, 7, 3]

            reels = []
            for _ in range(3):
                col = random.choices(symbols, weights=weights, k=3)
                reels.append(col)

            # Проверяем выигрышные линии (средняя строка)
            line = [reels[0][1], reels[1][1], reels[2][1]]
            win = 0
            result = 'lose'

            multipliers = {'7️⃣': 50, '💎': 20, '⭐': 10, '🍒': 5, '🍇': 3, '🍊': 2, '🍋': 1.5}

            if line[0] == line[1] == line[2]:
                mult = multipliers.get(line[0], 1)
                win = round(bet * mult, 2)
                result = 'win'
            elif line[0] == line[1] or line[1] == line[2]:
                win = round(bet * 0.5, 2)
                result = 'small_win'

            if win > 0:
                cur.execute("UPDATE casino_users SET balance = balance + %s WHERE user_id = %s RETURNING balance", (win, user_id))
                new_balance = float(cur.fetchone()[0])
                cur.execute("INSERT INTO casino_transactions (to_user_id, amount, type, description) VALUES (%s, %s, 'win', 'Слот: выигрыш')", (user_id, win))

            cur.execute("INSERT INTO casino_transactions (from_user_id, amount, type, description) VALUES (%s, %s, 'bet', 'Слот: ставка')", (user_id, bet))
            cur.execute("INSERT INTO casino_game_sessions (user_id, game_type, bet_amount, win_amount, result, game_data) VALUES (%s, 'slot_classic', %s, %s, %s, %s)",
                (user_id, bet, win, result, json.dumps({'reels': reels, 'line': line})))
            conn.commit()

            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'reels': reels, 'win': win, 'result': result, 'balance': new_balance})}

        # === СЛОТ БОНУСНЫЙ ===
        if path.endswith('/slot-bonus/spin') and method == 'POST':
            user_id = body.get('user_id')
            bet = float(body.get('bet', 0))
            buy_bonus = body.get('buy_bonus', False)
            is_bonus_spin = body.get('is_bonus_spin', False)

            if not is_bonus_spin:
                cur.execute("SELECT balance FROM casino_users WHERE user_id = %s", (user_id,))
                row = cur.fetchone()
                spin_cost = bet * 100 if buy_bonus else bet
                if not row or float(row[0]) < spin_cost:
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Недостаточно средств'})}

                cur.execute("UPDATE casino_users SET balance = balance - %s WHERE user_id = %s RETURNING balance", (spin_cost, user_id))
                new_balance = float(cur.fetchone()[0])
                cur.execute("INSERT INTO casino_transactions (from_user_id, amount, type, description) VALUES (%s, %s, 'bet', %s)", (user_id, spin_cost, 'Бонус слот: покупка бонуса' if buy_bonus else 'Бонус слот: ставка'))
            else:
                cur.execute("SELECT balance FROM casino_users WHERE user_id = %s", (user_id,))
                row = cur.fetchone()
                new_balance = float(row[0]) if row else 0

            symbols = ['🎰', '🃏', '👑', '🔔', '💰', '🌟', '🎁']
            weights_normal = [25, 20, 15, 15, 12, 8, 5]
            weights_bonus = [15, 15, 15, 15, 15, 15, 10]

            w = weights_bonus if (buy_bonus or is_bonus_spin) else weights_normal

            reels = []
            for _ in range(3):
                col = random.choices(symbols, weights=w, k=3)
                reels.append(col)

            line = [reels[0][1], reels[1][1], reels[2][1]]

            # Проверяем бонус символы (🎁) - 3 дают бонусную игру
            bonus_symbols = sum(1 for r in reels for s in r if s == '🎁')
            triggered_bonus = bonus_symbols >= 3 or buy_bonus

            win = 0
            result = 'lose'
            bonus_spins = 0

            multipliers = {'👑': 30, '💰': 20, '🌟': 15, '🔔': 8, '🃏': 4, '🎰': 2, '🎁': 5}

            if line[0] == line[1] == line[2]:
                mult = multipliers.get(line[0], 1)
                if is_bonus_spin:
                    mult *= 3
                win = round(bet * mult, 2)
                result = 'win'
            elif line.count(line[1]) >= 2:
                win = round(bet * 0.8, 2)
                result = 'small_win'

            if triggered_bonus and not is_bonus_spin:
                bonus_spins = 10
                result = 'bonus'
                win += round(bet * 5, 2)

            if win > 0:
                cur.execute("UPDATE casino_users SET balance = balance + %s WHERE user_id = %s RETURNING balance", (win, user_id))
                new_balance = float(cur.fetchone()[0])
                cur.execute("INSERT INTO casino_transactions (to_user_id, amount, type, description) VALUES (%s, %s, 'win', 'Бонус слот: выигрыш')", (user_id, win))

            cur.execute("INSERT INTO casino_game_sessions (user_id, game_type, bet_amount, win_amount, result, game_data) VALUES (%s, 'slot_bonus', %s, %s, %s, %s)",
                (user_id, bet, win, result, json.dumps({'reels': reels, 'bonus': triggered_bonus, 'bonus_spins': bonus_spins})))
            conn.commit()

            return {
                'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'reels': reels, 'win': win, 'result': result, 'balance': new_balance, 'bonus_triggered': triggered_bonus, 'bonus_spins': bonus_spins})
            }

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}

    finally:
        cur.close()
        conn.close()
