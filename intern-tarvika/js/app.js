(() => {
  'use strict'; const $ = s => document.querySelector(s), page = document.body.dataset.page, esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), url = id => `internship-details.html?id=${encodeURIComponent(id)}`, header = `<header class="header"><div class="wrap nav-wrap"><div class="header-brand-group"><a class="brand" href="index.html" aria-label="TARVIKA home"><img class="brand-logo" src="assets/images/logo.png" alt="TARVIKA Research and Technology logo"><span>TARVIKA<small>RESEARCH AND TECHNOLOGY</small></span></a><div class="header-sbwm" aria-label="SBWM brand"><img class="sbwm-symbol" src="assets/images/sbwm.png" alt=""><img class="sbwm-wordmark" src="assets/images/sbwm1.png" alt="SBWM — Social Business and Web Management"></div></div><button class="menu-toggle" aria-expanded="false" aria-controls="main-nav">Menu</button><nav class="nav-links" id="main-nav" aria-label="Main navigation"><a href="index.html">Home</a><a href="internships.html">Explore Internships</a><a href="programs.html">Programs</a><a href="contact.html">Contact</a><a href="dashboard.html">Login</a><a href="admin.html" style="color:var(--gold-pale);font-weight:600">Admin</a><a class="btn btn-primary" href="internships.html">Explore roles</a></nav></div></header>`, footer = `<footer class="footer"><div class="wrap"><div class="footer-grid"><div><a class="brand" href="index.html"><img class="brand-logo" src="assets/images/logo.png" alt="TARVIKA Research and Technology logo"><span>TARVIKA<small>RESEARCH AND TECHNOLOGY</small></span></a><p style="margin-top:18px">Research · Learning · Innovation</p><p>A learning and research portal preview. Opportunity content shown here is sample content for local development.</p></div><div><h3>Explore</h3><div class="footer-links"><a href="internships.html">Internships</a><a href="programs.html">Programs & domains</a><a href="index.html#how-it-works">How it works</a><a href="about.html">About TARVIKA</a><a href="faq.html">FAQs</a></div></div><div><h3>Information</h3><div class="footer-links"><a href="contact.html">Contact</a><a href="privacy.html">Privacy policy</a><a href="terms.html">Terms</a><a href="admin.html">Admin Portal</a><a href="https://tarvikart.com" target="_blank" rel="noopener noreferrer">Main TARVIKA website ↗</a></div></div></div><div class="footer-bottom"><span>© <span data-year></span> TARVIKA Research and Technology</span><span>Official opportunity status must be confirmed with TARVIKA.</span></div></div></footer>`; $('#site-header').innerHTML = header; $('#site-footer').innerHTML = footer; document.querySelector('[data-year]').textContent = new Date().getFullYear(); let toggle = $('.menu-toggle'), nav = $('.nav-links'); const activeHref = page === 'details' ? 'internships.html' : page === 'home' ? 'index.html' : `${page}.html`; nav.querySelectorAll('a[href]').forEach(link => { const target = new URL(link.href, location.href); if (!target.hash && target.pathname.endsWith('/' + activeHref)) link.setAttribute('aria-current', 'page') }); toggle.addEventListener('click', () => { let open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open) }); nav.addEventListener('click', event => { if (!event.target.closest('a')) return; nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false') }); document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('open')) { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.focus() } }); const intro = (ey, title, sub) => `<section class="page-intro"><div class="wrap"><span class="eyebrow">${ey}</span><h1>${title}</h1><p>${sub}</p></div></section>`, sample = '<p class="sample-note"><strong>Local preview:</strong> These sample opportunities are not approved vacancies and are not open application notices.</p>', card = o => `<article class="card op-card"><span class="eyebrow">${esc(o.domain)}</span><h3>${esc(o.title)}</h3><p>${esc(o.summary)}</p><div class="op-meta"><span class="tag">${esc(o.type)}</span><span class="tag">${esc(o.mode)}</span></div><div class="card-bottom"><span class="muted">${esc(o.location)}</span><a href="${url(o.id)}" aria-label="View ${esc(o.title)}">View details →</a></div></article>`, renderHome = () => { $('#main').innerHTML = `<section class="hero"><div class="hero-background" aria-hidden="true"><img src="assets/images/herossection.png" alt="" fetchpriority="high"></div><div class="wrap hero-content"><span class="eyebrow">Research · Learning · Innovation</span><h1>Build Skills. Explore Research. Create What Matters.</h1><p>Discover learning and research experiences across technology domains. Explore project ideas, understand the application process and follow verified TARVIKA announcements.</p><div class="hero-actions"><a class="btn btn-primary" href="internships.html">Explore Opportunities <span aria-hidden="true">→</span></a><a class="btn btn-outline" href="index.html#how-it-works">How It Works</a></div></div></section><div class="wrap"><form class="search-panel" id="home-search"><label class="sr-only" for="home-key">Search opportunities</label><input id="home-key" placeholder="Search skills, topics or roles"><select id="home-domain" aria-label="Choose a domain"><option value="">All domains</option>${[...new Set(OPPORTUNITIES.map(o => o.domain))].map(x => `<option>${esc(x)}</option>`).join('')}</select><select id="home-mode" aria-label="Choose work preference"><option value="">Any work mode</option><option value="Unconfirmed">Work mode to be confirmed</option></select><button class="btn btn-dark">Search</button></form></div><section class="section"><div class="wrap"><div class="section-head"><div><span class="eyebrow">Explore</span><h2>Featured learning opportunities</h2></div><a href="internships.html">Browse all →</a></div>${sample}<div class="grid op-grid" style="margin-top:20px">${OPPORTUNITIES.slice(0, 3).map(card).join('')}</div></div></section><section class="section" style="background:#fffefa"><div class="wrap"><div class="section-head"><div><span class="eyebrow">Areas of interest</span><h2>Technology domains</h2></div><a href="programs.html">All programs →</a></div><div class="grid domain-grid">${DOMAINS.map(d => `<a class="card" href="internships.html?domain=${encodeURIComponent(d[0])}"><span class="icon-box">${esc(d[4])}</span><h3 style="margin-top:18px">${esc(d[0])}</h3><p>${esc(d[1])}</p><span class="eyebrow">Explore area →</span></a>`).join('')}</div></div></section><section id="how-it-works" class="section"><div class="wrap"><div class="section-head"><div><span class="eyebrow">A considered process</span><h2>From interest to application</h2></div></div><div class="grid steps">${[['Explore', 'Review approved opportunities and their requirements.'], ['Prepare', 'Gather relevant project, education and portfolio details.'], ['Apply', 'Submit through the configured secure application service.'], ['Follow up', 'Use an authenticated candidate account when available.']].map(x => `<div class="step"><h3>${x[0]}</h3><p>${x[1]}</p></div>`).join('')}</div></div></section><section class="section section-dark"><div class="wrap two-col"><div><span class="eyebrow" style="color:var(--gold-pale)">How we learn</span><h2>Curiosity, evidence and responsible practice.</h2></div><p style="color:#d5ded6">A useful learning experience makes room for careful questions, practical project work, thoughtful feedback and clear communication. Each opportunity should explain its scope, expectations and any applicable terms before applications open.</p></div></section><section class="section"><div class="wrap two-col"><div><span class="eyebrow">Before you apply</span><h2>Clear information supports better applications.</h2><p>Review education and experience expectations, work mode, compensation, time commitments and application dates on the approved listing. Contact TARVIKA if a detail is unclear.</p><a class="btn btn-dark" href="faq.html">Read applicant FAQs</a></div><div class="card"><h3>Preview status</h3><p>There are no verified live vacancies connected to this site preview. Sample content is for interface demonstration only.</p><a href="contact.html">Ask TARVIKA directly →</a></div></div></section><section class="section" style="background:#fffefa"><div class="wrap section-head"><div><span class="eyebrow">Need help?</span><h2>Start with a conversation.</h2><p>For verified opportunity details, use TARVIKA’s official contact channels.</p></div><a class="btn btn-primary" href="contact.html">Contact TARVIKA →</a></div></section>`; $('#home-search').addEventListener('submit', e => { e.preventDefault(); let p = new URLSearchParams(); if ($('#home-key').value) p.set('q', $('#home-key').value); if ($('#home-domain').value) p.set('domain', $('#home-domain').value); if ($('#home-mode').value) p.set('mode', $('#home-mode').value); location.href = 'internships.html?' + p }) };
  const renderList = () => { $('#main').innerHTML = intro('Explore', 'Internships & opportunities', 'Search project and research learning examples across technology domains. Approved opportunities and application availability must be confirmed by TARVIKA.') + `<section class="section"><div class="wrap">${sample}<div class="filters"><input id="q" aria-label="Search by title, skill or keyword" placeholder="Search title, skill or keyword"><select id="category" aria-label="Category"><option value="">All categories</option>${[...new Set(OPPORTUNITIES.map(o => o.domain))].map(x => `<option>${esc(x)}</option>`).join('')}</select><select id="type" aria-label="Opportunity type"><option value="">All types</option>${[...new Set(OPPORTUNITIES.map(o => o.type))].map(x => `<option>${esc(x)}</option>`).join('')}</select><select id="mode" aria-label="Work mode"><option value="">All work modes</option><option value="Unconfirmed">Work mode to be confirmed</option></select><select id="sort" aria-label="Sort results"><option value="title">Title A–Z</option><option value="domain">Domain</option></select><button class="btn btn-light" id="clear">Clear filters</button></div><div class="results-bar"><span id="result-count" aria-live="polite"></span><span class="muted">Eligibility: confirm on approved listing</span></div><div id="listing" class="grid op-grid"></div><div style="text-align:center;margin-top:24px"><button class="btn btn-light hidden" id="more">Load more</button></div></div></section>`; let params = new URLSearchParams(location.search); $('#q').value = params.get('q') || ''; $('#category').value = params.get('domain') || ''; $('#mode').value = params.get('mode') || ''; let shown = 6; function update() { let q = $('#q').value.toLowerCase(), cat = $('#category').value, type = $('#type').value, mode = $('#mode').value, list = OPPORTUNITIES.filter(o => (!q || `${o.title} ${o.domain} ${o.summary} ${o.skills.join(' ')}`.toLowerCase().includes(q)) && (!cat || o.domain === cat) && (!type || o.type === type) && (!mode || o.mode === mode)); list.sort((a, b) => a[$('#sort').value].localeCompare(b[$('#sort').value])); $('#result-count').textContent = `${list.length} sample ${list.length === 1 ? 'result' : 'results'}`; $('#listing').innerHTML = list.slice(0, shown).map(card).join('') || '<div class="listing-empty"><h3>No matching sample opportunities</h3><p>Try another search or clear your filters.</p></div>'; $('#more').classList.toggle('hidden', list.length <= shown) } ['q', 'category', 'type', 'mode', 'sort'].forEach(id => $('#' + id).addEventListener('input', () => { shown = 6; update() })); $('#clear').addEventListener('click', () => { $('#q').value = '';['category', 'type', 'mode'].forEach(id => $('#' + id).value = ''); $('#sort').value = 'title'; shown = 6; update() }); $('#more').addEventListener('click', () => { shown += 6; update() }); update() };
  const renderDetails = () => { let o = OPPORTUNITIES.find(x => x.id === new URLSearchParams(location.search).get('id')) || OPPORTUNITIES[0]; document.title = `${o.title} | TARVIKA`; $('#main').innerHTML = intro(o.domain, o.title, 'Opportunity detail preview · Sample listing') + `<section class="section"><div class="wrap form-layout"><div>${sample}<div class="card" style="margin-top:20px"><h2>Overview</h2><p>${esc(o.summary)}</p><h3>Learning objectives & activities</h3><ul>${o.activities.map(x => `<li>${esc(x)}</li>`).join('')}</ul><h3>Skills</h3><p>${o.skills.map(esc).join(' · ')}</p><h3>Preferred experience</h3><p>${o.preferred.map(esc).join(' · ') || 'Not specified'}</p><h3>Selection process</h3><p>To be confirmed by TARVIKA before publication.</p><h3>Terms and application requirements</h3><p>Duration, schedule, eligibility, deadline and compensation have not been verified for this sample. Confirm details directly with TARVIKA before applying.</p></div></div><aside class="card"><span class="status">${esc(o.status)}</span><h3 style="margin-top:14px">Opportunity details</h3><p><b>Type</b><br>${esc(o.type)}</p><p><b>Work mode</b><br>${esc(o.mode)}</p><p><b>Location</b><br>${esc(o.location)}</p><p><b>Duration / schedule</b><br>${esc(o.duration)} / ${esc(o.schedule)}</p><p><b>Eligibility</b><br>${esc(o.eligibility)}</p><p><b>Compensation</b><br>${esc(o.stipend)}</p><a class="btn btn-primary" href="apply.html?opportunity=${encodeURIComponent(o.id)}">Apply Now</a><p style="margin-top:14px"><small>Application submission is not enabled until the verified backend is configured.</small></p></aside></div></section><section class="section" style="background:#fffefa"><div class="wrap"><h2>Related opportunities</h2><div class="grid op-grid">${OPPORTUNITIES.filter(x => x.domain === o.domain && x.id !== o.id).slice(0, 3).map(card).join('') || OPPORTUNITIES.filter(x => x.id !== o.id).slice(0, 3).map(card).join('')}</div></div></section>` };
  const renderPrograms = () => { $('#main').innerHTML = intro('Programs & domains', 'Explore where curiosity can lead', 'Indicative research and project areas across seven technology domains. A domain page does not indicate an approved vacancy.') + `<section class="section"><div class="wrap"><div class="grid domain-grid">${DOMAINS.map(d => `<article class="card"><span class="icon-box">${esc(d[4])}</span><h2 style="font-size:1.5rem;margin-top:18px">${esc(d[0])}</h2><p>${esc(d[1])}</p><p><b>Possible project areas</b><br>${esc(d[2])}</p><p><b>Relevant skills</b><br>${esc(d[3])}</p><a href="internships.html?domain=${encodeURIComponent(d[0])}">Explore matching examples →</a></article>`).join('')}</div></div></section>` };
  const renderFaq = () => { $('#main').innerHTML = intro('Help & guidance', 'Frequently asked questions', 'Answers about applying, opportunity details and support. Always confirm opportunity-specific terms with TARVIKA.') + `<section class="section"><div class="wrap" style="max-width:850px"><div class="field-row"><label class="field"><span>Search questions</span><input id="faq-search" placeholder="Search by topic or keyword"></label><label class="field"><span>Filter by topic</span><select id="faq-category"><option value="">All topics</option>${[...new Set(FAQS.map(x => x[0]))].map(x => `<option>${esc(x)}</option>`).join('')}</select></label></div><div id="faq-list"></div></div></section>`; let draw = () => { let q = $('#faq-search').value.toLowerCase(), category = $('#faq-category').value, rows = FAQS.filter(x => (!category || x[0] === category) && x.join(' ').toLowerCase().includes(q)); $('#faq-list').innerHTML = rows.map((x, i) => `<section class="faq-item"><button class="faq-q" aria-expanded="false" aria-controls="faq-a-${i}">${esc(x[1])}<span aria-hidden="true">＋</span></button><div class="faq-a hidden" id="faq-a-${i}"><span class="tag">${esc(x[0])}</span><p style="margin-top:10px">${esc(x[2])}</p></div></section>`).join('') || '<p>No questions match your search.</p>'; document.querySelectorAll('.faq-q').forEach(b => b.addEventListener('click', () => { let open = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', String(open)); b.nextElementSibling.classList.toggle('hidden', !open); b.lastElementChild.textContent = open ? '−' : '＋' })) }; $('#faq-search').addEventListener('input', draw); $('#faq-category').addEventListener('change', draw); draw() };
  const renderAbout = () => { $('#main').innerHTML = intro('About TARVIKA', 'Research, education and technology', 'TARVIKA Research and Technology — Research · Learning · Innovation') + `<section class="section"><div class="wrap two-col"><div><h2>Learning through thoughtful practice</h2><p>This portal presents TARVIKA’s stated focus on research, learning and innovation across technology areas. Project-oriented learning can help participants connect concepts with practical questions, communicate evidence and reflect on responsible use.</p><p>Domain descriptions on this site are indicative. Specific programs, mentors, vacancies and selection practices require confirmation from TARVIKA.</p></div><div class="card"><h3>Research and responsible practice</h3><p>Clear scope, credible sources, privacy-aware work, appropriate permissions and careful documentation support responsible research and technology practice.</p><a href="programs.html">Explore technology domains →</a></div></div></section><section class="section" style="background:#fffefa"><div class="wrap"><h2>Technology domains</h2><p>Artificial intelligence and machine learning, web development and DevOps, cyber security, digital forensics, digital marketing, Agri Tech and Space Technology.</p><a href="programs.html" class="btn btn-dark">View domains</a></div></section><section class="section"><div class="wrap"><h2>Official information</h2><p>For verified organization information, visit the main TARVIKA website or contact its official channels.</p><a class="btn btn-primary" href="https://tarvikart.com" target="_blank" rel="noopener noreferrer">Visit tarvikart.com ↗</a></div></section>` };
  const renderContact = () => { $('#main').innerHTML = intro('Contact', 'Connect with TARVIKA', 'Use the official contact details below for verified opportunity information and support.') + `<section class="section"><div class="wrap"><div class="grid contact-cards"><article class="card"><span class="eyebrow">Email</span><h3>Write to us</h3><a href="mailto:info@tarvikart.com">info@tarvikart.com</a></article><article class="card"><span class="eyebrow">Phone</span><h3>Call TARVIKA</h3><a href="tel:+919887514194">+91 9887514194</a></article><article class="card"><span class="eyebrow">Location</span><h3>Udaipur, Rajasthan</h3><p>207 Fortune 80, University Road, Udaipur, Rajasthan 323001</p></article></div><div class="two-col" style="margin-top:52px"><div><h2>Send an enquiry</h2><p>This preview does not have a configured enquiry service. Submit will prepare an email in your mail application; no message is recorded by this website.</p></div><form class="form-card" id="contact-form"><div class="field"><label for="c-name">Name</label><input id="c-name" required maxlength="100"></div><div class="field"><label for="c-email">Email</label><input id="c-email" type="email" required maxlength="254"></div><div class="field"><label for="c-message">Message</label><textarea id="c-message" required minlength="10" maxlength="1500"></textarea><small><span id="c-count">0</span>/1500</small></div><p id="contact-error" class="error" role="alert"></p><button class="btn btn-primary">Continue in email</button></form></div><p style="margin-top:28px"><a href="https://tarvikart.com" target="_blank" rel="noopener noreferrer">Main TARVIKA website ↗</a></p></div></section>`; $('#c-message').addEventListener('input', () => $('#c-count').textContent = $('#c-message').value.length); $('#contact-form').addEventListener('submit', e => { e.preventDefault(); if (!e.currentTarget.reportValidity()) return; let body = `Name: ${$('#c-name').value}\nEmail: ${$('#c-email').value}\n\n${$('#c-message').value}`; location.href = `mailto:info@tarvikart.com?subject=${encodeURIComponent('TARVIKA portal enquiry')}&body=${encodeURIComponent(body)}` }) };
  const fbConfig = (window.TARVIKA_CONFIG && window.TARVIKA_CONFIG.firebaseConfig) || {
    apiKey: "AIzaSyA-mxmLqYEkKRrNTvMsWrF03IoWw7FK5iQ",
    authDomain: "tarvika-intership-pannel.firebaseapp.com",
    databaseURL: "https://tarvika-intership-pannel-default-rtdb.firebaseio.com",
    projectId: "tarvika-intership-pannel",
    storageBucket: "tarvika-intership-pannel.firebasestorage.app",
    messagingSenderId: "871442499173",
    appId: "1:871442499173:web:54d52ff685ce559e69a88c",
    measurementId: "G-VMLMRRVF6H"
  };

  async function fbSignUp(email, password) {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(fbConfig.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error?.message || 'Firebase sign-up failed';
      const err = new Error(msg);
      err.code = msg;
      throw err;
    }
    return { idToken: data.idToken, uid: data.localId, email: data.email };
  }

  async function fbSignIn(email, password) {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(fbConfig.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error?.message || 'Firebase sign-in failed';
      const err = new Error(msg);
      err.code = msg;
      throw err;
    }
    return { idToken: data.idToken, uid: data.localId, email: data.email };
  }

  async function fbSaveRegistration(uid, idToken, payload) {
    const year = new Date().getUTCFullYear();
    const suffix = (window.crypto && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).substring(2) + Date.now().toString(36)).slice(0, 12).toUpperCase();
    const studentId = `TRV-${year}-${suffix}`;

    const record = {
      studentId,
      studentName: payload.studentName,
      email: payload.email,
      whatsappNumber: payload.whatsappNumber,
      mobileNumber: payload.mobileNumber,
      address: payload.address,
      city: payload.city,
      qualification: payload.qualification,
      qualificationStatus: payload.qualificationStatus,
      degree: payload.degree,
      institutionName: payload.institutionName,
      institutionCity: payload.institutionCity,
      program: payload.program,
      status: 'received',
      createdAt: Date.now()
    };

    const dbBase = fbConfig.databaseURL.replace(/\/+$/, '');
    const res = await fetch(`${dbBase}/registrations/${encodeURIComponent(uid)}.json?auth=${encodeURIComponent(idToken)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to save application to Firebase database.');
    }
    return { ok: true, studentId, record };
  }

  async function fbGetRegistration(uid, idToken) {
    const dbBase = fbConfig.databaseURL.replace(/\/+$/, '');
    const res = await fetch(`${dbBase}/registrations/${encodeURIComponent(uid)}.json?auth=${encodeURIComponent(idToken)}`);
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Could not fetch registration from Firebase.');
    return data;
  }

  const renderApply = () => {
    const approvedPrograms = [
      'AI & Machine Learning',
      'Web Development & DevOps',
      'Cyber Security',
      'Digital Forensics',
      'Digital Marketing',
      'Agri Tech',
      'Space Technology'
    ];
    const degreeOptions = {
      '10th': { label: 'Stream', values: ['Not applicable'] },
      '12th': { label: '12th Stream', values: ['Science', 'Commerce', 'Arts/Humanities', 'Vocational', 'Other'] },
      'UG': { label: 'Undergraduate Degree', values: ['BA', 'BSc', 'BCom', 'BCA', 'BBA', 'BTech/BE', 'BPharm', 'BDes', 'LLB', 'Other'] },
      'PG': { label: 'Postgraduate Degree', values: ['MA', 'MSc', 'MCom', 'MCA', 'MBA', 'MTech/ME', 'MPharm', 'LLM', 'Other'] }
    };
    function mapDomainToProgram(d) {
      if (!d) return approvedPrograms[0];
      const s = d.toLowerCase();
      if (s.includes('artific') || s.includes('ai') || s.includes('machine')) return 'AI & Machine Learning';
      if (s.includes('web') || s.includes('devops')) return 'Web Development & DevOps';
      if (s.includes('cyber') || s.includes('security')) return 'Cyber Security';
      if (s.includes('forensic')) return 'Digital Forensics';
      if (s.includes('market')) return 'Digital Marketing';
      if (s.includes('agri')) return 'Agri Tech';
      if (s.includes('space')) return 'Space Technology';
      return approvedPrograms[0];
    }

    let oppId = new URLSearchParams(location.search).get('opportunity') || '';
    let selectedOp = OPPORTUNITIES.find(x => x.id === oppId);
    let defaultProgram = selectedOp ? mapDomainToProgram(selectedOp.domain) : approvedPrograms[0];

    $('#main').innerHTML = intro('Application', 'Apply for Internship & Incubation', 'Complete the application below to register your candidacy. Your account will be registered directly in Firebase Authentication and stored in the TARVIKA portal.') + `
<section class="section">
  <div class="wrap form-layout">
    <div id="apply-container">
      <form class="form-card" id="apply-form" novalidate>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:20px;border-bottom:1px solid var(--line);padding-bottom:16px;">
          <div>
            <span class="backend-badge">Firebase Authentication & Realtime Database</span>
            <h2 style="margin:8px 0 0;font-size:1.6rem">Internship Application</h2>
          </div>
          <span style="font-size:0.85rem;color:var(--muted)">All marked fields (<span>*</span>) are required</span>
        </div>

        <div id="form-message" role="alert" style="display:none;margin-bottom:18px"></div>

        <h3 style="margin-top:0">1. Personal & Contact Details</h3>
        <div class="field">
          <label for="studentName">Full Name *</label>
          <input id="studentName" name="studentName" required minlength="2" maxlength="100" autocomplete="name" placeholder="Name as you use it officially">
        </div>

        <div class="field">
          <label for="email">Email Address *</label>
          <input id="email" name="email" type="email" required maxlength="254" autocomplete="email" placeholder="you@example.com">
          <span class="field-hint">This email will be registered in Firebase Authentication for candidate sign-in.</span>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="password">Create Account Password *</label>
            <input id="password" name="password" type="password" required minlength="8" maxlength="128" autocomplete="new-password" placeholder="Minimum 8 characters">
            <span class="field-hint">Used for your TARVIKA candidate portal login.</span>
          </div>
          <div class="field">
            <label for="confirmPassword">Confirm Password *</label>
            <input id="confirmPassword" name="confirmPassword" type="password" required minlength="8" maxlength="128" autocomplete="new-password" placeholder="Repeat the password">
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="whatsappNumber">WhatsApp Number *</label>
            <input id="whatsappNumber" name="whatsappNumber" required type="tel" pattern="[+0-9 ()-]{8,20}" autocomplete="tel" placeholder="+91 98765 43210">
          </div>
          <div class="field">
            <label for="mobileNumber">Primary Mobile Number *</label>
            <input id="mobileNumber" name="mobileNumber" required type="tel" pattern="[+0-9 ()-]{8,20}" autocomplete="tel" placeholder="Mobile contact number">
          </div>
        </div>

        <div class="field">
          <label for="address">Residential Address *</label>
          <textarea id="address" name="address" required minlength="5" maxlength="500" placeholder="House / street / locality address" style="min-height:75px"></textarea>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="city">Your City *</label>
            <input id="city" name="city" required minlength="2" maxlength="100" placeholder="e.g. Udaipur">
          </div>
          <div class="field">
            <label for="institutionCity">Institution City *</label>
            <input id="institutionCity" name="institutionCity" required minlength="2" maxlength="100" placeholder="City where college/school is located">
          </div>
        </div>

        <h3 style="margin-top:28px">2. Academic Background</h3>
        <div class="field-row">
          <div class="field">
            <label for="qualification">Highest Qualification *</label>
            <select id="qualification" name="qualification" required>
              <option value="">Select qualification level</option>
              <option value="10th">10th (Secondary)</option>
              <option value="12th">12th (Higher Secondary)</option>
              <option value="UG">Undergraduate (UG)</option>
              <option value="PG">Postgraduate (PG)</option>
            </select>
          </div>
          <div class="field">
            <label for="qualificationStatus">Qualification Status *</label>
            <select id="qualificationStatus" name="qualificationStatus" required>
              <option value="">Select status</option>
              <option value="Pursuing">Pursuing / Currently Enrolled</option>
              <option value="Passed">Passed / Completed</option>
            </select>
          </div>
        </div>

        <div class="field" id="degree-wrap" style="display:none">
          <label for="degree" id="degree-label">Degree / Stream *</label>
          <select id="degree" name="degree">
            <option value="">Select stream or degree</option>
          </select>
        </div>

        <div class="field">
          <label for="institutionName">Last / Current School or College *</label>
          <input id="institutionName" name="institutionName" required minlength="2" maxlength="160" placeholder="Full name of school, college, or university">
        </div>

        <h3 style="margin-top:28px">3. Program & Opportunity</h3>
        <div class="field">
          <label for="program">Selected Program of Interest *</label>
          <select id="program" name="program" required>
            <option value="">Choose an approved program</option>
            ${approvedPrograms.map(p => `<option value="${esc(p)}" ${p === defaultProgram ? 'selected' : ''}>${esc(p)}</option>`).join('')}
          </select>
        </div>

        <div class="field">
          <label for="opportunity-select">Matching Opportunity</label>
          <select id="opportunity-select">
            <option value="">General program application</option>
            ${OPPORTUNITIES.map(o => `<option value="${esc(o.id)}" ${o.id === oppId ? 'selected' : ''}>${esc(o.title)} · ${esc(o.domain)}</option>`).join('')}
          </select>
          <span class="field-hint">Selecting a role synchronizes your target research & internship track.</span>
        </div>

        <div class="field">
          <label for="notes">Relevant Projects, Skills or Motivation</label>
          <textarea id="notes" name="notes" maxlength="1200" placeholder="Briefly describe your programming skills, portfolio links, or what you want to achieve..." style="min-height:90px"></textarea>
        </div>

        <div class="field" style="margin-top:16px">
          <label style="font-weight:normal;display:flex;gap:12px;align-items:start;cursor:pointer">
            <input type="checkbox" id="consent" name="consent" required style="width:auto;margin-top:4px">
            <span>I confirm that all details provided are accurate and authorize TARVIKA Research & Technology to create my candidate account in Firebase and review my application. *</span>
          </label>
        </div>

        <div style="margin-top:24px">
          <button type="submit" id="apply-submit" class="btn btn-primary" style="width:100%;padding:15px;font-size:1.05rem">
            Submit Application to TARVIKA &rarr;
          </button>
        </div>
      </form>
    </div>

    <aside class="card" id="apply-sidebar">
      <h3>Opportunity Brief</h3>
      ${selectedOp ? `
        <span class="tag" style="margin-bottom:8px">${esc(selectedOp.type)}</span>
        <h4 style="margin:8px 0">${esc(selectedOp.title)}</h4>
        <p style="font-size:0.92rem">${esc(selectedOp.summary)}</p>
        <p style="font-size:0.88rem;margin:10px 0"><strong>Domain:</strong> ${esc(selectedOp.domain)}</p>
        <p style="font-size:0.88rem;margin:10px 0"><strong>Work Mode:</strong> ${esc(selectedOp.mode)}</p>
        <p style="font-size:0.88rem;margin:10px 0"><strong>Location:</strong> ${esc(selectedOp.location)}</p>
        <div style="border-top:1px solid var(--line);padding-top:14px;margin-top:14px">
          <span style="font-size:0.82rem;color:var(--muted)">Backend: Firebase Project <code>tarvika-intership-pannel</code> (Realtime Database)</span>
        </div>
      ` : `
        <p>Choose an opportunity or select your desired technology domain in the form.</p>
        <p style="font-size:0.88rem">Applications are authenticated and stored in the verified TARVIKA Firebase backend.</p>
      `}
    </aside>
  </div>
</section>`;

    const form = document.getElementById('apply-form');
    const qualificationEl = document.getElementById('qualification');
    const degreeWrap = document.getElementById('degree-wrap');
    const degreeEl = document.getElementById('degree');
    const degreeLabel = document.getElementById('degree-label');
    const opportunitySelect = document.getElementById('opportunity-select');
    const programSelect = document.getElementById('program');
    const messageBox = document.getElementById('form-message');
    const submitBtn = document.getElementById('apply-submit');

    function showMessage(text, isError = true) {
      messageBox.style.display = 'block';
      messageBox.className = `form-alert ${isError ? 'form-alert-error' : 'form-alert-info'}`;
      messageBox.innerHTML = esc(text);
      messageBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideMessage() {
      messageBox.style.display = 'none';
      messageBox.textContent = '';
    }

    function updateDegreeDropdown() {
      const q = qualificationEl.value;
      const config = degreeOptions[q];
      degreeEl.replaceChildren(new Option('Select degree / stream', ''));
      if (!config || q === '10th') {
        degreeWrap.style.display = 'none';
        degreeEl.required = false;
        if (q === '10th') {
          degreeEl.add(new Option('Not applicable', 'Not applicable'));
          degreeEl.value = 'Not applicable';
        }
      } else {
        degreeWrap.style.display = 'block';
        degreeLabel.textContent = `${config.label} *`;
        degreeEl.required = true;
        config.values.forEach(v => degreeEl.add(new Option(v, v)));
      }
    }

    qualificationEl.addEventListener('change', updateDegreeDropdown);

    opportunitySelect.addEventListener('change', () => {
      const chosenId = opportunitySelect.value;
      const chosen = OPPORTUNITIES.find(x => x.id === chosenId);
      if (chosen) {
        programSelect.value = mapDomainToProgram(chosen.domain);
      }
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      hideMessage();

      if (!form.reportValidity()) return;

      const formData = new FormData(form);
      const password = String(formData.get('password') || '');
      const confirmPassword = String(formData.get('confirmPassword') || '');

      if (password.length < 8) {
        showMessage('Password must be at least 8 characters in length.');
        document.getElementById('password').focus();
        return;
      }
      if (password !== confirmPassword) {
        showMessage('Passwords do not match. Please ensure both passwords match.');
        document.getElementById('confirmPassword').focus();
        return;
      }

      const qualification = String(formData.get('qualification') || '');
      let degree = String(formData.get('degree') || '');
      if (qualification === '10th') degree = 'Not applicable';
      if (!degree) {
        showMessage('Please select your degree / stream.');
        degreeEl.focus();
        return;
      }

      const payload = {
        studentName: String(formData.get('studentName') || '').trim(),
        email: String(formData.get('email') || '').trim().toLowerCase(),
        whatsappNumber: String(formData.get('whatsappNumber') || '').trim(),
        mobileNumber: String(formData.get('mobileNumber') || '').trim(),
        address: String(formData.get('address') || '').trim(),
        city: String(formData.get('city') || '').trim(),
        qualification: qualification,
        qualificationStatus: String(formData.get('qualificationStatus') || ''),
        degree: degree,
        institutionName: String(formData.get('institutionName') || '').trim(),
        institutionCity: String(formData.get('institutionCity') || '').trim(),
        program: String(formData.get('program') || ''),
        consent: formData.get('consent') === 'on'
      };

      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating with Firebase...';

      let authSession;
      try {
        try {
          authSession = await fbSignUp(payload.email, password);
        } catch (authErr) {
          if (authErr.message && (authErr.message.includes('EMAIL_EXISTS') || authErr.code === 'EMAIL_EXISTS')) {
            submitBtn.textContent = 'Account exists, signing in...';
            try {
              authSession = await fbSignIn(payload.email, password);
            } catch (loginErr) {
              if (loginErr.message && (loginErr.message.includes('INVALID_LOGIN_CREDENTIALS') || loginErr.message.includes('INVALID_PASSWORD'))) {
                throw new Error('An account with this email already exists, but the password entered was incorrect. Please enter your existing password to proceed.');
              }
              throw loginErr;
            }
          } else if (authErr.message && authErr.message.includes('WEAK_PASSWORD')) {
            throw new Error('Firebase requires the password to be at least 6 characters.');
          } else {
            throw authErr;
          }
        }

        submitBtn.textContent = 'Saving application to Firebase Realtime Database...';

        const saveRes = await fbSaveRegistration(authSession.uid, authSession.idToken, payload);
        const studentId = saveRes.studentId;

        try {
          sessionStorage.setItem('tarvika_candidate_session', JSON.stringify({
            uid: authSession.uid,
            idToken: authSession.idToken,
            email: authSession.email
          }));
        } catch {}

        const container = document.getElementById('apply-container');
        container.innerHTML = `
        <div class="success-card">
          <div class="success-icon-wrap">&check;</div>
          <span class="backend-badge">Application Verified &middot; Firebase Connected</span>
          <h2 style="margin:14px 0 6px">Application Submitted Successfully!</h2>
          <p>Your candidate account has been authenticated in Firebase (Project: <code>tarvika-intership-pannel</code>) and your application has been recorded in your Firebase Realtime Database.</p>
          
          <div class="ref-box">
            <div>
              <span style="display:block;font-size:0.8rem;color:var(--muted);text-transform:uppercase">Your Official Student Reference ID</span>
              <strong id="student-ref-id">${esc(studentId)}</strong>
            </div>
            <button type="button" class="btn btn-dark" id="btn-copy-id" style="padding:8px 14px;font-size:0.85rem">Copy Reference ID</button>
          </div>

          <table class="details-table">
            <tr><td>Candidate Name:</td><td><strong>${esc(payload.studentName)}</strong></td></tr>
            <tr><td>Registered Email:</td><td>${esc(payload.email)}</td></tr>
            <tr><td>Selected Program:</td><td><strong>${esc(payload.program)}</strong></td></tr>
            <tr><td>Qualification:</td><td>${esc(payload.qualification)} (${esc(payload.degree)}) &middot; ${esc(payload.qualificationStatus)}</td></tr>
            <tr><td>Institution:</td><td>${esc(payload.institutionName)}, ${esc(payload.institutionCity)}</td></tr>
            <tr><td>Contact:</td><td>${esc(payload.mobileNumber)} / ${esc(payload.whatsappNumber)}</td></tr>
            <tr><td>Firebase Project:</td><td><code>tarvika-intership-pannel</code> (Realtime Database)</td></tr>
          </table>

          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:28px">
            <button type="button" class="btn btn-primary" id="btn-download-slip">Download Application Slip (.txt)</button>
            <a href="dashboard.html" class="btn btn-dark">View Candidate Dashboard</a>
            <a href="internships.html" class="btn btn-light">Browse More Internships</a>
            <a href="index.html" class="btn btn-light">Home</a>
          </div>
        </div>
      `;

        document.getElementById('btn-copy-id').addEventListener('click', async e => {
          try {
            await navigator.clipboard.writeText(studentId);
            e.currentTarget.textContent = 'Copied to Clipboard!';
          } catch {
            e.currentTarget.textContent = 'Select ID to copy';
          }
        });

        document.getElementById('btn-download-slip').addEventListener('click', () => {
          const text = [
            '========================================',
            '  TARVIKA RESEARCH AND TECHNOLOGY',
            '  INTERNSHIP & INCUBATION APPLICATION',
            '========================================',
            '',
            `Student Reference ID : ${studentId}`,
            `Candidate Name       : ${payload.studentName}`,
            `Registered Email     : ${payload.email}`,
            `Program Track        : ${payload.program}`,
            `Highest Qualification: ${payload.qualification} - ${payload.degree} (${payload.qualificationStatus})`,
            `Institution          : ${payload.institutionName}, ${payload.institutionCity}`,
            `Contact Numbers      : Mobile: ${payload.mobileNumber} | WhatsApp: ${payload.whatsappNumber}`,
            `Residential City     : ${payload.city}`,
            `Submission Timestamp : ${new Date().toISOString()}`,
            `Firebase Project     : tarvika-intership-pannel (Realtime Database)`,
            '',
            'Keep this Student Reference ID safe for candidate communications.',
            '========================================'
          ].join('\n');
          const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `TARVIKA_Application_${studentId}.txt`;
          a.click();
          URL.revokeObjectURL(a.href);
        });

      } catch (err) {
        console.error('Application submission error:', err);
        let errMsg = err.message || 'An unexpected error occurred while communicating with Firebase.';
        showMessage(errMsg, true);
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Application to TARVIKA &rarr;';
      }
    });
  };
  const renderDashboard = () => {
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem('tarvika_candidate_session') || 'null'); } catch {}

    const renderCandidateView = (record) => {
      const statusMap = {
        received: { label: 'Application Received', bg: '#e8f0fe', col: '#1967d2' },
        under_review: { label: 'Under Review', bg: '#fef3d6', col: '#b06a00' },
        shortlisted: { label: 'Shortlisted for Interview', bg: '#f3e8fd', col: '#7c3aed' },
        interview_scheduled: { label: 'Interview Scheduled', bg: '#e0f7f6', col: '#0f766e' },
        selected: { label: 'Selected & Offered', bg: '#e6f7ec', col: '#15803d' },
        rejected: { label: 'Application Closed', bg: '#fee2e2', col: '#b91c1c' }
      };
      const st = (record.status || 'received').toLowerCase().replace(' ', '_');
      const sInfo = statusMap[st] || { label: (record.status || 'Application Received').toUpperCase(), bg: '#eaf7ee', col: '#186838' };

      $('#main').innerHTML = intro('Candidate Portal', 'Your Application Status', 'Verified candidate record authenticated with Firebase.') + `
<section class="section">
  <div class="wrap" style="max-width:850px">
    <div class="card" style="border-top:4px solid var(--forest)">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:20px;border-bottom:1px solid var(--line);padding-bottom:14px">
        <div>
          <span class="tag" style="background:${sInfo.bg};color:${sInfo.col};font-weight:700">${esc(sInfo.label)}</span>
          <h2 style="margin:8px 0 0">${esc(record.studentName)}</h2>
        </div>
        <button class="btn btn-light" id="btn-logout" style="padding:6px 14px;font-size:0.85rem">Sign Out</button>
      </div>

      <div class="ref-box" style="margin-bottom:24px">
        <div>
          <span style="display:block;font-size:0.8rem;color:var(--muted);text-transform:uppercase">Official Student Reference ID</span>
          <strong>${esc(record.studentId)}</strong>
        </div>
      </div>

      <table class="details-table">
        <tr><td>Registered Email:</td><td>${esc(record.email)}</td></tr>
        <tr><td>Program Track:</td><td><strong>${esc(record.program)}</strong></td></tr>
        <tr><td>Application Status:</td><td><strong style="color:${sInfo.col}">${esc(sInfo.label)}</strong></td></tr>
        <tr><td>Qualification:</td><td>${esc(record.qualification)} (${esc(record.degree)}) &middot; ${esc(record.qualificationStatus)}</td></tr>
        <tr><td>Institution:</td><td>${esc(record.institutionName)}, ${esc(record.institutionCity)}</td></tr>
        <tr><td>Contact Numbers:</td><td>${esc(record.mobileNumber)} / ${esc(record.whatsappNumber)}</td></tr>
        <tr><td>Residential City:</td><td>${esc(record.city)}</td></tr>
        <tr><td>Submission Date:</td><td>${record.createdAt ? new Date(record.createdAt).toLocaleString() : 'Recently'}</td></tr>
        ${record.adminNotes ? `<tr><td>Reviewer Notes:</td><td style="color:var(--forest)"><em>${esc(record.adminNotes)}</em></td></tr>` : ''}
        <tr><td>Firebase Project:</td><td><code>tarvika-intership-pannel</code> (Realtime Database)</td></tr>
      </table>

      <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap">
        <a href="internships.html" class="btn btn-light">Browse More Internships</a>
        <a href="index.html" class="btn btn-light">Home</a>
      </div>
    </div>
  </div>
</section>`;

      document.getElementById('btn-logout').addEventListener('click', () => {
        try { sessionStorage.removeItem('tarvika_candidate_session'); } catch {}
        renderDashboard();
      });
    };

    const renderLoginForm = () => {
      $('#main').innerHTML = intro('Candidate Login', 'Application Dashboard', 'Sign in with your registered candidate account to view your application status.') + `
<section class="section">
  <div class="wrap" style="max-width:540px">
    <div class="card form-card">
      <div style="border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:20px">
        <span class="backend-badge">Firebase Authentication</span>
        <h2 style="margin:8px 0 0">Candidate Sign-In</h2>
        <p style="margin:6px 0 0;font-size:0.9rem;color:var(--muted)">Use the email and password you entered during your application.</p>
      </div>

      <div id="dash-msg" class="form-alert form-alert-error" style="display:none;margin-bottom:16px" role="alert"></div>

      <form id="dash-login-form">
        <div class="field">
          <label for="dash-email">Registered Email *</label>
          <input id="dash-email" type="email" required autocomplete="email" placeholder="you@example.com">
        </div>

        <div class="field">
          <label for="dash-pass">Account Password *</label>
          <input id="dash-pass" type="password" required autocomplete="current-password" placeholder="Your password">
        </div>

        <button type="submit" class="btn btn-primary" id="dash-submit" style="width:100%;margin-top:14px">Sign In to Dashboard &rarr;</button>
      </form>

      <div style="border-top:1px solid var(--line);margin-top:24px;padding-top:16px;text-align:center;font-size:0.9rem">
        Don't have an application on file? <a href="apply.html">Apply for an internship &rarr;</a>
      </div>
    </div>
  </div>
</section>`;

      const loginForm = document.getElementById('dash-login-form');
      const msgBox = document.getElementById('dash-msg');
      const submitBtn = document.getElementById('dash-submit');

      loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        msgBox.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying with Firebase...';

        const email = document.getElementById('dash-email').value.trim();
        const password = document.getElementById('dash-pass').value;

        try {
          const auth = await fbSignIn(email, password);
          submitBtn.textContent = 'Loading your application...';
          const rec = await fbGetRegistration(auth.uid, auth.idToken);
          if (!rec) {
            throw new Error('No internship application found for this account. Please complete an application first.');
          }
          try {
            sessionStorage.setItem('tarvika_candidate_session', JSON.stringify({
              uid: auth.uid,
              idToken: auth.idToken,
              email: auth.email
            }));
          } catch {}
          renderCandidateView(rec);
        } catch (err) {
          console.error(err);
          let errText = err.message || 'Login failed';
          if (errText.includes('INVALID_LOGIN_CREDENTIALS') || errText.includes('INVALID_PASSWORD')) {
            errText = 'Invalid email or password. Please try again.';
          } else if (errText.includes('EMAIL_NOT_FOUND')) {
            errText = 'No account found with this email. Please check your email or submit an application.';
          }
          msgBox.textContent = errText;
          msgBox.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In to Dashboard →';
        }
      });
    };

    if (saved && saved.uid && saved.idToken) {
      $('#main').innerHTML = intro('Candidate Portal', 'Loading...', 'Fetching application details from Firebase.') + '<section class="section"><div class="wrap" style="text-align:center;padding:40px 0"><p>Loading your verified application record...</p></div></section>';
      fbGetRegistration(saved.uid, saved.idToken).then(rec => {
        if (rec) {
          renderCandidateView(rec);
        } else {
          renderLoginForm();
        }
      }).catch(() => {
        renderLoginForm();
      });
    } else {
      renderLoginForm();
    }
  };
  const policy = (kind) => { let privacy = kind === 'privacy'; $('#main').innerHTML = intro('Review draft', privacy ? 'Privacy policy' : 'Terms & conditions', `Draft for owner and legal review. This page does not represent an approved TARVIKA policy.`) + `<section class="section"><article class="wrap policy-copy" style="max-width:850px"><div class="sample-note">Owner review required before publication. Operational details and final legal language must be confirmed.</div>${(privacy ? [['Information collected', 'A production application may collect contact, education, skills, project, availability and portfolio details that candidates choose to submit. Resume collection must use an approved secure service.'], ['Purpose', 'Candidate information should be used to review applications and communicate about relevant opportunities.'], ['Access and security', 'Access should be limited by role and enforced by backend controls. Hosting, encryption, access logging and incident procedures require owner confirmation.'], ['Sharing and service providers', 'Any processors or third-party services, including hosting, authentication and file storage, must be identified before launch.'], ['Retention and deletion', 'Retention periods and deletion request procedures require owner approval. Candidates may contact info@tarvikart.com to ask about their information.'], ['Candidate rights and contact', 'Applicable rights, response timelines and legal entity details require legal review. Contact info@tarvikart.com.']] : [['Submitted information', 'Candidates are responsible for providing accurate and current information and must have permission to share linked work.'], ['Opportunity availability', 'Descriptions and vacancies may change. Only approved listings are authoritative; sample portal entries are demonstrations.'], ['Applications and selection', 'Submission does not guarantee a response, interview, selection or employment. Procedures and eligibility will be specified by the approved listing.'], ['Conduct and intellectual property', 'Participants should follow applicable law, project instructions, third-party licenses and responsible research practices. Ownership and permitted use of project outputs must be stated for each program.'], ['Confidential information', 'Do not submit confidential, sensitive or third-party information unless specifically requested through an approved secure process.'], ['Compensation, withdrawal and communication', 'Compensation and fees should be disclosed clearly before application. Withdrawal and communication procedures require owner confirmation.'], ['Privacy and contact', 'Use of candidate information is described in the privacy policy. Contact info@tarvikart.com for questions.']]).map(x => `<h2>${esc(x[0])}</h2><p>${esc(x[1])}</p>`).join('')}</article></section>` };
  const renderAdmin = () => { location.href = 'admin.html'; };
  const content = { home: renderHome, internships: renderList, details: renderDetails, programs: renderPrograms, faq: renderFaq, about: renderAbout, contact: renderContact, apply: renderApply, dashboard: renderDashboard, privacy: () => policy('privacy'), terms: () => policy('terms'), admin: renderAdmin }; (content[page] || renderHome)()
})();
