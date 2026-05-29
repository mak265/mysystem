// ============ MAKRONE ADMIN PANEL ============

const API = '';
let currentPage = 'dashboard';
let authToken = localStorage.getItem('makrone_token') || '';

// Cache
let clientsCache = [];
let servicesCache = [];

// ============ AUTH ============
async function checkAuth() {
  if (!authToken) {
    showLogin();
    return;
  }
  const res = await fetch('/api/auth/check', { headers: { 'x-auth-token': authToken } });
  const data = await res.json();
  if (data.authenticated) {
    showApp();
  } else {
    localStorage.removeItem('makrone_token');
    authToken = '';
    showLogin();
  }
}

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'flex';
  loadDashboard();
}

function logout() {
  fetch('/api/auth/logout', { method: 'POST', headers: { 'x-auth-token': authToken } });
  localStorage.removeItem('makrone_token');
  authToken = '';
  showLogin();
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.token) {
      authToken = data.token;
      localStorage.setItem('makrone_token', authToken);
      showApp();
    } else {
      errorEl.textContent = data.error || 'Login failed';
    }
  } catch (err) {
    errorEl.textContent = 'Connection error. Try again.';
  }
});

// Init
checkAuth();

// ============ NAVIGATION ============
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const page = item.dataset.page;
    navigateTo(page);
  });
});

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');
  document.getElementById('pageTitle').textContent = getPageTitle(page);
  loadPage(page);
  document.querySelector('.sidebar').classList.remove('open');
}

function getPageTitle(page) {
  const titles = {
    dashboard: 'Dashboard',
    analytics: 'Website Analytics',
    inquiries: 'Customer Inquiries',
    reviews: 'Customer Reviews',
    gallery: 'Photo Gallery',
    clients: 'Clients',
    jobs: 'Job Orders',
    services: 'Services',
    invoices: 'Invoices'
  };
  return titles[page] || 'Dashboard';
}

document.getElementById('menuToggle').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('open');
});

// ============ PAGE LOADER ============
async function loadPage(page) {
  switch(page) {
    case 'dashboard': await loadDashboard(); break;
    case 'analytics': await loadAnalytics(); break;
    case 'inquiries': await loadInquiries(); break;
    case 'reviews': await loadReviews(); break;
    case 'gallery': await loadGallery(); break;
    case 'clients': await loadClients(); break;
    case 'jobs': await loadJobs(); break;
    case 'services': await loadServices(); break;
    case 'invoices': await loadInvoices(); break;
  }
}

// ============ DASHBOARD ============
async function loadDashboard() {
  const data = await fetchAPI('/api/dashboard');
  const content = document.getElementById('content');
  
  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue"><i class="fas fa-users"></i></div>
        <div class="stat-info"><h3>${data.totalClients || 0}</h3><p>Total Clients</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon yellow"><i class="fas fa-clock"></i></div>
        <div class="stat-info"><h3>${data.pendingJobs || 0}</h3><p>Pending Jobs</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue"><i class="fas fa-spinner"></i></div>
        <div class="stat-info"><h3>${data.inProgressJobs || 0}</h3><p>In Progress</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
        <div class="stat-info"><h3>${data.completedJobs || 0}</h3><p>Completed</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><i class="fas fa-peso-sign"></i></div>
        <div class="stat-info"><h3>&#8369;${formatNumber(data.totalRevenue)}</h3><p>Total Revenue</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red"><i class="fas fa-exclamation-circle"></i></div>
        <div class="stat-info"><h3>&#8369;${formatNumber(data.unpaidInvoices)}</h3><p>Unpaid Invoices</p></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Recent Job Orders</h2>
        <button class="btn btn-primary btn-sm" onclick="navigateTo('jobs')">View All</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Job #</th><th>Client</th><th>Service</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            ${(data.recentJobs || []).length ? data.recentJobs.map(job => `
              <tr>
                <td><strong>${job.job_number}</strong></td>
                <td>${job.client_name}</td>
                <td>${job.service_name}</td>
                <td><span class="badge badge-${getStatusClass(job.status)}">${job.status}</span></td>
                <td>${formatDate(job.date_received)}</td>
              </tr>
            `).join('') : '<tr><td colspan="5" class="empty-state"><p>No job orders yet</p></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ============ ANALYTICS ============
async function loadAnalytics() {
  const data = await fetchAPI('/api/analytics/stats');
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue"><i class="fas fa-eye"></i></div>
        <div class="stat-info"><h3>${data.totalVisits || 0}</h3><p>Total Page Views</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><i class="fas fa-user-check"></i></div>
        <div class="stat-info"><h3>${data.uniqueVisitors || 0}</h3><p>Unique Visitors</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon yellow"><i class="fas fa-calendar-day"></i></div>
        <div class="stat-info"><h3>${data.todayVisits || 0}</h3><p>Today's Visits</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red"><i class="fas fa-calendar-week"></i></div>
        <div class="stat-info"><h3>${data.weekVisits || 0}</h3><p>This Week</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue"><i class="fas fa-calendar"></i></div>
        <div class="stat-info"><h3>${data.monthVisits || 0}</h3><p>This Month</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><i class="fas fa-users"></i></div>
        <div class="stat-info"><h3>${data.todayUnique || 0}</h3><p>Today Unique</p></div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
      <!-- Daily Visits Chart -->
      <div class="card">
        <div class="card-header"><h2>Daily Visits (Last 30 Days)</h2></div>
        <div style="padding: 24px;">
          <div class="chart-container" id="dailyChart"></div>
        </div>
      </div>

      <!-- Device Breakdown -->
      <div class="card">
        <div class="card-header"><h2>Device Breakdown</h2></div>
        <div style="padding: 24px;">
          ${(data.devices || []).length ? data.devices.map(d => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--gray-100);">
              <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas fa-${d.device === 'Mobile' ? 'mobile-screen' : d.device === 'Tablet' ? 'tablet-screen-button' : 'desktop'}" style="color: var(--primary); width: 20px;"></i>
                <span style="font-weight: 500;">${d.device}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 100px; height: 8px; background: var(--gray-200); border-radius: 4px; overflow: hidden;">
                  <div style="height: 100%; background: var(--primary); border-radius: 4px; width: ${Math.round((d.visits / (data.totalVisits || 1)) * 100)}%;"></div>
                </div>
                <span style="font-size: 0.85rem; color: var(--gray-500); min-width: 40px;">${d.visits}</span>
              </div>
            </div>
          `).join('') : '<p style="color: var(--gray-400); text-align: center; padding: 20px;">No data yet</p>'}
        </div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
      <!-- Top Pages -->
      <div class="card">
        <div class="card-header"><h2>Top Pages</h2></div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Page</th><th>Visits</th></tr></thead>
            <tbody>
              ${(data.topPages || []).length ? data.topPages.map(p => `
                <tr><td>${p.page}</td><td><strong>${p.visits}</strong></td></tr>
              `).join('') : '<tr><td colspan="2" style="text-align:center; color: var(--gray-400); padding: 20px;">No data yet</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Top Referrers -->
      <div class="card">
        <div class="card-header"><h2>Top Referrers</h2></div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Referrer</th><th>Visits</th></tr></thead>
            <tbody>
              ${(data.topReferrers || []).length ? data.topReferrers.map(r => `
                <tr><td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.referrer}</td><td><strong>${r.visits}</strong></td></tr>
              `).join('') : '<tr><td colspan="2" style="text-align:center; color: var(--gray-400); padding: 20px;">No referrer data yet</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Recent Visits -->
    <div class="card">
      <div class="card-header"><h2>Recent Visits</h2></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Page</th><th>Visitor</th><th>Device</th><th>Referrer</th><th>Time</th></tr></thead>
          <tbody>
            ${(data.recentVisits || []).length ? data.recentVisits.map(v => `
              <tr>
                <td>${v.page}</td>
                <td><code style="font-size: 0.75rem; background: var(--gray-100); padding: 2px 6px; border-radius: 4px;">${v.visitor_id || 'unknown'}</code></td>
                <td>${getDeviceType(v.screen_width)}</td>
                <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${v.referrer || 'direct'}</td>
                <td>${formatDate(v.visited_at)}</td>
              </tr>
            `).join('') : '<tr><td colspan="5" style="text-align:center; color: var(--gray-400); padding: 20px;">No visits recorded yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Render simple bar chart
  renderDailyChart(data.dailyVisits || []);
}

function renderDailyChart(dailyData) {
  const container = document.getElementById('dailyChart');
  if (!container) return;

  if (!dailyData.length) {
    container.innerHTML = '<p style="color: var(--gray-400); text-align: center; padding: 40px;">No visit data yet. Visits will appear here once customers visit your website.</p>';
    return;
  }

  const maxVisits = Math.max(...dailyData.map(d => d.visits), 1);
  const barWidth = Math.max(100 / dailyData.length - 1, 2);

  container.innerHTML = `
    <div style="display: flex; align-items: flex-end; gap: 2px; height: 200px; padding: 10px 0;">
      ${dailyData.map(d => `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end;" title="${d.date}: ${d.visits} visits (${d.unique_visitors} unique)">
          <span style="font-size: 0.65rem; color: var(--gray-500); margin-bottom: 4px;">${d.visits}</span>
          <div style="width: 100%; max-width: 30px; background: var(--primary); border-radius: 3px 3px 0 0; height: ${Math.max((d.visits / maxVisits) * 100, 3)}%; min-height: 3px; transition: height 0.3s;"></div>
        </div>
      `).join('')}
    </div>
    <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid var(--gray-200);">
      <span style="font-size: 0.7rem; color: var(--gray-400);">${dailyData[0]?.date || ''}</span>
      <span style="font-size: 0.7rem; color: var(--gray-400);">${dailyData[dailyData.length - 1]?.date || ''}</span>
    </div>
  `;
}

function getDeviceType(width) {
  if (!width || width === 0) return 'Unknown';
  if (width < 768) return '<i class="fas fa-mobile-screen"></i> Mobile';
  if (width < 1024) return '<i class="fas fa-tablet-screen-button"></i> Tablet';
  return '<i class="fas fa-desktop"></i> Desktop';
}

// ============ INQUIRIES ============
async function loadInquiries() {
  const inquiries = await fetchAPI('/api/inquiries');
  const content = document.getElementById('content');

  const newCount = inquiries.filter(i => i.status === 'New').length;

  content.innerHTML = `
    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="stat-card">
        <div class="stat-icon blue"><i class="fas fa-envelope"></i></div>
        <div class="stat-info"><h3>${inquiries.length}</h3><p>Total Inquiries</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon yellow"><i class="fas fa-bell"></i></div>
        <div class="stat-info"><h3>${newCount}</h3><p>New / Unread</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><i class="fas fa-check"></i></div>
        <div class="stat-info"><h3>${inquiries.length - newCount}</h3><p>Responded</p></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Customer Inquiries</h2>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Name</th><th>Contact</th><th>Service</th><th>Message</th><th>Status</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${inquiries.length ? inquiries.map(inq => `
              <tr style="${inq.status === 'New' ? 'background: #eff6ff;' : ''}">
                <td><strong>${inq.name}</strong></td>
                <td>${inq.phone || inq.email || '-'}</td>
                <td>${inq.service || '-'}</td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(inq.message || '').replace(/"/g, '&quot;')}">${inq.message || '-'}</td>
                <td><span class="badge badge-${inq.status === 'New' ? 'pending' : 'completed'}">${inq.status}</span></td>
                <td>${formatDate(inq.created_at)}</td>
                <td class="action-btns">
                  <button class="btn btn-outline btn-sm" onclick="viewInquiry(${inq.id})" title="View"><i class="fas fa-eye"></i></button>
                  ${inq.status === 'New' ? `<button class="btn btn-success btn-sm" onclick="markInquiryResponded(${inq.id})" title="Mark Responded"><i class="fas fa-check"></i></button>` : ''}
                  <button class="btn btn-danger btn-sm" onclick="deleteInquiry(${inq.id})" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="7" class="empty-state"><i class="fas fa-envelope"></i><p>No inquiries yet. They will appear here when customers submit the contact form.</p></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function viewInquiry(id) {
  fetchAPI('/api/inquiries').then(inquiries => {
    const inq = inquiries.find(i => i.id === id);
    if (!inq) return;
    openModal('Inquiry Details', `
      <div style="display: grid; gap: 16px;">
        <div><strong>Name:</strong> ${inq.name}</div>
        <div><strong>Phone:</strong> ${inq.phone || 'N/A'}</div>
        <div><strong>Email:</strong> ${inq.email || 'N/A'}</div>
        <div><strong>Service:</strong> ${inq.service || 'N/A'}</div>
        <div><strong>Message:</strong><br><p style="margin-top: 8px; padding: 12px; background: var(--gray-50); border-radius: 8px;">${inq.message || 'No message'}</p></div>
        <div><strong>Date:</strong> ${formatDate(inq.created_at)}</div>
        <div><strong>Status:</strong> <span class="badge badge-${inq.status === 'New' ? 'pending' : 'completed'}">${inq.status}</span></div>
      </div>
    `);
  });
}

async function markInquiryResponded(id) {
  await fetchAPI(`/api/inquiries/${id}`, 'PUT', { status: 'Responded' });
  loadInquiries();
}

async function deleteInquiry(id) {
  if (!confirm('Delete this inquiry?')) return;
  await fetchAPI(`/api/inquiries/${id}`, 'DELETE');
  loadInquiries();
}

// ============ REVIEWS (Admin) ============
async function loadReviews() {
  const reviews = await fetchAPI('/api/reviews/all') || [];
  const links = await fetchAPI('/api/reviews/links') || [];
  clientsCache = await fetchAPI('/api/clients') || [];
  const content = document.getElementById('content');

  // Ensure arrays
  const reviewsList = Array.isArray(reviews) ? reviews : [];
  const linksList = Array.isArray(links) ? links : [];

  const avgRating = reviewsList.length ? (reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length).toFixed(1) : '0.0';
  const approvedCount = reviewsList.filter(r => r.approved).length;
  const unusedLinks = linksList.filter(l => !l.used).length;

  content.innerHTML = `
    <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
      <div class="stat-card">
        <div class="stat-icon blue"><i class="fas fa-star"></i></div>
        <div class="stat-info"><h3>${reviewsList.length}</h3><p>Total Reviews</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
        <div class="stat-info"><h3>${approvedCount}</h3><p>Approved</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon yellow"><i class="fas fa-link"></i></div>
        <div class="stat-info"><h3>${unusedLinks}</h3><p>Pending Links</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue"><i class="fas fa-chart-line"></i></div>
        <div class="stat-info"><h3>${avgRating} <small style="font-size: 0.7rem;">/ 5</small></h3><p>Avg Rating</p></div>
      </div>
    </div>

    <!-- Generate Review Link -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <h2><i class="fas fa-link" style="color: var(--primary); margin-right: 8px;"></i> Generate Review Link</h2>
        <button class="btn btn-primary" onclick="showGenerateLinkForm()"><i class="fas fa-plus"></i> New Link</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Client</th><th>Service</th><th>Status</th><th>Link</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            ${linksList.length ? linksList.map(l => `
              <tr>
                <td><strong>${l.client_name}</strong></td>
                <td>${l.service_name || '-'}</td>
                <td><span class="badge badge-${l.used ? 'completed' : 'pending'}">${l.used ? 'Used' : 'Pending'}</span></td>
                <td>
                  <code style="font-size: 0.75rem; background: var(--gray-100); padding: 3px 8px; border-radius: 4px; cursor: pointer;" onclick="copyLink('${l.token}')" title="Click to copy">/review/${l.token.substring(0, 8)}...</code>
                </td>
                <td>${formatDate(l.created_at)}</td>
                <td class="action-btns">
                  <button class="btn btn-primary btn-sm" onclick="copyLink('${l.token}')" title="Copy Link"><i class="fas fa-copy"></i></button>
                  <button class="btn btn-danger btn-sm" onclick="deleteReviewLink(${l.id})" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="6" style="text-align:center; color: var(--gray-400); padding: 20px;">No review links generated yet. Click "New Link" to create one for a client.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Reviews List -->
    <div class="card">
      <div class="card-header"><h2>All Reviews</h2></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Name</th><th>Service</th><th>Rating</th><th>Review</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            ${reviewsList.length ? reviewsList.map(r => `
              <tr style="${!r.approved ? 'opacity: 0.6;' : ''}">
                <td><strong>${r.name || 'Anonymous'}</strong></td>
                <td>${r.service || '-'}</td>
                <td>${'⭐'.repeat(r.rating)}</td>
                <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(r.message || '').replace(/"/g, '&quot;')}">${r.message}</td>
                <td><span class="badge badge-${r.approved ? 'completed' : 'pending'}">${r.approved ? 'Visible' : 'Hidden'}</span></td>
                <td>${formatDate(r.created_at)}</td>
                <td class="action-btns">
                  <button class="btn btn-${r.approved ? 'outline' : 'success'} btn-sm" onclick="toggleReview(${r.id}, ${r.approved ? 0 : 1})" title="${r.approved ? 'Hide' : 'Show'}">
                    <i class="fas fa-${r.approved ? 'eye-slash' : 'eye'}"></i>
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="deleteReview(${r.id})" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="7" class="empty-state"><i class="fas fa-star"></i><p>No reviews yet. Generate a link and send it to a client!</p></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function showGenerateLinkForm() {
  openModal('Generate Review Link', `
    <p style="margin-bottom: 20px; color: var(--gray-500); font-size: 0.9rem;">Create a unique link to send to your client. Only they can use it to leave a review.</p>
    <form id="generateLinkForm">
      <div class="form-group">
        <label>Client Name *</label>
        <input type="text" name="client_name" required placeholder="e.g. Juan Dela Cruz" list="clientsList">
        <datalist id="clientsList">
          ${clientsCache.map(c => `<option value="${c.name}">`).join('')}
        </datalist>
      </div>
      <div class="form-group">
        <label>Service Provided</label>
        <select name="service_name">
          <option value="">Select service (optional)</option>
          <option value="CCTV Installation">CCTV Installation</option>
          <option value="CCTV Maintenance">CCTV Maintenance</option>
          <option value="Laptop Repair">Laptop Repair</option>
          <option value="Laptop Upgrade">Laptop Upgrade</option>
          <option value="Phone Repair">Phone Repair</option>
          <option value="Network Setup">Network Setup</option>
          <option value="WiFi Installation">WiFi Installation</option>
          <option value="Custom System">Custom System</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary"><i class="fas fa-link"></i> Generate Link</button>
    </form>
  `);

  document.getElementById('generateLinkForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(e.target));
    const result = await fetchAPI('/api/reviews/generate-link', 'POST', formData);
    if (result.token) {
      const fullLink = window.location.origin + result.link;
      closeModal();
      openModal('Review Link Generated!', `
        <div style="text-align: center; padding: 20px 0;">
          <i class="fas fa-check-circle" style="font-size: 3rem; color: var(--success); margin-bottom: 16px;"></i>
          <p style="margin-bottom: 16px; color: var(--gray-600);">Send this link to <strong>${formData.client_name}</strong>:</p>
          <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: 8px; padding: 14px; margin-bottom: 16px; word-break: break-all; font-size: 0.85rem; font-family: monospace;">
            ${fullLink}
          </div>
          <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${fullLink}'); this.innerHTML='<i class=\\'fas fa-check\\'></i> Copied!'; setTimeout(() => this.innerHTML='<i class=\\'fas fa-copy\\'></i> Copy Link', 2000);">
            <i class="fas fa-copy"></i> Copy Link
          </button>
        </div>
      `);
      loadReviews();
    }
  });
}

function copyLink(token) {
  const fullLink = window.location.origin + '/review/' + token;
  navigator.clipboard.writeText(fullLink).then(() => {
    alert('Link copied to clipboard!');
  });
}

async function deleteReviewLink(id) {
  if (!confirm('Delete this review link?')) return;
  await fetchAPI(`/api/reviews/links/${id}`, 'DELETE');
  loadReviews();
}

async function toggleReview(id, approved) {
  await fetchAPI(`/api/reviews/${id}`, 'PUT', { approved });
  loadReviews();
}

async function deleteReview(id) {
  if (!confirm('Delete this review permanently?')) return;
  await fetchAPI(`/api/reviews/${id}`, 'DELETE');
  loadReviews();
}

// ============ GALLERY ============
async function loadGallery() {
  const photos = await fetchAPI('/api/gallery');
  const photosList = Array.isArray(photos) ? photos : [];
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
      <div class="stat-card">
        <div class="stat-icon blue"><i class="fas fa-images"></i></div>
        <div class="stat-info"><h3>${photosList.length}</h3><p>Total Photos</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><i class="fas fa-upload"></i></div>
        <div class="stat-info"><h3><button class="btn btn-primary" onclick="showUploadForm()"><i class="fas fa-plus"></i> Upload Photo</button></h3><p></p></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>All Photos</h2>
      </div>
      <div style="padding: 24px;">
        ${photosList.length ? `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px;">
            ${photosList.map(p => `
              <div style="border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); background: white;">
                <div style="height: 160px; overflow: hidden; background: var(--gray-100);">
                  <img src="/uploads/${p.filename}" alt="${p.title}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div style="padding: 12px;">
                  <h4 style="font-size: 0.9rem; margin-bottom: 4px;">${p.title}</h4>
                  <p style="font-size: 0.75rem; color: var(--gray-500); margin-bottom: 4px;">${p.description || ''}</p>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="badge badge-progress">${p.category || 'General'}</span>
                    <button class="btn btn-danger btn-sm" onclick="deletePhoto(${p.id})"><i class="fas fa-trash"></i></button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<div class="empty-state"><i class="fas fa-images"></i><p>No photos yet. Upload your first photo!</p></div>'}
      </div>
    </div>
  `;
}

function showUploadForm() {
  openModal('Upload Photo', `
    <form id="uploadForm" enctype="multipart/form-data">
      <div class="form-group">
        <label>Photo *</label>
        <input type="file" name="photo" accept="image/*" required id="photoInput" style="padding: 8px;">
        <div id="photoPreview" style="margin-top: 12px; display: none;">
          <img id="previewImg" style="max-width: 100%; max-height: 200px; border-radius: 8px; object-fit: cover;">
        </div>
      </div>
      <div class="form-group">
        <label>Title *</label>
        <input type="text" name="title" required placeholder="e.g. CCTV Installation at SM Mall">
      </div>
      <div class="form-group">
        <label>Category</label>
        <select name="category">
          <option value="CCTV">CCTV</option>
          <option value="Laptop">Laptop</option>
          <option value="Phone">Phone</option>
          <option value="Networking">Networking</option>
          <option value="Custom Systems">Custom Systems</option>
          <option value="Graphic Design">Graphic Design</option>
          <option value="General">General</option>
        </select>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea name="description" placeholder="Short description of the work done..."></textarea>
      </div>
      <button type="submit" class="btn btn-primary"><i class="fas fa-upload"></i> Upload</button>
    </form>
  `);

  // Image preview
  document.getElementById('photoInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        document.getElementById('previewImg').src = ev.target.result;
        document.getElementById('photoPreview').style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    const fileInput = document.getElementById('photoInput');
    const file = fileInput.files[0];
    if (!file) return alert('Please select a photo');

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Compressing & Uploading...';

    // Compress image before upload
    const compressed = await compressImage(file, 1200, 0.8);
    formData.append('photo', compressed, file.name);
    formData.append('title', e.target.querySelector('[name="title"]').value);
    formData.append('category', e.target.querySelector('[name="category"]').value);
    formData.append('description', e.target.querySelector('[name="description"]').value);

    try {
      const res = await fetch('/api/gallery/upload', {
        method: 'POST',
        headers: { 'x-auth-token': authToken },
        body: formData
      });
      const data = await res.json();
      if (data.message) {
        closeModal();
        loadGallery();
      } else {
        alert(data.error || 'Upload failed');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-upload"></i> Upload';
      }
    } catch (err) {
      alert('Upload failed. Try again.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-upload"></i> Upload';
    }
  });
}

async function deletePhoto(id) {
  if (!confirm('Delete this photo?')) return;
  await fetchAPI(`/api/gallery/${id}`, 'DELETE');
  loadGallery();
}


// ============ CLIENTS ============
async function loadClients() {
  const clients = await fetchAPI('/api/clients');
  clientsCache = clients;
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>All Clients (${clients.length})</h2>
        <button class="btn btn-primary" onclick="showClientForm()"><i class="fas fa-plus"></i> Add Client</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Name</th><th>Contact</th><th>Email</th><th>Address</th><th>Actions</th></tr></thead>
          <tbody>
            ${clients.length ? clients.map(c => `
              <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.contact || '-'}</td>
                <td>${c.email || '-'}</td>
                <td>${c.address || '-'}</td>
                <td class="action-btns">
                  <button class="btn btn-outline btn-sm" onclick="showClientForm(${c.id})"><i class="fas fa-edit"></i></button>
                  <button class="btn btn-danger btn-sm" onclick="deleteClient(${c.id})"><i class="fas fa-trash"></i></button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="5" class="empty-state"><i class="fas fa-users"></i><p>No clients yet. Add your first client!</p></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function showClientForm(id = null) {
  const client = id ? clientsCache.find(c => c.id === id) : null;
  const title = client ? 'Edit Client' : 'Add New Client';

  openModal(title, `
    <form id="clientForm">
      <div class="form-row">
        <div class="form-group">
          <label>Name *</label>
          <input type="text" name="name" value="${client?.name || ''}" required>
        </div>
        <div class="form-group">
          <label>Contact Number</label>
          <input type="text" name="contact" value="${client?.contact || ''}">
        </div>
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" name="email" value="${client?.email || ''}">
      </div>
      <div class="form-group">
        <label>Address</label>
        <input type="text" name="address" value="${client?.address || ''}">
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea name="notes">${client?.notes || ''}</textarea>
      </div>
      <button type="submit" class="btn btn-primary">${client ? 'Update' : 'Add'} Client</button>
    </form>
  `);

  document.getElementById('clientForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(e.target));
    if (client) {
      await fetchAPI(`/api/clients/${id}`, 'PUT', formData);
    } else {
      await fetchAPI('/api/clients', 'POST', formData);
    }
    closeModal();
    loadClients();
  });
}

async function deleteClient(id) {
  if (!confirm('Are you sure you want to delete this client?')) return;
  await fetchAPI(`/api/clients/${id}`, 'DELETE');
  loadClients();
}

// ============ JOB ORDERS ============
async function loadJobs() {
  const jobs = await fetchAPI('/api/jobs');
  clientsCache = await fetchAPI('/api/clients');
  servicesCache = await fetchAPI('/api/services');
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>All Job Orders (${jobs.length})</h2>
        <button class="btn btn-primary" onclick="showJobForm()"><i class="fas fa-plus"></i> New Job Order</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Job #</th><th>Client</th><th>Service</th><th>Category</th><th>Status</th><th>Amount</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            ${jobs.length ? jobs.map(j => `
              <tr>
                <td><strong>${j.job_number}</strong></td>
                <td>${j.client_name}</td>
                <td>${j.service_name}</td>
                <td>${j.service_category}</td>
                <td><span class="badge badge-${getStatusClass(j.status)}">${j.status}</span></td>
                <td>&#8369;${formatNumber(j.amount)}</td>
                <td>${formatDate(j.date_received)}</td>
                <td class="action-btns">
                  <button class="btn btn-outline btn-sm" onclick="showJobForm(${j.id})" title="Edit"><i class="fas fa-edit"></i></button>
                  <button class="btn btn-success btn-sm" onclick="updateJobStatus(${j.id}, '${j.status}')" title="Update Status"><i class="fas fa-sync"></i></button>
                  <button class="btn btn-primary btn-sm" onclick="createInvoiceFromJob(${j.id}, ${j.client_id}, ${j.amount})" title="Create Invoice"><i class="fas fa-file-invoice"></i></button>
                  <button class="btn btn-danger btn-sm" onclick="deleteJob(${j.id})" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="8" class="empty-state"><i class="fas fa-clipboard-list"></i><p>No job orders yet</p></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function showJobForm(id = null) {
  const title = id ? 'Edit Job Order' : 'New Job Order';
  
  openModal(title, `
    <form id="jobForm">
      <div class="form-row">
        <div class="form-group">
          <label>Client *</label>
          <select name="client_id" required>
            <option value="">Select Client</option>
            ${clientsCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Service *</label>
          <select name="service_id" required id="serviceSelect">
            <option value="">Select Service</option>
            ${servicesCache.map(s => `<option value="${s.id}" data-price="${s.base_price}">${s.category} - ${s.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Priority</label>
          <select name="priority">
            <option value="Normal">Normal</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
        <div class="form-group">
          <label>Amount</label>
          <input type="number" name="amount" id="amountInput" step="0.01" value="0">
        </div>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea name="description" placeholder="Describe the work to be done..."></textarea>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea name="notes" placeholder="Additional notes..."></textarea>
      </div>
      <button type="submit" class="btn btn-primary">Create Job Order</button>
    </form>
  `);

  document.getElementById('serviceSelect').addEventListener('change', (e) => {
    const option = e.target.selectedOptions[0];
    if (option && option.dataset.price) {
      document.getElementById('amountInput').value = option.dataset.price;
    }
  });

  document.getElementById('jobForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(e.target));
    formData.amount = parseFloat(formData.amount) || 0;
    if (id) {
      await fetchAPI(`/api/jobs/${id}`, 'PUT', formData);
    } else {
      await fetchAPI('/api/jobs', 'POST', formData);
    }
    closeModal();
    loadJobs();
  });
}

async function updateJobStatus(id, currentStatus) {
  const nextStatus = { 'Pending': 'In Progress', 'In Progress': 'Completed', 'Completed': 'Completed' };
  const newStatus = nextStatus[currentStatus] || 'Pending';
  if (currentStatus === 'Completed') { alert('This job is already completed.'); return; }
  if (confirm(`Update status to "${newStatus}"?`)) {
    await fetchAPI(`/api/jobs/${id}`, 'PUT', { status: newStatus });
    loadJobs();
  }
}

async function deleteJob(id) {
  if (!confirm('Delete this job order?')) return;
  await fetchAPI(`/api/jobs/${id}`, 'DELETE');
  loadJobs();
}

async function createInvoiceFromJob(jobId, clientId, amount) {
  if (!confirm(`Create invoice for ₱${formatNumber(amount)}?`)) return;
  await fetchAPI('/api/invoices', 'POST', { job_order_id: jobId, client_id: clientId, amount: amount });
  alert('Invoice created successfully!');
}

// ============ SERVICES ============
async function loadServices() {
  const services = await fetchAPI('/api/services');
  servicesCache = services;
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>Services Catalog (${services.length})</h2>
        <button class="btn btn-primary" onclick="showServiceForm()"><i class="fas fa-plus"></i> Add Service</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Service Name</th><th>Category</th><th>Description</th><th>Base Price</th><th>Actions</th></tr></thead>
          <tbody>
            ${services.map(s => `
              <tr>
                <td><strong>${s.name}</strong></td>
                <td><span class="badge badge-progress">${s.category}</span></td>
                <td>${s.description || '-'}</td>
                <td>&#8369;${formatNumber(s.base_price)}</td>
                <td class="action-btns">
                  <button class="btn btn-outline btn-sm" onclick="showServiceForm(${s.id})"><i class="fas fa-edit"></i></button>
                  <button class="btn btn-danger btn-sm" onclick="deleteService(${s.id})"><i class="fas fa-trash"></i></button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function showServiceForm(id = null) {
  const service = id ? servicesCache.find(s => s.id === id) : null;
  const title = service ? 'Edit Service' : 'Add New Service';

  openModal(title, `
    <form id="serviceForm">
      <div class="form-row">
        <div class="form-group">
          <label>Service Name *</label>
          <input type="text" name="name" value="${service?.name || ''}" required>
        </div>
        <div class="form-group">
          <label>Category *</label>
          <select name="category" required>
            <option value="">Select Category</option>
            <option value="CCTV" ${service?.category === 'CCTV' ? 'selected' : ''}>CCTV</option>
            <option value="Laptop" ${service?.category === 'Laptop' ? 'selected' : ''}>Laptop</option>
            <option value="Phone" ${service?.category === 'Phone' ? 'selected' : ''}>Phone</option>
            <option value="Networking" ${service?.category === 'Networking' ? 'selected' : ''}>Networking</option>
            <option value="Custom Systems" ${service?.category === 'Custom Systems' ? 'selected' : ''}>Custom Systems</option>
            <option value="Graphic Design" ${service?.category === 'Graphic Design' ? 'selected' : ''}>Graphic Design</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea name="description">${service?.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label>Base Price</label>
        <input type="number" name="base_price" step="0.01" value="${service?.base_price || 0}">
      </div>
      <button type="submit" class="btn btn-primary">${service ? 'Update' : 'Add'} Service</button>
    </form>
  `);

  document.getElementById('serviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(e.target));
    formData.base_price = parseFloat(formData.base_price) || 0;
    if (service) {
      await fetchAPI(`/api/services/${id}`, 'PUT', formData);
    } else {
      await fetchAPI('/api/services', 'POST', formData);
    }
    closeModal();
    loadServices();
  });
}

async function deleteService(id) {
  if (!confirm('Delete this service?')) return;
  await fetchAPI(`/api/services/${id}`, 'DELETE');
  loadServices();
}

// ============ INVOICES ============
async function loadInvoices() {
  const invoices = await fetchAPI('/api/invoices');
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="card">
      <div class="card-header"><h2>Invoices (${invoices.length})</h2></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Invoice #</th><th>Job #</th><th>Client</th><th>Amount</th><th>Status</th><th>Date Issued</th><th>Date Paid</th><th>Actions</th></tr></thead>
          <tbody>
            ${invoices.length ? invoices.map(inv => `
              <tr>
                <td><strong>${inv.invoice_number}</strong></td>
                <td>${inv.job_number}</td>
                <td>${inv.client_name}</td>
                <td>&#8369;${formatNumber(inv.amount)}</td>
                <td><span class="badge badge-${inv.status === 'Paid' ? 'paid' : 'unpaid'}">${inv.status}</span></td>
                <td>${formatDate(inv.date_issued)}</td>
                <td>${inv.date_paid ? formatDate(inv.date_paid) : '-'}</td>
                <td class="action-btns">
                  ${inv.status === 'Unpaid' ? `<button class="btn btn-success btn-sm" onclick="markAsPaid(${inv.id})"><i class="fas fa-check"></i> Paid</button>` : ''}
                </td>
              </tr>
            `).join('') : '<tr><td colspan="8" class="empty-state"><i class="fas fa-file-invoice-dollar"></i><p>No invoices yet</p></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function markAsPaid(id) {
  if (!confirm('Mark this invoice as paid?')) return;
  await fetchAPI(`/api/invoices/${id}`, 'PUT', { status: 'Paid' });
  loadInvoices();
}

// ============ MODAL ============
function openModal(title, bodyHTML) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

// ============ UTILITIES ============
async function fetchAPI(url, method = 'GET', body = null) {
  const options = { method, headers: { 'Content-Type': 'application/json', 'x-auth-token': authToken } };
  if (body) options.body = JSON.stringify(body);
  try {
    const res = await fetch(API + url, options);
    if (res.status === 401) {
      localStorage.removeItem('makrone_token');
      authToken = '';
      showLogin();
      return {};
    }
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    return {};
  }
}

function formatNumber(num) {
  return Number(num || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getStatusClass(status) {
  switch(status) {
    case 'Pending': return 'pending';
    case 'In Progress': return 'progress';
    case 'Completed': return 'completed';
    default: return 'pending';
  }
}

// ============ IMAGE COMPRESSION ============
function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if larger than maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ============ INIT ============
// Auth check handles initialization
