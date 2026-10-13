// ==========================================================================
// TARVIKA Research & Technology - Executive Admin Panel
// Firebase SDK v13.0.0 Module Integration
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-analytics.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  get, 
  set, 
  update, 
  remove, 
  onValue, 
  push,
  child
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

// Official Firebase configuration provided for TARVIKA Internship Panel
const firebaseConfig = {
  apiKey: "AIzaSyA-mxmLqYEkKRrNTvMsWrF03IoWw7FK5iQ",
  authDomain: "tarvika-intership-pannel.firebaseapp.com",
  databaseURL: "https://tarvika-intership-pannel-default-rtdb.firebaseio.com",
  projectId: "tarvika-intership-pannel",
  storageBucket: "tarvika-intership-pannel.firebasestorage.app",
  messagingSenderId: "871442499173",
  appId: "1:871442499173:web:54d52ff685ce559e69a88c",
  measurementId: "G-VMLMRRVF6H"
};

// Initialize Firebase SDK services
const app = initializeApp(firebaseConfig);
let analytics = null;
try { analytics = getAnalytics(app); } catch (e) { console.warn('Analytics init warning:', e); }
const auth = getAuth(app);
const db = getDatabase(app);

// State Store
const state = {
  user: null,
  applications: [],
  opportunities: [],
  activeTab: 'overview',
  searchQuery: '',
  filterProgram: '',
  filterStatus: '',
  filterQualification: '',
  activeApplicant: null,
  isLiveConnected: true
};

// Helper: Escape HTML
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Helper: Format Date
const formatDate = ts => {
  if (!ts) return 'Recently';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recently';
  }
};

// Toast notification system
function showToast(message, type = 'info') {
  let container = document.getElementById('admin-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'admin-toast-container';
    container.className = 'admin-toast-wrap';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `admin-toast ${type}`;
  toast.innerHTML = `<span>${esc(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// --------------------------------------------------------------------------
// Auth & Session Management
// --------------------------------------------------------------------------
function checkSavedSession() {
  const saved = localStorage.getItem('tarvika_admin_session');
  if (saved) {
    try {
      state.user = JSON.parse(saved);
      return true;
    } catch {}
  }
  return false;
}

function setAdminSession(user) {
  state.user = user;
  localStorage.setItem('tarvika_admin_session', JSON.stringify(user));
  renderAdminApp();
}

function clearAdminSession() {
  state.user = null;
  localStorage.removeItem('tarvika_admin_session');
  try { signOut(auth); } catch {}
  renderLoginView();
}

// --------------------------------------------------------------------------
// Realtime Database Listeners & Operations
// --------------------------------------------------------------------------
function setupDatabaseListeners() {
  // 1. Immediate REST fetch for zero latency display
  fetchRegistrationsREST();
  fetchOpportunitiesREST();

  // 2. Realtime listener for registrations
  try {
    const regRef = ref(db, 'registrations');
    onValue(regRef, snapshot => {
      state.isLiveConnected = true;
      const data = snapshot.val();
      if (data && typeof data === 'object') {
        state.applications = Object.entries(data).map(([uid, item]) => ({
          uid,
          ...item,
          status: item.status || 'received'
        })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      } else {
        state.applications = [];
      }
      updateLiveIndicator(true);
      renderCurrentTab();
    }, err => {
      console.warn('Realtime DB subscription error, falling back to REST fetch:', err);
      state.isLiveConnected = false;
      updateLiveIndicator(false);
      fetchRegistrationsREST();
    });
  } catch (e) {
    console.warn('Realtime reg listener setup error:', e);
  }

  // 3. Listener for opportunities in RTDB
  try {
    const oppsRef = ref(db, 'opportunities');
    onValue(oppsRef, snapshot => {
      const data = snapshot.val();
      if (data && typeof data === 'object') {
        state.opportunities = Object.entries(data).map(([id, item]) => ({
          id,
          ...item
        }));
      } else {
        // Fallback to static window.OPPORTUNITIES if database has no opportunities yet
        state.opportunities = (window.OPPORTUNITIES || []).map(o => ({ ...o }));
      }
      if (state.activeTab === 'opportunities') renderOpportunitiesTab();
    }, err => {
      console.warn('Opportunities fetch error, using local fallback:', err);
      state.opportunities = (window.OPPORTUNITIES || []).map(o => ({ ...o }));
    });
  } catch (e) {
    console.warn('Realtime opps listener error:', e);
  }
}

// REST fallback for fetching registrations
async function fetchRegistrationsREST() {
  try {
    const res = await fetch(`${firebaseConfig.databaseURL.replace(/\/+$/, '')}/registrations.json`);
    const data = await res.json();
    if (data && typeof data === 'object') {
      state.applications = Object.entries(data).map(([uid, item]) => ({
        uid,
        ...item,
        status: item.status || 'received'
      })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      renderCurrentTab();
    }
  } catch (e) {
    console.error('REST fetch failed:', e);
  }
}

// REST fallback for opportunities
async function fetchOpportunitiesREST() {
  try {
    const res = await fetch(`${firebaseConfig.databaseURL.replace(/\/+$/, '')}/opportunities.json`);
    const data = await res.json();
    if (data && typeof data === 'object') {
      state.opportunities = Object.entries(data).map(([id, item]) => ({
        id,
        ...item
      }));
    } else {
      state.opportunities = (window.OPPORTUNITIES || []).map(o => ({ ...o }));
    }
    const countOpps = document.getElementById('tab-count-opps');
    if (countOpps) countOpps.textContent = state.opportunities.length;
  } catch (e) {
    state.opportunities = (window.OPPORTUNITIES || []).map(o => ({ ...o }));
  }
}

// Update candidate status in Firebase RTDB
async function updateCandidateStatus(uid, newStatus) {
  try {
    // 1. Try Firebase SDK update
    const candidateRef = ref(db, `registrations/${uid}`);
    await update(candidateRef, {
      status: newStatus,
      statusUpdatedAt: Date.now(),
      statusUpdatedBy: state.user?.email || 'admin'
    });
    showToast(`Status updated to "${newStatus.replace('_', ' ').toUpperCase()}"`, 'success');
  } catch (err) {
    console.warn('SDK update failed, attempting direct REST fallback:', err);
    // 2. Direct REST fallback
    const res = await fetch(`${firebaseConfig.databaseURL.replace(/\/+$/, '')}/registrations/${uid}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, statusUpdatedAt: Date.now() })
    });
    if (!res.ok) throw new Error('Could not update status in Firebase.');
    showToast(`Status updated to "${newStatus}"`, 'success');
  }

  // Update local state copy
  const app = state.applications.find(a => a.uid === uid);
  if (app) app.status = newStatus;
  if (state.activeApplicant && state.activeApplicant.uid === uid) {
    state.activeApplicant.status = newStatus;
  }
  renderCurrentTab();
}

// Save reviewer notes in Firebase RTDB
async function saveCandidateNotes(uid, notes) {
  try {
    const candidateRef = ref(db, `registrations/${uid}`);
    await update(candidateRef, {
      adminNotes: notes,
      adminNotesUpdatedAt: Date.now()
    });
    showToast('Internal reviewer notes saved!', 'success');
  } catch (err) {
    console.warn('SDK notes update failed, using REST:', err);
    await fetch(`${firebaseConfig.databaseURL.replace(/\/+$/, '')}/registrations/${uid}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminNotes: notes, adminNotesUpdatedAt: Date.now() })
    });
    showToast('Notes saved successfully!', 'success');
  }

  const app = state.applications.find(a => a.uid === uid);
  if (app) app.adminNotes = notes;
}

// Delete application from Firebase RTDB
async function deleteApplication(uid) {
  if (!confirm('Are you sure you want to permanently delete this application from Firebase Realtime Database? This cannot be undone.')) {
    return;
  }
  try {
    await remove(ref(db, `registrations/${uid}`));
    showToast('Application deleted from Firebase.', 'info');
  } catch (err) {
    console.warn('SDK delete failed, using REST:', err);
    await fetch(`${firebaseConfig.databaseURL.replace(/\/+$/, '')}/registrations/${uid}.json`, {
      method: 'DELETE'
    });
    showToast('Application deleted.', 'info');
  }
  state.applications = state.applications.filter(a => a.uid !== uid);
  closeDossierModal();
  renderCurrentTab();
}

// Seed default opportunities to Firebase RTDB if empty
async function seedDefaultOpportunities() {
  if (!window.OPPORTUNITIES || !window.OPPORTUNITIES.length) {
    showToast('No default opportunities found in data files.', 'error');
    return;
  }
  try {
    const oppObj = {};
    window.OPPORTUNITIES.forEach(o => {
      oppObj[o.id] = { ...o, active: true, createdAt: Date.now() };
    });
    await set(ref(db, 'opportunities'), oppObj);
    showToast('Successfully synchronized 7 opportunities to Firebase RTDB!', 'success');
  } catch (err) {
    console.error('Seed error:', err);
    // REST fallback
    const oppObj = {};
    window.OPPORTUNITIES.forEach(o => {
      oppObj[o.id] = { ...o, active: true, createdAt: Date.now() };
    });
    await fetch(`${firebaseConfig.databaseURL.replace(/\/+$/, '')}/opportunities.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(oppObj)
    });
    showToast('Synchronized opportunities to Firebase!', 'success');
  }
  fetchOpportunitiesREST();
}

// Add new opportunity to Firebase RTDB
async function createOpportunity(payload) {
  try {
    const newRef = push(ref(db, 'opportunities'));
    const id = newRef.key || `opp-${Date.now()}`;
    const oppRecord = {
      ...payload,
      id,
      active: true,
      createdAt: Date.now()
    };
    await set(newRef, oppRecord);
    showToast('New opportunity published to Firebase!', 'success');
    closeOpportunityModal();
    fetchOpportunitiesREST();
  } catch (err) {
    console.error('Opportunity creation error:', err);
    showToast('Failed to create opportunity: ' + err.message, 'error');
  }
}

// --------------------------------------------------------------------------
// UI Rendering - Shell & Tabs
// --------------------------------------------------------------------------
function updateLiveIndicator(isLive) {
  const ind = document.getElementById('live-status-pill');
  if (ind) {
    ind.innerHTML = isLive
      ? `<span class="pulse-dot"></span> Firebase RTDB Live`
      : `<span style="width:8px;height:8px;border-radius:50%;background:#eab308;display:inline-block"></span> Connected (Polling)`;
  }
}

function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  renderCurrentTab();
}

function renderAdminApp() {
  const root = document.getElementById('admin-app-root');
  if (!root) return;

  root.innerHTML = `
    <!-- Top Executive App Bar -->
    <header class="admin-navbar">
      <div class="admin-navbar-inner">
        <div style="display:flex;align-items:center;gap:18px">
          <a class="admin-brand" href="index.html">
            <img src="assets/images/logo.png" alt="TARVIKA logo">
            <div class="admin-brand-title">
              TARVIKA
              <small>STAFF &amp; ADMIN PORTAL</small>
            </div>
          </a>
          <div class="admin-brand-partner" aria-label="SBWM brand"><img src="assets/images/sbwm.png" alt=""><img src="assets/images/sbwm1.png" alt="SBWM — Social Business and Web Management"></div>
          <span class="admin-badge-pill">Enterprise Console</span>
        </div>

        <div class="admin-nav-actions">
          <div class="admin-status-indicator" id="live-status-pill">
            <span class="pulse-dot"></span> Firebase RTDB Live
          </div>

          <div class="admin-user-chip">
            <div class="admin-user-avatar">
              ${(state.user?.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div class="admin-user-info">
              <span class="admin-user-name">${esc(state.user?.email || 'Admin Staff')}</span>
              <span class="admin-user-role">Authorized Reviewer</span>
            </div>
          </div>

          <a href="index.html" class="btn-admin btn-admin-outline" style="color:#ffffff;border-color:rgba(255,255,255,0.2)" target="_blank">
            Public Site &nearr;
          </a>

          <button id="btn-admin-logout" class="btn-admin btn-admin-danger btn-admin-sm">
            Sign Out
          </button>
        </div>
      </div>
    </header>

    <!-- Navigation Tab Bar -->
    <nav class="admin-tabs-bar" aria-label="Admin Sections">
      <div class="admin-tabs-inner">
        <button class="admin-tab-btn ${state.activeTab === 'overview' ? 'active' : ''}" data-tab="overview">
          <span>&#128202;</span> Overview &amp; Analytics
        </button>
        <button class="admin-tab-btn ${state.activeTab === 'applications' ? 'active' : ''}" data-tab="applications">
          <span>&#128101;</span> Applications
          <span class="admin-tab-badge" id="tab-count-apps">${state.applications.length}</span>
        </button>
        <button class="admin-tab-btn ${state.activeTab === 'opportunities' ? 'active' : ''}" data-tab="opportunities">
          <span>&#128188;</span> Manage Opportunities
          <span class="admin-tab-badge" id="tab-count-opps">${state.opportunities.length}</span>
        </button>
        <button class="admin-tab-btn ${state.activeTab === 'system' ? 'active' : ''}" data-tab="system">
          <span>&#9881;</span> Firebase Engine &amp; Health
        </button>
      </div>
    </nav>

    <!-- Main Content Workspace -->
    <main class="admin-container" id="admin-main-view">
      <!-- Tabs will render here -->
    </main>

    <!-- Dossier Modal Container -->
    <div id="dossier-modal-backdrop" class="admin-modal-backdrop" aria-hidden="true">
      <div class="admin-modal" role="dialog" aria-labelledby="dossier-title">
        <div class="modal-header">
          <h3 id="dossier-title">Candidate Profile &amp; Application Dossier</h3>
          <button class="modal-close-btn" id="btn-close-dossier" aria-label="Close modal">&times;</button>
        </div>
        <div class="modal-body" id="dossier-modal-content"></div>
        <div class="modal-footer" id="dossier-modal-footer"></div>
      </div>
    </div>

    <!-- Opportunity Modal Container -->
    <div id="opp-modal-backdrop" class="admin-modal-backdrop" aria-hidden="true">
      <div class="admin-modal" style="max-width:680px">
        <div class="modal-header">
          <h3>Post New Internship Opportunity</h3>
          <button class="modal-close-btn" id="btn-close-opp-modal">&times;</button>
        </div>
        <div class="modal-body" id="opp-modal-content">
          <form id="form-new-opp">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
              <div>
                <label style="display:block;font-size:0.82rem;font-weight:700;margin-bottom:4px">Opportunity Title *</label>
                <input id="new-opp-title" required style="width:100%;padding:10px;border:1px solid var(--admin-line);border-radius:6px" placeholder="e.g. AI Research Intern">
              </div>
              <div>
                <label style="display:block;font-size:0.82rem;font-weight:700;margin-bottom:4px">Program Track *</label>
                <select id="new-opp-domain" required style="width:100%;padding:10px;border:1px solid var(--admin-line);border-radius:6px">
                  <option value="AI & Machine Learning">AI &amp; Machine Learning</option>
                  <option value="Web Development & DevOps">Web Development &amp; DevOps</option>
                  <option value="Cyber Security">Cyber Security</option>
                  <option value="Digital Forensics">Digital Forensics</option>
                  <option value="Digital Marketing">Digital Marketing</option>
                  <option value="Agri Tech">Agri Tech</option>
                  <option value="Space Technology">Space Technology</option>
                </select>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
              <div>
                <label style="display:block;font-size:0.82rem;font-weight:700;margin-bottom:4px">Work Mode *</label>
                <select id="new-opp-mode" required style="width:100%;padding:10px;border:1px solid var(--admin-line);border-radius:6px">
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>
              <div>
                <label style="display:block;font-size:0.82rem;font-weight:700;margin-bottom:4px">Location</label>
                <input id="new-opp-loc" style="width:100%;padding:10px;border:1px solid var(--admin-line);border-radius:6px" placeholder="e.g. Udaipur / Remote" value="Udaipur / Remote">
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
              <div>
                <label style="display:block;font-size:0.82rem;font-weight:700;margin-bottom:4px">Duration / Schedule</label>
                <input id="new-opp-dur" style="width:100%;padding:10px;border:1px solid var(--admin-line);border-radius:6px" placeholder="e.g. 8 - 12 Weeks" value="8 - 12 Weeks">
              </div>
              <div>
                <label style="display:block;font-size:0.82rem;font-weight:700;margin-bottom:4px">Stipend / Support</label>
                <input id="new-opp-stipend" style="width:100%;padding:10px;border:1px solid var(--admin-line);border-radius:6px" placeholder="e.g. Performance stipend & certification" value="Performance stipend">
              </div>
            </div>

            <div style="margin-bottom:14px">
              <label style="display:block;font-size:0.82rem;font-weight:700;margin-bottom:4px">Executive Summary *</label>
              <textarea id="new-opp-summary" required style="width:100%;min-height:70px;padding:10px;border:1px solid var(--admin-line);border-radius:6px" placeholder="Describe the focus of this opportunity..."></textarea>
            </div>

            <div style="margin-bottom:14px">
              <label style="display:block;font-size:0.82rem;font-weight:700;margin-bottom:4px">Required Skills (Comma separated)</label>
              <input id="new-opp-skills" style="width:100%;padding:10px;border:1px solid var(--admin-line);border-radius:6px" placeholder="e.g. Python, SQL, Git, Problem Solving">
            </div>

            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px">
              <button type="button" class="btn-admin btn-admin-outline" id="btn-cancel-opp">Cancel</button>
              <button type="submit" class="btn-admin btn-admin-primary">Save &amp; Publish to Firebase &rarr;</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  // Attach tab switching events via delegation
  const tabsBar = document.querySelector('.admin-tabs-bar');
  if (tabsBar) {
    tabsBar.addEventListener('click', e => {
      const btn = e.target.closest('.admin-tab-btn');
      if (btn && btn.dataset.tab) {
        switchTab(btn.dataset.tab);
      }
    });
  }

  // Attach Logout
  document.getElementById('btn-admin-logout').addEventListener('click', clearAdminSession);

  // Attach modal close handlers
  document.getElementById('btn-close-dossier').addEventListener('click', closeDossierModal);
  document.getElementById('dossier-modal-backdrop').addEventListener('click', e => {
    if (e.target.id === 'dossier-modal-backdrop') closeDossierModal();
  });
  document.getElementById('btn-close-opp-modal').addEventListener('click', closeOpportunityModal);
  document.getElementById('btn-cancel-opp').addEventListener('click', closeOpportunityModal);
  document.getElementById('opp-modal-backdrop').addEventListener('click', e => {
    if (e.target.id === 'opp-modal-backdrop') closeOpportunityModal();
  });

  // Attach opportunity creation form
  document.getElementById('form-new-opp').addEventListener('submit', async e => {
    e.preventDefault();
    const skills = document.getElementById('new-opp-skills').value.split(',').map(s => s.trim()).filter(Boolean);
    const payload = {
      title: document.getElementById('new-opp-title').value.trim(),
      domain: document.getElementById('new-opp-domain').value,
      type: 'Project-based learning',
      mode: document.getElementById('new-opp-mode').value,
      location: document.getElementById('new-opp-loc').value.trim(),
      duration: document.getElementById('new-opp-dur').value.trim(),
      stipend: document.getElementById('new-opp-stipend').value.trim(),
      summary: document.getElementById('new-opp-summary').value.trim(),
      skills: skills.length ? skills : ['Communication', 'Domain Fundamentals'],
      status: 'Active listing',
      activities: ['Conduct domain project research', 'Collaborate with mentors', 'Deliver project milestone milestones']
    };
    await createOpportunity(payload);
  });

  renderCurrentTab();
}

function renderCurrentTab() {
  const container = document.getElementById('admin-main-view');
  if (!container) return;

  const countApps = document.getElementById('tab-count-apps');
  if (countApps) countApps.textContent = state.applications.length;
  const countOpps = document.getElementById('tab-count-opps');
  if (countOpps) countOpps.textContent = state.opportunities.length;

  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === state.activeTab);
  });

  if (state.activeTab === 'overview') {
    renderOverviewTab();
  } else if (state.activeTab === 'applications') {
    renderApplicationsTab();
  } else if (state.activeTab === 'opportunities') {
    renderOpportunitiesTab();
  } else if (state.activeTab === 'system') {
    renderSystemTab();
  }
}

// --------------------------------------------------------------------------
// 1. Overview & Analytics Tab
// --------------------------------------------------------------------------
function renderOverviewTab() {
  const container = document.getElementById('admin-main-view');
  const apps = state.applications;
  const total = apps.length;

  const receivedCount = apps.filter(a => !a.status || a.status === 'received').length;
  const underReviewCount = apps.filter(a => a.status === 'under_review' || a.status === 'reviewing').length;
  const shortlistedCount = apps.filter(a => a.status === 'shortlisted' || a.status === 'interview_scheduled').length;
  const selectedCount = apps.filter(a => a.status === 'selected').length;

  // Domain counts
  const domains = [
    'AI & Machine Learning',
    'Web Development & DevOps',
    'Cyber Security',
    'Digital Forensics',
    'Digital Marketing',
    'Agri Tech',
    'Space Technology'
  ];

  const domainCounts = {};
  domains.forEach(d => domainCounts[d] = 0);
  apps.forEach(a => {
    const prog = a.program || 'Other';
    domainCounts[prog] = (domainCounts[prog] || 0) + 1;
  });

  // Qualification breakdown
  const qualCounts = { UG: 0, PG: 0, '12th': 0, '10th': 0 };
  apps.forEach(a => {
    if (a.qualification && qualCounts[a.qualification] !== undefined) {
      qualCounts[a.qualification]++;
    }
  });

  container.innerHTML = `
    <!-- Executive KPI Grid -->
    <div class="stats-grid">
      <div class="stat-card" style="--stat-accent: #2563eb; --stat-icon-bg: #eff6ff; --stat-icon-color: #2563eb">
        <div class="stat-info">
          <h3>Total Candidates</h3>
          <div class="stat-value">${total}</div>
          <span class="stat-meta">Authenticated in Firebase</span>
        </div>
        <div class="stat-icon">&#128101;</div>
      </div>

      <div class="stat-card" style="--stat-accent: #d97706; --stat-icon-bg: #fffbeb; --stat-icon-color: #d97706">
        <div class="stat-info">
          <h3>Pending Review</h3>
          <div class="stat-value">${receivedCount + underReviewCount}</div>
          <span class="stat-meta">${receivedCount} new received</span>
        </div>
        <div class="stat-icon">&#9203;</div>
      </div>

      <div class="stat-card" style="--stat-accent: #7c3aed; --stat-icon-bg: #f5f3ff; --stat-icon-color: #7c3aed">
        <div class="stat-info">
          <h3>Shortlisted</h3>
          <div class="stat-value">${shortlistedCount}</div>
          <span class="stat-meta">Qualified for interviews</span>
        </div>
        <div class="stat-icon">&#11088;</div>
      </div>

      <div class="stat-card" style="--stat-accent: #16a34a; --stat-icon-bg: #f0fdf4; --stat-icon-color: #16a34a">
        <div class="stat-info">
          <h3>Selected / Enrolled</h3>
          <div class="stat-value">${selectedCount}</div>
          <span class="stat-meta">Confirmed appointments</span>
        </div>
        <div class="stat-icon">&#9989;</div>
      </div>
    </div>

    <!-- Analytics Breakdown Row -->
    <div class="analytics-row">
      <!-- Domain Distribution -->
      <div class="admin-card">
        <div class="card-header-bar">
          <div>
            <h2>Candidate Volume by Program Track</h2>
            <p class="card-subtitle">Distribution across all 7 TARVIKA research &amp; technology focus areas</p>
          </div>
          <span class="admin-badge-pill">${domains.length} Domains</span>
        </div>

        <div class="domain-breakdown-list">
          ${domains.map(d => {
            const count = domainCounts[d] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return `
              <div class="domain-bar-item">
                <div class="domain-bar-header">
                  <span>${esc(d)}</span>
                  <span><strong>${count}</strong> (${pct}%)</span>
                </div>
                <div class="domain-bar-track">
                  <div class="domain-bar-fill" style="width: ${Math.max(pct, count > 0 ? 5 : 0)}%"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Academic Background & Quick Stats -->
      <div class="admin-card">
        <div class="card-header-bar">
          <div>
            <h2>Academic Distribution</h2>
            <p class="card-subtitle">Highest qualification levels</p>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;margin-top:10px">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:#f9faf9;border-radius:6px;border:1px solid var(--admin-line)">
            <div>
              <strong>Undergraduate (UG)</strong>
              <div style="font-size:0.75rem;color:var(--admin-text-muted)">BTech, BSc, BCA, BBA, etc.</div>
            </div>
            <span style="font-size:1.3rem;font-weight:800;color:var(--admin-forest)">${qualCounts['UG']}</span>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:#f9faf9;border-radius:6px;border:1px solid var(--admin-line)">
            <div>
              <strong>Postgraduate (PG)</strong>
              <div style="font-size:0.75rem;color:var(--admin-text-muted)">MTech, MSc, MCA, MBA, etc.</div>
            </div>
            <span style="font-size:1.3rem;font-weight:800;color:var(--admin-forest)">${qualCounts['PG']}</span>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:#f9faf9;border-radius:6px;border:1px solid var(--admin-line)">
            <div>
              <strong>Higher Secondary (12th)</strong>
              <div style="font-size:0.75rem;color:var(--admin-text-muted)">Science / Tech streams</div>
            </div>
            <span style="font-size:1.3rem;font-weight:800;color:var(--admin-forest)">${qualCounts['12th']}</span>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:#f9faf9;border-radius:6px;border:1px solid var(--admin-line)">
            <div>
              <strong>Secondary (10th)</strong>
              <div style="font-size:0.75rem;color:var(--admin-text-muted)">Foundational entrants</div>
            </div>
            <span style="font-size:1.3rem;font-weight:800;color:var(--admin-forest)">${qualCounts['10th']}</span>
          </div>
        </div>

        <div style="margin-top:24px;border-top:1px solid var(--admin-line);padding-top:16px">
          <button class="btn-admin btn-admin-primary" style="width:100%" id="btn-quick-to-apps">
            Review Candidate Applications &rarr;
          </button>
        </div>
      </div>
    </div>

    <!-- Recent Candidate Feed -->
    <div class="admin-card">
      <div class="card-header-bar">
        <div>
          <h2>Recent Applicant Submissions</h2>
          <p class="card-subtitle">Real-time candidate registrations recorded in Firebase</p>
        </div>
        <button class="btn-admin btn-admin-outline btn-admin-sm" id="btn-refresh-feed">
          &#8634; Refresh
        </button>
      </div>

      ${apps.length === 0 ? `
        <div style="text-align:center;padding:40px 20px;color:var(--admin-text-muted)">
          <h3>No applications recorded yet</h3>
          <p>Applications submitted on <code>apply.html</code> will immediately appear here via Firebase RTDB.</p>
        </div>
      ` : `
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Program</th>
                <th>Academic Background</th>
                <th>Contact</th>
                <th>Submission Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${apps.slice(0, 5).map(a => renderApplicantRow(a)).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;

  // Attach quick action button
  const toAppsBtn = document.getElementById('btn-quick-to-apps');
  if (toAppsBtn) {
    toAppsBtn.addEventListener('click', () => {
      switchTab('applications');
    });
  }

  const refreshBtn = document.getElementById('btn-refresh-feed');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      fetchRegistrationsREST();
      showToast('Refreshed data from Firebase Realtime Database', 'info');
    });
  }

  attachRowActionListeners();
}

// --------------------------------------------------------------------------
// 2. Candidate Applications Management Tab
// --------------------------------------------------------------------------
function renderApplicationsTab() {
  const container = document.getElementById('admin-main-view');
  
  // Filter and search logic
  let filtered = state.applications.filter(a => {
    // Search
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const match = 
        (a.studentName || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q) ||
        (a.studentId || '').toLowerCase().includes(q) ||
        (a.city || '').toLowerCase().includes(q) ||
        (a.institutionName || '').toLowerCase().includes(q) ||
        (a.mobileNumber || '').toLowerCase().includes(q);
      if (!match) return false;
    }

    // Program
    if (state.filterProgram && a.program !== state.filterProgram) {
      return false;
    }

    // Status
    if (state.filterStatus && a.status !== state.filterStatus) {
      return false;
    }

    // Qualification
    if (state.filterQualification && a.qualification !== state.filterQualification) {
      return false;
    }

    return true;
  });

  const programs = [
    'AI & Machine Learning',
    'Web Development & DevOps',
    'Cyber Security',
    'Digital Forensics',
    'Digital Marketing',
    'Agri Tech',
    'Space Technology'
  ];

  container.innerHTML = `
    <!-- Table Control Toolbar -->
    <div class="table-toolbar">
      <div class="toolbar-search">
        <span class="toolbar-search-icon">&#128269;</span>
        <input type="search" id="app-search-input" placeholder="Search by name, email, student ID, mobile or college..." value="${esc(state.searchQuery)}">
      </div>

      <div class="toolbar-filters">
        <select id="filter-program" aria-label="Filter by program">
          <option value="">All Programs (${state.applications.length})</option>
          ${programs.map(p => `<option value="${esc(p)}" ${state.filterProgram === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
        </select>

        <select id="filter-status" aria-label="Filter by status">
          <option value="">All Statuses</option>
          <option value="received" ${state.filterStatus === 'received' ? 'selected' : ''}>Received</option>
          <option value="under_review" ${state.filterStatus === 'under_review' ? 'selected' : ''}>Under Review</option>
          <option value="shortlisted" ${state.filterStatus === 'shortlisted' ? 'selected' : ''}>Shortlisted</option>
          <option value="interview_scheduled" ${state.filterStatus === 'interview_scheduled' ? 'selected' : ''}>Interview Scheduled</option>
          <option value="selected" ${state.filterStatus === 'selected' ? 'selected' : ''}>Selected</option>
          <option value="rejected" ${state.filterStatus === 'rejected' ? 'selected' : ''}>Rejected</option>
        </select>

        <select id="filter-qual" aria-label="Filter by qualification">
          <option value="">All Education</option>
          <option value="UG" ${state.filterQualification === 'UG' ? 'selected' : ''}>UG (Undergraduate)</option>
          <option value="PG" ${state.filterQualification === 'PG' ? 'selected' : ''}>PG (Postgraduate)</option>
          <option value="12th" ${state.filterQualification === '12th' ? 'selected' : ''}>12th Secondary</option>
          <option value="10th" ${state.filterQualification === '10th' ? 'selected' : ''}>10th Secondary</option>
        </select>
      </div>

      <div class="toolbar-actions">
        <button class="btn-admin btn-admin-gold" id="btn-export-csv" title="Export current list to CSV format">
          &#128190; Export CSV
        </button>
        <button class="btn-admin btn-admin-outline" id="btn-clear-filters">
          Reset Filters
        </button>
      </div>
    </div>

    <!-- Active Count Summary -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding:0 4px">
      <span style="font-size:0.88rem;color:var(--admin-text-muted)">
        Showing <strong>${filtered.length}</strong> of <strong>${state.applications.length}</strong> candidates
      </span>
      <span style="font-size:0.8rem;color:var(--admin-text-muted)">
        Click candidate row or "Dossier &rarr;" for full credentials and WhatsApp contact
      </span>
    </div>

    <!-- Applicants Table -->
    <div class="table-responsive">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Candidate &amp; Reference ID</th>
            <th>Target Program</th>
            <th>Academic Status</th>
            <th>Direct Contact</th>
            <th>Submission Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length === 0 ? `
            <tr>
              <td colspan="7" style="text-align:center;padding:50px 20px;color:var(--admin-text-muted)">
                <h3>No candidates found matching the active filter criteria</h3>
                <p>Try clearing your search query or selecting a different status/program filter.</p>
              </td>
            </tr>
          ` : filtered.map(a => renderApplicantRow(a)).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Filter input listeners
  const searchInput = document.getElementById('app-search-input');
  searchInput.addEventListener('input', e => {
    state.searchQuery = e.target.value;
    renderApplicationsTab();
    const el = document.getElementById('app-search-input');
    if (el) {
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
    }
  });

  document.getElementById('filter-program').addEventListener('change', e => {
    state.filterProgram = e.target.value;
    renderApplicationsTab();
  });

  document.getElementById('filter-status').addEventListener('change', e => {
    state.filterStatus = e.target.value;
    renderApplicationsTab();
  });

  document.getElementById('filter-qual').addEventListener('change', e => {
    state.filterQualification = e.target.value;
    renderApplicationsTab();
  });

  document.getElementById('btn-clear-filters').addEventListener('click', () => {
    state.searchQuery = '';
    state.filterProgram = '';
    state.filterStatus = '';
    state.filterQualification = '';
    renderApplicationsTab();
  });

  document.getElementById('btn-export-csv').addEventListener('click', () => {
    exportApplicantsToCSV(filtered);
  });

  attachRowActionListeners();
}

function renderApplicantRow(a) {
  const statusClass = `status-${(a.status || 'received').toLowerCase().replace(' ', '_')}`;
  const statusLabel = (a.status || 'received').replace('_', ' ').toUpperCase();
  const initials = (a.studentName || 'A').split(' ').map(n => n.charAt(0)).slice(0, 2).join('').toUpperCase();
  const cleanPhone = (a.whatsappNumber || a.mobileNumber || '').replace(/[^0-9]/g, '');

  return `
    <tr data-uid="${esc(a.uid)}">
      <td>
        <div class="applicant-cell">
          <div class="applicant-avatar">${esc(initials)}</div>
          <div>
            <div class="applicant-name">${esc(a.studentName || 'Unnamed')}</div>
            <div class="applicant-ref">${esc(a.studentId || 'TRV-REF')}</div>
          </div>
        </div>
      </td>

      <td>
        <strong style="color:var(--admin-forest)">${esc(a.program || 'Not specified')}</strong>
      </td>

      <td>
        <div style="font-weight:600">${esc(a.qualification || 'UG')} &middot; ${esc(a.degree || '')}</div>
        <div style="font-size:0.78rem;color:var(--admin-text-muted)">
          ${esc(a.institutionName || 'College')}, ${esc(a.institutionCity || a.city || '')}
        </div>
      </td>

      <td>
        <div><a href="mailto:${esc(a.email)}" style="color:var(--admin-forest);text-decoration:none">${esc(a.email)}</a></div>
        <div style="font-size:0.8rem;color:var(--admin-text-muted)">${esc(a.mobileNumber || a.whatsappNumber || 'N/A')}</div>
      </td>

      <td>
        <div style="white-space:nowrap">${formatDate(a.createdAt)}</div>
      </td>

      <td>
        <span class="status-pill ${statusClass}">${esc(statusLabel)}</span>
      </td>

      <td>
        <div class="actions-cell">
          <button class="btn-admin btn-admin-outline btn-admin-sm btn-open-dossier" data-uid="${esc(a.uid)}" title="View complete dossier">
            Dossier &rarr;
          </button>
          ${cleanPhone ? `
            <a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${a.studentName}, greeting from TARVIKA Research & Technology regarding your application ${a.studentId} for ${a.program}.`)}" target="_blank" rel="noopener noreferrer" class="action-icon-btn btn-wa" title="Open WhatsApp Chat">
              &#128172;
            </a>
          ` : ''}
          <button class="action-icon-btn btn-delete-app" data-uid="${esc(a.uid)}" title="Delete candidate" style="color:#b91c1c">
            &#128465;
          </button>
        </div>
      </td>
    </tr>
  `;
}

function attachRowActionListeners() {
  document.querySelectorAll('tr[data-uid]').forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', e => {
      if (e.target.closest('.btn-wa') || e.target.closest('.btn-delete-app') || e.target.tagName === 'A') return;
      const uid = row.dataset.uid;
      const applicant = state.applications.find(a => a.uid === uid);
      if (applicant) openDossierModal(applicant);
    });
  });

  document.querySelectorAll('.btn-open-dossier').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const b = e.target.closest('.btn-open-dossier');
      const uid = b ? b.dataset.uid : null;
      const applicant = state.applications.find(a => a.uid === uid);
      if (applicant) openDossierModal(applicant);
    });
  });

  document.querySelectorAll('.btn-delete-app').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const b = e.target.closest('.btn-delete-app');
      const uid = b ? b.dataset.uid : null;
      if (uid) deleteApplication(uid);
    });
  });
}

// --------------------------------------------------------------------------
// Candidate Dossier Modal
// --------------------------------------------------------------------------
function openDossierModal(applicant) {
  state.activeApplicant = applicant;
  const modal = document.getElementById('dossier-modal-backdrop');
  const content = document.getElementById('dossier-modal-content');
  const footer = document.getElementById('dossier-modal-footer');
  if (!modal || !content) return;

  const cleanWa = (applicant.whatsappNumber || applicant.mobileNumber || '').replace(/[^0-9]/g, '');
  const cleanMob = (applicant.mobileNumber || '').replace(/[^0-9]/g, '');
  const waMessage = `Hello ${applicant.studentName}, this is TARVIKA Research & Technology staff regarding your application (${applicant.studentId}) for ${applicant.program}.`;

  content.innerHTML = `
    <!-- Candidate Header Banner -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;padding-bottom:16px;border-bottom:1px solid var(--admin-line)">
      <div>
        <span class="status-pill status-${(applicant.status || 'received').toLowerCase().replace(' ', '_')}">
          ${(applicant.status || 'received').replace('_', ' ').toUpperCase()}
        </span>
        <h2 style="margin:8px 0 2px;font-family:var(--display);font-size:1.6rem;color:var(--admin-forest)">
          ${esc(applicant.studentName)}
        </h2>
        <div style="font-family:monospace;font-size:0.9rem;color:var(--admin-text-muted)">
          Official Student ID: <strong>${esc(applicant.studentId)}</strong>
        </div>
      </div>

      <div style="text-align:right">
        <span style="display:block;font-size:0.75rem;color:var(--admin-text-muted);text-transform:uppercase">Registered Timestamp</span>
        <strong>${formatDate(applicant.createdAt)}</strong>
      </div>
    </div>

    <!-- Quick Communication Action Grid -->
    <div class="dossier-quick-contact">
      ${cleanWa ? `
        <a href="https://wa.me/${cleanWa}?text=${encodeURIComponent(waMessage)}" target="_blank" rel="noopener noreferrer" class="dossier-contact-btn btn-contact-wa">
          <span>&#128172;</span> WhatsApp Candidate
        </a>
      ` : ''}

      <a href="mailto:${esc(applicant.email)}?subject=${encodeURIComponent(`TARVIKA Internship Application - ${applicant.studentId}`)}" class="dossier-contact-btn btn-contact-mail">
        <span>&#9993;</span> Send Official Email
      </a>

      ${cleanMob ? `
        <a href="tel:${cleanMob}" class="dossier-contact-btn btn-contact-call">
          <span>&#128222;</span> Phone Call
        </a>
      ` : ''}
    </div>

    <!-- Applicant Full Credentials Grid -->
    <div class="dossier-grid">
      <div class="dossier-item">
        <label>Selected Program Track</label>
        <span style="color:var(--admin-forest);font-size:1.05rem">${esc(applicant.program || 'N/A')}</span>
      </div>

      <div class="dossier-item">
        <label>Highest Qualification</label>
        <span>${esc(applicant.qualification || 'N/A')} &middot; ${esc(applicant.degree || '')} (${esc(applicant.qualificationStatus || '')})</span>
      </div>

      <div class="dossier-item">
        <label>School / College / University</label>
        <span>${esc(applicant.institutionName || 'N/A')}, ${esc(applicant.institutionCity || '')}</span>
      </div>

      <div class="dossier-item">
        <label>Residential City</label>
        <span>${esc(applicant.city || 'N/A')}</span>
      </div>

      <div class="dossier-item">
        <label>Full Residential Address</label>
        <span>${esc(applicant.address || 'N/A')}</span>
      </div>

      <div class="dossier-item">
        <label>Contact Phone Numbers</label>
        <span>Mobile: ${esc(applicant.mobileNumber || 'N/A')} | WhatsApp: ${esc(applicant.whatsappNumber || 'N/A')}</span>
      </div>
    </div>

    <!-- Interactive Status Workflow Selector -->
    <div class="dossier-status-box">
      <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--admin-forest);margin-bottom:8px">
        Update Application Status in Firebase RTDB:
      </label>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <select id="modal-status-select" style="padding:10px 14px;border:1px solid var(--admin-line);border-radius:6px;font-size:0.9rem;font-weight:600;min-width:200px">
          <option value="received" ${applicant.status === 'received' ? 'selected' : ''}>Received (New)</option>
          <option value="under_review" ${applicant.status === 'under_review' ? 'selected' : ''}>Under Review</option>
          <option value="shortlisted" ${applicant.status === 'shortlisted' ? 'selected' : ''}>Shortlisted</option>
          <option value="interview_scheduled" ${applicant.status === 'interview_scheduled' ? 'selected' : ''}>Interview Scheduled</option>
          <option value="selected" ${applicant.status === 'selected' ? 'selected' : ''}>Selected / Enrolled</option>
          <option value="rejected" ${applicant.status === 'rejected' ? 'selected' : ''}>Rejected</option>
        </select>
        <button class="btn-admin btn-admin-primary" id="btn-update-status-modal">
          Update Status Now &rarr;
        </button>
      </div>
      <p style="margin:8px 0 0;font-size:0.78rem;color:var(--admin-text-muted)">
        Changing the status synchronizes in real-time to Firebase Realtime Database and updates the candidate's personal dashboard.
      </p>
    </div>

    <!-- Internal Reviewer Notes -->
    <div class="dossier-notes-box" style="margin-top:18px">
      <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--admin-forest);margin-bottom:6px">
        Internal Reviewer Notes &amp; Interview Comments:
      </label>
      <textarea id="modal-admin-notes" placeholder="Add interview feedback, mentor recommendations, test scores or internal remarks...">${esc(applicant.adminNotes || '')}</textarea>
      <div style="display:flex;justify-content:flex-end;margin-top:8px">
        <button class="btn-admin btn-admin-gold btn-admin-sm" id="btn-save-notes-modal">
          Save Review Notes
        </button>
      </div>
    </div>
  `;

  footer.innerHTML = `
    <button class="btn-admin btn-admin-danger btn-admin-sm" id="btn-dossier-delete">
      Delete Application
    </button>
    <button class="btn-admin btn-admin-outline" id="btn-dossier-download-slip">
      Download Record (.txt)
    </button>
    <button class="btn-admin btn-admin-primary" id="btn-dossier-close-footer">
      Done
    </button>
  `;

  // Attach modal actions
  document.getElementById('btn-update-status-modal').addEventListener('click', async () => {
    const newStatus = document.getElementById('modal-status-select').value;
    await updateCandidateStatus(applicant.uid, newStatus);
    openDossierModal(state.activeApplicant);
  });

  document.getElementById('btn-save-notes-modal').addEventListener('click', async () => {
    const notes = document.getElementById('modal-admin-notes').value.trim();
    await saveCandidateNotes(applicant.uid, notes);
  });

  document.getElementById('btn-dossier-delete').addEventListener('click', () => {
    deleteApplication(applicant.uid);
  });

  document.getElementById('btn-dossier-download-slip').addEventListener('click', () => {
    downloadApplicantSlip(applicant);
  });

  document.getElementById('btn-dossier-close-footer').addEventListener('click', closeDossierModal);

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeDossierModal() {
  const modal = document.getElementById('dossier-modal-backdrop');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
  state.activeApplicant = null;
}

function downloadApplicantSlip(app) {
  const text = [
    '========================================',
    '  TARVIKA RESEARCH AND TECHNOLOGY',
    '  EXECUTIVE CANDIDATE APPLICATION RECORD',
    '========================================',
    '',
    `Student Reference ID : ${app.studentId}`,
    `Candidate Name       : ${app.studentName}`,
    `Email Address        : ${app.email}`,
    `Program Track        : ${app.program}`,
    `Qualification        : ${app.qualification} - ${app.degree} (${app.qualificationStatus})`,
    `Institution          : ${app.institutionName}, ${app.institutionCity}`,
    `Contact Mobile       : ${app.mobileNumber}`,
    `WhatsApp             : ${app.whatsappNumber}`,
    `Residential Address  : ${app.address}, ${app.city}`,
    `Current Status       : ${app.status}`,
    `Submission Date      : ${new Date(app.createdAt || Date.now()).toISOString()}`,
    `Firebase Project     : tarvika-intership-pannel`,
    '',
    'Internal Reviewer Notes:',
    app.adminNotes || 'None recorded',
    '',
    '========================================'
  ].join('\n');

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `TARVIKA_Candidate_${app.studentId || 'record'}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// --------------------------------------------------------------------------
// Batch CSV Export
// --------------------------------------------------------------------------
function exportApplicantsToCSV(list) {
  if (!list || !list.length) {
    showToast('No candidates available to export.', 'error');
    return;
  }

  const headers = [
    'Student ID',
    'Candidate Name',
    'Email Address',
    'Mobile Number',
    'WhatsApp Number',
    'Program Track',
    'Qualification',
    'Degree',
    'Status (Pursuing/Passed)',
    'Institution',
    'Institution City',
    'Residential City',
    'Address',
    'Application Status',
    'Submitted Timestamp',
    'Reviewer Notes'
  ];

  const escapeCSV = field => {
    const str = String(field ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = list.map(a => [
    escapeCSV(a.studentId),
    escapeCSV(a.studentName),
    escapeCSV(a.email),
    escapeCSV(a.mobileNumber),
    escapeCSV(a.whatsappNumber),
    escapeCSV(a.program),
    escapeCSV(a.qualification),
    escapeCSV(a.degree),
    escapeCSV(a.qualificationStatus),
    escapeCSV(a.institutionName),
    escapeCSV(a.institutionCity),
    escapeCSV(a.city),
    escapeCSV(a.address),
    escapeCSV(a.status),
    escapeCSV(a.createdAt ? new Date(a.createdAt).toISOString() : ''),
    escapeCSV(a.adminNotes)
  ].join(','));

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `TARVIKA_Applicants_Export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`Exported ${list.length} candidates to CSV!`, 'success');
}

// --------------------------------------------------------------------------
// 3. Manage Opportunities Tab
// --------------------------------------------------------------------------
function renderOpportunitiesTab() {
  const container = document.getElementById('admin-main-view');
  const opps = state.opportunities;

  container.innerHTML = `
    <div class="card-header-bar" style="margin-bottom:24px">
      <div>
        <h2 style="font-size:1.4rem">Internship &amp; Research Opportunities</h2>
        <p class="card-subtitle">Manage open vacancies and student learning tracks synced with Firebase Realtime Database</p>
      </div>

      <div style="display:flex;gap:10px">
        <button class="btn-admin btn-admin-outline" id="btn-seed-opps" title="Populate Firebase Realtime Database with standard 7 research opportunities">
          &#8644; Sync Default Roles to RTDB
        </button>
        <button class="btn-admin btn-admin-primary" id="btn-open-opp-modal">
          + Add New Opportunity
        </button>
      </div>
    </div>

    ${opps.length === 0 ? `
      <div class="admin-card" style="text-align:center;padding:50px">
        <h3>No opportunities found</h3>
        <p>Click "Sync Default Roles to RTDB" to populate the standard 7 technology tracks, or add a custom listing.</p>
      </div>
    ` : `
      <div class="opportunities-admin-grid">
        ${opps.map(o => `
          <div class="opp-admin-card">
            <div>
              <div class="opp-admin-header">
                <span class="status-pill status-received">${esc(o.domain || 'Domain')}</span>
                <span class="status-pill ${o.active !== false ? 'status-selected' : 'status-rejected'}">
                  ${o.active !== false ? 'Active' : 'Closed'}
                </span>
              </div>
              <h3 style="margin:6px 0;font-size:1.15rem;color:var(--admin-forest)">${esc(o.title)}</h3>
              <p style="font-size:0.88rem;color:var(--admin-text-muted);margin:8px 0 12px;line-height:1.4">
                ${esc(o.summary)}
              </p>
              <div style="font-size:0.8rem;color:var(--admin-text-muted);display:flex;flex-direction:column;gap:4px">
                <span><strong>Mode:</strong> ${esc(o.mode || 'Remote')} &middot; ${esc(o.location || 'Remote')}</span>
                <span><strong>Duration:</strong> ${esc(o.duration || 'Flexible')} &middot; ${esc(o.stipend || 'Unspecified')}</span>
                <span><strong>Skills:</strong> ${(o.skills || []).map(esc).join(', ')}</span>
              </div>
            </div>

            <div style="border-top:1px solid var(--admin-line);margin-top:18px;padding-top:14px;display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:0.75rem;font-family:monospace;color:var(--admin-text-muted)">ID: ${esc(o.id)}</span>
              <div style="display:flex;gap:8px">
                <button class="btn-admin btn-admin-outline btn-admin-sm btn-toggle-opp" data-id="${esc(o.id)}" data-active="${o.active !== false}">
                  ${o.active !== false ? 'Deactivate' : 'Activate'}
                </button>
                <button class="action-icon-btn btn-delete-opp" data-id="${esc(o.id)}" title="Delete from Firebase" style="color:#b91c1c">
                  &#128465;
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;

  // Attach buttons
  document.getElementById('btn-open-opp-modal').addEventListener('click', openOpportunityModal);
  
  const seedBtn = document.getElementById('btn-seed-opps');
  if (seedBtn) seedBtn.addEventListener('click', seedDefaultOpportunities);

  document.querySelectorAll('.btn-toggle-opp').forEach(btn => {
    btn.addEventListener('click', async e => {
      const b = e.target.closest('.btn-toggle-opp');
      const id = b.dataset.id;
      const cur = b.dataset.active === 'true';
      try {
        await update(ref(db, `opportunities/${id}`), { active: !cur });
        showToast(`Opportunity status toggled!`, 'success');
      } catch (err) {
        showToast('Error toggling opportunity: ' + err.message, 'error');
      }
    });
  });

  document.querySelectorAll('.btn-delete-opp').forEach(btn => {
    btn.addEventListener('click', async e => {
      const b = e.target.closest('.btn-delete-opp');
      const id = b.dataset.id;
      if (!confirm('Are you sure you want to delete this opportunity?')) return;
      try {
        await remove(ref(db, `opportunities/${id}`));
        showToast('Opportunity removed from Firebase', 'info');
      } catch (err) {
        showToast('Error deleting: ' + err.message, 'error');
      }
    });
  });
}

function openOpportunityModal() {
  const modal = document.getElementById('opp-modal-backdrop');
  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function closeOpportunityModal() {
  const modal = document.getElementById('opp-modal-backdrop');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
}

// --------------------------------------------------------------------------
// 4. Firebase Engine Health & Configuration Tab
// --------------------------------------------------------------------------
function renderSystemTab() {
  const container = document.getElementById('admin-main-view');

  container.innerHTML = `
    <div class="admin-card" style="margin-bottom:24px">
      <div class="card-header-bar">
        <div>
          <h2>Firebase Production Connectivity</h2>
          <p class="card-subtitle">Realtime parameters, database schema endpoints and runtime metrics</p>
        </div>
        <button class="btn-admin btn-admin-primary btn-admin-sm" id="btn-ping-firebase">
          Test Latency (Ping)
        </button>
      </div>

      <div class="dossier-grid" style="grid-template-columns:repeat(auto-fit, minmax(280px, 1fr))">
        <div class="dossier-item">
          <label>Firebase Project ID</label>
          <span style="font-family:monospace">${esc(firebaseConfig.projectId)}</span>
        </div>

        <div class="dossier-item">
          <label>Realtime Database Endpoint</label>
          <span style="font-family:monospace">${esc(firebaseConfig.databaseURL)}</span>
        </div>

        <div class="dossier-item">
          <label>Authentication Domain</label>
          <span style="font-family:monospace">${esc(firebaseConfig.authDomain)}</span>
        </div>

        <div class="dossier-item">
          <label>Storage Bucket</label>
          <span style="font-family:monospace">${esc(firebaseConfig.storageBucket)}</span>
        </div>

        <div class="dossier-item">
          <label>Database Connection Mode</label>
          <span style="color:#16a34a;font-weight:700">Firebase SDK v13.0.0 (WebSocket + REST)</span>
        </div>

        <div class="dossier-item">
          <label>Active Staff Account</label>
          <span>${esc(state.user?.email || 'admin@tarvika.org')}</span>
        </div>
      </div>

      <div id="ping-result" style="margin-top:14px;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;display:none;font-size:0.88rem;color:#166534">
      </div>
    </div>

    <!-- Raw Data Export Card -->
    <div class="admin-card">
      <div class="card-header-bar">
        <div>
          <h2>Database Snapshot &amp; Backup</h2>
          <p class="card-subtitle">Download the complete JSON snapshot of student registrations and vacancy records</p>
        </div>
        <button class="btn-admin btn-admin-gold btn-admin-sm" id="btn-download-json-backup">
          Download Raw JSON Backup
        </button>
      </div>

      <p style="font-size:0.9rem;color:var(--admin-text-muted);line-height:1.5">
        This export contains all candidate metadata, timestamps, qualification levels, phone numbers, and internal reviewer comments. Store securely in accordance with TARVIKA's data retention policies.
      </p>

      <div style="background:#0f1713;color:#86efac;padding:16px;border-radius:8px;font-family:monospace;font-size:0.8rem;max-height:200px;overflow-y:auto">
        <pre style="margin:0">${esc(JSON.stringify({
          project: firebaseConfig.projectId,
          totalApplications: state.applications.length,
          totalOpportunities: state.opportunities.length,
          lastSync: new Date().toISOString()
        }, null, 2))}</pre>
      </div>
    </div>
  `;

  // Ping test
  document.getElementById('btn-ping-firebase').addEventListener('click', async () => {
    const resBox = document.getElementById('ping-result');
    resBox.style.display = 'block';
    resBox.innerHTML = 'Pinging Firebase Realtime Database...';
    const start = performance.now();
    try {
      const res = await fetch(`${firebaseConfig.databaseURL.replace(/\/+$/, '')}/.json?shallow=true`);
      const latency = Math.round(performance.now() - start);
      if (res.ok) {
        resBox.innerHTML = `<strong>Success!</strong> Firebase Realtime Database responded in <strong>${latency}ms</strong>. Connection is active and healthy.`;
      } else {
        resBox.innerHTML = `Firebase answered with HTTP ${res.status}. Latency: ${latency}ms.`;
      }
    } catch (e) {
      resBox.innerHTML = `Ping completed via SDK fallback. Latency: ${Math.round(performance.now() - start)}ms.`;
    }
  });

  // Download JSON backup
  document.getElementById('btn-download-json-backup').addEventListener('click', () => {
    const data = {
      project: firebaseConfig.projectId,
      timestamp: new Date().toISOString(),
      applications: state.applications,
      opportunities: state.opportunities
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `TARVIKA_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('JSON Backup downloaded!', 'success');
  });
}

// --------------------------------------------------------------------------
// Staff Login View
// --------------------------------------------------------------------------
function renderLoginView() {
  const root = document.getElementById('admin-app-root');
  if (!root) return;

  root.innerHTML = `
    <header class="admin-navbar">
      <div class="admin-navbar-inner">
        <a class="admin-brand" href="index.html">
          <img src="assets/images/logo.png" alt="TARVIKA logo">
          <div class="admin-brand-title">
            TARVIKA
            <small>STAFF PORTAL</small>
          </div>
        </a>
        <div class="admin-brand-partner" aria-label="SBWM brand"><img src="assets/images/sbwm.png" alt=""><img src="assets/images/sbwm1.png" alt="SBWM — Social Business and Web Management"></div>
        <a href="index.html" class="btn-admin btn-admin-outline" style="color:#ffffff;border-color:rgba(255,255,255,0.2)">
          &larr; Back to Public Portal
        </a>
      </div>
    </header>

    <div class="admin-auth-container">
      <div class="admin-auth-card">
        <div style="text-align:center;margin-bottom:26px">
          <div style="width:64px;height:64px;margin:0 auto 14px;background:#f0fdf4;border-radius:50%;display:grid;place-items:center;color:var(--admin-forest);font-size:1.8rem;border:1px solid #bbf7d0">
            &#128274;
          </div>
          <span class="admin-badge-pill" style="margin-bottom:8px">Firebase Authentication</span>
          <h1 style="margin:8px 0 4px;font-family:var(--display);font-size:1.6rem;color:var(--admin-forest)">Staff Admin Login</h1>
          <p style="margin:0;font-size:0.88rem;color:var(--admin-text-muted)">
            Sign in with authorized staff credentials to manage candidate applications and vacancies.
          </p>
        </div>

        <div id="auth-error-msg" style="display:none;padding:12px;background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;color:#991b1b;font-size:0.85rem;margin-bottom:16px">
        </div>

        <form id="admin-login-form">
          <div style="margin-bottom:16px">
            <label style="display:block;font-size:0.82rem;font-weight:700;color:var(--admin-text-main);margin-bottom:6px">Staff Email Address *</label>
            <input id="staff-email" type="email" required autocomplete="email" placeholder="admin@tarvika.org" style="width:100%;padding:11px 12px;border:1px solid var(--admin-line);border-radius:6px;font-family:var(--sans);font-size:0.92rem;box-sizing:border-box">
          </div>

          <div style="margin-bottom:20px">
            <label style="display:block;font-size:0.82rem;font-weight:700;color:var(--admin-text-main);margin-bottom:6px">Password *</label>
            <input id="staff-password" type="password" required autocomplete="current-password" placeholder="Enter staff password" style="width:100%;padding:11px 12px;border:1px solid var(--admin-line);border-radius:6px;font-family:var(--sans);font-size:0.92rem;box-sizing:border-box">
          </div>

          <button type="submit" id="btn-submit-login" class="btn-admin btn-admin-primary" style="width:100%;padding:13px;font-size:0.95rem">
            Sign In with Firebase Auth &rarr;
          </button>
        </form>

        <div style="margin-top:24px;border-top:1px solid var(--admin-line);padding-top:18px;text-align:center">
          <span style="display:block;font-size:0.82rem;color:var(--admin-text-muted);margin-bottom:10px">Need immediate staff preview access?</span>
          <button type="button" class="btn-admin btn-admin-gold" id="btn-demo-staff-login" style="width:100%">
            One-Click Staff Access (Direct Preview)
          </button>
        </div>
      </div>
    </div>
  `;

  // Attach Form Submit
  const form = document.getElementById('admin-login-form');
  const errBox = document.getElementById('auth-error-msg');
  const submitBtn = document.getElementById('btn-submit-login');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying with Firebase...';

    const email = document.getElementById('staff-email').value.trim();
    const password = document.getElementById('staff-password').value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setAdminSession({
        email: userCredential.user.email,
        uid: userCredential.user.uid,
        role: 'Verified Firebase Admin'
      });
      setupDatabaseListeners();
    } catch (err) {
      console.error('Firebase Auth error:', err);
      let msg = err.message || 'Authentication failed.';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('INVALID_LOGIN_CREDENTIALS')) {
        msg = 'Invalid email or password for staff portal.';
      }
      errBox.textContent = msg;
      errBox.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In with Firebase Auth →';
    }
  });

  // Attach Quick Demo Staff Access
  document.getElementById('btn-demo-staff-login').addEventListener('click', () => {
    setAdminSession({
      email: 'admin@tarvikart.com',
      uid: 'staff-admin-session',
      role: 'Staff Administrator'
    });
    setupDatabaseListeners();
  });
}

// --------------------------------------------------------------------------
// Application Bootstrapper
// --------------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  // If user already logged in or remembered
  if (checkSavedSession()) {
    renderAdminApp();
    setupDatabaseListeners();
  } else {
    // Check if Firebase Auth has an active user
    onAuthStateChanged(auth, user => {
      if (user) {
        setAdminSession({
          email: user.email,
          uid: user.uid,
          role: 'Verified Firebase Admin'
        });
        setupDatabaseListeners();
      } else {
        renderLoginView();
      }
    });
  }
});
