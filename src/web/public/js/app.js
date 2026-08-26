let currentUser = null;
let guilds = [];
let selectedGuild = null;
let currentPage = 'dashboard';
let dashboardStats = null;
let activity = [];
let premium = null;
let systemHealth = null;
let sidebarOpen = false;

async function apiFetch(url) {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (res.status === 401) {
    window.location.href = '/login';
    return null;
  }
  return res.json();
}

async function checkAuth() {
  const res = await apiFetch('/api/auth/me');
  if (!res || !res.success || !res.data) {
    window.location.href = '/login';
    return false;
  }
  currentUser = res.data;
  return true;
}

async function loadGuilds() {
  const res = await apiFetch('/api/guilds');
  if (!res || !res.success) {
    guilds = [];
    return;
  }
  guilds = res.data || [];
  if (guilds.length > 0 && !selectedGuild) {
    const params = new URLSearchParams(window.location.search);
    const guildId = params.get('guild');
    const found = guilds.find((g) => g.id === guildId);
    if (found) {
      selectedGuild = found;
    } else {
      selectedGuild = guilds[0];
    }
  }
}

async function loadDashboardData() {
  if (!selectedGuild) return;
  const [statsRes, activityRes, premiumRes, healthRes] = await Promise.all([
    apiFetch(`/api/guilds/${selectedGuild.id}/stats`),
    apiFetch(`/api/guilds/${selectedGuild.id}/activity`),
    apiFetch(`/api/guilds/${selectedGuild.id}/premium`),
    apiFetch('/api/health'),
  ]);
  if (statsRes?.success) dashboardStats = statsRes.data;
  if (activityRes?.success) activity = activityRes.data || [];
  if (premiumRes?.success) premium = premiumRes.data;
  if (healthRes?.success) systemHealth = healthRes.data;
}

function navigate(page) {
  currentPage = page;
  const guildParam = selectedGuild ? `?guild=${selectedGuild.id}` : '';
  window.history.pushState({}, '', `/dashboard/${page === 'dashboard' ? '' : page}${guildParam}`);
  if (page === 'dashboard') {
    loadDashboardData().then(render);
  } else {
    render();
  }
}

function selectGuild(guildId) {
  selectedGuild = guilds.find((g) => g.id === guildId) || null;
  if (selectedGuild) {
    const params = new URLSearchParams(window.location.search);
    params.set('guild', selectedGuild.id);
    window.history.replaceState({}, '', `/dashboard/${currentPage === 'dashboard' ? '' : currentPage}?${params.toString()}`);
    loadDashboardData().then(render);
  }
}

window.addEventListener('popstate', () => {
  const path = window.location.pathname.replace('/dashboard/', '').replace('/', '') || 'dashboard';
  currentPage = path;
  const params = new URLSearchParams(window.location.search);
  const guildId = params.get('guild');
  if (guildId && guilds.length > 0) {
    selectedGuild = guilds.find((g) => g.id === guildId) || selectedGuild;
  }
  if (path === 'dashboard') {
    loadDashboardData().then(render);
  } else {
    render();
  }
});

const PAGES = {
  dashboard: { title: 'Genel bakış', icon: 'home' },
  servers: { title: 'Sunucularım', icon: 'server' },
  moderation: { title: 'Moderasyon', icon: 'shield' },
  automod: { title: 'AutoMod', icon: 'settings' },
  guard: { title: 'Guard', icon: 'lock' },
  tickets: { title: 'Ticket', icon: 'link' },
  logs: { title: 'Loglar', icon: 'search' },
  cases: { title: 'Vaka / Kanıt', icon: 'edit' },
  welcome: { title: 'Hoşgeldin / Ayrılış', icon: 'user' },
  'custom-commands': { title: 'Özel komut', icon: 'settings' },
  'auto-response': { title: 'Otomatik yanıt', icon: 'info' },
  setup: { title: 'Kurulum', icon: 'settings' },
  premium: { title: 'Premium', icon: 'crown' },
  settings: { title: 'Ayarlar', icon: 'settings' },
};

const SIDEBAR_NAV = [
  { section: null, items: [
    { id: 'dashboard', label: 'Genel bakış', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>' },
    { id: 'servers', label: 'Sunucularım', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>' },
  ]},
  { section: 'Yönetim', items: [
    { id: 'moderation', label: 'Moderasyon', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
    { id: 'automod', label: 'AutoMod', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4"/></svg>' },
    { id: 'guard', label: 'Guard', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' },
    { id: 'tickets', label: 'Ticket', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' },
  ]},
  { section: 'Sistemler', items: [
    { id: 'logs', label: 'Loglar', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' },
    { id: 'cases', label: 'Vaka / Kanıt', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' },
    { id: 'welcome', label: 'Hoşgeldin / Ayrılış', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
    { id: 'custom-commands', label: 'Özel komut', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>' },
    { id: 'auto-response', label: 'Otomatik yanıt', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
    { id: 'setup', label: 'Kurulum', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06"/></svg>' },
  ]},
  { section: 'Hesap', items: [
    { id: 'premium', label: 'Premium', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
    { id: 'settings', label: 'Ayarlar', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>' },
  ]},
];

function getAvatarUrl(userId, avatar) {
  if (!avatar) return null;
  const ext = avatar.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${ext}?size=64`;
}

function getGuildIconUrl(guild) {
  if (!guild.icon) return null;
  const ext = guild.icon.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${ext}?size=64`;
}

function formatTimeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)} dakika önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}

function renderEmptyGuildState() {
  return `
    <div class="page-placeholder">
      <div class="page-placeholder-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
      </div>
      <div class="page-placeholder-title">Yönetebildiğiniz bir Discord sunucusu bulunamadı</div>
      <div class="page-placeholder-desc">CyberBOT'u bir Discord sunucusuna ekleyerek başlayın.</div>
      <div class="embed-btn-group" style="margin-top: 24px;">
        <a href="/" class="embed-btn embed-btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Ana Sayfa
        </a>
        <a href="/support" class="embed-btn embed-btn-secondary" target="_blank">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Destek
        </a>
      </div>
    </div>
  `;
}

function renderSidebar() {
  return `
    <aside class="sidebar ${sidebarOpen ? 'open' : ''}" id="sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-brand-icon" style="padding:0;overflow:hidden;">
          <img src="/images/CyberBOT-profile.png" alt="CB" style="width:100%;height:100%;object-fit:cover;">
        </div>
        <div>
          <div class="sidebar-brand-text">CyberBOT</div>
          <div class="sidebar-brand-version">v1.0.0</div>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${SIDEBAR_NAV.map(section => `
          ${section.section ? `<div class="sidebar-section-label">${section.section}</div>` : ''}
          ${section.items.map(item => `
            <a class="sidebar-link ${currentPage === item.id ? 'active' : ''}" onclick="navigate('${item.id}')" href="javascript:void(0)">
              ${item.icon}
              <span>${item.label}</span>
            </a>
          `).join('')}
        `).join('')}
      </nav>
      <div class="sidebar-user">
        <div class="sidebar-user-avatar">
          ${currentUser && getAvatarUrl(currentUser.userId, currentUser.avatar)
            ? `<img src="${getAvatarUrl(currentUser.userId, currentUser.avatar)}" alt="">`
            : (currentUser?.username?.charAt(0) || 'U')}
        </div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${currentUser?.username || 'Kullanıcı'}</div>
          <div class="sidebar-user-tag">Discord Kullanıcısı</div>
        </div>
      </div>
    </aside>
    <div class="sidebar-overlay ${sidebarOpen ? 'active' : ''}" onclick="closeSidebar()"></div>
  `;
}

function renderHeader() {
  return `
    <header class="header">
      <div class="header-left">
        <button class="hamburger" onclick="toggleSidebar()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <h1 class="header-title">${PAGES[currentPage]?.title || 'Genel bakış'}</h1>
      </div>
      <div class="header-right">
        ${guilds.length > 0 ? `
          <div class="server-selector" onclick="toggleServerDropdown()" id="server-selector">
            ${selectedGuild ? `
              <div class="server-selector-icon">
                ${getGuildIconUrl(selectedGuild)
                  ? `<img src="${getGuildIconUrl(selectedGuild)}" alt="" style="width:100%;height:100%;border-radius:var(--radius-sm);object-fit:cover;">`
                  : selectedGuild.name.charAt(0)}
              </div>
              <span class="server-selector-name">${selectedGuild.name}</span>
              ${!selectedGuild.hasBot ? '<span class="server-dropdown-badge">Bot Yok</span>' : ''}
            ` : `
              <div class="server-selector-icon">?</div>
              <span class="server-selector-name">Sunucu seçin</span>
            `}
            <span class="server-selector-arrow">&#9662;</span>
          </div>
        ` : ''}
        <a href="/" class="embed-btn embed-btn-secondary" style="padding:6px 12px;font-size:var(--text-xs);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Ana Sayfa
        </a>
        <a href="/support" class="embed-btn embed-btn-secondary" target="_blank" style="padding:6px 12px;font-size:var(--text-xs);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Destek
        </a>
        <a href="/api/auth/logout" class="embed-btn embed-btn-secondary" style="padding:6px 12px;font-size:var(--text-xs);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Cikis
        </a>
      </div>
    </header>
  `;
}

function renderServerDropdown() {
  if (guilds.length === 0) return '';
  return `
    <div class="server-dropdown" id="server-dropdown">
      ${guilds.map(g => `
        <div class="server-dropdown-item ${selectedGuild?.id === g.id ? 'active' : ''}" onclick="selectGuild('${g.id}'); closeServerDropdown();">
          <div class="server-dropdown-icon">
            ${getGuildIconUrl(g)
              ? `<img src="${getGuildIconUrl(g)}" alt="" style="width:100%;height:100%;border-radius:var(--radius-sm);object-fit:cover;">`
              : g.name.charAt(0)}
          </div>
          <div class="server-dropdown-info">
            <div class="server-dropdown-name">${g.name}</div>
            ${!g.hasBot ? '<div class="server-dropdown-badge">Bot Yok</div>' : ''}
          </div>
          ${!g.hasBot ? `
            <a href="${g.inviteUrl}" class="embed-btn embed-btn-primary" style="padding:4px 8px;font-size:10px;flex-shrink:0;" target="_blank" onclick="event.stopPropagation();">
              Botu Ekle
            </a>
          ` : `
            <a href="/dashboard?guild=${g.id}" class="embed-btn embed-btn-secondary" style="padding:4px 8px;font-size:10px;flex-shrink:0;" onclick="event.stopPropagation();">
              Panel
            </a>
          `}
        </div>
      `).join('')}
    </div>
  `;
}

function renderDashboard() {
  if (guilds.length === 0) return renderEmptyGuildState();

  const stats = dashboardStats || {};
  const premiumData = premium;
  const isPremium = premiumData?.status === 'found' && premiumData.data?.active;
  const premiumInfo = isPremium ? premiumData.data : null;
  const health = systemHealth || {};

  return `
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Toplam Sunucu</span>
          <div class="stat-card-icon accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
        </div>
        <div class="stat-card-value">${guilds.length}</div>
        <div class="stat-card-change">Yönetilebilir sunucu</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Bot Durumu</span>
          <div class="stat-card-icon ${selectedGuild?.hasBot ? 'success' : 'warning'}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
        </div>
        <div class="stat-card-value">${selectedGuild?.hasBot ? 'Aktif' : 'Değil'}</div>
        <div class="stat-card-change">${selectedGuild?.name || 'Sunucu seçin'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Moderasyon kayıtları</span>
          <div class="stat-card-icon warning">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
        </div>
        <div class="stat-card-value">${stats.moderationCount ?? '-'}</div>
        <div class="stat-card-change">${stats.caseCount ?? 0} vaka &middot; ${stats.warningCount ?? 0} uyarı</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Premium</span>
          <div class="stat-card-icon ${isPremium ? 'success' : 'danger'}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
        </div>
        <div class="stat-card-value">${isPremium ? 'Aktif' : 'Pasif'}</div>
        <div class="stat-card-change">${isPremium ? (premiumInfo.expiresAt ? 'Süreli' : 'Kalıcı') : 'Premium bulunmuyor'}</div>
      </div>
    </div>

    <div class="section-header">
      <div>
        <div class="section-title">Hızlı işlemler</div>
        <div class="section-subtitle">Sistem yapılandırmalarına hızlıca erişin</div>
      </div>
    </div>

    <div class="action-cards">
      <a class="action-card" onclick="navigate('moderation')" href="javascript:void(0)">
        <div class="action-card-icon accent">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div class="action-card-title">Moderasyon</div>
        <div class="action-card-desc">Ban, kick, mute, warn ve diğer moderasyon araçları.</div>
      </a>
      <a class="action-card" onclick="navigate('automod')" href="javascript:void(0)">
        <div class="action-card-icon warning">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06"/></svg>
        </div>
        <div class="action-card-title">AutoMod</div>
        <div class="action-card-desc">Otomatik moderasyon kuralları ve spam koruması.</div>
      </a>
      <a class="action-card" onclick="navigate('guard')" href="javascript:void(0)">
        <div class="action-card-icon danger">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div class="action-card-title">Guard</div>
        <div class="action-card-desc">Anti-raid, anti-spam, anti-nuke koruma sistemi.</div>
      </a>
      <a class="action-card" onclick="navigate('tickets')" href="javascript:void(0)">
        <div class="action-card-icon info">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="action-card-title">Ticket</div>
        <div class="action-card-desc">Destek talebi sistemi ve yönetim araçları.</div>
      </a>
      <a class="action-card" onclick="navigate('logs')" href="javascript:void(0)">
        <div class="action-card-icon success">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </div>
        <div class="action-card-title">Loglar</div>
        <div class="action-card-desc">Mesaj, ses, kanal, rol ve moderasyon kayıtları.</div>
      </a>
      <a class="action-card" onclick="navigate('setup')" href="javascript:void(0)">
        <div class="action-card-icon accent">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06"/></svg>
        </div>
        <div class="action-card-title">Kurulum</div>
        <div class="action-card-desc">Sunucu kurulum sihirbazı ve yapılandırma.</div>
      </a>
    </div>

    <div class="two-col">
      <div>
        <div class="premium-card">
          <div class="premium-card-header">
            <div class="premium-card-icon">&#9733;</div>
            <div>
              <div class="premium-card-title">CyberBOT Premium</div>
              <div class="premium-card-status">Gelişmiş özelliklere erişin</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; position: relative;">
            <span class="premium-badge ${isPremium ? 'active' : 'inactive'}">
              ${isPremium ? 'Aktif' : 'Pasif'}
            </span>
            ${isPremium && premiumInfo?.expiresAt ? `<span style="font-size:var(--text-xs);color:var(--text-secondary);">Bitiş: ${new Date(premiumInfo.expiresAt).toLocaleDateString('tr-TR')}</span>` : ''}
            ${isPremium && !premiumInfo?.expiresAt ? '<span style="font-size:var(--text-xs);color:var(--success);">Kalıcı</span>' : ''}
          </div>
          <div class="embed-btn-group" style="position: relative;">
            <button class="embed-btn embed-btn-primary" onclick="navigate('premium')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Premium
            </button>
            <a href="/support" class="embed-btn embed-btn-secondary" target="_blank">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Destek
            </a>
          </div>
        </div>

        <div class="status-card">
          <div class="status-card-title">Sistem durumu</div>
          <div class="status-items">
            <div class="status-item">
              <span class="status-item-label">Discord API</span>
              <span class="status-dot ${health.discord === 'ONLINE' ? 'online' : 'offline'}">${health.discord || 'KONTROL'}</span>
            </div>
            <div class="status-item">
              <span class="status-item-label">Database</span>
              <span class="status-dot ${health.database === 'ONLINE' ? 'online' : 'offline'}">${health.database || 'KONTROL'}</span>
            </div>
            <div class="status-item">
              <span class="status-item-label">Bot</span>
              <span class="status-dot ${health.bot === 'ONLINE' ? 'online' : 'offline'}">${health.bot || 'KONTROL'}</span>
            </div>
            <div class="status-item">
              <span class="status-item-label">Web Panel</span>
              <span class="status-dot ${health.web === 'ONLINE' ? 'online' : 'offline'}">${health.web || 'KONTROL'}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="section-header">
          <div class="section-title">Son aktiviteler</div>
        </div>
        ${activity.length === 0 ? `
          <div class="empty-state" style="padding:var(--spacing-xl);">
            <div class="empty-state-icon" style="width:48px;height:48px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <div class="empty-state-title" style="font-size:var(--text-sm);">Henüz aktivite yok</div>
            <div class="empty-state-desc" style="font-size:var(--text-xs);">Bu sunucuda henüz moderasyon kaydı bulunmuyor.</div>
          </div>
        ` : `
          <div class="activity-list">
            ${activity.map(a => `
              <div class="activity-item">
                <div class="activity-icon ${a.action?.toLowerCase() || 'warn'}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div class="activity-content">
                  <div class="activity-text">${a.action || 'İşlem'}${a.targetId ? ` &middot; ${a.targetId}` : ''}</div>
                  <div class="activity-meta">${a.moderatorId ? `Moderator: ${a.moderatorId}` : ''}</div>
                </div>
                <div class="activity-time">${a.createdAt ? formatTimeAgo(a.createdAt) : ''}</div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

function renderPlaceholder(page) {
  const info = PAGES[page] || { title: page, icon: 'settings' };
  return `
    <div class="page-placeholder">
      <div class="page-placeholder-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06"/></svg>
      </div>
      <div class="page-placeholder-title">${info.title}</div>
      <div class="page-placeholder-desc">Bu sayfa yakında oluşturulacak. Seçili sunucu: ${selectedGuild?.name || 'Yok'}</div>
      <div class="embed-btn-group" style="margin-top: 24px;">
        <button class="embed-btn embed-btn-primary" onclick="navigate('dashboard')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          Ana Sayfa
        </button>
        <a href="/support" class="embed-btn embed-btn-secondary" target="_blank">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Destek
        </a>
      </div>
    </div>
  `;
}

function renderContent() {
  if (currentPage === 'dashboard') return renderDashboard();
  return renderPlaceholder(currentPage);
}

function render() {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar()}
      <div class="main-content">
        ${renderHeader()}
        <div class="page-content">
          ${renderContent()}
        </div>
      </div>
    </div>
    ${renderServerDropdown()}
  `;
  applyServerDropdownStyles();
}

function applyServerDropdownStyles() {
  let style = document.getElementById('dropdown-styles');
  if (!style) {
    style = document.createElement('style');
    style.id = 'dropdown-styles';
    style.textContent = `
      .server-dropdown {
        position: fixed;
        top: 60px;
        right: 24px;
        width: 320px;
        max-height: 400px;
        overflow-y: auto;
        background: var(--bg-secondary);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-xl);
        z-index: var(--z-modal);
        padding: var(--spacing-sm);
        display: none;
      }
      .server-dropdown.open { display: block; }
      .server-dropdown-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: background var(--transition-fast);
      }
      .server-dropdown-item:hover { background: var(--surface-hover); }
      .server-dropdown-item.active { background: var(--accent-muted); }
      .server-dropdown-icon {
        width: 32px;
        height: 32px;
        border-radius: var(--radius-sm);
        background: var(--accent-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: var(--text-xs);
        color: var(--accent);
        flex-shrink: 0;
        overflow: hidden;
      }
      .server-dropdown-info { flex: 1; min-width: 0; }
      .server-dropdown-name {
        font-size: var(--text-sm);
        font-weight: 500;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .server-dropdown-badge {
        font-size: var(--text-xs);
        color: var(--warning);
      }
    `;
    document.head.appendChild(style);
  }
}

function toggleServerDropdown() {
  const dd = document.getElementById('server-dropdown');
  if (dd) dd.classList.toggle('open');
}

function closeServerDropdown() {
  const dd = document.getElementById('server-dropdown');
  if (dd) dd.classList.remove('open');
}

document.addEventListener('click', (e) => {
  const sel = document.getElementById('server-selector');
  const dd = document.getElementById('server-dropdown');
  if (sel && dd && !sel.contains(e.target) && !dd.contains(e.target)) {
    dd.classList.remove('open');
  }
});

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  render();
}

function closeSidebar() {
  sidebarOpen = false;
  render();
}

async function init() {
  const ok = await checkAuth();
  if (!ok) return;
  await loadGuilds();
  const path = window.location.pathname.replace('/dashboard/', '').replace('/', '') || 'dashboard';
  currentPage = path;
  if (currentPage === 'dashboard') {
    await loadDashboardData();
  }
  render();
}

init();
