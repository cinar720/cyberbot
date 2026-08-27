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
  loadPageData(page).then(render);
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
  music: { title: 'Müzik', icon: 'music' },
  level: { title: 'Level', icon: 'level' },
  voice: { title: 'Ses Kanalı', icon: 'voice' },
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
  { section: 'Özellikler', items: [
    { id: 'music', label: 'Müzik', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' },
    { id: 'level', label: 'Level', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>' },
    { id: 'voice', label: 'Ses Kanalı', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>' },
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
  switch(currentPage) {
    case 'dashboard': return renderDashboard();
    case 'moderation': return renderModeration();
    case 'automod': return renderAutomod();
    case 'guard': return renderGuard();
    case 'tickets': return renderTickets();
    case 'logs': return renderLogs();
    case 'cases': return renderCases();
    case 'welcome': return renderWelcome();
    case 'custom-commands': return renderCustomCommands();
    case 'auto-response': return renderAutoResponse();
    case 'setup': return renderSetup();
    case 'premium': return renderPremiumPage();
    case 'settings': return renderSettings();
    case 'servers': return renderServers();
    case 'music': return renderMusic();
    case 'level': return renderLevel();
    case 'voice': return renderVoice();
    default: return renderPlaceholder(currentPage);
  }
}

function renderLoading() {
  return `<div class="empty-state" style="padding:var(--spacing-3xl);"><div class="empty-state-desc">Yükleniyor...</div></div>`;
}

function renderNoGuild() {
  return `<div class="empty-state" style="padding:var(--spacing-3xl);"><div class="empty-state-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><div class="empty-state-title">Sunucu seçilmedi</div><div class="empty-state-desc">Bu sayfayı görüntülemek için bir sunucu seçin.</div></div>`;
}

function renderToggle(label, desc, enabled) {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--spacing-lg);background:var(--surface);border:1px solid var(--surface-border);border-radius:var(--radius-lg);margin-bottom:var(--spacing-md);">
      <div><div style="font-size:var(--text-sm);font-weight:600;color:var(--text-primary);margin-bottom:2px;">${label}</div><div style="font-size:var(--text-xs);color:var(--text-muted);">${desc}</div></div>
      <div style="width:44px;height:24px;border-radius:var(--radius-full);background:${enabled ? 'var(--success)' : 'var(--surface-active)'};border:1px solid ${enabled ? 'var(--success-border)' : 'var(--surface-border)'};position:relative;cursor:pointer;transition:all var(--transition-fast);">
        <div style="width:18px;height:18px;border-radius:var(--radius-full);background:white;position:absolute;top:2px;${enabled ? 'right:2px;' : 'left:2px;'}transition:all var(--transition-fast);"></div>
      </div>
    </div>`;
}

async function renderModeration() {
  if (!selectedGuild) return renderNoGuild();
  const container = document.getElementById('page-content') || document.querySelector('.page-content');
  const html = `
    <div class="section-header"><div><div class="section-title">Moderasyon</div><div class="section-subtitle">Sunucu moderasyon araçları ve istatistikleri</div></div></div>
    <div id="mod-stats">${renderLoading()}</div>
    <div class="section-header" style="margin-top:var(--spacing-xl);"><div class="section-title">Hızlı İşlemler</div></div>
    <div class="action-cards">
      <div class="action-card" onclick="alert('Ban komutu: /ban @kullanıcı sebep')"><div class="action-card-icon danger"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></div><div class="action-card-title">Ban</div><div class="action-card-desc">Kullanıcıyı sunucudan yasakla</div></div>
      <div class="action-card" onclick="alert('Kick komutu: /kick @kullanıcı sebep')"><div class="action-card-icon warning"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><polyline points="17 11 21 7 17 3"/><line x1="21" y1="7" x2="9" y2="7"/></svg></div><div class="action-card-title">Kick</div><div class="action-card-desc">Kullanıcıyı sunucudan at</div></div>
      <div class="action-card" onclick="alert('Mute komutu: /mute @kullanıcı süre sebep')"><div class="action-card-icon info"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><line x1="4" y1="4" x2="20" y2="20"/></svg></div><div class="action-card-title">Mute</div><div class="action-card-desc">Kullanıcıyı sustur</div></div>
      <div class="action-card" onclick="alert('Warn komutu: /warn @kullanıcı sebep')"><div class="action-card-icon accent"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div class="action-card-title">Warn</div><div class="action-card-desc">Kullanıcıya uyarı ver</div></div>
    </div>
    <div id="mod-activity">${renderLoading()}</div>`;
  setTimeout(async () => {
    const statsRes = await apiFetch(`/api/guilds/${selectedGuild.id}/stats`);
    const statsEl = document.getElementById('mod-stats');
    if (statsEl && statsRes?.success) {
      const s = statsRes.data;
      statsEl.innerHTML = `<div class="stat-cards"><div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Toplam İşlem</span><div class="stat-card-icon accent"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div></div><div class="stat-card-value">${s.moderationCount ?? 0}</div><div class="stat-card-change">Moderasyon kayıtları</div></div><div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Vakalar</span><div class="stat-card-icon warning"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div></div><div class="stat-card-value">${s.caseCount ?? 0}</div><div class="stat-card-change">Açık vaka</div></div><div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Uyarılar</span><div class="stat-card-icon danger"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg></div></div><div class="stat-card-value">${s.warningCount ?? 0}</div><div class="stat-card-change">Aktif uyarı</div></div><div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Ticket</span><div class="stat-card-icon info"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div></div><div class="stat-card-value">${s.ticketCount ?? 0}</div><div class="stat-card-change">Açık ticket</div></div></div>`;
    }
    const actRes = await apiFetch(`/api/guilds/${selectedGuild.id}/activity`);
    const actEl = document.getElementById('mod-activity');
    if (actEl) {
      if (actRes?.success && actRes.data?.length > 0) {
        actEl.innerHTML = `<div class="section-header" style="margin-top:var(--spacing-xl);"><div class="section-title">Son İşlemler</div></div><div class="activity-list">${actRes.data.map(a => `<div class="activity-item"><div class="activity-icon ${a.action?.toLowerCase() || 'warn'}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><div class="activity-content"><div class="activity-text">${a.action || 'İşlem'}${a.targetId ? ` · ${a.targetId}` : ''}</div><div class="activity-meta">${a.moderatorId ? `Moderator: ${a.moderatorId}` : ''}</div></div><div class="activity-time">${a.createdAt ? formatTimeAgo(a.createdAt) : ''}</div></div>`).join('')}</div>`;
      } else {
        actEl.innerHTML = '';
      }
    }
  }, 0);
  return html;
}

async function renderAutomod() {
  if (!selectedGuild) return renderNoGuild();
  return `
    <div class="section-header"><div><div class="section-title">AutoMod</div><div class="section-subtitle">Otomatik moderasyon kuralları ve spam koruması</div></div></div>
    <div style="max-width:600px;">
      ${renderToggle('Spam Koruması', 'Aşırı mesaj yazan kullanıcıları otomatik sustur', true)}
      ${renderToggle('Küfür Filtresi', 'Küfür içeren mesajları otomatik sil', true)}
      ${renderToggle('Link Filtresi', 'Discord dışı linkleri otomatik sil', false)}
      ${renderToggle('Capslock Filtresi', 'Aşırı büyük harf kullanımını engelle', false)}
      ${renderToggle('Reklam Koruması', 'Discord davet linklerini otomatik sil', true)}
      ${renderToggle('Spam Eşik Değeri', '5 mesaj / 10 saniye limiti', true)}
    </div>
    <div style="margin-top:var(--spacing-xl);"><button class="embed-btn embed-btn-primary" onclick="alert('Ayarlar kaydedildi!')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg> Kaydet</button></div>`;
}

async function renderGuard() {
  if (!selectedGuild) return renderNoGuild();
  return `
    <div class="section-header"><div><div class="section-title">Guard</div><div class="section-subtitle">Sunucu koruma sistemi</div></div></div>
    <div style="max-width:600px;">
      ${renderToggle('Anti-Raid', 'Toplu kullanıcı girişlerine karşı koruma', true)}
      ${renderToggle('Anti-Spam', 'Spam mesajlara karşı koruma', true)}
      ${renderToggle('Anti-Nuke', 'Sunucu silme / düzenlemelere karşı koruma', true)}
      ${renderToggle('Anti-Bot', 'Yetkisiz bot eklemelerine karşı koruma', false)}
      ${renderToggle('Anti-Channel Delete', 'Kanal silme işlemlerine karşı koruma', true)}
      ${renderToggle('Anti-Role Delete', 'Rol silme işlemlerine karşı koruma', true)}
      ${renderToggle('Whitelist Sistemi', 'Beyaz listedeki üyeleri muaf tut', true)}
    </div>
    <div style="margin-top:var(--spacing-xl);"><button class="embed-btn embed-btn-primary" onclick="alert('Guard ayarları kaydedildi!')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg> Kaydet</button></div>`;
}

async function renderTickets() {
  if (!selectedGuild) return renderNoGuild();
  const container = document.getElementById('page-content') || document.querySelector('.page-content');
  const html = `
    <div class="section-header"><div><div class="section-title">Ticket</div><div class="section-subtitle">Destek talebi sistemi</div></div></div>
    <div id="ticket-content">${renderLoading()}</div>`;
  setTimeout(async () => {
    const statsRes = await apiFetch(`/api/guilds/${selectedGuild.id}/stats`);
    const el = document.getElementById('ticket-content');
    if (el && statsRes?.success) {
      const count = statsRes.data.ticketCount ?? 0;
      el.innerHTML = `
        <div class="stat-cards"><div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Açık Ticket</span><div class="stat-card-icon info"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div></div><div class="stat-card-value">${count}</div><div class="stat-card-change">Aktif destek talebi</div></div><div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Toplam</span><div class="stat-card-icon accent"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div></div><div class="stat-card-value">—</div><div class="stat-card-change">Tüm zamanlar</div></div></div>
        <div class="section-header"><div class="section-title">Yakın Zamanda Açılan Ticketlar</div></div>
        <div class="empty-state" style="padding:var(--spacing-xl);background:var(--surface);border:1px solid var(--surface-border);border-radius:var(--radius-lg);"><div class="empty-state-icon" style="width:48px;height:48px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div><div class="empty-state-title" style="font-size:var(--text-sm);">Ticket listesi burada görünecek</div></div>
        <div style="margin-top:var(--spacing-lg);display:flex;gap:var(--spacing-md);">
          <div style="max-width:600px;flex:1;">
            <div class="section-header"><div class="section-title">Ayarlar</div></div>
            ${renderToggle('Ticket Sistemi', 'Destek talebi sistemini aktifleştir', true)}
            ${renderToggle('Otomatik Kapanma', 'Çözülen ticketları otomatik kapat', false)}
            ${renderToggle('Transkript', 'Kapatılan ticketların transkriptini kaydet', true)}
          </div>
        </div>`;
    }
  }, 0);
  return html;
}

async function renderLogs() {
  if (!selectedGuild) return renderNoGuild();
  const html = `
    <div class="section-header"><div><div class="section-title">Loglar</div><div class="section-subtitle">Moderasyon ve sistem logları</div></div></div>
    <div style="display:flex;gap:var(--spacing-md);margin-bottom:var(--spacing-xl);flex-wrap:wrap;">
      <button class="embed-btn embed-btn-primary" onclick="loadLogs('all')" id="log-filter-all">Tümü</button>
      <button class="embed-btn embed-btn-secondary" onclick="loadLogs('ban')" id="log-filter-ban">Ban</button>
      <button class="embed-btn embed-btn-secondary" onclick="loadLogs('kick')" id="log-filter-kick">Kick</button>
      <button class="embed-btn embed-btn-secondary" onclick="loadLogs('mute')" id="log-filter-mute">Mute</button>
      <button class="embed-btn embed-btn-secondary" onclick="loadLogs('warn')" id="log-filter-warn">Warn</button>
    </div>
    <div id="logs-list">${renderLoading()}</div>`;
  setTimeout(() => loadLogs('all'), 0);
  return html;
}

window.loadLogs = async function(filter) {
  const el = document.getElementById('logs-list');
  if (!el || !selectedGuild) return;
  el.innerHTML = renderLoading();
  const res = await apiFetch(`/api/guilds/${selectedGuild.id}/activity`);
  if (!res?.success || !res.data) { el.innerHTML = '<div class="empty-state" style="padding:var(--spacing-xl);background:var(--surface);border:1px solid var(--surface-border);border-radius:var(--radius-lg);"><div class="empty-state-title" style="font-size:var(--text-sm);">Log bulunamadı</div></div>'; return; }
  let items = res.data;
  if (filter !== 'all') items = items.filter(a => a.action?.toLowerCase() === filter);
  if (items.length === 0) { el.innerHTML = '<div class="empty-state" style="padding:var(--spacing-xl);background:var(--surface);border:1px solid var(--surface-border);border-radius:var(--radius-lg);"><div class="empty-state-title" style="font-size:var(--text-sm);">Bu filtreye uygun log bulunamadı</div></div>'; return; }
  el.innerHTML = `<div class="activity-list">${items.map(a => `<div class="activity-item"><div class="activity-icon ${a.action?.toLowerCase() || 'warn'}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><div class="activity-content"><div class="activity-text">${a.action || 'İşlem'}${a.targetId ? ` · ${a.targetId}` : ''}</div><div class="activity-meta">${a.moderatorId ? `Moderator: ${a.moderatorId}` : ''}</div></div><div class="activity-time">${a.createdAt ? formatTimeAgo(a.createdAt) : ''}</div></div>`).join('')}</div>`;
  ['all','ban','kick','mute','warn'].forEach(f => { const btn = document.getElementById(`log-filter-${f}`); if (btn) { btn.className = f === filter ? 'embed-btn embed-btn-primary' : 'embed-btn embed-btn-secondary'; } });
};

async function renderCases() {
  if (!selectedGuild) return renderNoGuild();
  const html = `
    <div class="section-header"><div><div class="section-title">Vaka / Kanıt</div><div class="section-subtitle">Moderasyon vakaları ve kanıt yönetimi</div></div></div>
    <div id="cases-content">${renderLoading()}</div>`;
  setTimeout(async () => {
    const statsRes = await apiFetch(`/api/guilds/${selectedGuild.id}/stats`);
    const el = document.getElementById('cases-content');
    if (el) {
      const caseCount = statsRes?.success ? (statsRes.data.caseCount ?? 0) : 0;
      el.innerHTML = `
        <div class="stat-cards"><div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Toplam Vaka</span><div class="stat-card-icon warning"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div></div><div class="stat-card-value">${caseCount}</div><div class="stat-card-change">Kayıtlı vaka</div></div></div>
        <div class="section-header"><div class="section-title">Vaka Listesi</div></div>
        <div class="empty-state" style="padding:var(--spacing-xl);background:var(--surface);border:1px solid var(--surface-border);border-radius:var(--radius-lg);"><div class="empty-state-icon" style="width:48px;height:48px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div><div class="empty-state-title" style="font-size:var(--text-sm);">Vaka listesi burada görünecek</div></div>`;
    }
  }, 0);
  return html;
}

async function renderWelcome() {
  if (!selectedGuild) return renderNoGuild();
  return `
    <div class="section-header"><div><div class="section-title">Hoşgeldin / Ayrılış</div><div class="section-subtitle">Sunucuya hoşgeldin ve ayrılış mesajları</div></div></div>
    <div class="two-col">
      <div>
        <div class="section-header"><div class="section-title">Hoşgeldin Mesajı</div></div>
        <div style="background:var(--surface);border:1px solid var(--surface-border);border-radius:var(--radius-lg);padding:var(--spacing-xl);">
          <div style="margin-bottom:var(--spacing-md);"><label style="font-size:var(--text-sm);color:var(--text-secondary);display:block;margin-bottom:var(--spacing-xs);">Kanal</label><input type="text" value="#hosgeldin" style="width:100%;padding:var(--spacing-sm) var(--spacing-md);background:var(--bg-tertiary);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);box-sizing:border-box;"></div>
          <div style="margin-bottom:var(--spacing-md);"><label style="font-size:var(--text-sm);color:var(--text-secondary);display:block;margin-bottom:var(--spacing-xs);">Mesaj</label><textarea style="width:100%;padding:var(--spacing-sm) var(--spacing-md);background:var(--bg-tertiary);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);min-height:80px;resize:vertical;box-sizing:border-box;font-family:var(--font-mono);">Hoşgeldin {user}! 🎉</textarea></div>
          ${renderToggle('Hoşgeldin Mesajı Aktif', 'Yeni üyeler için hoşgeldin mesajı gönder', true)}
          <div style="margin-top:var(--spacing-lg);"><button class="embed-btn embed-btn-primary" onclick="alert('Hoşgeldin ayarları kaydedildi!')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/></svg> Kaydet</button></div>
        </div>
      </div>
      <div>
        <div class="section-header"><div class="section-title">Ayrılış Mesajı</div></div>
        <div style="background:var(--surface);border:1px solid var(--surface-border);border-radius:var(--radius-lg);padding:var(--spacing-xl);">
          <div style="margin-bottom:var(--spacing-md);"><label style="font-size:var(--text-sm);color:var(--text-secondary);display:block;margin-bottom:var(--spacing-xs);">Kanal</label><input type="text" value="#ayrilis" style="width:100%;padding:var(--spacing-sm) var(--spacing-md);background:var(--bg-tertiary);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);box-sizing:border-box;"></div>
          <div style="margin-bottom:var(--spacing-md);"><label style="font-size:var(--text-sm);color:var(--text-secondary);display:block;margin-bottom:var(--spacing-xs);">Mesaj</label><textarea style="width:100%;padding:var(--spacing-sm) var(--spacing-md);background:var(--bg-tertiary);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);min-height:80px;resize:vertical;box-sizing:border-box;font-family:var(--font-mono);">Hoşçakal {user}! 👋</textarea></div>
          ${renderToggle('Ayrılış Mesajı Aktif', 'Ayrılan üyeler için ayrılış mesajı gönder', true)}
          <div style="margin-top:var(--spacing-lg);"><button class="embed-btn embed-btn-primary" onclick="alert('Ayrılış ayarları kaydedildi!')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/></svg> Kaydet</button></div>
        </div>
      </div>
    </div>`;
}

async function renderCustomCommands() {
  if (!selectedGuild) return renderNoGuild();
  return `
    <div class="section-header"><div><div class="section-title">Özel Komut</div><div class="section-subtitle">Özel komutlar oluşturun ve yönetin</div></div></div>
    <div style="background:var(--surface);border:1px solid var(--surface-border);border-radius:var(--radius-lg);padding:var(--spacing-xl);margin-bottom:var(--spacing-xl);">
      <div style="display:flex;gap:var(--spacing-md);flex-wrap:wrap;">
        <input type="text" placeholder="Komut adı (ör: selam)" style="flex:1;min-width:150px;padding:var(--spacing-sm) var(--spacing-md);background:var(--bg-tertiary);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);box-sizing:border-box;">
        <input type="text" placeholder="Yanıt mesajı" style="flex:2;min-width:200px;padding:var(--spacing-sm) var(--spacing-md);background:var(--bg-tertiary);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);box-sizing:border-box;">
        <button class="embed-btn embed-btn-primary" onclick="alert('Komut eklendi!')">Ekle</button>
      </div>
    </div>
    <div id="custom-cmds-list">
      <div class="activity-list">
        <div class="activity-item"><div class="activity-icon accent"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div><div class="activity-content"><div class="activity-text">!selam → Merhaba!</div><div class="activity-meta">Oluşturulma: bilinmiyor</div></div><button class="embed-btn embed-btn-danger" style="padding:4px 8px;font-size:10px;">Sil</button></div>
        <div class="activity-item"><div class="activity-icon accent"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div><div class="activity-content"><div class="activity-text">!yardım → Komut listesi burada...</div><div class="activity-meta">Oluşturulma: bilinmiyor</div></div><button class="embed-btn embed-btn-danger" style="padding:4px 8px;font-size:10px;">Sil</button></div>
      </div>
    </div>`;
}

async function renderAutoResponse() {
  if (!selectedGuild) return renderNoGuild();
  return `
    <div class="section-header"><div><div class="section-title">Otomatik Yanıt</div><div class="section-subtitle">Otomatik yanıt sistemi kurun</div></div></div>
    <div style="background:var(--surface);border:1px solid var(--surface-border);border-radius:var(--radius-lg);padding:var(--spacing-xl);margin-bottom:var(--spacing-xl);">
      <div style="display:flex;gap:var(--spacing-md);flex-wrap:wrap;">
        <input type="text" placeholder="Tetikleme kelimesi (ör: bot)" style="flex:1;min-width:150px;padding:var(--spacing-sm) var(--spacing-md);background:var(--bg-tertiary);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);box-sizing:border-box;">
        <input type="text" placeholder="Yanıt mesajı" style="flex:2;min-width:200px;padding:var(--spacing-sm) var(--spacing-md);background:var(--bg-tertiary);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);box-sizing:border-box;">
        <button class="embed-btn embed-btn-primary" onclick="alert('Otomatik yanıt eklendi!')">Ekle</button>
      </div>
    </div>
    <div class="activity-list">
      <div class="activity-item"><div class="activity-icon info"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><div class="activity-content"><div class="activity-text">"bot" → CyberBOT bir Discord botudur.</div><div class="activity-meta">Durum: Aktif</div></div><button class="embed-btn embed-btn-danger" style="padding:4px 8px;font-size:10px;">Sil</button></div>
      <div class="activity-item"><div class="activity-icon info"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><div class="activity-content"><div class="activity-text">"web" → Web panelimiz: cyberbot.com</div><div class="activity-meta">Durum: Aktif</div></div><button class="embed-btn embed-btn-danger" style="padding:4px 8px;font-size:10px;">Sil</button></div>
    </div>`;
}

async function renderSetup() {
  if (!selectedGuild) return renderNoGuild();
  const steps = [
    { title: 'Botu Sunucuya Ekle', desc: 'Discord OAuth2 ile botu sunucunuza ekleyin', done: selectedGuild.hasBot },
    { title: 'Yetkileri Ayarla', desc: 'Bot için gerekli izinleri verin', done: selectedGuild.hasBot },
    { title: 'Kanal Seç', desc: 'Log ve hoşgeldin kanallarını seçin', done: false },
    { title: 'Rolleri Eşle', desc: 'Moderasyon ve rol yapısını ayarlayın', done: false },
    { title: 'Özellikleri Aktifleştir', desc: 'AutoMod, Guard, Ticket sistemlerini açın', done: false },
  ];
  return `
    <div class="section-header"><div><div class="section-title">Kurulum</div><div class="section-subtitle">Sunucu kurulum sihirbazı</div></div></div>
    <div style="max-width:600px;">
      ${steps.map((s, i) => `
        <div style="display:flex;gap:var(--spacing-lg);align-items:flex-start;padding:var(--spacing-lg);background:var(--surface);border:1px solid var(--surface-border);border-radius:var(--radius-lg);margin-bottom:var(--spacing-md);">
          <div style="width:32px;height:32px;border-radius:var(--radius-full);background:${s.done ? 'var(--success-muted)' : 'var(--accent-muted)'};color:${s.done ? 'var(--success)' : 'var(--accent)'};display:flex;align-items:center;justify-content:center;font-size:var(--text-sm);font-weight:700;flex-shrink:0;">${s.done ? '✓' : i + 1}</div>
          <div style="flex:1;"><div style="font-size:var(--text-sm);font-weight:600;color:var(--text-primary);margin-bottom:2px;">${s.title}</div><div style="font-size:var(--text-xs);color:var(--text-muted);">${s.desc}</div></div>
          <span class="premium-badge ${s.done ? 'active' : 'inactive'}">${s.done ? 'Tamamlandı' : 'Bekliyor'}</span>
        </div>
      `).join('')}
    </div>`;
}

async function renderPremiumPage() {
  if (!selectedGuild) return renderNoGuild();
  const res = await apiFetch(`/api/guilds/${selectedGuild.id}/premium`);
  const isActive = res?.success && res.data?.status === 'found' && res.data.data?.active;
  const premiumData = isActive ? res.data.data : null;
  return `
    <div class="section-header"><div><div class="section-title">Premium</div><div class="section-subtitle">Premium özellikler ve abonelik durumu</div></div></div>
    <div class="premium-card" style="max-width:600px;">
      <div class="premium-card-header">
        <div class="premium-card-icon">&#9733;</div>
        <div><div class="premium-card-title">CyberBOT Premium</div><div class="premium-card-status">Gelişmiş özelliklere erişin</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:var(--spacing-xl);">
        <span class="premium-badge ${isActive ? 'active' : 'inactive'}">${isActive ? 'Aktif' : 'Pasif'}</span>
        ${premiumData?.expiresAt ? `<span style="font-size:var(--text-xs);color:var(--text-secondary);">Bitiş: ${new Date(premiumData.expiresAt).toLocaleDateString('tr-TR')}</span>` : ''}
      </div>
    </div>
    <div class="section-header"><div class="section-title">Premium Özellikler</div></div>
    <div style="max-width:600px;">
      ${[
        { name: 'Gelişmiş AutoMod', desc: 'Daha hassas filtreleme ve özel kurallar', active: isActive },
        { name: 'Detaylı Loglar', desc: '7 gün yerine 30 günlük log tutma', active: isActive },
        { name: 'Özel Komutlar', desc: 'Sınırsız özel komut oluşturma', active: isActive },
        { name: 'Öncelikli Destek', desc: 'Hızlı ve öncelikli teknik destek', active: isActive },
        { name: 'Müzik Premium', desc: 'Yüksek kaliteli müzik çalma', active: isActive },
      ].map(f => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--spacing-md);background:var(--surface);border:1px solid var(--surface-border);border-radius:var(--radius-md);margin-bottom:var(--spacing-sm);">
          <div><div style="font-size:var(--text-sm);font-weight:600;color:var(--text-primary);">${f.name}</div><div style="font-size:var(--text-xs);color:var(--text-muted);">${f.desc}</div></div>
          <span class="premium-badge ${f.active ? 'active' : 'inactive'}">${f.active ? 'Aktif' : 'Kilitli'}</span>
        </div>`).join('')}
    </div>
    ${!isActive ? '<div style="margin-top:var(--spacing-xl);"><button class="embed-btn embed-btn-primary" onclick="alert('Premium satın alma sayfasına yönlendiriliyorsunuz...')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Premium Satın Al</button></div>' : ''}`;
}

async function renderSettings() {
  if (!selectedGuild) return renderNoGuild();
  return `
    <div class="section-header"><div><div class="section-title">Ayarlar</div><div class="section-subtitle">Bot ve sunucu ayarları</div></div></div>
    <div class="two-col">
      <div>
        <div class="status-card">
          <div class="status-card-title">Sunucu Bilgileri</div>
          <div class="status-items">
            <div class="status-item"><span class="status-item-label">Sunucu Adı</span><span style="font-size:var(--text-sm);color:var(--text-primary);">${selectedGuild.name}</span></div>
            <div class="status-item"><span class="status-item-label">Sunucu ID</span><span style="font-size:var(--text-xs);color:var(--text-muted);font-family:var(--font-mono);">${selectedGuild.id}</span></div>
            <div class="status-item"><span class="status-item-label">Bot Durumu</span><span class="status-dot ${selectedGuild.hasBot ? 'online' : 'offline'}">${selectedGuild.hasBot ? 'Aktif' : 'Değil'}</span></div>
          </div>
        </div>
      </div>
      <div>
        <div class="status-card">
          <div class="status-card-title">Ayarlar</div>
          <div style="display:flex;flex-direction:column;gap:var(--spacing-sm);">
            ${renderToggle('Prefix', 'Komut öneki: !', true)}
            ${renderToggle('Dil', 'Türkçe', true)}
            ${renderToggle('Otomatik Yanıt', 'Otomatik yanıt sistemi', true)}
          </div>
        </div>
      </div>
    </div>
    <div style="margin-top:var(--spacing-xl);max-width:400px;">
      <div class="status-card">
        <div class="status-card-title" style="color:var(--danger);">Tehlikeli Bölge</div>
        <div style="display:flex;flex-direction:column;gap:var(--spacing-sm);">
          <button class="embed-btn embed-btn-danger" style="width:100%;justify-content:flex-start;" onclick="if(confirm('Bot sunucudan ayrılacak. Emin misiniz?')) alert('Bot ayrılıyor...')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Botu Sunucudan Çıkar</button>
        </div>
      </div>
    </div>`;
}

async function renderServers() {
  const html = `
    <div class="section-header"><div><div class="section-title">Sunucularım</div><div class="section-subtitle">Yönetilebilir Discord sunucuları</div></div></div>
    <div id="servers-list">${renderLoading()}</div>`;
  setTimeout(async () => {
    const el = document.getElementById('servers-list');
    if (!el) return;
    if (guilds.length === 0) { el.innerHTML = renderEmptyGuildState(); return; }
    el.innerHTML = `<div class="activity-list">${guilds.map(g => `
      <div class="activity-item" style="cursor:pointer;" onclick="selectGuild('${g.id}')">
        <div class="activity-icon accent" style="border-radius:var(--radius-sm);overflow:hidden;width:40px;height:40px;">
          ${getGuildIconUrl(g) ? `<img src="${getGuildIconUrl(g)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : g.name.charAt(0)}
        </div>
        <div class="activity-content">
          <div class="activity-text" style="font-weight:600;">${g.name}</div>
          <div class="activity-meta">ID: ${g.id} · ${g.hasBot ? 'Bot Aktif' : 'Bot Yok'}</div>
        </div>
        <span class="premium-badge ${g.hasBot ? 'active' : 'inactive'}">${g.hasBot ? 'Yönet' : 'Bot Ekle'}</span>
      </div>`).join('')}</div>`;
  }, 0);
  return html;
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

async function loadPageData(page) {
  if (!selectedGuild) return;
  if (page === 'dashboard') {
    await loadDashboardData();
  } else if (page === 'music') {
    musicConfig = await apiFetch(`/api/guilds/${selectedGuild.id}/music/config`).then(r => r?.success ? r.data : null);
    musicQueue = await apiFetch(`/api/guilds/${selectedGuild.id}/music/queue`).then(r => r?.success ? r.data : null);
  } else if (page === 'level') {
    levelConfig = await apiFetch(`/api/guilds/${selectedGuild.id}/level/config`).then(r => r?.success ? r.data : null);
    levelLeaderboard = await apiFetch(`/api/guilds/${selectedGuild.id}/level/leaderboard`).then(r => r?.success ? r.data : null);
  } else if (page === 'voice') {
    voiceConfig = await apiFetch(`/api/guilds/${selectedGuild.id}/voice/config`).then(r => r?.success ? r.data : null);
    voiceChannels = await apiFetch(`/api/guilds/${selectedGuild.id}/voice/channels`).then(r => r?.success ? r.data : null);
  }
}

let musicConfig = null;
let musicQueue = null;
let levelConfig = null;
let levelLeaderboard = null;
let voiceConfig = null;
let voiceChannels = null;

function renderMusic() {
  if (!selectedGuild) return renderNoGuild();
  const cfg = musicConfig || {};
  const queue = musicQueue || [];
  return `
    <div class="section-header"><div><div class="section-title">Müzik Sistemi</div><div class="section-subtitle">Müzik çalma ve kuyruk yönetimi</div></div></div>
    <div class="stat-cards">
      <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Durum</span><div class="stat-card-icon ${cfg.enabled ? 'success' : 'danger'}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div></div><div class="stat-card-value">${cfg.enabled ? 'Aktif' : 'Pasif'}</div><div class="stat-card-change">Müzik sistemi</div></div>
      <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Ses Seviyesi</span><div class="stat-card-icon accent"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></div></div><div class="stat-card-value">${cfg.volume || 80}%</div><div class="stat-card-change">Maksimum ses</div></div>
      <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Kuyruk</span><div class="stat-card-icon info"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></div></div><div class="stat-card-value">${Array.isArray(queue) ? queue.length : 0}</div><div class="stat-card-change">Şarkı kuyruğu</div></div>
      <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">DJ Rolü</span><div class="stat-card-icon warning"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div></div><div class="stat-card-value">${cfg.djRoleId ? '<@' + cfg.djRoleId + '>' : 'Tanımlı değil'}</div><div class="stat-card-change">Müzik yetki rolü</div></div>
    </div>
    <div class="section-header" style="margin-top:var(--spacing-xl);"><div class="section-title">Müzik Ayarları</div></div>
    <div style="background:var(--surface);border:1px solid var(--surface-border);border-radius:var(--radius-lg);padding:var(--spacing-xl);">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--spacing-lg);">
        <div><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:6px;">Ses Seviyesi (0-100)</label><input type="number" id="music-volume" value="${cfg.volume || 80}" min="0" max="100" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);"></div>
        <div><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:6px;">Otomatik Ayrılma (sn)</label><input type="number" id="music-autoleave" value="${cfg.autoLeaveTimer || 300}" min="60" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);"></div>
      </div>
      <div style="margin-top:var(--spacing-lg);display:flex;gap:var(--spacing-md);">
        <button class="embed-btn embed-btn-primary" onclick="saveMusicConfig()" style="width:auto;">Kaydet</button>
      </div>
    </div>
    ${Array.isArray(queue) && queue.length > 0 ? `
    <div class="section-header" style="margin-top:var(--spacing-xl);"><div class="section-title">Kuyruk</div></div>
    <div style="background:var(--surface);border:1px solid var(--surface-border);border-radius:var(--radius-lg);overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;font-size:var(--text-sm);">
        <thead><tr style="border-bottom:1px solid var(--surface-border);"><th style="padding:12px 16px;text-align:left;color:var(--text-muted);font-weight:500;">#</th><th style="padding:12px 16px;text-align:left;color:var(--text-muted);font-weight:500;">Şarkı</th><th style="padding:12px 16px;text-align:left;color:var(--text-muted);font-weight:500;">Süre</th><th style="padding:12px 16px;text-align:left;color:var(--text-muted);font-weight:500;">İsteyen</th></tr></thead>
        <tbody>${queue.map((t, i) => `<tr style="border-bottom:1px solid var(--surface-border);"><td style="padding:10px 16px;color:var(--text-muted);">${i + 1}</td><td style="padding:10px 16px;color:var(--text-primary);">${t.title || 'Bilinmiyor'}</td><td style="padding:10px 16px;color:var(--text-secondary);">${t.duration || '-'}</td><td style="padding:10px 16px;color:var(--text-secondary);">${t.requestedBy || '-'}</td></tr>`).join('')}</tbody>
      </table>
    </div>` : ''}
  `;
}

async function saveMusicConfig() {
  if (!selectedGuild) return;
  const volume = parseInt(document.getElementById('music-volume')?.value || '80');
  const autoLeaveTimer = parseInt(document.getElementById('music-autoleave')?.value || '300');
  await fetch(`/api/guilds/${selectedGuild.id}/music/config`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ volume, autoLeaveTimer }) });
  musicConfig = await apiFetch(`/api/guilds/${selectedGuild.id}/music/config`).then(r => r?.success ? r.data : null);
  render();
}

function renderLevel() {
  if (!selectedGuild) return renderNoGuild();
  const cfg = levelConfig || {};
  const lb = levelLeaderboard || [];
  return `
    <div class="section-header"><div><div class="section-title">XP & Level Sistemi</div><div class="section-subtitle">Mesaj XP kazanımı ve level ayarları</div></div></div>
    <div class="stat-cards">
      <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Durum</span><div class="stat-card-icon ${cfg.enabled ? 'success' : 'danger'}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg></div></div><div class="stat-card-value">${cfg.enabled ? 'Aktif' : 'Pasif'}</div><div class="stat-card-change">Level sistemi</div></div>
      <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">XP / Mesaj</span><div class="stat-card-icon accent"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div></div><div class="stat-card-value">${cfg.xpPerMessage || 15}</div><div class="stat-card-change">Her mesajda kazanılan XP</div></div>
      <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Cooldown</span><div class="stat-card-icon warning"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div></div><div class="stat-card-value">${cfg.xpCooldown || 60}s</div><div class="stat-card-change">XP kazanma bekleme süresi</div></div>
      <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Level-Up Kanalı</span><div class="stat-card-icon info"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div></div><div class="stat-card-value">${cfg.levelUpChannelId ? '<#' + cfg.levelUpChannelId + '>' : 'Mevcut kanal'}</div><div class="stat-card-change">Level atlama bildirim kanalı</div></div>
    </div>
    <div class="section-header" style="margin-top:var(--spacing-xl);"><div class="section-title">Level Ayarları</div></div>
    <div style="background:var(--surface);border:1px solid var(--surface-border);border-radius:var(--radius-lg);padding:var(--spacing-xl);">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--spacing-lg);">
        <div><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:6px;">XP / Mesaj</label><input type="number" id="level-xp" value="${cfg.xpPerMessage || 15}" min="1" max="100" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);"></div>
        <div><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:6px;">Cooldown (sn)</label><input type="number" id="level-cooldown" value="${cfg.xpCooldown || 60}" min="10" max="300" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);"></div>
        <div style="grid-column:span 2;"><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:6px;">Level-Up Mesajı</label><input type="text" id="level-message" value="${cfg.levelUpMessage || 'Tebrikler {user}, **Level {level}** oldun!'}" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);"></div>
      </div>
      <div style="margin-top:var(--spacing-lg);display:flex;gap:var(--spacing-md);">
        <button class="embed-btn embed-btn-primary" onclick="saveLevelConfig()" style="width:auto;">Kaydet</button>
      </div>
    </div>
    ${lb.length > 0 ? `
    <div class="section-header" style="margin-top:var(--spacing-xl);"><div class="section-title">Liderlik Tablosu</div></div>
    <div style="background:var(--surface);border:1px solid var(--surface-border);border-radius:var(--radius-lg);overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;font-size:var(--text-sm);">
        <thead><tr style="border-bottom:1px solid var(--surface-border);"><th style="padding:12px 16px;text-align:left;color:var(--text-muted);font-weight:500;">#</th><th style="padding:12px 16px;text-align:left;color:var(--text-muted);font-weight:500;">Kullanıcı</th><th style="padding:12px 16px;text-align:left;color:var(--text-muted);font-weight:500;">Level</th><th style="padding:12px 16px;text-align:left;color:var(--text-muted);font-weight:500;">XP</th><th style="padding:12px 16px;text-align:left;color:var(--text-muted);font-weight:500;">Mesaj</th></tr></thead>
        <tbody>${lb.map((u, i) => `<tr style="border-bottom:1px solid var(--surface-border);"><td style="padding:10px 16px;color:var(--text-muted);">${i + 1}</td><td style="padding:10px 16px;color:var(--text-primary);">${u.userId}</td><td style="padding:10px 16px;color:var(--accent);font-weight:600;">${u.level}</td><td style="padding:10px 16px;color:var(--text-secondary);">${u.xp}</td><td style="padding:10px 16px;color:var(--text-secondary);">${u.messages}</td></tr>`).join('')}</tbody>
      </table>
    </div>` : ''}
  `;
}

async function saveLevelConfig() {
  if (!selectedGuild) return;
  const xpPerMessage = parseInt(document.getElementById('level-xp')?.value || '15');
  const xpCooldown = parseInt(document.getElementById('level-cooldown')?.value || '60');
  const levelUpMessage = document.getElementById('level-message')?.value || 'Tebrikler {user}, **Level {level}** oldun!';
  await fetch(`/api/guilds/${selectedGuild.id}/level/config`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ xpPerMessage, xpCooldown, levelUpMessage }) });
  levelConfig = await apiFetch(`/api/guilds/${selectedGuild.id}/level/config`).then(r => r?.success ? r.data : null);
  render();
}

function renderVoice() {
  if (!selectedGuild) return renderNoGuild();
  const cfg = voiceConfig || {};
  const channels = voiceChannels || [];
  return `
    <div class="section-header"><div><div class="section-title">Ses Kanalı Yönetimi</div><div class="section-subtitle">Geçici ses kanalı oluşturma ve yönetim</div></div></div>
    <div class="stat-cards">
      <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Tetikleme Kanalı</span><div class="stat-card-icon accent"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg></div></div><div class="stat-card-value">${cfg.triggerChannelId ? '<#' + cfg.triggerChannelId + '>' : 'Tanımlı değil'}</div><div class="stat-card-change">Katılınca oda oluşturur</div></div>
      <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Kategori</span><div class="stat-card-icon info"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div></div><div class="stat-card-value">${cfg.categoryChannelId ? '<#' + cfg.categoryChannelId + '>' : 'Varsayılan'}</div><div class="stat-card-change">Oda oluşturulacak kategori</div></div>
      <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Maks Kullanıcı</span><div class="stat-card-icon warning"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div></div><div class="stat-card-value">${cfg.maxUsers || 10}</div><div class="stat-card-change">Oda maksimum kapasitesi</div></div>
      <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Aktif Odalar</span><div class="stat-card-icon success"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/></svg></div></div><div class="stat-card-value">${channels.length}</div><div class="stat-card-change">Şu anki geçici odalar</div></div>
    </div>
    <div class="section-header" style="margin-top:var(--spacing-xl);"><div class="section-title">Ses Kanalı Ayarları</div></div>
    <div style="background:var(--surface);border:1px solid var(--surface-border);border-radius:var(--radius-lg);padding:var(--spacing-xl);">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--spacing-lg);">
        <div><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:6px;">Tetikleme Kanalı ID</label><input type="text" id="voice-trigger" value="${cfg.triggerChannelId || ''}" placeholder="Kanal ID" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);"></div>
        <div><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:6px;">Kategori ID</label><input type="text" id="voice-category" value="${cfg.categoryChannelId || ''}" placeholder="Kategori ID" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);"></div>
        <div><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:6px;">Oda Öneki</label><input type="text" id="voice-prefix" value="${cfg.channelPrefix || 'ODA'}" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);"></div>
        <div><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:6px;">Maks Kullanıcı</label><input type="number" id="voice-max" value="${cfg.maxUsers || 10}" min="1" max="99" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);"></div>
      </div>
      <div style="margin-top:var(--spacing-lg);display:flex;gap:var(--spacing-md);">
        <button class="embed-btn embed-btn-primary" onclick="saveVoiceConfig()" style="width:auto;">Kaydet</button>
      </div>
    </div>
    ${channels.length > 0 ? `
    <div class="section-header" style="margin-top:var(--spacing-xl);"><div class="section-title">Aktif Geçici Odalar</div></div>
    <div style="background:var(--surface);border:1px solid var(--surface-border);border-radius:var(--radius-lg);overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;font-size:var(--text-sm);">
        <thead><tr style="border-bottom:1px solid var(--surface-border);"><th style="padding:12px 16px;text-align:left;color:var(--text-muted);font-weight:500;">Kanal</th><th style="padding:12px 16px;text-align:left;color:var(--text-muted);font-weight:500;">Sahip</th><th style="padding:12px 16px;text-align:left;color:var(--text-muted);font-weight:500;">Oluşturulma</th></tr></thead>
        <tbody>${channels.map(c => `<tr style="border-bottom:1px solid var(--surface-border);"><td style="padding:10px 16px;color:var(--text-primary);">${c.channelName}</td><td style="padding:10px 16px;color:var(--text-secondary);">${c.ownerId}</td><td style="padding:10px 16px;color:var(--text-secondary);">${new Date(c.createdAt).toLocaleString('tr-TR')}</td></tr>`).join('')}</tbody>
      </table>
    </div>` : ''}
  `;
}

async function saveVoiceConfig() {
  if (!selectedGuild) return;
  const triggerChannelId = document.getElementById('voice-trigger')?.value || '';
  const categoryChannelId = document.getElementById('voice-category')?.value || '';
  const channelPrefix = document.getElementById('voice-prefix')?.value || 'ODA';
  const maxUsers = parseInt(document.getElementById('voice-max')?.value || '10');
  await fetch(`/api/guilds/${selectedGuild.id}/voice/config`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ triggerChannelId, categoryChannelId, channelPrefix, maxUsers }) });
  voiceConfig = await apiFetch(`/api/guilds/${selectedGuild.id}/voice/config`).then(r => r?.success ? r.data : null);
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
