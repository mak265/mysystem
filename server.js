const express = require('express');
const initSqlJs = require('sql.js');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5555;

// Middleware
app.use(cors());
app.use(express.json());

// Serve admin panel at /admin
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));

// Serve landing page assets (disable auto index.html serving)
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

const DB_PATH = path.join(__dirname, 'makrone.db');
let db;

// Helper: save database to file
function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Helper: run query and return results as array of objects
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: run query and return first result
function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results[0] || null;
}

// Helper: run statement (INSERT/UPDATE/DELETE)
function runStmt(sql, params = []) {
  db.run(sql, params);
  saveDB();
  return { lastId: db.exec("SELECT last_insert_rowid()")[0]?.values[0][0] };
}

async function startServer() {
  const SQL = await initSqlJs();

  // Load or create database
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      base_price REAL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS job_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_number TEXT UNIQUE NOT NULL,
      client_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'Pending',
      priority TEXT DEFAULT 'Normal',
      amount REAL DEFAULT 0,
      date_received DATETIME DEFAULT CURRENT_TIMESTAMP,
      date_completed DATETIME,
      notes TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      job_order_id INTEGER NOT NULL,
      client_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'Unpaid',
      date_issued DATETIME DEFAULT CURRENT_TIMESTAMP,
      date_paid DATETIME,
      notes TEXT,
      FOREIGN KEY (job_order_id) REFERENCES job_orders(id),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS page_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page TEXT NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      ip_address TEXT,
      screen_width INTEGER,
      screen_height INTEGER,
      visitor_id TEXT,
      visited_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      service TEXT,
      message TEXT,
      status TEXT DEFAULT 'New',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      service TEXT,
      rating INTEGER DEFAULT 5,
      message TEXT NOT NULL,
      token TEXT,
      approved INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS review_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      client_id INTEGER,
      client_name TEXT,
      service_name TEXT,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);

  // Seed default services if empty
  const serviceCount = queryOne('SELECT COUNT(*) as count FROM services');
  if (serviceCount.count === 0) {
    const defaultServices = [
      ['CCTV Installation', 'CCTV', 'Installation and setup of CCTV camera systems', 3500],
      ['CCTV Maintenance', 'CCTV', 'Maintenance and repair of existing CCTV systems', 1500],
      ['Laptop Repair', 'Laptop', 'General laptop troubleshooting and repair', 1000],
      ['Laptop Upgrade (RAM)', 'Laptop', 'RAM upgrade for laptops', 800],
      ['Laptop Upgrade (SSD)', 'Laptop', 'SSD upgrade/replacement for laptops', 1500],
      ['Laptop Upgrade (Full)', 'Laptop', 'Complete laptop upgrade package', 3000],
      ['Phone Screen Repair', 'Phone', 'Phone screen replacement', 1500],
      ['Phone Battery Replacement', 'Phone', 'Phone battery replacement', 800],
      ['Phone General Repair', 'Phone', 'General phone troubleshooting', 500],
      ['Network Setup', 'Networking', 'Network infrastructure setup and configuration', 5000],
      ['Network Troubleshooting', 'Networking', 'Network issue diagnosis and fix', 1500],
      ['WiFi Installation', 'Networking', 'WiFi access point installation and setup', 2500],
      ['Custom System Development', 'Custom Systems', 'Custom software/system development', 15000],
      ['System Maintenance', 'Custom Systems', 'Ongoing system maintenance and support', 3000],
      ['POS System Setup', 'Custom Systems', 'Point of Sale system installation', 8000],
    ];
    for (const [name, category, description, base_price] of defaultServices) {
      db.run('INSERT INTO services (name, category, description, base_price) VALUES (?, ?, ?, ?)',
        [name, category, description, base_price]);
    }
  }

  saveDB();

  // ============ API ROUTES ============

  // --- Dashboard Stats ---
  app.get('/api/dashboard', (req, res) => {
    const totalClients = queryOne('SELECT COUNT(*) as count FROM clients').count;
    const totalJobs = queryOne('SELECT COUNT(*) as count FROM job_orders').count;
    const pendingJobs = queryOne("SELECT COUNT(*) as count FROM job_orders WHERE status = 'Pending'").count;
    const inProgressJobs = queryOne("SELECT COUNT(*) as count FROM job_orders WHERE status = 'In Progress'").count;
    const completedJobs = queryOne("SELECT COUNT(*) as count FROM job_orders WHERE status = 'Completed'").count;
    const totalRevenue = queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE status = 'Paid'").total;
    const unpaidInvoices = queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE status = 'Unpaid'").total;

    const recentJobs = queryAll(`
      SELECT jo.*, c.name as client_name, s.name as service_name 
      FROM job_orders jo 
      JOIN clients c ON jo.client_id = c.id 
      JOIN services s ON jo.service_id = s.id 
      ORDER BY jo.date_received DESC LIMIT 5
    `);

    res.json({
      totalClients, totalJobs, pendingJobs, inProgressJobs, completedJobs,
      totalRevenue, unpaidInvoices, recentJobs
    });
  });

  // --- Clients ---
  app.get('/api/clients', (req, res) => {
    const clients = queryAll('SELECT * FROM clients ORDER BY created_at DESC');
    res.json(clients);
  });

  app.get('/api/clients/:id', (req, res) => {
    const client = queryOne('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  });

  app.post('/api/clients', (req, res) => {
    const { name, contact, email, address, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = runStmt(
      'INSERT INTO clients (name, contact, email, address, notes) VALUES (?, ?, ?, ?, ?)',
      [name, contact || '', email || '', address || '', notes || '']
    );
    res.json({ id: result.lastId, message: 'Client added successfully' });
  });

  app.put('/api/clients/:id', (req, res) => {
    const { name, contact, email, address, notes } = req.body;
    runStmt('UPDATE clients SET name=?, contact=?, email=?, address=?, notes=? WHERE id=?',
      [name, contact, email, address, notes, req.params.id]);
    res.json({ message: 'Client updated successfully' });
  });

  app.delete('/api/clients/:id', (req, res) => {
    runStmt('DELETE FROM clients WHERE id = ?', [req.params.id]);
    res.json({ message: 'Client deleted successfully' });
  });

  // --- Services ---
  app.get('/api/services', (req, res) => {
    const services = queryAll('SELECT * FROM services ORDER BY category, name');
    res.json(services);
  });

  app.post('/api/services', (req, res) => {
    const { name, category, description, base_price } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'Name and category are required' });
    const result = runStmt(
      'INSERT INTO services (name, category, description, base_price) VALUES (?, ?, ?, ?)',
      [name, category, description || '', base_price || 0]
    );
    res.json({ id: result.lastId, message: 'Service added successfully' });
  });

  app.put('/api/services/:id', (req, res) => {
    const { name, category, description, base_price } = req.body;
    runStmt('UPDATE services SET name=?, category=?, description=?, base_price=? WHERE id=?',
      [name, category, description, base_price, req.params.id]);
    res.json({ message: 'Service updated successfully' });
  });

  app.delete('/api/services/:id', (req, res) => {
    runStmt('DELETE FROM services WHERE id = ?', [req.params.id]);
    res.json({ message: 'Service deleted successfully' });
  });

  // --- Job Orders ---
  app.get('/api/jobs', (req, res) => {
    const jobs = queryAll(`
      SELECT jo.*, c.name as client_name, s.name as service_name, s.category as service_category
      FROM job_orders jo 
      JOIN clients c ON jo.client_id = c.id 
      JOIN services s ON jo.service_id = s.id 
      ORDER BY jo.date_received DESC
    `);
    res.json(jobs);
  });

  app.get('/api/jobs/:id', (req, res) => {
    const job = queryOne(`
      SELECT jo.*, c.name as client_name, s.name as service_name, s.category as service_category
      FROM job_orders jo 
      JOIN clients c ON jo.client_id = c.id 
      JOIN services s ON jo.service_id = s.id 
      WHERE jo.id = ?
    `, [req.params.id]);
    if (!job) return res.status(404).json({ error: 'Job order not found' });
    res.json(job);
  });

  app.post('/api/jobs', (req, res) => {
    const { client_id, service_id, description, priority, amount, notes } = req.body;
    if (!client_id || !service_id) return res.status(400).json({ error: 'Client and service are required' });

    const jobCount = queryOne('SELECT COUNT(*) as count FROM job_orders').count;
    const job_number = 'MKR-' + String(jobCount + 1).padStart(5, '0');

    const result = runStmt(
      'INSERT INTO job_orders (job_number, client_id, service_id, description, priority, amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [job_number, client_id, service_id, description || '', priority || 'Normal', amount || 0, notes || '']
    );

    res.json({ id: result.lastId, job_number, message: 'Job order created successfully' });
  });

  app.put('/api/jobs/:id', (req, res) => {
    const { status, description, priority, amount, notes } = req.body;
    const updates = [];
    const values = [];

    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
    if (amount !== undefined) { updates.push('amount = ?'); values.push(amount); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
    if (status === 'Completed') { updates.push("date_completed = datetime('now')"); }

    if (updates.length === 0) return res.json({ message: 'Nothing to update' });

    values.push(req.params.id);
    runStmt(`UPDATE job_orders SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Job order updated successfully' });
  });

  app.delete('/api/jobs/:id', (req, res) => {
    runStmt('DELETE FROM job_orders WHERE id = ?', [req.params.id]);
    res.json({ message: 'Job order deleted successfully' });
  });

  // --- Invoices ---
  app.get('/api/invoices', (req, res) => {
    const invoices = queryAll(`
      SELECT i.*, c.name as client_name, jo.job_number
      FROM invoices i 
      JOIN clients c ON i.client_id = c.id 
      JOIN job_orders jo ON i.job_order_id = jo.id
      ORDER BY i.date_issued DESC
    `);
    res.json(invoices);
  });

  app.post('/api/invoices', (req, res) => {
    const { job_order_id, client_id, amount, notes } = req.body;
    if (!job_order_id || !client_id || !amount) {
      return res.status(400).json({ error: 'Job order, client, and amount are required' });
    }

    const invCount = queryOne('SELECT COUNT(*) as count FROM invoices').count;
    const invoice_number = 'INV-' + String(invCount + 1).padStart(5, '0');

    const result = runStmt(
      'INSERT INTO invoices (invoice_number, job_order_id, client_id, amount, notes) VALUES (?, ?, ?, ?, ?)',
      [invoice_number, job_order_id, client_id, amount, notes || '']
    );

    res.json({ id: result.lastId, invoice_number, message: 'Invoice created successfully' });
  });

  app.put('/api/invoices/:id', (req, res) => {
    const { status } = req.body;
    if (status === 'Paid') {
      runStmt("UPDATE invoices SET status = 'Paid', date_paid = datetime('now') WHERE id = ?", [req.params.id]);
    } else {
      runStmt('UPDATE invoices SET status = ? WHERE id = ?', [status, req.params.id]);
    }
    res.json({ message: 'Invoice updated successfully' });
  });

  // --- Analytics: Track page visit ---
  app.post('/api/analytics/track', (req, res) => {
    const { page, referrer, userAgent, screenWidth, screenHeight } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const visitorId = crypto.createHash('md5').update(ip + (userAgent || '')).digest('hex').substring(0, 16);

    runStmt(
      'INSERT INTO page_visits (page, referrer, user_agent, ip_address, screen_width, screen_height, visitor_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [page || '/', referrer || 'direct', userAgent || '', ip, screenWidth || 0, screenHeight || 0, visitorId]
    );
    res.json({ ok: true });
  });

  // --- Analytics: Get stats for admin ---
  app.get('/api/analytics/stats', (req, res) => {
    const totalVisits = queryOne('SELECT COUNT(*) as count FROM page_visits').count;
    const uniqueVisitors = queryOne('SELECT COUNT(DISTINCT visitor_id) as count FROM page_visits').count;

    // Today's visits
    const todayVisits = queryOne("SELECT COUNT(*) as count FROM page_visits WHERE date(visited_at) = date('now')").count;
    const todayUnique = queryOne("SELECT COUNT(DISTINCT visitor_id) as count FROM page_visits WHERE date(visited_at) = date('now')").count;

    // This week
    const weekVisits = queryOne("SELECT COUNT(*) as count FROM page_visits WHERE visited_at >= datetime('now', '-7 days')").count;

    // This month
    const monthVisits = queryOne("SELECT COUNT(*) as count FROM page_visits WHERE visited_at >= datetime('now', '-30 days')").count;

    // Visits per day (last 30 days)
    const dailyVisits = queryAll(`
      SELECT date(visited_at) as date, COUNT(*) as visits, COUNT(DISTINCT visitor_id) as unique_visitors
      FROM page_visits 
      WHERE visited_at >= datetime('now', '-30 days')
      GROUP BY date(visited_at)
      ORDER BY date ASC
    `);

    // Top pages
    const topPages = queryAll(`
      SELECT page, COUNT(*) as visits 
      FROM page_visits 
      GROUP BY page 
      ORDER BY visits DESC 
      LIMIT 10
    `);

    // Top referrers
    const topReferrers = queryAll(`
      SELECT referrer, COUNT(*) as visits 
      FROM page_visits 
      WHERE referrer != 'direct' AND referrer != ''
      GROUP BY referrer 
      ORDER BY visits DESC 
      LIMIT 10
    `);

    // Device breakdown (based on screen width)
    const devices = queryAll(`
      SELECT 
        CASE 
          WHEN screen_width < 768 THEN 'Mobile'
          WHEN screen_width < 1024 THEN 'Tablet'
          ELSE 'Desktop'
        END as device,
        COUNT(*) as visits
      FROM page_visits
      WHERE screen_width > 0
      GROUP BY device
      ORDER BY visits DESC
    `);

    // Recent visits
    const recentVisits = queryAll(`
      SELECT * FROM page_visits ORDER BY visited_at DESC LIMIT 20
    `);

    res.json({
      totalVisits, uniqueVisitors, todayVisits, todayUnique,
      weekVisits, monthVisits, dailyVisits, topPages,
      topReferrers, devices, recentVisits
    });
  });

  // --- Inquiries (from landing page contact form) ---
  app.post('/api/inquiries', (req, res) => {
    const { name, phone, email, service, message } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    runStmt(
      'INSERT INTO inquiries (name, phone, email, service, message) VALUES (?, ?, ?, ?, ?)',
      [name, phone || '', email || '', service || '', message || '']
    );
    res.json({ message: 'Inquiry submitted successfully' });
  });

  app.get('/api/inquiries', (req, res) => {
    const inquiries = queryAll('SELECT * FROM inquiries ORDER BY created_at DESC');
    res.json(inquiries);
  });

  app.put('/api/inquiries/:id', (req, res) => {
    const { status } = req.body;
    runStmt('UPDATE inquiries SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Inquiry updated successfully' });
  });

  app.delete('/api/inquiries/:id', (req, res) => {
    runStmt('DELETE FROM inquiries WHERE id = ?', [req.params.id]);
    res.json({ message: 'Inquiry deleted successfully' });
  });

  // --- Reviews ---
  app.get('/api/reviews', (req, res) => {
    // Public: only show approved reviews
    const reviews = queryAll('SELECT * FROM reviews WHERE approved = 1 ORDER BY created_at DESC');
    res.json(reviews);
  });

  app.get('/api/reviews/all', (req, res) => {
    // Admin: show all reviews
    const reviews = queryAll('SELECT * FROM reviews ORDER BY created_at DESC');
    res.json(reviews);
  });

  // Generate a review link for a client
  app.post('/api/reviews/generate-link', (req, res) => {
    const { client_id, client_name, service_name } = req.body;
    if (!client_name) return res.status(400).json({ error: 'Client name is required' });

    const token = crypto.randomBytes(16).toString('hex');
    runStmt(
      'INSERT INTO review_tokens (token, client_id, client_name, service_name) VALUES (?, ?, ?, ?)',
      [token, client_id || null, client_name, service_name || '']
    );

    res.json({ token, link: `/review/${token}`, message: 'Review link generated' });
  });

  // Get all generated review links (admin)
  app.get('/api/reviews/links', (req, res) => {
    const links = queryAll('SELECT * FROM review_tokens ORDER BY created_at DESC');
    res.json(links);
  });

  // Delete a review link
  app.delete('/api/reviews/links/:id', (req, res) => {
    runStmt('DELETE FROM review_tokens WHERE id = ?', [req.params.id]);
    res.json({ message: 'Link deleted' });
  });

  // Verify a review token (client-facing)
  app.get('/api/reviews/verify/:token', (req, res) => {
    const tokenData = queryOne('SELECT * FROM review_tokens WHERE token = ?', [req.params.token]);
    if (!tokenData) return res.json({ error: 'This review link is invalid or has expired.' });
    if (tokenData.used) return res.json({ used: true });
    res.json({
      client_name: tokenData.client_name,
      service_name: tokenData.service_name,
      valid: true
    });
  });

  // Submit a review via token
  app.post('/api/reviews/submit', (req, res) => {
    const { token, name, service, rating, message } = req.body;
    if (!token || !message) return res.status(400).json({ error: 'Token and message are required' });

    const tokenData = queryOne('SELECT * FROM review_tokens WHERE token = ?', [token]);
    if (!tokenData) return res.status(400).json({ error: 'Invalid review link.' });
    if (tokenData.used) return res.status(400).json({ error: 'This link has already been used.' });

    const safeRating = Math.min(5, Math.max(1, parseInt(rating) || 5));
    runStmt(
      'INSERT INTO reviews (name, service, rating, message, token) VALUES (?, ?, ?, ?, ?)',
      [name || '', service || tokenData.service_name || '', safeRating, message, token]
    );

    // Mark token as used
    runStmt('UPDATE review_tokens SET used = 1 WHERE token = ?', [token]);

    res.json({ message: 'Review submitted successfully' });
  });

  app.post('/api/reviews', (req, res) => {
    // Keep for backward compat but require token now
    return res.status(403).json({ error: 'Direct reviews are disabled. Use a review link.' });
  });

  app.put('/api/reviews/:id', (req, res) => {
    const { approved } = req.body;
    runStmt('UPDATE reviews SET approved = ? WHERE id = ?', [approved ? 1 : 0, req.params.id]);
    res.json({ message: 'Review updated successfully' });
  });

  app.delete('/api/reviews/:id', (req, res) => {
    runStmt('DELETE FROM reviews WHERE id = ?', [req.params.id]);
    res.json({ message: 'Review deleted successfully' });
  });

  // Serve review page for token links
  app.get('/review/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'review.html'));
  });

  // --- Serve landing page at root ---
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'landing.html'));
  });

  // Serve admin panel
  app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
  });

  // Catch-all: serve admin for /admin/* routes
  app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log('');
    console.log('  ======================================');
    console.log('   MAKRONE Business Management System');
    console.log(`   Running on http://localhost:${PORT}`);
    console.log('  ======================================');
    console.log('');
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
