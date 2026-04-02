
-- Casino KazakhCoin users
CREATE TABLE casino_users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(8) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    balance DECIMAL(20, 2) DEFAULT 1000.00,
    created_at TIMESTAMP DEFAULT NOW(),
    is_admin BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE
);

-- Transactions (transfers and deposits)
CREATE TABLE casino_transactions (
    id SERIAL PRIMARY KEY,
    from_user_id VARCHAR(8),
    to_user_id VARCHAR(8),
    amount DECIMAL(20, 2) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'transfer', 'win', 'bet', 'bonus'
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Game sessions
CREATE TABLE casino_game_sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(8) NOT NULL,
    game_type VARCHAR(30) NOT NULL, -- 'miner', 'crash', 'slot_classic', 'slot_bonus'
    bet_amount DECIMAL(20, 2) NOT NULL,
    win_amount DECIMAL(20, 2) DEFAULT 0,
    result VARCHAR(20) NOT NULL, -- 'win', 'lose', 'bonus'
    game_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_casino_users_user_id ON casino_users(user_id);
CREATE INDEX idx_casino_transactions_from ON casino_transactions(from_user_id);
CREATE INDEX idx_casino_transactions_to ON casino_transactions(to_user_id);
CREATE INDEX idx_casino_game_sessions_user ON casino_game_sessions(user_id);
