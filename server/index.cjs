const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.NODE_ENV === 'production' ? 5000 : 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

const pool = new Pool({
  host: process.env.POSTGRESQL_HOST,
  port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
  user: process.env.POSTGRESQL_USER,
  password: process.env.POSTGRESQL_PASSWORD,
  database: process.env.POSTGRESQL_DBNAME,
  ssl: {
    rejectUnauthorized: false
  }
});

const SCHEMA = 'ugt_tuners';

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'master',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) DEFAULT 0,
        duration INTEGER DEFAULT 60,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.bookings (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES ${SCHEMA}.clients(id) ON DELETE SET NULL,
        service_id INTEGER REFERENCES ${SCHEMA}.services(id) ON DELETE SET NULL,
        master_id INTEGER REFERENCES ${SCHEMA}.users(id) ON DELETE SET NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.transactions (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category VARCHAR(255),
        description TEXT,
        date DATE DEFAULT CURRENT_DATE,
        booking_id INTEGER REFERENCES ${SCHEMA}.bookings(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(50) DEFAULT 'medium',
        due_date DATE,
        client_id INTEGER REFERENCES ${SCHEMA}.clients(id) ON DELETE SET NULL,
        assigned_to INTEGER REFERENCES ${SCHEMA}.users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.app_data (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log(`Database schema '${SCHEMA}' initialized successfully`);
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', schema: SCHEMA });
});

app.get('/api/clients', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${SCHEMA}.clients ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const { name, phone, email, notes } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = await pool.query(
      `INSERT INTO ${SCHEMA}.clients (name, phone, email, notes) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), phone || null, email || null, notes || null]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }
    const { name, phone, email, notes } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = await pool.query(
      `UPDATE ${SCHEMA}.clients SET name = $1, phone = $2, email = $3, notes = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *`,
      [name.trim(), phone || null, email || null, notes || null, parseInt(id)]
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

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ${SCHEMA}.clients WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${SCHEMA}.services ORDER BY name`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

app.post('/api/services', async (req, res) => {
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

app.put('/api/services/:id', async (req, res) => {
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

app.delete('/api/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ${SCHEMA}.services WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

app.get('/api/bookings', async (req, res) => {
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

app.post('/api/bookings', async (req, res) => {
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

app.put('/api/bookings/:id', async (req, res) => {
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

app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ${SCHEMA}.bookings WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${SCHEMA}.transactions ORDER BY date DESC, created_at DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/transactions', async (req, res) => {
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

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ${SCHEMA}.transactions WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

app.get('/api/tasks', async (req, res) => {
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

app.post('/api/tasks', async (req, res) => {
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

app.put('/api/tasks/:id', async (req, res) => {
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

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ${SCHEMA}.tasks WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

app.get('/api/data/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const result = await pool.query(`SELECT value FROM ${SCHEMA}.app_data WHERE key = $1`, [key]);
    res.json(result.rows[0]?.value || null);
  } catch (error) {
    console.error('Error fetching app data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.post('/api/data/:key', async (req, res) => {
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

app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, username, name, role, created_at FROM ${SCHEMA}.users ORDER BY name`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
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
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
    app.listen(PORT, host, () => {
      console.log(`Server running on http://${host}:${PORT}`);
      console.log(`Using PostgreSQL schema: ${SCHEMA}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
