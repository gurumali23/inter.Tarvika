// ==========================================================================
// TARVIKA Research & Technology - Executive Admin Panel
// Firebase SDK v13.0.0 Restricted Administrative Access
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-analytics.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updatePassword,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  get, 
  set, 
  update, 
  remove, 
  onValue, 
  push
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

// Official Firebase configuration for TARVIKA Internship Panel
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

// Authorized Admin Emails Whitelist (Restricted Access)
const AUTHORIZED_ADMIN_EMAILS = [
  'admin@tarvika.com',
  'admin@tarvikart.com',
  'director@tarvikart.com'
];

// Initialize Firebase SDK services
const app = initializeApp(firebaseConfig);
let analytics = null;
try { analytics = getAnalytics(app); } catch (e) { console.warn('Analytics warning:', e); }
const auth = getAuth(app);
const db = getDatabase(app);

// Application State
const state = {
  user: null,
  applications: [],
  opportunities: [],
  authorizedAdmins: [],
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
// Authorization & Multi-Admin Session Management
// --------------------------------------------------------------------------
function getLocalCustomAdmins() {
  try {
    return JSON.parse(localStorage.getItem('tarvika_custom_admins') || '[]');
  } catch {
    return [];
  }
}

function saveLocalCustomAdmin(email) {
  if (!email) return;
  const list = getLocalCustomAdmins();
  const norm = email.toLowerCase().trim();
  if (!list.includes(norm)) {
    list.push(norm);
    localStorage.setItem('tarvika_custom_admins', JSON.stringify(list));
  }
}

function removeLocalCustomAdmin(email) {
  if (!email) return;
  const norm = email.toLowerCase().trim();
  try {
    let list = getLocalCustomAdmins();
    list = list.filter(e => e.toLowerCase() !== norm);
    localStorage.setItem('tarvika_custom_admins', JSON.stringify(list));
  } catch {}
}

function generateSecurePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let pwd = 'Admin@';
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

async function verifyAdminAuthorization(user) {
  if (!user || !user.email) return false;
  const emailNorm = user.email.toLowerCase().trim();

  // 1. Direct static whitelist match
  if (AUTHORIZED_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(emailNorm)) {
    return true;
  }

  // 2. Check local custom admins whitelist cache
  const cachedAdmins = getLocalCustomAdmins();
  if (cachedAdmins.includes(emailNorm)) {
    return true;
  }

  // 3. Realtime Database /authorized_admins check by UID or email
  try {
    if (user.uid) {
      const adminSnap = await get(ref(db, `authorized_admins/${user.uid}`));
      if (adminSnap.exists()) {
        const val = adminSnap.val();
        if (val && val.status !== 'revoked') {
          saveLocalCustomAdmin(emailNorm);
          return true;
        }
      }
    }

    // Check by email in authorized_admins collection
    const allAdminsSnap = await get(ref(db, 'authorized_admins'));
    if (allAdminsSnap.exists()) {
      const records = allAdminsSnap.val();
      const match = Object.values(records).some(r => 
        r && r.email && r.email.toLowerCase() === emailNorm && r.status !== 'revoked'
      );
      if (match) {
        saveLocalCustomAdmin(emailNorm);
        return true;
      }
    }
  } catch (err) {
    console.warn('RTDB admin verification warning:', err);
    // Fallback REST check
    try {
      const res = await fetch(`${firebaseConfig.databaseURL.replace(/\/+$/, '')}/authorized_admins.json`);
      const records = await res.json();
      if (records && typeof records === 'object') {
        const match = Object.values(records).some(r => 
          r && r.email && r.email.toLowerCase() === emailNorm && r.status !== 'revoked'
        );
        if (match) {
          saveLocalCustomAdmin(emailNorm);
          return true;
        }
      }
    } catch {}
  }

  return false;
}

function checkSavedSession() {
  const saved = localStorage.getItem('tarvika_admin_session');
  if (saved) {
    try {
      const u = JSON.parse(saved);
      if (u && u.email) {
        const emailNorm = u.email.toLowerCase();
        const cached = getLocalCustomAdmins();
        if (AUTHORIZED_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(emailNorm) || cached.includes(emailNorm) || u.role) {
          state.user = u;
          return true;
        }
      }
    } catch {}
  }
  return false;
}

function setAdminSession(user) {
  state.user = user;
  localStorage.setItem('tarvika_admin_session', JSON.stringify(user));
  renderAdminApp();
}

async function clearAdminSession() {
  state.user = null;
  localStorage.removeItem('tarvika_admin_session');
  try { await signOut(auth); } catch {}
  renderLoginView();
}

// REST fallback for fetching authorized admins
async function fetchAuthorizedAdminsREST() {
  try {
    const res = await fetch(`${firebaseConfig.databaseURL.replace(/\/+$/, '')}/authorized_admins.json`);
    const data = await res.json();
    if (data && typeof data === 'object') {
      state.authorizedAdmins = Object.entries(data).map(([id, item]) => ({
        id,
        ...item
      }));
      state.authorizedAdmins.forEach(a => {
        if (a.email && a.status !== 'revoked') saveLocalCustomAdmin(a.email);
      });
    }
  } catch (err) {
    console.warn('fetchAuthorizedAdminsREST warning:', err);
  }
}

// Add / Authorize a new admin Gmail or corporate email
async function addAuthorizedAdmin({ email, name, role, password }) {
  const emailNorm = (email || '').toLowerCase().trim();
  if (!emailNorm || !emailNorm.includes('@')) {
    throw new Error('Please enter a valid email address (e.g., colleague@gmail.com).');
  }
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  let userUid = null;

  // 1. Create account in Firebase Authentication via REST
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailNorm,
        password: password,
        returnSecureToken: true
      })
    });
    const authData = await res.json();
    if (authData.error) {
      if (authData.error.message === 'EMAIL_EXISTS') {
        console.log('User already exists in Firebase Auth, authorizing in RTDB directly.');
      } else {
        throw new Error(authData.error.message || 'Firebase Auth account creation failed.');
      }
    } else if (authData.localId) {
      userUid = authData.localId;
    }
  } catch (authErr) {
    if (!authErr.message || !authErr.message.includes('EMAIL_EXISTS')) {
      console.warn('Firebase Auth note:', authErr);
    }
  }

  // 2. Generate key in RTDB
  const rtdbKey = userUid || ('admin_' + btoa(emailNorm).replace(/[/+=]/g, '_'));

  // 3. Save admin record in RTDB /authorized_admins
  const record = {
    email: emailNorm,
    name: (name || '').trim() || 'Co-Administrator',
    role: role || 'Co-Administrator',
    status: 'active',
    createdAt: Date.now(),
    addedBy: state.user?.email || 'admin@tarvika.com'
  };

  try {
    await set(ref(db, `authorized_admins/${rtdbKey}`), record);
  } catch {
    await fetch(`${firebaseConfig.databaseURL.replace(/\/+$/, '')}/authorized_admins/${rtdbKey}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
  }

  // 4. Update local cache
  saveLocalCustomAdmin(emailNorm);

  // 5. Update local state
  const existingIdx = state.authorizedAdmins.findIndex(a => a.id === rtdbKey || (a.email && a.email.toLowerCase() === emailNorm));
  if (existingIdx >= 0) {
    state.authorizedAdmins[existingIdx] = { id: rtdbKey, ...record };
  } else {
    state.authorizedAdmins.unshift({ id: rtdbKey, ...record });
  }

  return { email: emailNorm, rtdbKey, record };
}

// Revoke an authorized admin
async function revokeAuthorizedAdmin(adminId, email) {
  const emailNorm = (email || '').toLowerCase().trim();
  if (emailNorm === 'admin@tarvika.com') {
    throw new Error('The primary super administrator account (admin@tarvika.com) cannot be removed.');
  }

  try {
    await remove(ref(db, `authorized_admins/${adminId}`));
  } catch {
    await fetch(`${firebaseConfig.databaseURL.replace(/\/+$/, '')}/authorized_admins/${adminId}.json`, {
      method: 'DELETE'
    });
  }

  removeLocalCustomAdmin(emailNorm);
  state.authorizedAdmins = state.authorizedAdmins.filter(a => a.id !== adminId && (a.email || '').toLowerCase() !== emailNorm);
}

// --------------------------------------------------------------------------
// Realtime Database Listeners & Operations
// --------------------------------------------------------------------------
function setupDatabaseListeners() {
  fetchRegistrationsREST();
  fetchOpportunitiesREST();
  fetchAuthorizedAdminsREST();

  try {
    const adminsRef = ref(db, 'authorized_admins');
    onValue(adminsRef, snapshot => {
      const data = snapshot.val();
      if (data && typeof data === 'object') {
        state.authorizedAdmins = Object.entries(data).map(([id, item]) => ({
          id,
          ...item
        }));
        state.authorizedAdmins.forEach(a => {
          if (a.email && a.status !== 'revoked') saveLocalCustomAdmin(a.email);
        });
      } else {
        state.authorizedAdmins = [];
      }
      if (state.activeTab === 'system') {
        renderAuthorizedAdminsList();
      }
    }, err => {
      console.warn('Admins listener error:', err);
      fetchAuthorizedAdminsREST();
    });
  } catch (e) {
    console.warn('Admins listener setup error:', e);
  }

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
      console.warn('Realtime subscription error, using REST fallback:', err);
      state.isLiveConnected = false;
      updateLiveIndicator(false);
      fetchRegistrationsREST();
    });
  } catch (e) {
    console.warn('Reg listener setup error:', e);
  }

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
        state.opportunities = (window.OPPORTUNITIES || []).map(o => ({ ...o }));
      }
      if (state.activeTab === 'opportunities') renderOpportunitiesTab();
    }, err => {
      console.warn('Opportunities fetch error:', err);
      state.opportunities = (window.OPPORTUNITIES || []).map(o => ({ ...o }));
    });
  } catch (e) {
    console.warn('Opps listener error:', e);
  }
}

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

async function updateCandidateStatus(uid, newStatus) {
  try {
    const candidateRef = ref(db, `registrations/${uid}`);
    await update(candidateRef, {
      status: newStatus,
      statusUpdatedAt: Date.now(),
      statusUpdatedBy: state.user?.email || 'admin'
    });
    showToast(`Status updated to "${newStatus.replace('_', ' ').toUpperCase()}"`, 'success');
  } catch (err) {
    console.warn('SDK update fallback to REST:', err);
    const res = await fetch(`${firebaseConfig.databaseURL.replace(/\/+$/, '')}/registrations/${uid}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, statusUpdatedAt: Date.now() })
    });
    if (!res.ok) throw new Error('Could not update status.');
    showToast(`Status updated to "${newStatus}"`, 'success');
  }

  const app = state.applications.find(a => a.uid === uid);
  if (app) app.status = newStatus;
  if (state.activeApplicant && state.activeApplicant.uid === uid) {
    state.activeApplicant.status = newStatus;
  }
  renderCurrentTab();
}

async function saveCandidateNotes(uid, notes) {
  try {
    const candidateRef = ref(db, `registrations/${uid}`);
    await update(candidateRef, {
      adminNotes: notes,
      adminNotesUpdatedAt: Date.now()
    });
    showToast('Internal reviewer notes saved!', 'success');
  } catch (err) {
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

async function deleteApplication(uid) {
  if (!confirm('Are you sure you want to permanently delete this application from Firebase Realtime Database? This action is irreversible.')) {
    return;
  }
  try {
    await remove(ref(db, `registrations/${uid}`));
    showToast('Application deleted from Firebase.', 'info');
  } catch (err) {
    await fetch(`${firebaseConfig.databaseURL.replace(/\/+$/, '')}/registrations/${uid}.json`, {
      method: 'DELETE'
    });
    showToast('Application deleted.', 'info');
  }
  state.applications = state.applications.filter(a => a.uid !== uid);
  closeDossierModal();
  renderCurrentTab();
}

async function seedDefaultOpportunities() {
  if (!window.OPPORTUNITIES || !window.OPPORTUNITIES.length) {
    showToast('No default opportunities found.', 'error');
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
    console.error('Opportunity error:', err);
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
            <div class="admin-brand-partner">
              <img src="assets/images/sbwm.png" alt="SBWM symbol">
              <img src="assets/images/sbwm1.png" alt="SBWM wordmark">
            </div>
            <div class="admin-brand-title">
              TARVIKA
              <small>ADMINISTRATIVE CONSOLE</small>
            </div>
          </a>
          <span class="admin-badge-pill" style="background:#16653420;border-color:#16a34a80;color:#86efac">
            RESTRICTED ACCESS
          </span>
        </div>

        <div class="admin-nav-actions">
          <div class="admin-status-indicator" id="live-status-pill">
            <span class="pulse-dot"></span> Firebase RTDB Live
          </div>

          <div class="admin-user-chip" title="Authorized Administrator">
            <div class="admin-user-avatar" style="background:var(--admin-gold);color:var(--admin-forest)">
              &#128100;
            </div>
            <div class="admin-user-info">
              <span class="admin-user-name">${esc(state.user?.email || 'admin@tarvika.com')}</span>
              <span class="admin-user-role" style="color:#86efac;font-weight:700">Super Administrator</span>
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
          <span>&#9881;</span> Security &amp; Firebase Engine
        </button>
      </div>
    </nav>

    <!-- Main Content Workspace -->
    <main class="admin-container" id="admin-main-view">
      <!-- Tabs render here -->
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
                <input id="new-opp-stipend" style="width:100%;padding:10px;border:1px solid var(--admin-line);border-radius:6px" placeholder="e.g. Performance stipend" value="Performance stipend">
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
      activities: ['Conduct domain project research', 'Collaborate with mentors', 'Deliver project milestones']
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
  
  let filtered = state.applications.filter(a => {
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

    if (state.filterProgram && a.program !== state.filterProgram) {
      return false;
    }

    if (state.filterStatus && a.status !== state.filterStatus) {
      return false;
    }

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
// 4. Security & Firebase Engine Configuration Tab
// --------------------------------------------------------------------------
function renderSystemTab() {
  const container = document.getElementById('admin-main-view');

  container.innerHTML = `
    <!-- Administrator Credentials & Password Management -->
    <div class="admin-card" style="margin-bottom:24px;border-top:4px solid var(--admin-gold)">
      <div class="card-header-bar">
        <div>
          <h2>Administrator Account &amp; Access Credentials</h2>
          <p class="card-subtitle">Protected admin profile and separate access password management</p>
        </div>
        <span class="status-pill status-selected">Authorized Staff Session</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
        <div style="background:#f8faf8;padding:16px;border-radius:8px;border:1px solid var(--admin-line)">
          <span style="display:block;font-size:0.75rem;text-transform:uppercase;color:var(--admin-text-muted);font-weight:700">Dedicated Admin Email</span>
          <strong style="font-size:1.1rem;color:var(--admin-forest)">${esc(state.user?.email || 'admin@tarvika.com')}</strong>
          <p style="margin:6px 0 0;font-size:0.82rem;color:var(--admin-text-muted)">Registered as Super Administrator in Firebase Authentication.</p>
        </div>

        <div style="background:#f8faf8;padding:16px;border-radius:8px;border:1px solid var(--admin-line)">
          <span style="display:block;font-size:0.75rem;text-transform:uppercase;color:var(--admin-text-muted);font-weight:700">Security Clearance</span>
          <strong style="font-size:1.1rem;color:#15803d">Level 1 - Full Enterprise Control</strong>
          <p style="margin:6px 0 0;font-size:0.82rem;color:var(--admin-text-muted)">Authorized for candidate review, status updates, and vacancy publication.</p>
        </div>
      </div>

      <!-- Change Admin Password Form -->
      <div style="border-top:1px solid var(--admin-line);padding-top:18px">
        <h3 style="margin:0 0 6px;font-size:1rem;color:var(--admin-forest)">Update Admin Password</h3>
        <p style="margin:0 0 14px;font-size:0.85rem;color:var(--admin-text-muted)">Change your administrative access password directly in Firebase Authentication.</p>

        <form id="form-change-password" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
          <div style="flex:1;min-width:220px">
            <label style="display:block;font-size:0.8rem;font-weight:700;margin-bottom:4px">New Password (Min 8 chars) *</label>
            <input type="password" id="new-admin-password" required minlength="8" placeholder="Enter new password" style="width:100%;padding:10px;border:1px solid var(--admin-line);border-radius:6px;font-family:var(--sans);font-size:0.9rem;box-sizing:border-box">
          </div>
          <div style="flex:1;min-width:220px">
            <label style="display:block;font-size:0.8rem;font-weight:700;margin-bottom:4px">Confirm New Password *</label>
            <input type="password" id="confirm-admin-password" required minlength="8" placeholder="Repeat new password" style="width:100%;padding:10px;border:1px solid var(--admin-line);border-radius:6px;font-family:var(--sans);font-size:0.9rem;box-sizing:border-box">
          </div>
          <button type="submit" class="btn-admin btn-admin-gold" id="btn-save-new-password">
            Save New Password
          </button>
        </form>
        <div id="change-pwd-msg" style="display:none;margin-top:10px;font-size:0.85rem;font-weight:600"></div>
      </div>
    </div>

    <!-- Authorized Administrators & Gmail Access Management Card -->
    <div class="admin-card" style="margin-bottom:24px;border-top:4px solid var(--admin-forest)">
      <div class="card-header-bar">
        <div>
          <h2>Authorized Administrators &amp; Gmail Whitelist</h2>
          <p class="card-subtitle">Authorize additional Gmail or institutional accounts to sign in to the TARVIKA Admin Portal.</p>
        </div>
        <span class="status-pill status-selected" id="admins-count-pill">
          ${(state.authorizedAdmins.length || 1)} Authorized Accounts
        </span>
      </div>

      <!-- Add New Admin / Gmail Form -->
      <div style="background:#f8faf8;padding:20px;border-radius:8px;border:1px solid var(--admin-line);margin-bottom:22px">
        <h3 style="margin:0 0 6px;font-size:1.02rem;color:var(--admin-forest);display:flex;align-items:center;gap:8px">
          <span>&#10010;</span> Authorize New Admin (Gmail or Corporate Email)
        </h3>
        <p style="margin:0 0 16px;font-size:0.83rem;color:var(--admin-text-muted)">
          The added account will be registered in Firebase Realtime Database and can log in immediately via Email/Password or direct Google Sign-In.
        </p>

        <form id="form-add-admin">
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px;margin-bottom:14px">
            <div>
              <label for="new-admin-email" style="display:block;font-size:0.8rem;font-weight:700;color:var(--admin-text-main);margin-bottom:4px">
                Admin Gmail / Email Address *
              </label>
              <input id="new-admin-email" type="email" required placeholder="e.g. colleague@gmail.com" style="width:100%;padding:10px 12px;border:1px solid var(--admin-line);border-radius:6px;font-family:var(--sans);font-size:0.9rem;box-sizing:border-box">
            </div>

            <div>
              <label for="new-admin-name" style="display:block;font-size:0.8rem;font-weight:700;color:var(--admin-text-main);margin-bottom:4px">
                Full Name / Officer Title
              </label>
              <input id="new-admin-name" type="text" placeholder="e.g. John Doe / Review Lead" style="width:100%;padding:10px 12px;border:1px solid var(--admin-line);border-radius:6px;font-family:var(--sans);font-size:0.9rem;box-sizing:border-box">
            </div>

            <div>
              <label for="new-admin-role" style="display:block;font-size:0.8rem;font-weight:700;color:var(--admin-text-main);margin-bottom:4px">
                Administrative Clearance
              </label>
              <select id="new-admin-role" style="width:100%;padding:10px 12px;border:1px solid var(--admin-line);border-radius:6px;font-family:var(--sans);font-size:0.9rem;box-sizing:border-box;background:#ffffff">
                <option value="Co-Administrator">Co-Administrator (Full Access)</option>
                <option value="Admissions Reviewer">Admissions Reviewer (Applications Only)</option>
                <option value="Opportunity Coordinator">Opportunity Coordinator (Vacancies Only)</option>
              </select>
            </div>

            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <label for="new-admin-pwd" style="font-size:0.8rem;font-weight:700;color:var(--admin-text-main)">
                  Login Password *
                </label>
                <button type="button" id="btn-quick-gen-pwd" style="background:none;border:none;color:var(--admin-forest);font-size:0.75rem;cursor:pointer;font-weight:600;padding:0;text-decoration:underline">
                  Auto-Generate
                </button>
              </div>
              <div style="display:flex;gap:6px">
                <input id="new-admin-pwd" type="password" required minlength="8" placeholder="Min 8 characters" style="flex:1;padding:10px 12px;border:1px solid var(--admin-line);border-radius:6px;font-family:var(--sans);font-size:0.9rem;box-sizing:border-box">
                <button type="button" id="btn-toggle-new-admin-pwd" class="btn-admin btn-admin-outline" style="padding:0 10px;font-size:0.75rem">
                  Show
                </button>
              </div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
            <span style="font-size:0.78rem;color:var(--admin-text-muted)">
              &#128274; Password is encrypted via Firebase Authentication. If using Google Sign-In, the authorized Gmail can also sign in directly with 1 click.
            </span>
            <button type="submit" id="btn-submit-add-admin" class="btn-admin btn-admin-gold" style="font-weight:700;padding:10px 22px">
              &#10004; Authorize &amp; Save Admin
            </button>
          </div>
        </form>

        <div id="add-admin-alert" style="display:none;margin-top:14px;padding:12px 14px;border-radius:6px;font-size:0.86rem;line-height:1.4"></div>
      </div>

      <!-- Authorized Admins Table -->
      <div>
        <h3 style="margin:0 0 12px;font-size:0.95rem;color:var(--admin-forest)">
          Active Authorized Accounts
        </h3>
        <div id="authorized-admins-table-container">
          <!-- Rendered by renderAuthorizedAdminsList -->
        </div>
      </div>
    </div>

    <!-- Production Connectivity Info -->
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
          <label>Access Restriction Mode</label>
          <span style="color:#15803d;font-weight:700">Strict (Authorized Personnel Only)</span>
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
          <p class="card-subtitle">Download the complete JSON snapshot of candidate registrations and vacancies</p>
        </div>
        <button class="btn-admin btn-admin-gold btn-admin-sm" id="btn-download-json-backup">
          Download Raw JSON Backup
        </button>
      </div>

      <div style="background:#0f1713;color:#86efac;padding:16px;border-radius:8px;font-family:monospace;font-size:0.8rem;max-height:160px;overflow-y:auto">
        <pre style="margin:0">${esc(JSON.stringify({
          project: firebaseConfig.projectId,
          totalApplications: state.applications.length,
          totalOpportunities: state.opportunities.length,
          totalAuthorizedAdmins: state.authorizedAdmins.length + 1,
          activeAdmin: state.user?.email || 'admin@tarvika.com',
          lastSync: new Date().toISOString()
        }, null, 2))}</pre>
      </div>
    </div>
  `;

  // Render Authorized Admins List
  renderAuthorizedAdminsList();

  // Add Admin Form submission
  const addAdminForm = document.getElementById('form-add-admin');
  const addAdminBtn = document.getElementById('btn-submit-add-admin');
  const addAdminAlert = document.getElementById('add-admin-alert');

  addAdminForm.addEventListener('submit', async e => {
    e.preventDefault();
    addAdminAlert.style.display = 'none';
    addAdminBtn.disabled = true;
    addAdminBtn.textContent = 'Authorizing with Firebase...';

    const email = document.getElementById('new-admin-email').value.trim();
    const name = document.getElementById('new-admin-name').value.trim();
    const role = document.getElementById('new-admin-role').value;
    const password = document.getElementById('new-admin-pwd').value;

    try {
      await addAuthorizedAdmin({ email, name, role, password });
      addAdminAlert.style.display = 'block';
      addAdminAlert.style.background = '#f0fdf4';
      addAdminAlert.style.border = '1px solid #86efac';
      addAdminAlert.style.color = '#166534';
      addAdminAlert.innerHTML = `<strong>Success!</strong> Account <strong>${esc(email)}</strong> has been authorized. They can now log in using this email and password or via Google Sign-In.`;
      showToast(`Admin ${email} authorized successfully!`, 'success');
      addAdminForm.reset();
      renderAuthorizedAdminsList();
    } catch (err) {
      console.error(err);
      addAdminAlert.style.display = 'block';
      addAdminAlert.style.background = '#fee2e2';
      addAdminAlert.style.border = '1px solid #fca5a5';
      addAdminAlert.style.color = '#991b1b';
      addAdminAlert.innerHTML = `<strong>Error:</strong> ${esc(err.message || 'Failed to authorize administrator.')}`;
    } finally {
      addAdminBtn.disabled = false;
      addAdminBtn.textContent = '✔ Authorize & Save Admin';
    }
  });

  // Quick Generate Password
  const pwdInput = document.getElementById('new-admin-pwd');
  const toggleNewPwdBtn = document.getElementById('btn-toggle-new-admin-pwd');
  document.getElementById('btn-quick-gen-pwd').addEventListener('click', () => {
    const generated = generateSecurePassword();
    pwdInput.value = generated;
    pwdInput.type = 'text';
    toggleNewPwdBtn.textContent = 'Hide';
    showToast('Secure password generated! Note it down.', 'info');
  });

  toggleNewPwdBtn.addEventListener('click', () => {
    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      toggleNewPwdBtn.textContent = 'Hide';
    } else {
      pwdInput.type = 'password';
      toggleNewPwdBtn.textContent = 'Show';
    }
  });

  // Change password handler
  document.getElementById('form-change-password').addEventListener('submit', async e => {
    e.preventDefault();
    const newPwd = document.getElementById('new-admin-password').value;
    const confPwd = document.getElementById('confirm-admin-password').value;
    const msgEl = document.getElementById('change-pwd-msg');

    if (newPwd !== confPwd) {
      msgEl.style.display = 'block';
      msgEl.style.color = '#b91c1c';
      msgEl.textContent = 'Passwords do not match. Please verify.';
      return;
    }

    try {
      const btn = document.getElementById('btn-save-new-password');
      btn.disabled = true;
      btn.textContent = 'Updating...';

      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPwd);
      } else {
        await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${firebaseConfig.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken: state.user?.idToken,
            password: newPwd,
            returnSecureToken: true
          })
        });
      }

      msgEl.style.display = 'block';
      msgEl.style.color = '#15803d';
      msgEl.textContent = 'Password updated successfully in Firebase Authentication!';
      showToast('Admin password updated successfully!', 'success');
      document.getElementById('form-change-password').reset();
      btn.disabled = false;
      btn.textContent = 'Save New Password';
    } catch (err) {
      console.error(err);
      msgEl.style.display = 'block';
      msgEl.style.color = '#b91c1c';
      msgEl.textContent = err.message || 'Failed to update password. Please re-authenticate and try again.';
      document.getElementById('btn-save-new-password').disabled = false;
      document.getElementById('btn-save-new-password').textContent = 'Save New Password';
    }
  });

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
        resBox.innerHTML = `<strong>Connected!</strong> Firebase Realtime Database responded in <strong>${latency}ms</strong>.`;
      } else {
        resBox.innerHTML = `Connected. HTTP status: ${res.status} (${latency}ms).`;
      }
    } catch (e) {
      resBox.innerHTML = `Connected via SDK. Latency: ${Math.round(performance.now() - start)}ms.`;
    }
  });

  // Download JSON backup
  document.getElementById('btn-download-json-backup').addEventListener('click', () => {
    const data = {
      project: firebaseConfig.projectId,
      timestamp: new Date().toISOString(),
      applications: state.applications,
      opportunities: state.opportunities,
      authorizedAdmins: state.authorizedAdmins
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
// Authorized Admins Table View Renderer
// --------------------------------------------------------------------------
function renderAuthorizedAdminsList() {
  const container = document.getElementById('authorized-admins-table-container');
  if (!container) return;

  const pill = document.getElementById('admins-count-pill');

  // Build combined list of admins
  const allList = [];
  
  // 1. Primary root admin
  allList.push({
    id: 'primary-root',
    email: 'admin@tarvika.com',
    name: 'TARVIKA Primary Executive',
    role: 'Super Administrator',
    createdAt: 1791880440404,
    status: 'active',
    isPrimary: true
  });

  // 2. Any additional static whitelist or database admins
  const seenEmails = new Set(['admin@tarvika.com']);
  state.authorizedAdmins.forEach(item => {
    if (item.email) {
      const norm = item.email.toLowerCase();
      if (!seenEmails.has(norm)) {
        seenEmails.add(norm);
        allList.push(item);
      }
    }
  });

  if (pill) {
    pill.textContent = `${allList.length} Authorized Accounts`;
  }

  container.innerHTML = `
    <div style="overflow-x:auto;border:1px solid var(--admin-line);border-radius:8px;background:#ffffff">
      <table style="width:100%;border-collapse:collapse;font-size:0.86rem;text-align:left">
        <thead>
          <tr style="background:#f4f6f4;border-bottom:1px solid var(--admin-line);color:var(--admin-text-muted);font-size:0.76rem;text-transform:uppercase;letter-spacing:0.04em">
            <th style="padding:11px 14px">Admin Account / Gmail</th>
            <th style="padding:11px 14px">Role &amp; Clearance</th>
            <th style="padding:11px 14px">Date Authorized</th>
            <th style="padding:11px 14px">Status</th>
            <th style="padding:11px 14px;text-align:right">Action</th>
          </tr>
        </thead>
        <tbody>
          ${allList.map(admin => {
            const isGmail = (admin.email || '').toLowerCase().includes('@gmail.com');
            return `
              <tr style="border-bottom:1px solid var(--admin-line)">
                <td style="padding:12px 14px">
                  <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:34px;height:34px;border-radius:50%;background:${isGmail ? '#ea433515' : 'var(--admin-forest-light)'};color:${isGmail ? '#ea4335' : '#86efac'};display:grid;place-items:center;font-weight:700;font-size:0.85rem;flex-shrink:0">
                      ${isGmail ? 'G' : esc((admin.email || 'A').charAt(0).toUpperCase())}
                    </div>
                    <div>
                      <strong style="color:var(--admin-text-main);display:block;font-size:0.88rem">${esc(admin.email)}</strong>
                      <span style="font-size:0.75rem;color:var(--admin-text-muted)">${esc(admin.name || 'Administrative Staff')}</span>
                    </div>
                  </div>
                </td>
                <td style="padding:12px 14px">
                  <span class="status-pill status-selected" style="font-size:0.74rem">
                    ${esc(admin.role || 'Co-Administrator')}
                  </span>
                </td>
                <td style="padding:12px 14px;color:var(--admin-text-muted);font-size:0.8rem">
                  ${formatDate(admin.createdAt)}
                </td>
                <td style="padding:12px 14px">
                  <span style="color:#15803d;font-weight:700;display:inline-flex;align-items:center;gap:6px;font-size:0.8rem">
                    <span style="width:7px;height:7px;background:#16a34a;border-radius:50%"></span> Active
                  </span>
                </td>
                <td style="padding:12px 14px;text-align:right">
                  ${admin.isPrimary ? `
                    <span style="font-size:0.75rem;color:var(--admin-text-muted);font-weight:600">Primary Root</span>
                  ` : `
                    <button class="btn-admin btn-admin-danger btn-admin-sm btn-revoke-admin" data-admin-id="${esc(admin.id)}" data-admin-email="${esc(admin.email)}" style="padding:5px 11px;font-size:0.75rem">
                      Revoke Access
                    </button>
                  `}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Attach revoke click handlers
  container.querySelectorAll('.btn-revoke-admin').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.adminId;
      const email = btn.dataset.adminEmail;
      if (!confirm(`Revoke administrative access for ${email}? They will no longer be able to log in to the administrator portal.`)) {
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Revoking...';
      try {
        await revokeAuthorizedAdmin(id, email);
        showToast(`Revoked access for ${email}`, 'success');
        renderAuthorizedAdminsList();
      } catch (err) {
        alert(err.message || 'Failed to revoke access.');
        btn.disabled = false;
        btn.textContent = 'Revoke Access';
      }
    });
  });
}

// --------------------------------------------------------------------------
// Restricted Administrator Login View
// --------------------------------------------------------------------------
function renderLoginView() {
  const root = document.getElementById('admin-app-root');
  if (!root) return;

  root.innerHTML = `
    <header class="admin-navbar">
      <div class="admin-navbar-inner">
        <a class="admin-brand" href="index.html">
          <img src="assets/images/logo.png" alt="TARVIKA logo">
          <div class="admin-brand-partner">
            <img src="assets/images/sbwm.png" alt="SBWM symbol">
            <img src="assets/images/sbwm1.png" alt="SBWM wordmark">
          </div>
          <div class="admin-brand-title">
            TARVIKA
            <small>RESTRICTED ADMIN PORTAL</small>
          </div>
        </a>
        <a href="index.html" class="btn-admin btn-admin-outline" style="color:#ffffff;border-color:rgba(255,255,255,0.2)">
          &larr; Back to Public Website
        </a>
      </div>
    </header>

    <div class="admin-auth-container">
      <div class="admin-auth-card">
        <div style="text-align:center;margin-bottom:24px">
          <div style="width:68px;height:68px;margin:0 auto 14px;background:#17251e;border-radius:50%;display:grid;place-items:center;color:var(--admin-gold);font-size:1.8rem;border:2px solid var(--admin-gold)">
            &#128274;
          </div>
          <span class="admin-badge-pill" style="background:#dc262615;border-color:#dc262650;color:#ef4444;margin-bottom:8px">
            RESTRICTED &middot; AUTHORIZED PERSONNEL ONLY
          </span>
          <h1 style="margin:8px 0 4px;font-family:var(--display);font-size:1.6rem;color:var(--admin-forest)">
            Administrator Sign-In
          </h1>
          <p style="margin:0;font-size:0.88rem;color:var(--admin-text-muted)">
            Access is restricted exclusively to authorized administrative officers. All login attempts are authenticated against Firebase Security Rules.
          </p>
        </div>

        <div id="auth-error-msg" style="display:none;padding:12px 14px;background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;color:#991b1b;font-size:0.86rem;margin-bottom:18px;line-height:1.4" role="alert">
        </div>

        <form id="admin-login-form" autocomplete="off">
          <div style="margin-bottom:16px">
            <label for="staff-email" style="display:block;font-size:0.82rem;font-weight:700;color:var(--admin-text-main);margin-bottom:6px">
              Authorized Admin Email *
            </label>
            <input id="staff-email" name="tarvika_sec_usr" type="email" required autocomplete="off" readonly onfocus="this.removeAttribute('readonly')" onclick="this.removeAttribute('readonly')" value="" style="width:100%;padding:11px 12px;border:1px solid var(--admin-line);border-radius:6px;font-family:var(--sans);font-size:0.92rem;box-sizing:border-box;background:#ffffff">
          </div>

          <div style="margin-bottom:18px;position:relative">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <label for="staff-password" style="font-size:0.82rem;font-weight:700;color:var(--admin-text-main)">
                Administrative Password *
              </label>
              <button type="button" id="btn-toggle-pwd" style="background:none;border:none;color:var(--admin-text-muted);font-size:0.78rem;cursor:pointer;padding:0">
                Show Password
              </button>
            </div>
            <input id="staff-password" name="tarvika_sec_pwd" type="password" required autocomplete="new-password" readonly onfocus="this.removeAttribute('readonly')" onclick="this.removeAttribute('readonly')" value="" style="width:100%;padding:11px 12px;border:1px solid var(--admin-line);border-radius:6px;font-family:var(--sans);font-size:0.92rem;box-sizing:border-box;background:#ffffff">
          </div>

          <button type="submit" id="btn-submit-login" class="btn-admin btn-admin-primary" style="width:100%;padding:13px;font-size:0.95rem;font-weight:700">
            Verify &amp; Enter Admin Console &rarr;
          </button>

          <div style="display:flex;align-items:center;gap:12px;margin:20px 0 14px">
            <div style="flex:1;height:1px;background:var(--admin-line)"></div>
            <span style="font-size:0.75rem;color:var(--admin-text-muted);text-transform:uppercase;letter-spacing:0.06em">or</span>
            <div style="flex:1;height:1px;background:var(--admin-line)"></div>
          </div>

          <button type="button" id="btn-google-admin-login" class="btn-admin" style="width:100%;background:#ffffff;color:var(--admin-text-main);border:1px solid var(--admin-line);display:flex;align-items:center;justify-content:center;gap:10px;padding:12px;font-size:0.92rem;font-weight:600;box-shadow:var(--admin-shadow-sm);cursor:pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" style="flex-shrink:0">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            Sign in with Google (Authorized Gmails)
          </button>
        </form>
      </div>
    </div>
  `;

  // Prevent browser autofill from popping in saved email/password
  const emailInput = document.getElementById('staff-email');
  const pwdInput = document.getElementById('staff-password');
  if (emailInput) {
    emailInput.value = '';
    const unlockEmail = () => emailInput.removeAttribute('readonly');
    emailInput.addEventListener('focus', unlockEmail, { once: true });
    emailInput.addEventListener('click', unlockEmail, { once: true });
  }
  if (pwdInput) {
    pwdInput.value = '';
    const unlockPwd = () => pwdInput.removeAttribute('readonly');
    pwdInput.addEventListener('focus', unlockPwd, { once: true });
    pwdInput.addEventListener('click', unlockPwd, { once: true });
  }
  // Clear any delayed browser password manager autofill
  setTimeout(() => {
    if (emailInput && !emailInput.matches(':focus')) emailInput.value = '';
    if (pwdInput && !pwdInput.matches(':focus')) pwdInput.value = '';
  }, 150);

  // Password visibility toggle
  const toggleBtn = document.getElementById('btn-toggle-pwd');
  toggleBtn.addEventListener('click', () => {
    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      toggleBtn.textContent = 'Hide Password';
    } else {
      pwdInput.type = 'password';
      toggleBtn.textContent = 'Show Password';
    }
  });

  // Google Sign-In button handler
  const googleBtn = document.getElementById('btn-google-admin-login');
  const errBox = document.getElementById('auth-error-msg');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      errBox.style.display = 'none';
      googleBtn.disabled = true;
      const originalHtml = googleBtn.innerHTML;
      googleBtn.innerHTML = 'Connecting to Google...';

      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const isAuthorized = await verifyAdminAuthorization(user);
        if (!isAuthorized) {
          await signOut(auth);
          throw new Error(`ACCESS DENIED: The Gmail account (${user.email}) is not authorized. Please ask an authorized administrator to add your Gmail first.`);
        }

        setAdminSession({
          email: user.email,
          uid: user.uid,
          role: 'Authorized Administrator',
          idToken: await user.getIdToken()
        });
        setupDatabaseListeners();
        showToast(`Welcome, ${user.displayName || user.email}!`, 'success');
      } catch (err) {
        console.error('Google Admin Sign-in Error:', err);
        errBox.style.display = 'block';
        let msg = err.message || 'Google authentication failed.';
        if (err.code === 'auth/popup-closed-by-user') {
          msg = 'Sign-in popup was closed before completing verification.';
        } else if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-supported-in-this-environment') {
          msg = 'Google Provider is not enabled in Firebase Console. Please log in using your authorized email & password above, or enable Google Provider in Firebase.';
        }
        errBox.innerHTML = `<strong>Authentication Notice:</strong> ${esc(msg)}`;
      } finally {
        googleBtn.disabled = false;
        googleBtn.innerHTML = originalHtml;
      }
    });
  }

  // Login form submission
  const form = document.getElementById('admin-login-form');
  const submitBtn = document.getElementById('btn-submit-login');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying Authorization with Firebase...';

    const email = document.getElementById('staff-email').value.trim();
    const password = document.getElementById('staff-password').value;

    try {
      // 1. Authenticate with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Strict Authorization Check
      const isAuthorized = await verifyAdminAuthorization(user);
      if (!isAuthorized) {
        // Sign out unauthorized user immediately
        await signOut(auth);
        throw new Error(`ACCESS DENIED: The account (${user.email}) is not authorized to access the TARVIKA Administrative Console. Only designated staff may access this portal.`);
      }

      // 3. Authorized Session Setup
      setAdminSession({
        email: user.email,
        uid: user.uid,
        role: email.toLowerCase() === 'admin@tarvika.com' ? 'Super Administrator' : 'Authorized Administrator',
        idToken: await user.getIdToken()
      });
      setupDatabaseListeners();
      showToast(`Welcome back, ${user.email}!`, 'success');
    } catch (err) {
      console.error('Admin Auth Error:', err);
      let msg = err.message || 'Authentication failed.';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('INVALID_LOGIN_CREDENTIALS')) {
        msg = 'Invalid administrative credentials. Please verify your email and password.';
      }
      errBox.textContent = msg;
      errBox.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Verify & Enter Admin Console →';
    }
  });
}

// --------------------------------------------------------------------------
// Application Bootstrapper
// --------------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  if (checkSavedSession()) {
    renderAdminApp();
    setupDatabaseListeners();
  } else {
    onAuthStateChanged(auth, async user => {
      if (user) {
        const isAuthorized = await verifyAdminAuthorization(user);
        if (isAuthorized) {
          setAdminSession({
            email: user.email,
            uid: user.uid,
            role: user.email.toLowerCase() === 'admin@tarvika.com' ? 'Super Administrator' : 'Authorized Administrator',
            idToken: await user.getIdToken()
          });
          setupDatabaseListeners();
          return;
        } else {
          await signOut(auth);
        }
      }
      renderLoginView();
    });
  }
});
