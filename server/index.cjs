const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const crypto = require('crypto');
const { promisify } = require('util');

// Глобальные обработчики ошибок - предотвращают внезапное завершение процесса
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error.message);
  console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERROR] Unhandled Promise Rejection:', reason);
});

process.on('SIGTERM', () => {
  console.log('[INFO] Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[INFO] Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

const scryptAsync = promisify(crypto.scrypt);

// Rate Limiting - хранилище неудачных попыток входа по IP
const loginAttempts = new Map();
const MAX_ATTEMPTS = 3;
const BLOCK_DURATION = 5 * 60 * 1000; // 5 минут в миллисекундах

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.ip || 
         'unknown';
}

function isBlocked(ip) {
  const record = loginAttempts.get(ip);
  if (!record) return false;
  
  if (record.blockedUntil && Date.now() < record.blockedUntil) {
    return true;
  }
  
  // Если блокировка истекла, сбрасываем счётчик
  if (record.blockedUntil && Date.now() >= record.blockedUntil) {
    loginAttempts.delete(ip);
    return false;
  }
  
  return false;
}

function recordFailedAttempt(ip) {
  const record = loginAttempts.get(ip) || { attempts: 0, blockedUntil: null };
  record.attempts++;
  record.lastAttempt = Date.now();
  
  if (record.attempts >= MAX_ATTEMPTS) {
    record.blockedUntil = Date.now() + BLOCK_DURATION;
    console.log(`[Rate Limit] IP ${ip} заблокирован на 5 минут после ${record.attempts} неудачных попыток`);
  }
  
  loginAttempts.set(ip, record);
  return record;
}

function resetAttempts(ip) {
  loginAttempts.delete(ip);
}

function getRemainingBlockTime(ip) {
  const record = loginAttempts.get(ip);
  if (!record || !record.blockedUntil) return 0;
  return Math.max(0, Math.ceil((record.blockedUntil - Date.now()) / 1000));
}

// Генерация токена сессии
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Время жизни сессии (24 часа)
const SESSION_DURATION = 24 * 60 * 60 * 1000;

// Время жизни токена сброса пароля (1 час)
const RESET_TOKEN_DURATION = 60 * 60 * 1000;

// Функции хеширования паролей
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return crypto.timingSafeEqual(hashedBuf, suppliedBuf);
}

const app = express();
const PORT = process.env.NODE_ENV === 'production' ? 5000 : 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

console.log('Starting UGT Tuners backend server...');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

const pool = new Pool({
  host: process.env.POSTGRESQL_HOST,
  port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
  user: process.env.POSTGRESQL_USER,
  password: process.env.POSTGRESQL_PASSWORD,
  database: process.env.POSTGRESQL_DBNAME,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10
});

pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
});

console.log('Database pool configured, connecting...');

const SCHEMA = 'ugt_tuners';

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
    
    // === ТАБЛИЦЫ ДЛЯ ПЛАТНОГО ДОСТУПА ===
    
    // Тарифные планы подписки
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.subscriptions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        period_days INTEGER NOT NULL DEFAULT 30,
        max_users INTEGER DEFAULT 1,
        max_clients INTEGER DEFAULT 100,
        max_branches INTEGER DEFAULT 1,
        features JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Филиалы компании
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.branches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        phone VARCHAR(50),
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Сессии пользователей
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Токены сброса пароля
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Пользователи системы (расширенная)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        avatar TEXT,
        role VARCHAR(50) NOT NULL DEFAULT 'master',
        is_owner BOOLEAN DEFAULT false,
        branch_id INTEGER REFERENCES ${SCHEMA}.branches(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Логи действий пользователей
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES ${SCHEMA}.users(id) ON DELETE SET NULL,
        user_name VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id INTEGER,
        entity_name VARCHAR(255),
        details TEXT,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Подписки пользователей (связь владельца с тарифом)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.user_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES ${SCHEMA}.users(id) ON DELETE CASCADE,
        subscription_id INTEGER NOT NULL REFERENCES ${SCHEMA}.subscriptions(id) ON DELETE RESTRICT,
        start_date DATE NOT NULL DEFAULT CURRENT_DATE,
        end_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        auto_renew BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // История платежей за подписку
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.payments (
        id SERIAL PRIMARY KEY,
        user_subscription_id INTEGER REFERENCES ${SCHEMA}.user_subscriptions(id) ON DELETE SET NULL,
        user_id INTEGER NOT NULL REFERENCES ${SCHEMA}.users(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'RUB',
        payment_method VARCHAR(50),
        payment_provider VARCHAR(100),
        external_payment_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // === ТАБЛИЦЫ ДЛЯ CRM ===

    // Категории расходов/доходов
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'expense',
        color VARCHAR(20),
        icon VARCHAR(50),
        branch_id INTEGER REFERENCES ${SCHEMA}.branches(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Теги для фильтрации
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(20),
        branch_id INTEGER REFERENCES ${SCHEMA}.branches(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Клиенты (расширенная)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        notes TEXT,
        branch_id INTEGER REFERENCES ${SCHEMA}.branches(id) ON DELETE SET NULL,
        source VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Транспортные средства клиентов
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.vehicles (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES ${SCHEMA}.clients(id) ON DELETE CASCADE,
        brand VARCHAR(100) NOT NULL,
        model VARCHAR(100),
        year INTEGER,
        vin VARCHAR(50),
        license_plate VARCHAR(20),
        color VARCHAR(50),
        mileage INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Услуги (расширенная)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) DEFAULT 0,
        duration INTEGER DEFAULT 60,
        description TEXT,
        category_id INTEGER REFERENCES ${SCHEMA}.categories(id) ON DELETE SET NULL,
        branch_id INTEGER REFERENCES ${SCHEMA}.branches(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Записи/бронирования (расширенная)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.bookings (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES ${SCHEMA}.clients(id) ON DELETE SET NULL,
        vehicle_id INTEGER REFERENCES ${SCHEMA}.vehicles(id) ON DELETE SET NULL,
        service_id INTEGER REFERENCES ${SCHEMA}.services(id) ON DELETE SET NULL,
        master_id INTEGER REFERENCES ${SCHEMA}.users(id) ON DELETE SET NULL,
        branch_id INTEGER REFERENCES ${SCHEMA}.branches(id) ON DELETE SET NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        end_time TIME,
        status VARCHAR(50) DEFAULT 'pending',
        payment_status VARCHAR(50) DEFAULT 'unpaid',
        amount DECIMAL(10,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // История записей клиента (детализированные работы)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.client_records (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES ${SCHEMA}.clients(id) ON DELETE CASCADE,
        vehicle_id INTEGER REFERENCES ${SCHEMA}.vehicles(id) ON DELETE SET NULL,
        booking_id INTEGER REFERENCES ${SCHEMA}.bookings(id) ON DELETE SET NULL,
        service_name VARCHAR(255) NOT NULL,
        description TEXT,
        amount DECIMAL(10,2) DEFAULT 0,
        date DATE NOT NULL,
        time TIME,
        master_id INTEGER REFERENCES ${SCHEMA}.users(id) ON DELETE SET NULL,
        branch_id INTEGER REFERENCES ${SCHEMA}.branches(id) ON DELETE SET NULL,
        is_paid BOOLEAN DEFAULT false,
        is_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Финансовые транзакции (расширенная)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.transactions (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category_id INTEGER REFERENCES ${SCHEMA}.categories(id) ON DELETE SET NULL,
        category VARCHAR(255),
        description TEXT,
        date DATE DEFAULT CURRENT_DATE,
        booking_id INTEGER REFERENCES ${SCHEMA}.bookings(id) ON DELETE SET NULL,
        client_id INTEGER REFERENCES ${SCHEMA}.clients(id) ON DELETE SET NULL,
        branch_id INTEGER REFERENCES ${SCHEMA}.branches(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES ${SCHEMA}.users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Задачи (расширенная)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(50) DEFAULT 'medium',
        due_date DATE,
        due_time TIME,
        client_id INTEGER REFERENCES ${SCHEMA}.clients(id) ON DELETE SET NULL,
        vehicle_id INTEGER REFERENCES ${SCHEMA}.vehicles(id) ON DELETE SET NULL,
        assigned_to INTEGER REFERENCES ${SCHEMA}.users(id) ON DELETE SET NULL,
        branch_id INTEGER REFERENCES ${SCHEMA}.branches(id) ON DELETE SET NULL,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Связь тегов с сущностями
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.entity_tags (
        id SERIAL PRIMARY KEY,
        tag_id INTEGER NOT NULL REFERENCES ${SCHEMA}.tags(id) ON DELETE CASCADE,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Хранилище настроек приложения
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.app_data (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value JSONB,
        branch_id INTEGER REFERENCES ${SCHEMA}.branches(id) ON DELETE SET NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Миграция: добавление недостающих колонок в существующие таблицы
    const migrations = [
      { table: 'clients', column: 'branch_id', type: 'INTEGER REFERENCES ' + SCHEMA + '.branches(id) ON DELETE SET NULL' },
      { table: 'clients', column: 'source', type: 'VARCHAR(100)' },
      { table: 'users', column: 'email', type: 'VARCHAR(255)' },
      { table: 'users', column: 'phone', type: 'VARCHAR(50)' },
      { table: 'users', column: 'is_owner', type: 'BOOLEAN DEFAULT false' },
      { table: 'users', column: 'branch_id', type: 'INTEGER REFERENCES ' + SCHEMA + '.branches(id) ON DELETE SET NULL' },
      { table: 'users', column: 'is_active', type: 'BOOLEAN DEFAULT true' },
      { table: 'users', column: 'last_login', type: 'TIMESTAMP' },
      { table: 'bookings', column: 'vehicle_id', type: 'INTEGER REFERENCES ' + SCHEMA + '.vehicles(id) ON DELETE SET NULL' },
      { table: 'bookings', column: 'branch_id', type: 'INTEGER REFERENCES ' + SCHEMA + '.branches(id) ON DELETE SET NULL' },
      { table: 'bookings', column: 'end_time', type: 'TIME' },
      { table: 'bookings', column: 'payment_status', type: "VARCHAR(50) DEFAULT 'unpaid'" },
      { table: 'bookings', column: 'amount', type: 'DECIMAL(10,2)' },
      { table: 'transactions', column: 'category_id', type: 'INTEGER REFERENCES ' + SCHEMA + '.categories(id) ON DELETE SET NULL' },
      { table: 'transactions', column: 'client_id', type: 'INTEGER REFERENCES ' + SCHEMA + '.clients(id) ON DELETE SET NULL' },
      { table: 'transactions', column: 'branch_id', type: 'INTEGER REFERENCES ' + SCHEMA + '.branches(id) ON DELETE SET NULL' },
      { table: 'transactions', column: 'created_by', type: 'INTEGER REFERENCES ' + SCHEMA + '.users(id) ON DELETE SET NULL' },
      { table: 'tasks', column: 'due_time', type: 'TIME' },
      { table: 'tasks', column: 'vehicle_id', type: 'INTEGER REFERENCES ' + SCHEMA + '.vehicles(id) ON DELETE SET NULL' },
      { table: 'tasks', column: 'branch_id', type: 'INTEGER REFERENCES ' + SCHEMA + '.branches(id) ON DELETE SET NULL' },
      { table: 'tasks', column: 'completed_at', type: 'TIMESTAMP' },
      { table: 'services', column: 'category_id', type: 'INTEGER REFERENCES ' + SCHEMA + '.categories(id) ON DELETE SET NULL' },
      { table: 'services', column: 'branch_id', type: 'INTEGER REFERENCES ' + SCHEMA + '.branches(id) ON DELETE SET NULL' },
      { table: 'services', column: 'is_active', type: 'BOOLEAN DEFAULT true' },
      { table: 'app_data', column: 'branch_id', type: 'INTEGER REFERENCES ' + SCHEMA + '.branches(id) ON DELETE SET NULL' },
    ];

    for (const m of migrations) {
      try {
        await client.query(`ALTER TABLE ${SCHEMA}.${m.table} ADD COLUMN IF NOT EXISTS ${m.column} ${m.type}`);
      } catch (e) {
        // Column might already exist or other non-critical error
      }
    }

    // Создание индексов для производительности
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_clients_branch ON ${SCHEMA}.clients(branch_id)`);
    } catch (e) {}
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_bookings_date ON ${SCHEMA}.bookings(date)`);
    } catch (e) {}
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_bookings_client ON ${SCHEMA}.bookings(client_id)`);
    } catch (e) {}
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON ${SCHEMA}.transactions(date)`);
    } catch (e) {}
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON ${SCHEMA}.tasks(status)`);
    } catch (e) {}
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_vehicles_client ON ${SCHEMA}.vehicles(client_id)`);
    } catch (e) {}
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_client_records_client ON ${SCHEMA}.client_records(client_id)`);
    } catch (e) {}
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON ${SCHEMA}.user_subscriptions(user_id)`);
    } catch (e) {}
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_user ON ${SCHEMA}.payments(user_id)`);
    } catch (e) {}

    console.log(`Database schema '${SCHEMA}' initialized successfully`);
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function logActivity(userId, userName, action, entityType, entityId, entityName, details, ipAddress) {
  try {
    await pool.query(
      `INSERT INTO ${SCHEMA}.activity_logs (user_id, user_name, action, entity_type, entity_id, entity_name, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, userName, action, entityType, entityId, entityName, details, ipAddress]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', schema: SCHEMA });
});

// === АУТЕНТИФИКАЦИЯ ===

// Регистрация нового пользователя
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }
    
    // Проверяем, существует ли пользователь с таким email
    const existingUser = await pool.query(
      `SELECT id FROM ${SCHEMA}.users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    
    // Хешируем пароль
    const passwordHash = await hashPassword(password);
    
    // Создаем пользователя
    const result = await pool.query(
      `INSERT INTO ${SCHEMA}.users (username, email, password_hash, name, role, is_owner) 
       VALUES ($1, $2, $3, $4, 'owner', true) RETURNING id, username, email, name, role, is_owner, branch_id, created_at`,
      [email.toLowerCase().trim(), email.toLowerCase().trim(), passwordHash, name || email.split('@')[0]]
    );
    
    const user = result.rows[0];
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isOwner: user.is_owner
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
});

// Вход в систему
app.post('/api/login', async (req, res) => {
  try {
    const clientIP = getClientIP(req);
    
    // Проверяем, не заблокирован ли IP
    if (isBlocked(clientIP)) {
      const remainingTime = getRemainingBlockTime(clientIP);
      const minutes = Math.floor(remainingTime / 60);
      const seconds = remainingTime % 60;
      return res.status(429).json({ 
        error: `Слишком много попыток. Повторите через ${minutes}:${seconds.toString().padStart(2, '0')}`,
        blocked: true,
        remainingSeconds: remainingTime
      });
    }
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }
    
    // Ищем пользователя по email
    const result = await pool.query(
      `SELECT id, username, email, password_hash, name, role, is_owner, branch_id, is_active 
       FROM ${SCHEMA}.users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    
    if (result.rows.length === 0) {
      const record = recordFailedAttempt(clientIP);
      const attemptsLeft = MAX_ATTEMPTS - record.attempts;
      if (attemptsLeft > 0) {
        return res.status(401).json({ error: `Неверный email или пароль. Осталось попыток: ${attemptsLeft}` });
      } else {
        const remainingTime = getRemainingBlockTime(clientIP);
        return res.status(429).json({ 
          error: `Слишком много попыток. Вход заблокирован на 5 минут`,
          blocked: true,
          remainingSeconds: remainingTime
        });
      }
    }
    
    const user = result.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({ error: 'Аккаунт деактивирован' });
    }
    
    // Проверяем пароль
    const isValidPassword = await comparePasswords(password, user.password_hash);
    
    if (!isValidPassword) {
      const record = recordFailedAttempt(clientIP);
      const attemptsLeft = MAX_ATTEMPTS - record.attempts;
      if (attemptsLeft > 0) {
        return res.status(401).json({ error: `Неверный email или пароль. Осталось попыток: ${attemptsLeft}` });
      } else {
        const remainingTime = getRemainingBlockTime(clientIP);
        return res.status(429).json({ 
          error: `Слишком много попыток. Вход заблокирован на 5 минут`,
          blocked: true,
          remainingSeconds: remainingTime
        });
      }
    }
    
    // Успешный вход - сбрасываем счётчик попыток
    resetAttempts(clientIP);
    
    // Создаём токен сессии
    const sessionToken = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION);
    
    // Удаляем старые сессии пользователя
    await pool.query(`DELETE FROM ${SCHEMA}.sessions WHERE user_id = $1`, [user.id]);
    
    // Сохраняем новую сессию
    await pool.query(
      `INSERT INTO ${SCHEMA}.sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, sessionToken, expiresAt]
    );
    
    // Обновляем время последнего входа
    await pool.query(
      `UPDATE ${SCHEMA}.users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
      [user.id]
    );
    
    // Логируем вход
    await logActivity(user.id, user.name, 'login', 'user', user.id, user.name, null, clientIP);
    
    res.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: user.avatar,
        role: user.role,
        isOwner: user.is_owner,
        branchId: user.branch_id
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Ошибка при входе' });
  }
});

// Middleware для проверки авторизации
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    const token = authHeader.substring(7);
    
    // Проверяем токен в базе
    const result = await pool.query(
      `SELECT s.*, u.id as user_id, u.role, u.is_owner, u.is_active 
       FROM ${SCHEMA}.sessions s 
       JOIN ${SCHEMA}.users u ON s.user_id = u.id 
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Сессия истекла или недействительна' });
    }
    
    const session = result.rows[0];
    
    if (!session.is_active) {
      return res.status(401).json({ error: 'Аккаунт деактивирован' });
    }
    
    // Добавляем данные пользователя в request
    req.user = {
      id: session.user_id,
      role: session.role,
      isOwner: session.is_owner
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Ошибка авторизации' });
  }
};

// Middleware для проверки роли владельца
const ownerOnly = (req, res, next) => {
  if (!req.user?.isOwner && req.user?.role !== 'owner') {
    return res.status(403).json({ error: 'Доступ запрещён. Требуются права владельца.' });
  }
  next();
};

// Middleware для проверки роли менеджера или выше
const managerOrOwner = (req, res, next) => {
  if (!['owner', 'manager'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Доступ запрещён. Требуются права менеджера.' });
  }
  next();
};

// Выход из системы
app.post('/api/logout', authMiddleware, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7);
    await pool.query(`DELETE FROM ${SCHEMA}.sessions WHERE token = $1`, [token]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Ошибка при выходе' });
  }
});

// Запрос на сброс пароля
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email обязателен' });
    }
    
    // Ищем пользователя
    const userResult = await pool.query(
      `SELECT id, email FROM ${SCHEMA}.users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    
    // Не сообщаем, существует ли email (защита от перебора)
    if (userResult.rows.length === 0) {
      return res.json({ success: true, message: 'Если email существует, инструкции отправлены' });
    }
    
    const user = userResult.rows[0];
    
    // Генерируем токен
    const resetToken = generateToken();
    const tokenHash = await hashPassword(resetToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_DURATION);
    
    // Удаляем старые токены пользователя
    await pool.query(
      `DELETE FROM ${SCHEMA}.password_reset_tokens WHERE user_id = $1`,
      [user.id]
    );
    
    // Сохраняем новый токен
    await pool.query(
      `INSERT INTO ${SCHEMA}.password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );
    
    res.json({ 
      success: true, 
      message: 'Если email существует, инструкции отправлены'
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ error: 'Ошибка при запросе сброса пароля' });
  }
});

// Сброс пароля с токеном
app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Токен и новый пароль обязательны' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }
    
    // Ищем все неиспользованные токены
    const tokensResult = await pool.query(
      `SELECT * FROM ${SCHEMA}.password_reset_tokens 
       WHERE used = false AND expires_at > NOW()`
    );
    
    // Проверяем каждый токен (хеши нужно сравнивать)
    let validToken = null;
    for (const t of tokensResult.rows) {
      try {
        const isValid = await comparePasswords(token, t.token_hash);
        if (isValid) {
          validToken = t;
          break;
        }
      } catch (e) {}
    }
    
    if (!validToken) {
      return res.status(400).json({ error: 'Токен недействителен или истёк' });
    }
    
    // Хешируем новый пароль
    const newPasswordHash = await hashPassword(newPassword);
    
    // Обновляем пароль
    await pool.query(
      `UPDATE ${SCHEMA}.users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newPasswordHash, validToken.user_id]
    );
    
    // Помечаем токен как использованный
    await pool.query(
      `UPDATE ${SCHEMA}.password_reset_tokens SET used = true WHERE id = $1`,
      [validToken.id]
    );
    
    // Удаляем все сессии пользователя (разлогиниваем везде)
    await pool.query(
      `DELETE FROM ${SCHEMA}.sessions WHERE user_id = $1`,
      [validToken.user_id]
    );
    
    res.json({ success: true, message: 'Пароль успешно изменён' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Ошибка при сбросе пароля' });
  }
});

// Получение профиля текущего пользователя
app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, name, first_name, last_name, avatar, phone, role, is_owner, branch_id, is_active, created_at 
       FROM ${SCHEMA}.users WHERE id = $1`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.first_name,
      lastName: user.last_name,
      avatar: user.avatar,
      phone: user.phone,
      role: user.role,
      isOwner: user.is_owner,
      branchId: user.branch_id,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Ошибка при получении профиля' });
  }
});

// Обновление профиля текущего пользователя
app.put('/api/profile', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, phone, avatar } = req.body;
    
    const result = await pool.query(
      `UPDATE ${SCHEMA}.users 
       SET first_name = COALESCE($1, first_name), 
           last_name = COALESCE($2, last_name), 
           phone = COALESCE($3, phone),
           avatar = COALESCE($4, avatar),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 RETURNING id, email, name, first_name, last_name, avatar, phone, role, is_owner`,
      [firstName, lastName, phone, avatar, req.user.id]
    );
    
    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.first_name,
      lastName: user.last_name,
      avatar: user.avatar,
      phone: user.phone,
      role: user.role,
      isOwner: user.is_owner
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Ошибка при обновлении профиля' });
  }
});

// Создание пользователя администратором
app.post('/api/admin/users', authMiddleware, ownerOnly, async (req, res) => {
  try {
    const { email, password, name, firstName, lastName, role, branchId } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }
    
    const existingUser = await pool.query(
      `SELECT id FROM ${SCHEMA}.users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    
    const passwordHash = await hashPassword(password);
    
    const result = await pool.query(
      `INSERT INTO ${SCHEMA}.users (username, email, password_hash, name, first_name, last_name, role, branch_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id, username, email, name, first_name, last_name, role, is_owner, branch_id, is_active, created_at`,
      [
        email.toLowerCase().trim(), 
        email.toLowerCase().trim(), 
        passwordHash, 
        name || `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0],
        firstName || null,
        lastName || null,
        role || 'master',
        branchId || null
      ]
    );
    
    const user = result.rows[0];
    
    await logActivity(req.user.id, req.user.name, 'user_created', 'user', user.id, user.name, `Role: ${user.role}`, req.ip);
    
    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      isOwner: user.is_owner,
      branchId: user.branch_id,
      isActive: user.is_active
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Ошибка при создании пользователя' });
  }
});

// Обновление пользователя администратором
app.put('/api/admin/users/:id', authMiddleware, ownerOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, firstName, lastName, email, phone, role, branchId, isActive, password } = req.body;
    
    let query = `UPDATE ${SCHEMA}.users SET 
      name = COALESCE($1, name),
      first_name = COALESCE($2, first_name),
      last_name = COALESCE($3, last_name),
      email = COALESCE($4, email),
      phone = COALESCE($5, phone),
      role = COALESCE($6, role),
      branch_id = $7,
      is_active = COALESCE($8, is_active),
      updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 
      RETURNING id, email, name, first_name, last_name, phone, role, is_owner, branch_id, is_active`;
    
    const values = [name, firstName, lastName, email, phone, role, branchId, isActive, id];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Если указан новый пароль - обновляем его отдельно
    if (password && password.length >= 6) {
      const passwordHash = await hashPassword(password);
      await pool.query(
        `UPDATE ${SCHEMA}.users SET password_hash = $1 WHERE id = $2`,
        [passwordHash, id]
      );
    }
    
    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      isOwner: user.is_owner,
      branchId: user.branch_id,
      isActive: user.is_active
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Ошибка при обновлении пользователя' });
  }
});

// Удаление пользователя администратором
app.delete('/api/admin/users/:id', authMiddleware, ownerOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Нельзя удалить самого себя
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Нельзя удалить собственный аккаунт' });
    }
    
    await pool.query(`DELETE FROM ${SCHEMA}.sessions WHERE user_id = $1`, [id]);
    await pool.query(`DELETE FROM ${SCHEMA}.users WHERE id = $1`, [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Ошибка при удалении пользователя' });
  }
});

// Получение пользователя по ID
app.get('/api/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, username, email, name, role, is_owner, branch_id, is_active, created_at 
       FROM ${SCHEMA}.users WHERE id = $1`,
      [parseInt(id)]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isOwner: user.is_owner,
      branchId: user.branch_id
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.get('/api/clients', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${SCHEMA}.clients ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

app.post('/api/clients', authMiddleware, async (req, res) => {
  try {
    const { name, phone, email, notes, branch_id, source } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = await pool.query(
      `INSERT INTO ${SCHEMA}.clients (name, phone, email, notes, branch_id, source) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name.trim(), phone || null, email || null, notes || null, branch_id || null, source || null]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

app.put('/api/clients/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }
    const { name, phone, email, notes, branch_id, source } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = await pool.query(
      `UPDATE ${SCHEMA}.clients SET name = $1, phone = $2, email = $3, notes = $4, branch_id = $5, source = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *`,
      [name.trim(), phone || null, email || null, notes || null, branch_id || null, source || null, parseInt(id)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

app.delete('/api/clients/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ${SCHEMA}.clients WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

app.get('/api/services', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${SCHEMA}.services ORDER BY name`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

app.post('/api/services', authMiddleware, async (req, res) => {
  try {
    const { name, price, duration, description } = req.body;
    const result = await pool.query(
      `INSERT INTO ${SCHEMA}.services (name, price, duration, description) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, price, duration, description]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

app.put('/api/services/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, duration, description } = req.body;
    const result = await pool.query(
      `UPDATE ${SCHEMA}.services SET name = $1, price = $2, duration = $3, description = $4 WHERE id = $5 RETURNING *`,
      [name, price, duration, description, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

app.delete('/api/services/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ${SCHEMA}.services WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

app.get('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, c.name as client_name, s.name as service_name, u.name as master_name
      FROM ${SCHEMA}.bookings b
      LEFT JOIN ${SCHEMA}.clients c ON b.client_id = c.id
      LEFT JOIN ${SCHEMA}.services s ON b.service_id = s.id
      LEFT JOIN ${SCHEMA}.users u ON b.master_id = u.id
      ORDER BY b.date DESC, b.time DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

app.post('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const { client_id, service_id, master_id, date, time, status, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO ${SCHEMA}.bookings (client_id, service_id, master_id, date, time, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [client_id, service_id, master_id, date, time, status || 'pending', notes]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

app.put('/api/bookings/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { client_id, service_id, master_id, date, time, status, notes } = req.body;
    const result = await pool.query(
      `UPDATE ${SCHEMA}.bookings SET client_id = $1, service_id = $2, master_id = $3, date = $4, time = $5, status = $6, notes = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *`,
      [client_id, service_id, master_id, date, time, status, notes, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

app.delete('/api/bookings/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ${SCHEMA}.bookings WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

app.get('/api/transactions', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${SCHEMA}.transactions ORDER BY date DESC, created_at DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/transactions', authMiddleware, async (req, res) => {
  try {
    const { type, amount, category, description, date, booking_id } = req.body;
    const result = await pool.query(
      `INSERT INTO ${SCHEMA}.transactions (type, amount, category, description, date, booking_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [type, amount, category, description, date || new Date(), booking_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

app.delete('/api/transactions/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ${SCHEMA}.transactions WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, c.name as client_name, u.name as assigned_to_name
      FROM ${SCHEMA}.tasks t
      LEFT JOIN ${SCHEMA}.clients c ON t.client_id = c.id
      LEFT JOIN ${SCHEMA}.users u ON t.assigned_to = u.id
      ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const { title, description, status, priority, due_date, client_id, assigned_to } = req.body;
    const result = await pool.query(
      `INSERT INTO ${SCHEMA}.tasks (title, description, status, priority, due_date, client_id, assigned_to) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description, status || 'pending', priority || 'medium', due_date, client_id, assigned_to]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, due_date, client_id, assigned_to } = req.body;
    const result = await pool.query(
      `UPDATE ${SCHEMA}.tasks SET title = $1, description = $2, status = $3, priority = $4, due_date = $5, client_id = $6, assigned_to = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *`,
      [title, description, status, priority, due_date, client_id, assigned_to, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ${SCHEMA}.tasks WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

app.get('/api/data/:key', authMiddleware, async (req, res) => {
  try {
    const { key } = req.params;
    const result = await pool.query(`SELECT value FROM ${SCHEMA}.app_data WHERE key = $1`, [key]);
    res.json(result.rows[0]?.value || null);
  } catch (error) {
    console.error('Error fetching app data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.post('/api/data/:key', authMiddleware, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    await pool.query(
      `INSERT INTO ${SCHEMA}.app_data (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
      [key, JSON.stringify(value)]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving app data:', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, username, name, first_name, last_name, email, phone, avatar, role, is_owner, branch_id, is_active, created_at FROM ${SCHEMA}.users ORDER BY name`);
    res.json(result.rows.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      phone: u.phone,
      avatar: u.avatar,
      role: u.role,
      isOwner: u.is_owner,
      branchId: u.branch_id,
      isActive: u.is_active,
      createdAt: u.created_at
    })));
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// === BRANCHES API ===
app.get('/api/branches', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${SCHEMA}.branches ORDER BY name`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

app.post('/api/branches', authMiddleware, managerOrOwner, async (req, res) => {
  try {
    const { name, address, phone, email } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = await pool.query(
      `INSERT INTO ${SCHEMA}.branches (name, address, phone, email) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, address, phone, email]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

app.put('/api/branches/:id', authMiddleware, managerOrOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone, email, is_active } = req.body;
    const result = await pool.query(
      `UPDATE ${SCHEMA}.branches SET name = $1, address = $2, phone = $3, email = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *`,
      [name, address, phone, email, is_active, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({ error: 'Failed to update branch' });
  }
});

app.delete('/api/branches/:id', authMiddleware, ownerOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ${SCHEMA}.branches WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ error: 'Failed to delete branch' });
  }
});

// === VEHICLES API ===
app.get('/api/vehicles', authMiddleware, async (req, res) => {
  try {
    const { client_id } = req.query;
    let query = `SELECT v.*, c.name as client_name FROM ${SCHEMA}.vehicles v LEFT JOIN ${SCHEMA}.clients c ON v.client_id = c.id`;
    const params = [];
    if (client_id) {
      query += ' WHERE v.client_id = $1';
      params.push(client_id);
    }
    query += ' ORDER BY v.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

app.post('/api/vehicles', authMiddleware, async (req, res) => {
  try {
    const { client_id, brand, model, year, vin, license_plate, color, mileage, notes } = req.body;
    if (!client_id || !brand) return res.status(400).json({ error: 'Client ID and brand are required' });
    const result = await pool.query(
      `INSERT INTO ${SCHEMA}.vehicles (client_id, brand, model, year, vin, license_plate, color, mileage, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [client_id, brand, model, year, vin, license_plate, color, mileage, notes]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

app.put('/api/vehicles/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { brand, model, year, vin, license_plate, color, mileage, notes } = req.body;
    const result = await pool.query(
      `UPDATE ${SCHEMA}.vehicles SET brand = $1, model = $2, year = $3, vin = $4, license_plate = $5, color = $6, mileage = $7, notes = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *`,
      [brand, model, year, vin, license_plate, color, mileage, notes, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

app.delete('/api/vehicles/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ${SCHEMA}.vehicles WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

// === CATEGORIES API ===
app.get('/api/categories', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${SCHEMA}.categories ORDER BY name`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', authMiddleware, async (req, res) => {
  try {
    const { name, type, color, icon, branch_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = await pool.query(
      `INSERT INTO ${SCHEMA}.categories (name, type, color, icon, branch_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, type || 'expense', color, icon, branch_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/api/categories/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, color, icon } = req.body;
    const result = await pool.query(
      `UPDATE ${SCHEMA}.categories SET name = $1, type = $2, color = $3, icon = $4 WHERE id = $5 RETURNING *`,
      [name, type, color, icon, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/categories/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ${SCHEMA}.categories WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// === TAGS API ===
app.get('/api/tags', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${SCHEMA}.tags ORDER BY name`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

app.post('/api/tags', authMiddleware, async (req, res) => {
  try {
    const { name, color, branch_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = await pool.query(
      `INSERT INTO ${SCHEMA}.tags (name, color, branch_id) VALUES ($1, $2, $3) RETURNING *`,
      [name, color, branch_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

app.delete('/api/tags/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ${SCHEMA}.tags WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// === ENTITY TAGS API ===
app.get('/api/entity-tags', authMiddleware, async (req, res) => {
  try {
    const { entity_type, entity_id } = req.query;
    let query = `SELECT et.*, t.name as tag_name, t.color FROM ${SCHEMA}.entity_tags et LEFT JOIN ${SCHEMA}.tags t ON et.tag_id = t.id`;
    const params = [];
    const conditions = [];
    if (entity_type) {
      conditions.push(`et.entity_type = $${params.length + 1}`);
      params.push(entity_type);
    }
    if (entity_id) {
      conditions.push(`et.entity_id = $${params.length + 1}`);
      params.push(entity_id);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY et.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching entity tags:', error);
    res.status(500).json({ error: 'Failed to fetch entity tags' });
  }
});

app.post('/api/entity-tags', authMiddleware, async (req, res) => {
  try {
    const { tag_id, entity_type, entity_id } = req.body;
    if (!tag_id || !entity_type || !entity_id) return res.status(400).json({ error: 'Tag ID, entity type and entity ID are required' });
    const result = await pool.query(
      `INSERT INTO ${SCHEMA}.entity_tags (tag_id, entity_type, entity_id) VALUES ($1, $2, $3) RETURNING *`,
      [tag_id, entity_type, entity_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating entity tag:', error);
    res.status(500).json({ error: 'Failed to create entity tag' });
  }
});

app.delete('/api/entity-tags/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ${SCHEMA}.entity_tags WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting entity tag:', error);
    res.status(500).json({ error: 'Failed to delete entity tag' });
  }
});

// === CLIENT RECORDS API ===
app.get('/api/client-records', authMiddleware, async (req, res) => {
  try {
    const { client_id } = req.query;
    let query = `SELECT cr.*, c.name as client_name, v.brand, v.model, v.license_plate, u.name as master_name
      FROM ${SCHEMA}.client_records cr
      LEFT JOIN ${SCHEMA}.clients c ON cr.client_id = c.id
      LEFT JOIN ${SCHEMA}.vehicles v ON cr.vehicle_id = v.id
      LEFT JOIN ${SCHEMA}.users u ON cr.master_id = u.id`;
    const params = [];
    if (client_id) {
      query += ' WHERE cr.client_id = $1';
      params.push(client_id);
    }
    query += ' ORDER BY cr.date DESC, cr.time DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching client records:', error);
    res.status(500).json({ error: 'Failed to fetch client records' });
  }
});

app.post('/api/client-records', authMiddleware, async (req, res) => {
  try {
    const { client_id, vehicle_id, booking_id, service_name, description, amount, date, time, master_id, branch_id, is_paid, is_completed } = req.body;
    if (!client_id || !service_name || !date) return res.status(400).json({ error: 'Client ID, service name and date are required' });
    const result = await pool.query(
      `INSERT INTO ${SCHEMA}.client_records (client_id, vehicle_id, booking_id, service_name, description, amount, date, time, master_id, branch_id, is_paid, is_completed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [client_id, vehicle_id, booking_id, service_name, description, amount || 0, date, time, master_id, branch_id, is_paid || false, is_completed || false]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating client record:', error);
    res.status(500).json({ error: 'Failed to create client record' });
  }
});

app.put('/api/client-records/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { service_name, description, amount, date, time, is_paid, is_completed } = req.body;
    const result = await pool.query(
      `UPDATE ${SCHEMA}.client_records SET service_name = $1, description = $2, amount = $3, date = $4, time = $5, is_paid = $6, is_completed = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *`,
      [service_name, description, amount, date, time, is_paid, is_completed, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating client record:', error);
    res.status(500).json({ error: 'Failed to update client record' });
  }
});

app.delete('/api/client-records/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ${SCHEMA}.client_records WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting client record:', error);
    res.status(500).json({ error: 'Failed to delete client record' });
  }
});

// === SUBSCRIPTIONS API ===
app.get('/api/subscriptions', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${SCHEMA}.subscriptions WHERE is_active = true ORDER BY price`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

app.post('/api/subscriptions', authMiddleware, ownerOnly, async (req, res) => {
  try {
    const { name, description, price, period_days, max_users, max_clients, max_branches, features } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = await pool.query(
      `INSERT INTO ${SCHEMA}.subscriptions (name, description, price, period_days, max_users, max_clients, max_branches, features) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, description, price || 0, period_days || 30, max_users || 1, max_clients || 100, max_branches || 1, features || {}]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// === USER SUBSCRIPTIONS API ===
app.get('/api/user-subscriptions', authMiddleware, async (req, res) => {
  try {
    const { user_id } = req.query;
    let query = `SELECT us.*, s.name as subscription_name, s.price, s.features, u.name as user_name
      FROM ${SCHEMA}.user_subscriptions us
      LEFT JOIN ${SCHEMA}.subscriptions s ON us.subscription_id = s.id
      LEFT JOIN ${SCHEMA}.users u ON us.user_id = u.id`;
    const params = [];
    if (user_id) {
      query += ' WHERE us.user_id = $1';
      params.push(user_id);
    }
    query += ' ORDER BY us.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch user subscriptions' });
  }
});

app.post('/api/user-subscriptions', authMiddleware, async (req, res) => {
  try {
    const { user_id, subscription_id, start_date, end_date, auto_renew } = req.body;
    if (!user_id || !subscription_id || !end_date) return res.status(400).json({ error: 'User ID, subscription ID and end date are required' });
    const result = await pool.query(
      `INSERT INTO ${SCHEMA}.user_subscriptions (user_id, subscription_id, start_date, end_date, auto_renew) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, subscription_id, start_date || new Date(), end_date, auto_renew || false]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user subscription:', error);
    res.status(500).json({ error: 'Failed to create user subscription' });
  }
});

app.put('/api/user-subscriptions/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, end_date, auto_renew } = req.body;
    const result = await pool.query(
      `UPDATE ${SCHEMA}.user_subscriptions SET status = $1, end_date = $2, auto_renew = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
      [status, end_date, auto_renew, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user subscription:', error);
    res.status(500).json({ error: 'Failed to update user subscription' });
  }
});

// === PAYMENTS API ===
app.get('/api/payments', authMiddleware, async (req, res) => {
  try {
    const { user_id } = req.query;
    let query = `SELECT p.*, u.name as user_name, us.subscription_id, s.name as subscription_name
      FROM ${SCHEMA}.payments p
      LEFT JOIN ${SCHEMA}.users u ON p.user_id = u.id
      LEFT JOIN ${SCHEMA}.user_subscriptions us ON p.user_subscription_id = us.id
      LEFT JOIN ${SCHEMA}.subscriptions s ON us.subscription_id = s.id`;
    const params = [];
    if (user_id) {
      query += ' WHERE p.user_id = $1';
      params.push(user_id);
    }
    query += ' ORDER BY p.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

app.post('/api/payments', authMiddleware, async (req, res) => {
  try {
    const { user_subscription_id, user_id, amount, currency, payment_method, payment_provider, external_payment_id, status } = req.body;
    if (!user_id || !amount) return res.status(400).json({ error: 'User ID and amount are required' });
    const result = await pool.query(
      `INSERT INTO ${SCHEMA}.payments (user_subscription_id, user_id, amount, currency, payment_method, payment_provider, external_payment_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [user_subscription_id, user_id, amount, currency || 'RUB', payment_method, payment_provider, external_payment_id, status || 'pending']
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

app.put('/api/payments/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paid_at } = req.body;
    const result = await pool.query(
      `UPDATE ${SCHEMA}.payments SET status = $1, paid_at = $2 WHERE id = $3 RETURNING *`,
      [status, paid_at, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// === ACTIVITY LOGS ===

app.get('/api/activity-logs', authMiddleware, ownerOnly, async (req, res) => {
  try {
    const { limit = 100, offset = 0, user_id, action } = req.query;
    let query = `SELECT * FROM ${SCHEMA}.activity_logs`;
    const params = [];
    const conditions = [];
    
    if (user_id) {
      params.push(user_id);
      conditions.push(`user_id = $${params.length}`);
    }
    if (action) {
      params.push(action);
      conditions.push(`action = $${params.length}`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    res.json(result.rows.map(log => ({
      id: log.id,
      userId: log.user_id,
      userName: log.user_name,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      entityName: log.entity_name,
      details: log.details,
      ipAddress: log.ip_address,
      createdAt: log.created_at
    })));
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Block/unblock user
app.put('/api/admin/users/:id/block', authMiddleware, ownerOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }
    
    const result = await pool.query(
      `UPDATE ${SCHEMA}.users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, name, email, role, is_active`,
      [is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const action = is_active ? 'user_unblocked' : 'user_blocked';
    await logActivity(req.user.id, req.user.name, action, 'user', parseInt(id), result.rows[0].name, null, req.ip);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Get all users for admin (with detailed info)
app.get('/api/admin/users', authMiddleware, ownerOnly, async (req, res) => {
  try {
    const { search, role, is_active } = req.query;
    let query = `SELECT id, username, name, first_name, last_name, email, phone, avatar, role, is_owner, branch_id, is_active, last_login, created_at FROM ${SCHEMA}.users`;
    const params = [];
    const conditions = [];
    
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR username ILIKE $${params.length})`);
    }
    if (role) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }
    if (is_active !== undefined) {
      params.push(is_active === 'true');
      conditions.push(`is_active = $${params.length}`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      phone: u.phone,
      avatar: u.avatar,
      role: u.role,
      isOwner: u.is_owner,
      branchId: u.branch_id,
      isActive: u.is_active,
      lastLogin: u.last_login,
      createdAt: u.created_at
    })));
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

initDatabase()
  .then(() => {
    const host = '0.0.0.0';
    app.listen(PORT, host, () => {
      console.log(`Server running on http://${host}:${PORT}`);
      console.log(`Using PostgreSQL schema: ${SCHEMA}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
