// Lógica Principal del Dashboard — Ecosistema Recaudo Bogotá (v3.0)

let dashboardData = {};
let coursesChartInstance = null;

// Configuración visual de Chart.js para tema Luxury Navy/Glass
Chart.defaults.color = '#e2e8f0';
Chart.defaults.font.family = "'Inter', 'sans-serif'";

const API_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwQnr3LdqtwTj8Xb6LtDx8_5dUAldKnD74nVEJW8f9m-BOpoVqYxrSb7Rs8IPNNFkG_/exec';
const SHEET_ID = '187oZ6iNeEj1I1sS-eC6eN0lBegTItw2L45DAkIDpXWk';
const HISTORICO_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Histórico')}`;
const CONTENIDO_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Contenido de Capacitación')}`;
const RB_LOGO_URL = 'https://wilvar88.github.io/Imagenes/FONDO TRANSPARENTE + LETRAS VERDES.png';

// ================================================================
// UTILIDADES GENERALES
// ================================================================
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeText(str) {
    return String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function parseCSV(text) {
    const rows = [];
    let row = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];
        if (inQuotes) {
            if (ch === '"' && next === '"') {
                current += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                row.push(current);
                current = '';
            } else if (ch === '\r' && next === '\n') {
                row.push(current);
                rows.push(row);
                row = [];
                current = '';
                i++;
            } else if (ch === '\n' || ch === '\r') {
                row.push(current);
                rows.push(row);
                row = [];
                current = '';
            } else {
                current += ch;
            }
        }
    }
    if (current.length > 0 || row.length > 0) {
        row.push(current);
        rows.push(row);
    }
    return rows;
}

// ================================================================
// SISTEMA DE AUTENTICACIÓN Y ROLES
// ================================================================

const BASE_USERS = [
    { password: 'RB1069432843191425', name: 'Wilson Varela Muñoz',       role: 'Super Administrador' },
    { password: 'RB52782882',         name: 'Marleny Avila',             role: 'Administrador' },
    { password: 'RB52850911',         name: 'Ramirez Mora Dora Yeny',    role: 'Administrador' },
    { password: 'RB1007339915',       name: 'Laguna Leiva Valentina',    role: 'Administrador' },
    { password: 'RB1026580615',       name: 'Campo Camacho Yenny Lizeth',role: 'Administrador' },
];

let apiExtraUsers = [];
let currentUser = null;
let auditLogs = [];
let staticSeedLogs = [];
let sessionUnsyncedLogs = [];
let ghAuditDebounceTimer = null;
let downloadHeaderHooked = false;

function isAuditLogCarrier(u) {
    if (!u || typeof u !== 'object') return false;
    return u.role === '__AUDIT_LOG__' ||
        u.name === '__AUDIT_LOG__' ||
        String(u.password || '').startsWith('__AUDIT_LOG__');
}

function getAllUsers() {
    return [...BASE_USERS, ...(apiExtraUsers || []).filter(u => !isAuditLogCarrier(u))];
}

function findUserByPassword(pw) {
    return getAllUsers().find(u => u.password === pw) || null;
}

function isAuthorized() {
    return currentUser !== null;
}

function isSuperAdmin() {
    return currentUser !== null && currentUser.role === 'Super Administrador';
}

function applyRoleUI() {
    const badge = document.getElementById('role-badge');
    const btnDownload = document.getElementById('btn-download');
    const btnHistorico = document.getElementById('btn-historico');
    const btnGhPanel = document.getElementById('btn-gh-panel');
    const btnSuperAdminContent = document.getElementById('btn-superadmin-content');
    const btnSuperAdminAudit = document.getElementById('btn-superadmin-audit');
    const tabBtnAuditoria = document.getElementById('tab-btn-auditoria');
    const ratingsCard = document.querySelector('[onclick="openRatingsModal()"]');
    const saPanel = document.getElementById('superadmin-content-panel');
    const nonSaNotice = document.getElementById('non-superadmin-content-notice');
    const saTabBadge = document.getElementById('badge-superadmin-tab');

    if (btnDownload && !downloadHeaderHooked) {
        btnDownload.addEventListener('click', () => {
            recordAuditEvent('DESCARGA', 'Descarga Excel General (XLSX)', 'Botón Descargar Resultados de la barra superior');
        });
        downloadHeaderHooked = true;
    }

    if (!currentUser) {
        badge.textContent = '\uD83D\uDD13 Invitado (Clic para ingresar)';
        badge.style.background = 'rgba(255,255,255,0.08)';
        badge.style.borderColor = 'rgba(255,255,255,0.22)';
        badge.style.color = '#e2e8f0';
        if (btnDownload) btnDownload.classList.add('hidden');
        if (btnHistorico) btnHistorico.classList.add('hidden');
        if (btnGhPanel) btnGhPanel.classList.add('hidden');
        if (btnSuperAdminContent) btnSuperAdminContent.classList.add('hidden');
        if (btnSuperAdminAudit) btnSuperAdminAudit.classList.add('hidden');
        if (tabBtnAuditoria) tabBtnAuditoria.classList.add('hidden');
        if (saPanel) saPanel.classList.add('hidden');
        if (nonSaNotice) nonSaNotice.classList.remove('hidden');
        if (saTabBadge) saTabBadge.classList.add('hidden');
        if (ratingsCard) {
            ratingsCard.style.cursor = 'default';
            ratingsCard.classList.remove('hover:border-[#CDD400]', 'group');
        }
    } else {
        const isSA = isSuperAdmin();
        const roleColor = isSA
            ? { bg: 'rgba(205,212,0,0.20)', border: 'rgba(205,212,0,0.7)', color: '#CDD400' }
            : { bg: 'rgba(255,255,255,0.14)', border: 'rgba(255,255,255,0.45)', color: '#ffffff' };

        const shortName = currentUser.name.split(' ').slice(0, 2).join(' ');
        badge.textContent = `\uD83D\uDD11 ${shortName} • ${currentUser.role}`;
        badge.style.background = roleColor.bg;
        badge.style.borderColor = roleColor.border;
        badge.style.color = roleColor.color;

        if (ratingsCard) {
            ratingsCard.style.cursor = 'pointer';
            ratingsCard.classList.add('hover:border-[#CDD400]', 'group');
        }
        if (btnDownload && dashboardData.kpis && dashboardData.kpis.download_url) {
            btnDownload.href = dashboardData.kpis.download_url;
            btnDownload.classList.remove('hidden');
        }
        if (btnHistorico) btnHistorico.classList.remove('hidden');
        if (btnGhPanel) btnGhPanel.classList.remove('hidden');

        if (isSA) {
            if (btnSuperAdminContent) btnSuperAdminContent.classList.remove('hidden');
            if (btnSuperAdminAudit) btnSuperAdminAudit.classList.remove('hidden');
            if (tabBtnAuditoria) tabBtnAuditoria.classList.remove('hidden');
            if (saPanel) saPanel.classList.remove('hidden');
            if (nonSaNotice) nonSaNotice.classList.add('hidden');
            if (saTabBadge) saTabBadge.classList.remove('hidden');
        } else {
            if (btnSuperAdminContent) btnSuperAdminContent.classList.add('hidden');
            if (btnSuperAdminAudit) btnSuperAdminAudit.classList.add('hidden');
            if (tabBtnAuditoria) tabBtnAuditoria.classList.add('hidden');
            if (saPanel) saPanel.classList.add('hidden');
            if (nonSaNotice) nonSaNotice.classList.remove('hidden');
            if (saTabBadge) saTabBadge.classList.add('hidden');
        }
    }
}

function handleRoleBadgeClick() {
    if (!currentUser) {
        openLoginModal();
    } else if (isSuperAdmin()) {
        const choice = confirm(`Sesión activa: ${currentUser.name} (${currentUser.role})\n\n[Aceptar] → Abrir Gestión de Usuarios\n[Cancelar] → Cerrar Sesión`);
        if (choice) {
            openAddUserModal();
        } else {
            if (confirm('\u00bfSeguro que quieres cerrar sesión?')) logout();
        }
    } else {
        if (confirm(`\u00bfDeseas cerrar la sesión de ${currentUser.name}?`)) logout();
    }
}

function openLoginModal() {
    document.getElementById('login-password-input').value = '';
    document.getElementById('login-error').classList.add('hidden');
    const m = document.getElementById('login-modal');
    m.classList.remove('hidden');
    m.classList.add('flex');
    setTimeout(() => document.getElementById('login-password-input').focus(), 100);
}

function closeLoginModal() {
    const m = document.getElementById('login-modal');
    m.classList.add('hidden');
    m.classList.remove('flex');
}

function attemptLogin() {
    const pw = document.getElementById('login-password-input').value.trim();
    const user = findUserByPassword(pw);
    if (user) {
        currentUser = user;
        sessionStorage.setItem('rb_session', JSON.stringify(user));
        closeLoginModal();
        applyRoleUI();
        // Registrar huella de conexión automáticamente en la nube (.json)
        recordAuditEvent('CONEXIÓN', 'Inicio de sesión en la plataforma', `Acceso autorizado con rol ${user.role}`);
        // Pre-cargar datos detallados de Histórico para Gestión Humana
        ensureHistoricoDetailedData();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
        document.getElementById('login-password-input').value = '';
        document.getElementById('login-password-input').focus();
    }
}

function logout() {
    if (currentUser) {
        recordAuditEvent('CONEXIÓN', 'Cierre de sesión', `Usuario ${currentUser.name} cerró sesión`);
    }
    currentUser = null;
    sessionStorage.removeItem('rb_session');
    closeHistoricoModal();
    applyRoleUI();
}

// ---- Add User Modal ----
function openAddUserModal() {
    renderUsersList();
    document.getElementById('new-user-name').value = '';
    document.getElementById('new-user-password').value = '';
    document.getElementById('new-user-role').value = 'Administrador';
    document.getElementById('add-user-error').classList.add('hidden');
    const m = document.getElementById('add-user-modal');
    m.classList.remove('hidden');
    m.classList.add('flex');
}

function closeAddUserModal() {
    const m = document.getElementById('add-user-modal');
    m.classList.add('hidden');
    m.classList.remove('flex');
}

function renderUsersList() {
    const container = document.getElementById('users-list');
    const users = getAllUsers();
    container.innerHTML = users.map((u, i) => {
        const isExtra = i >= BASE_USERS.length;
        const roleColor = u.role === 'Super Administrador' ? '#CDD400' : '#ffffff';
        return `
            <div class="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm">
                <div>
                    <p class="font-semibold text-white">${escapeHtml(u.name)}</p>
                    <p style="color:${roleColor}" class="text-xs font-medium">${escapeHtml(u.role)}</p>
                </div>
                ${isExtra
                    ? `<button onclick="removeExtraUser('${u.password.replace(/'/g, "\\'")}')"
                         class="text-red-400 hover:text-red-300 transition-colors text-lg leading-none" title="Eliminar">&times;</button>`
                    : '<span class="text-white/50 text-xs">Base</span>'}
            </div>
        `;
    }).join('');
}

async function removeExtraUser(password) {
    if (!confirm('\u00bfEliminar este usuario?')) return;
    try {
        const res = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify({ action: 'remove_user', password: password })
        });
        const data = await res.json();
        if (data.ok) {
            apiExtraUsers = (data.users || []).filter(u => !isAuditLogCarrier(u));
            renderUsersList();
            recordAuditEvent('ADMIN', 'Eliminación de usuario', `Documento eliminado: ${password}`);
        } else {
            alert('Error al eliminar: ' + (data.error || 'desconocido'));
        }
    } catch (e) {
        alert('Error de red al eliminar usuario.');
    }
}

async function addNewUser() {
    const name = document.getElementById('new-user-name').value.trim();
    const password = document.getElementById('new-user-password').value.trim();
    const role = document.getElementById('new-user-role').value;
    const errEl = document.getElementById('add-user-error');

    if (!name || !password) {
        errEl.textContent = 'Por favor completa todos los campos.';
        errEl.classList.remove('hidden');
        return;
    }
    if (getAllUsers().find(u => u.password === password)) {
        errEl.textContent = 'Esa contraseña ya está en uso. Elige una diferente.';
        errEl.classList.remove('hidden');
        return;
    }
    errEl.classList.add('hidden');

    try {
        const res = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify({ action: 'add_user', user: { name, password, role } })
        });
        const data = await res.json();
        if (data.ok) {
            apiExtraUsers = (data.users || []).filter(u => !isAuditLogCarrier(u));
            document.getElementById('new-user-name').value = '';
            document.getElementById('new-user-password').value = '';
            renderUsersList();
            recordAuditEvent('ADMIN', 'Creación de usuario', `${name} (${role})`);
        } else {
            errEl.textContent = data.error || 'No se pudo guardar el usuario.';
            errEl.classList.remove('hidden');
        }
    } catch (e) {
        errEl.textContent = 'Error de red al guardar. Intenta de nuevo.';
        errEl.classList.remove('hidden');
    }
}

// ================================================================
// CATÁLOGO JERÁRQUICO DE CONTENIDO DE CAPACITACIONES
// ================================================================

const EXTRA_CONTENT_STORAGE_KEY = 'rb_extra_training_content_v1';

const BASE_TRAINING_CONTENT = [
    // *Enero - febrero 2026 RA / SO RAP
    { id: 'CONT-001', mes: 'Enero - Febrero 2026', programa: 'Capacitación bimensual Enero-Febrero 2026', capacitacion: 'Capacitación bimensual enero - febrero 2026 RA', unidad: 'Unidad 1-Acoso sexual y laboral', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/80hnYQa8' },
    { id: 'CONT-002', mes: 'Enero - Febrero 2026', programa: 'Capacitación bimensual Enero-Febrero 2026', capacitacion: 'Capacitación bimensual enero - febrero 2026 RA', unidad: 'Unidad 2-Seguridad de la información', capitulo: '', formato: 'Scorm', url: 'https://cloud.scorm.com/ScormEngineInterface/defaultui/player/modern.html?configuration=jxafvt-cenxtWsmJHYvgJsRhqS9xMPrSXEV4Lm3To3qFIfQYge_ZHcEOZbKfQx1ZucJksxbgGNCmbTie0pJnB1NvIp5PwAkFD4zhMA8wMGjocunDNG0AVH2JIlZdn49QMUxGJBMqp137xjDPMNGCF8HDzPsg193KbA1fBeg2VodQwscfjXaWV-gQQv9qtbfvJJa3nKAtmNulPYVDWd7dWjtZaKXVnKDIOfPP0e5b&preventRightClick=true&cc=es&cache=22.38.484.6401bc3&playerConfUrl=j&package=A9p8VauflS8FkmAQT_F_K___YcyySzHBwyE9i11_lsnxslQ1DoBlgoPhPTGq7TqF99vOa2dMKwP6FFHtOSfbDA-DeVv09MrljBc_6xacYW6SruCVcm_rppE1U9UwHdzN4nZ4Et_CY9Ts98lMBz7UKlbMeOqUIqg&redirectUrl=https%3A%2F%2Fcloud.scorm.com%2FEngineWebServices%2FCloser.html&tracking=false&forceReview=false' },
    { id: 'CONT-003', mes: 'Enero - Febrero 2026', programa: 'Capacitación bimensual Enero-Febrero 2026', capacitacion: 'Capacitación bimensual enero - febrero 2026 RA', unidad: 'Unidad 3-Temas de impacto', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/GXaPsBZQ' },
    { id: 'CONT-004', mes: 'Enero - Febrero 2026', programa: 'Capacitación bimensual Enero-Febrero 2026', capacitacion: 'Capacitación bimensual enero - febrero 2026 RA', unidad: 'Unidad 4-Cambios', capitulo: '', formato: '.pdf', url: 'https://s3.boostworld.com/lms/0096/28/334c0236ab3e3b1a69431479bb8f2cb45f72e07e.pdf' },
    { id: 'CONT-005', mes: 'Enero - Febrero 2026', programa: 'Capacitación bimensual Enero-Febrero 2026', capacitacion: 'Capacitación bimensual enero - febrero 2026 RA', unidad: 'Unidad 5-Protocolo de seguridad', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/tYCvbkqw' },

    { id: 'CONT-006', mes: 'Enero - Febrero 2026', programa: 'Capacitación bimensual Enero-Febrero 2026', capacitacion: 'Capacitación bimensual enero - febrero 2026 SO RAP', unidad: 'Unidad 1-Acoso sexual y laboral', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/80hnYQa8' },
    { id: 'CONT-007', mes: 'Enero - Febrero 2026', programa: 'Capacitación bimensual Enero-Febrero 2026', capacitacion: 'Capacitación bimensual enero - febrero 2026 SO RAP', unidad: 'Unidad 2-Seguridad de la información', capitulo: '', formato: 'Scorm', url: 'https://cloud.scorm.com/ScormEngineInterface/defaultui/player/modern.html?configuration=jxafvt-cenxtWsmJHYvgJsRhqS9xMPrSXEV4Lm3To3qFIfQYge_ZHcEOZbKfQx1ZucJksxbgGNCmbTie0pJnB1NvIp5PwAkFD4zhMA8wMGjocunDNG0AVH2JIlZdn49QMUxGJBMqp137xjDPMNGCF8HDzPsg193KbA1fBeg2VodQwscfjXaWV-gQQv9qtbfvJJa3nKAtmNulPYVDWd7dWjtZaKXVnKDIOfPP0e5b&preventRightClick=true&cc=es&cache=22.38.484.6401bc3&playerConfUrl=j&package=A9p8VauflS8FkmAQT_F_K___YcyySzHBwyE9i11_lsnxslQ1DoBlgoPhPTGq7TqF99vOa2dMKwP6FFHtOSfbDA-DeVv09MrljBc_6xacYW6SruCVcm_rppE1U9UwHdzN4nZ4Et_CY9Ts98lMBz7UKlbMeOqUIqg&redirectUrl=https%3A%2F%2Fcloud.scorm.com%2FEngineWebServices%2FCloser.html&tracking=false&forceReview=false' },
    { id: 'CONT-008', mes: 'Enero - Febrero 2026', programa: 'Capacitación bimensual Enero-Febrero 2026', capacitacion: 'Capacitación bimensual enero - febrero 2026 SO RAP', unidad: 'Unidad 3-Temas de impacto', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/GXaPsBZQ' },
    { id: 'CONT-009', mes: 'Enero - Febrero 2026', programa: 'Capacitación bimensual Enero-Febrero 2026', capacitacion: 'Capacitación bimensual enero - febrero 2026 SO RAP', unidad: 'Unidad 4-Cambios', capitulo: '', formato: '.pdf', url: 'https://s3.boostworld.com/lms/0096/28/334c0236ab3e3b1a69431479bb8f2cb45f72e07e.pdf' },
    { id: 'CONT-010', mes: 'Enero - Febrero 2026', programa: 'Capacitación bimensual Enero-Febrero 2026', capacitacion: 'Capacitación bimensual enero - febrero 2026 SO RAP', unidad: 'Unidad 5-Top 3 personalización', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/c467OpLo' },
    { id: 'CONT-011', mes: 'Enero - Febrero 2026', programa: 'Capacitación bimensual Enero-Febrero 2026', capacitacion: 'Capacitación bimensual enero - febrero 2026 SO RAP', unidad: 'Unidad 6-Protocolo de seguridad', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/tYCvbkqw' },

    // *Marzo-Abril
    { id: 'CONT-012', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RA', unidad: 'Unidad 1-CAMBIOS TRANSMIPASS', capitulo: '', formato: '.pdf', url: 'https://s3.boostworld.com/lms/0103/35/2ea6f64b6017cb838388be919db3d8ad1c6ca54b.pdf' },
    { id: 'CONT-013', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RA', unidad: 'Unidad 2-KIT ANTIDISTURBIOS', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/bEBg7Y0B' },
    { id: 'CONT-014', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RA', unidad: 'Unidad 3-PROTOCOLO DE LLAVES', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/DQT11hNT' },
    { id: 'CONT-015', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RA', unidad: 'Unidad 4-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', capitulo: 'Capítulo 1', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/E1ftph3K' },
    { id: 'CONT-016', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RA', unidad: 'Unidad 4-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', capitulo: 'Capítulo 2', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/BmPyGlcX' },
    { id: 'CONT-017', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RA', unidad: 'Unidad 4-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', capitulo: 'Capítulo 3', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/Pp4ocXhE' },
    { id: 'CONT-018', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RA', unidad: 'Unidad 4-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', capitulo: 'Capítulo 4', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/UWRi0iA7' },
    { id: 'CONT-019', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RA', unidad: 'Unidad 4-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', capitulo: 'Capítulo 5', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/80hnYQa8' },
    { id: 'CONT-020', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RA', unidad: 'Unidad 4-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', capitulo: 'Capítulo 6', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/3eRqBSxO' },

    { id: 'CONT-021', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RAP', unidad: 'Unidad 1-KIT ANTIDISTURBIOS', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/bEBg7Y0B' },
    { id: 'CONT-022', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RAP', unidad: 'Unidad 2-ACTUALIZACIÓN DE DATOS DE ADULTO MAYOR', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/PdyubA4z' },
    { id: 'CONT-023', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RAP', unidad: 'Unidad 3-DILIGENCIAMIENTO DEL FORMATO DE ACTUALIZACIÓN DE DATOS', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/Eec0r4mb' },
    { id: 'CONT-024', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RAP', unidad: 'Unidad 4-MANTENIMIENTO DE IMPRESORA', capitulo: 'Capítulo 1', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/H6uCu9Yi' },
    { id: 'CONT-025', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RAP', unidad: 'Unidad 4-MANTENIMIENTO DE IMPRESORA', capitulo: 'Capítulo 2', formato: '.pdf', url: 'https://s3.boostworld.com/lms/0102/37/c948f4f664ba23b4053466e3724b069bfd012ab1.pdf' },
    { id: 'CONT-026', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RAP', unidad: 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', capitulo: 'Capítulo 1', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/E1ftph3K' },
    { id: 'CONT-027', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RAP', unidad: 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', capitulo: 'Capítulo 2', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/BmPyGlcX' },
    { id: 'CONT-028', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RAP', unidad: 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', capitulo: 'Capítulo 3', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/Pp4ocXhE' },
    { id: 'CONT-029', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RAP', unidad: 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', capitulo: 'Capítulo 4', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/UWRi0iA7' },
    { id: 'CONT-030', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RAP', unidad: 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', capitulo: 'Capítulo 5', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/80hnYQa8' },
    { id: 'CONT-031', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - RAP', unidad: 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', capitulo: 'Capítulo 6', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/3eRqBSxO' },

    { id: 'CONT-032', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - SO', unidad: 'Unidad 1-CAMBIOS TRANSMIPASS', capitulo: '', formato: '.pdf', url: 'https://s3.boostworld.com/lms/0103/35/2ea6f64b6017cb838388be919db3d8ad1c6ca54b.pdf' },
    { id: 'CONT-033', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - SO', unidad: 'Unidad 2-KIT ANTIDISTURBIOS', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/bEBg7Y0B' },
    { id: 'CONT-034', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - SO', unidad: 'Unidad 3-PROTOCOLO DE LLAVES', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/DQT11hNT' },
    { id: 'CONT-035', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - SO', unidad: 'Unidad 4-PROTOCOLO DE LLAVES', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/937P32Nt' },
    { id: 'CONT-036', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - SO', unidad: 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', capitulo: 'Capítulo 1', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/E1ftph3K' },
    { id: 'CONT-037', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - SO', unidad: 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', capitulo: 'Capítulo 2', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/BmPyGlcX' },
    { id: 'CONT-038', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - SO', unidad: 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', capitulo: 'Capítulo 3', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/Pp4ocXhE' },
    { id: 'CONT-039', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - SO', unidad: 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', capitulo: 'Capítulo 4', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/UWRi0iA7' },
    { id: 'CONT-040', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - SO', unidad: 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', capitulo: 'Capítulo 5', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/80hnYQa8' },
    { id: 'CONT-041', mes: 'Marzo - Abril 2026', programa: 'Capacitación bimensual Marzo-Abril 2026', capacitacion: 'Capacitación Bimensual Marzo -Abril 2026 - SO', unidad: 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', capitulo: 'Capítulo 6', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/3eRqBSxO' },

    // *Mayo
    { id: 'CONT-042', mes: 'Mayo 2026', programa: 'Capacitación bimensual Mayo 2026', capacitacion: 'Capacitación Bimensual Mayo 2026-RA', unidad: 'Unidad 1-Actualización de Procesos', capitulo: 'Capítulo 1-Políticas y Funciones', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/FOqOnCNP' },
    { id: 'CONT-043', mes: 'Mayo 2026', programa: 'Capacitación bimensual Mayo 2026', capacitacion: 'Capacitación Bimensual Mayo 2026-RA', unidad: 'Unidad 1-Actualización de Procesos', capitulo: 'Capítulo 2-Protocolo de Apertura', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/wASBYLIe' },
    { id: 'CONT-044', mes: 'Mayo 2026', programa: 'Capacitación bimensual Mayo 2026', capacitacion: 'Capacitación Bimensual Mayo 2026-RA', unidad: 'Unidad 1-Actualización de Procesos', capitulo: 'Capítulo 3-Manejo de bases', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/6HCaGByK' },
    { id: 'CONT-045', mes: 'Mayo 2026', programa: 'Capacitación bimensual Mayo 2026', capacitacion: 'Capacitación Bimensual Mayo 2026-RA', unidad: 'Unidad 1-Actualización de Procesos', capitulo: 'Capítulo 4-Encuesta de Caracterización vial', formato: '.pdf', url: 'https://s3.boostworld.com/lms/0115/45/2cc3ff98ba055c1821fa416961517d00b9aafdc2.pdf' },

    { id: 'CONT-046', mes: 'Mayo 2026', programa: 'Capacitación bimensual Mayo 2026', capacitacion: 'Capacitación Bimensual Mayo 2026-RAP', unidad: 'Unidad 1-Diligenciamiento del formato de actualización de datos', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/Eec0r4mb' },
    { id: 'CONT-047', mes: 'Mayo 2026', programa: 'Capacitación bimensual Mayo 2026', capacitacion: 'Capacitación Bimensual Mayo 2026-RAP', unidad: 'Unidad 2-Top 3', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/AdKELORk' },
    { id: 'CONT-048', mes: 'Mayo 2026', programa: 'Capacitación bimensual Mayo 2026', capacitacion: 'Capacitación Bimensual Mayo 2026-RAP', unidad: 'Unidad 3-Encuesta de Caracterización vial', capitulo: '', formato: '.pdf', url: 'https://s3.boostworld.com/lms/0115/45/2cc3ff98ba055c1821fa416961517d00b9aafdc2.pdf' },

    { id: 'CONT-049', mes: 'Mayo 2026', programa: 'Capacitación bimensual Mayo 2026', capacitacion: 'Capacitación Bimensual Mayo 2026-SO', unidad: 'Unidad 1-Políticas y Funciones', capitulo: 'Capítulo 1-Políticas y Funciones RA', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/FOqOnCNP' },
    { id: 'CONT-050', mes: 'Mayo 2026', programa: 'Capacitación bimensual Mayo 2026', capacitacion: 'Capacitación Bimensual Mayo 2026-SO', unidad: 'Unidad 1-Políticas y Funciones', capitulo: 'Capítulo 2-Políticas y Funciones SO', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/rpV4HHWE' },
    { id: 'CONT-051', mes: 'Mayo 2026', programa: 'Capacitación bimensual Mayo 2026', capacitacion: 'Capacitación Bimensual Mayo 2026-SO', unidad: 'Unidad 2-Protocolo de Apertura', capitulo: 'Capítulo 1-Protocolo de Apertura RA', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/wASBYLIe' },
    { id: 'CONT-052', mes: 'Mayo 2026', programa: 'Capacitación bimensual Mayo 2026', capacitacion: 'Capacitación Bimensual Mayo 2026-SO', unidad: 'Unidad 2-Protocolo de Apertura', capitulo: 'Capítulo 2-Protocolo de Apertura SO', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/sUcXn6wy' },
    { id: 'CONT-053', mes: 'Mayo 2026', programa: 'Capacitación bimensual Mayo 2026', capacitacion: 'Capacitación Bimensual Mayo 2026-SO', unidad: 'Unidad 3-Manejo de Bases', capitulo: 'Capítulo 1-Manejo de Bases RA', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/6HCaGByK' },
    { id: 'CONT-054', mes: 'Mayo 2026', programa: 'Capacitación bimensual Mayo 2026', capacitacion: 'Capacitación Bimensual Mayo 2026-SO', unidad: 'Unidad 3-Manejo de Bases', capitulo: 'Capítulo 2-Manejo de Bases SO', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/Ofyd3oin' },
    { id: 'CONT-055', mes: 'Mayo 2026', programa: 'Capacitación bimensual Mayo 2026', capacitacion: 'Capacitación Bimensual Mayo 2026-SO', unidad: 'Unidad 4-TOP 3 PERSONALIZACIÓN', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/AdKELORk' },
    { id: 'CONT-056', mes: 'Mayo 2026', programa: 'Capacitación bimensual Mayo 2026', capacitacion: 'Capacitación Bimensual Mayo 2026-SO', unidad: 'Unidad 5-Encuesta de Caracterización Vial', capitulo: '', formato: '.pdf', url: 'https://s3.boostworld.com/lms/0115/45/2cc3ff98ba055c1821fa416961517d00b9aafdc2.pdf' },

    // *Junio
    { id: 'CONT-057', mes: 'Junio 2026', programa: 'Capacitación bimensual junio-julio 2026', capacitacion: 'Capacitación Bimensual Junio 2026-RA', unidad: 'Unidad 1-Procesos de Venta y Recarga en estaciones', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/Sput2IHC' },
    { id: 'CONT-058', mes: 'Junio 2026', programa: 'Capacitación bimensual junio-julio 2026', capacitacion: 'Capacitación Bimensual Junio 2026-RA', unidad: 'Unidad 2-Administración de Efectivo en estaciones', capitulo: '', formato: '.pdf', url: 'https://s3.boostworld.com/lms/0126/59/7c21cb0c6c2ab1bb5430e2c3384b0373c4444ba0.pdf' },
    { id: 'CONT-059', mes: 'Junio 2026', programa: 'Capacitación bimensual junio-julio 2026', capacitacion: 'Capacitación Bimensual Junio 2026-RA', unidad: 'Unidad 3-Cierre de Operación en Estaciones', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/jYi4jkvx' },
    { id: 'CONT-060', mes: 'Junio 2026', programa: 'Capacitación bimensual junio-julio 2026', capacitacion: 'Capacitación Bimensual Junio 2026-RA', unidad: 'Unidad 4-Cambio de Tirilla', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/pVpuFvuU' },
    { id: 'CONT-061', mes: 'Junio 2026', programa: 'Capacitación bimensual junio-julio 2026', capacitacion: 'Capacitación Bimensual Junio 2026-RA', unidad: 'Unidad 5-ABC Experiencia en vía', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/2gAPgn17' },

    { id: 'CONT-062', mes: 'Junio 2026', programa: 'Capacitación bimensual junio-julio 2026', capacitacion: 'Capacitación Bimensual Junio 2026-RAP', unidad: 'Unidad 1-Procesos de Venta y Recarga en estaciones', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/Sput2IHC' },
    { id: 'CONT-063', mes: 'Junio 2026', programa: 'Capacitación bimensual junio-julio 2026', capacitacion: 'Capacitación Bimensual Junio 2026-RAP', unidad: 'Unidad 2-Administración de Efectivo en estaciones', capitulo: '', formato: '.pdf', url: 'https://s3.boostworld.com/lms/0126/59/7c21cb0c6c2ab1bb5430e2c3384b0373c4444ba0.pdf' },
    { id: 'CONT-064', mes: 'Junio 2026', programa: 'Capacitación bimensual junio-julio 2026', capacitacion: 'Capacitación Bimensual Junio 2026-RAP', unidad: 'Unidad 3-Cierre de Operación en Estaciones', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/jYi4jkvx' },
    { id: 'CONT-065', mes: 'Junio 2026', programa: 'Capacitación bimensual junio-julio 2026', capacitacion: 'Capacitación Bimensual Junio 2026-RAP', unidad: 'Unidad 4-Cambio de Tirilla', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/pVpuFvuU' },
    { id: 'CONT-066', mes: 'Junio 2026', programa: 'Capacitación bimensual junio-julio 2026', capacitacion: 'Capacitación Bimensual Junio 2026-RAP', unidad: 'Unidad 5-ABC Experiencia en vía', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/2gAPgn17' },
    { id: 'CONT-067', mes: 'Junio 2026', programa: 'Capacitación bimensual junio-julio 2026', capacitacion: 'Capacitación Bimensual Junio 2026-RAP', unidad: 'Unidad 6-Atención preferencial en fila', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/0eYHvKGo' },

    { id: 'CONT-068', mes: 'Junio 2026', programa: 'Capacitación bimensual junio-julio 2026', capacitacion: 'Capacitación Bimensual Junio 2026-SO', unidad: 'Unidad 1-Procesos de Venta y Recarga en estaciones', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/Sput2IHC' },
    { id: 'CONT-069', mes: 'Junio 2026', programa: 'Capacitación bimensual junio-julio 2026', capacitacion: 'Capacitación Bimensual Junio 2026-SO', unidad: 'Unidad 2-Administración de Efectivo en estaciones', capitulo: '', formato: '.pdf', url: 'https://s3.boostworld.com/lms/0126/59/7c21cb0c6c2ab1bb5430e2c3384b0373c4444ba0.pdf' },
    { id: 'CONT-070', mes: 'Junio 2026', programa: 'Capacitación bimensual junio-julio 2026', capacitacion: 'Capacitación Bimensual Junio 2026-SO', unidad: 'Unidad 3-Cierre de Operación en Estaciones', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/jYi4jkvx' },
    { id: 'CONT-071', mes: 'Junio 2026', programa: 'Capacitación bimensual junio-julio 2026', capacitacion: 'Capacitación Bimensual Junio 2026-SO', unidad: 'Unidad 4-Cambio de Tirilla', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/pVpuFvuU' },
    { id: 'CONT-072', mes: 'Junio 2026', programa: 'Capacitación bimensual junio-julio 2026', capacitacion: 'Capacitación Bimensual Junio 2026-SO', unidad: 'Unidad 5-ABC Experiencia en vía', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/2gAPgn17' },
    { id: 'CONT-073', mes: 'Junio 2026', programa: 'Capacitación bimensual junio-julio 2026', capacitacion: 'Capacitación Bimensual Junio 2026-SO', unidad: 'Unidad 6-Atención preferencial en fila', capitulo: '', formato: '.mp4', url: 'https://cdn.jwplayer.com/previews/0eYHvKGo' }
];

let sheetContentList = [];
let historicoDetailedRecords = [];
let historicoDetailedLoaded = false;
let historicoDetailedLoading = false;
let ghFilteredCache = [];
let ghRenderLimit = 35;

function getLocalExtraContent() {
    try {
        const raw = localStorage.getItem(EXTRA_CONTENT_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveLocalExtraContent(list) {
    try {
        localStorage.setItem(EXTRA_CONTENT_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
}

function getAllTrainingContent() {
    const base = sheetContentList.length > 0 ? sheetContentList : BASE_TRAINING_CONTENT;
    const extras = getLocalExtraContent();
    const seen = new Set(base.map(i => `${i.id}|${i.url}|${i.capacitacion}|${i.unidad}|${i.capitulo}`));
    const merged = [...base];
    extras.forEach(ex => {
        const key = `${ex.id}|${ex.url}|${ex.capacitacion}|${ex.unidad}|${ex.capitulo}`;
        if (!seen.has(key)) {
            seen.add(key);
            merged.push(ex);
        }
    });
    return merged;
}

/**
 * Relaciona Columna A (Programa) y Columna B (Capacitación) de Histórico con su contenido multimedia.
 */
function getContentForTraining(programa, curso) {
    const all = getAllTrainingContent();
    const normCurso = normalizeText(curso).replace(/^curso\s+/, '').trim();
    const normProg = normalizeText(programa);

    // 1. Coincidencia exacta normalizada por nombre de capacitación
    let matches = all.filter(item => {
        const itemCap = normalizeText(item.capacitacion).replace(/^curso\s+/, '').trim();
        return itemCap === normCurso;
    });
    if (matches.length > 0) return matches;

    // 2. Coincidencia por Programa + Sufijo de Área (RA, SO RAP, RAP, SO)
    const extractRole = (str) => {
        const m = str.match(/\b(so\s+rap|rap|ra|so)\b$/i);
        return m ? m[1].toLowerCase().replace(/\s+/g, ' ') : '';
    };
    const cursoRole = extractRole(normCurso);
    const sameProgram = all.filter(item => {
        const itemProg = normalizeText(item.programa);
        return itemProg === normProg || (normProg && (itemProg.includes(normProg) || normProg.includes(itemProg)));
    });

    if (sameProgram.length > 0 && cursoRole) {
        matches = sameProgram.filter(item => {
            const itemRole = extractRole(normalizeText(item.capacitacion));
            if (itemRole === cursoRole) return true;
            // En Enero-Febrero 2026 el programa SO RAP cubre tanto SO como RAP
            if (itemRole === 'so rap' && (cursoRole === 'so' || cursoRole === 'rap')) return true;
            return false;
        });
        if (matches.length > 0) return matches;
    }

    // 3. Coincidencia parcial de texto
    matches = all.filter(item => {
        const itemCap = normalizeText(item.capacitacion).replace(/^curso\s+/, '').trim();
        return itemCap && normCurso && (itemCap.includes(normCurso) || normCurso.includes(itemCap));
    });
    return matches;
}

/**
 * Evalúa el estado de Columna G y la Nota de Columna H según reglas de Gestión Humana:
 * - Aprobado: Hizo el curso y lo aprobó con la nota mínima.
 * - No Aprobado: Hizo el curso pero no alcanzó la nota para aprobar.
 * - En curso: Inició el curso pero no avanzó o no lo culminó (nota 0 si no presentó).
 * - Inscrito: Estuvo inscrito pero nunca ingresó (nota 0).
 */
function evaluateCourseRecord(rec) {
    const rawEstado = (rec.estado_aprobacion || '').toString().trim();
    const lower = normalizeText(rawEstado);
    const notaRaw = (rec.nota !== undefined && rec.nota !== null) ? String(rec.nota).trim() : '';
    const avanceNum = parseFloat(String(rec.avance || '0').replace('%', '').trim()) || 0;

    if (lower === 'aprobado' || lower === 'aprobados') {
        return {
            estadoLabel: 'Aprobado',
            badgeClass: 'badge-success',
            notaFinal: notaRaw !== '' ? notaRaw : '100',
            observacion: 'Aprobado — Realizó la capacitación y aprobó con la nota mínima requerida.',
            presento: true
        };
    }

    if (lower.includes('no aprob') || lower.includes('reprob')) {
        return {
            estadoLabel: 'No Aprobó',
            badgeClass: 'badge-risk',
            notaFinal: notaRaw !== '' ? notaRaw : '0',
            observacion: notaRaw !== ''
                ? `No Aprobó — Realizó el curso pero obtuvo nota ${notaRaw}, sin alcanzar la nota mínima para aprobar.`
                : 'No Aprobó — Hizo el curso pero no alcanzó la nota mínima para aprobar.',
            presento: true
        };
    }

    if (lower.includes('en curso') || lower.includes('en_curso')) {
        return {
            estadoLabel: 'En Curso',
            badgeClass: 'badge-warning',
            notaFinal: notaRaw !== '' ? notaRaw : '0',
            observacion: `No presentó evaluación — Inició el curso pero no avanzó o no lo culminó (avance registrado: ${avanceNum}%).`,
            presento: false
        };
    }

    // Inscrito / Incripción sin inicio
    return {
        estadoLabel: 'Inscrito',
        badgeClass: 'badge-risk',
        notaFinal: '0',
        observacion: 'No presentó — Estuvo inscrito en el curso pero nunca ingresó para hacer el curso o avanzar.',
        presento: false
    };
}

// ================================================================
// CARGA DE DATOS (APPS SCRIPT + GOOGLE SHEETS HISTÓRICO DIRECTO)
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    const savedSession = sessionStorage.getItem('rb_session');
    if (savedSession) {
        try { currentUser = JSON.parse(savedSession); } catch (e) { currentUser = null; }
    }
    applyRoleUI();
    fetchDashboardData();

    if (isAuthorized()) {
        ensureHistoricoDetailedData();
    }

    // Cerrar modales al hacer clic fuera
    ['login-modal', 'add-user-modal', 'participants-modal', 'ratings-modal', 'historico-modal', 'media-preview-modal', 'acta-modal', 'recurrencia-info-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('click', function (e) {
            if (e.target !== this) return;
            if (id === 'login-modal') closeLoginModal();
            else if (id === 'add-user-modal') closeAddUserModal();
            else if (id === 'participants-modal') closeModal();
            else if (id === 'ratings-modal') closeRatingsModal();
            else if (id === 'historico-modal') closeHistoricoModal();
            else if (id === 'media-preview-modal') closeMediaPreviewModal();
            else if (id === 'acta-modal') closeActaModal();
            else if (id === 'recurrencia-info-modal') closeRecurrenciaInfoModal();
        });
    });

    loadStaticAuditSeedJson();
});

async function fetchDashboardData() {
    try {
        const response = await fetch(API_ENDPOINT);
        if (!response.ok) throw new Error('Error al conectar con la API');

        dashboardData = await response.json();

        if (Array.isArray(dashboardData.contenido_capacitacion) && dashboardData.contenido_capacitacion.length > 0) {
            sheetContentList = dashboardData.contenido_capacitacion;
        }

        updateKPIs(dashboardData.kpis);
        renderChart(dashboardData.courses);
        renderTable(dashboardData.courses);
        renderAreasTable(dashboardData.areas);

        animateValue('kpi-avg-rating', 0, dashboardData.kpis.average_rating || 0, 2000, '', true);
        animateValue('kpi-rating-count', 0, dashboardData.kpis.ratings_count || 0, 2000, '', false);
        animateValue('kpi-rating-participation', 0, dashboardData.kpis.rating_participation || 0, 2000, '%', true);

        const gs = dashboardData.gender_stats;
        if (gs) {
            animateValue('kpi-f-avg', 0, gs.femenino.avg || 0, 2000, '', true);
            animateValue('kpi-f-count', 0, gs.femenino.count || 0, 2000, '', false);
            animateValue('kpi-f-pct', 0, gs.femenino.pct || 0, 2000, '%', true);
            animateValue('kpi-f-enrolled', 0, gs.femenino.enrolled || 0, 2000, '', false);
            animateValue('kpi-f-part', 0, gs.femenino.participation_rate || 0, 2000, '%', true);
            animateValue('kpi-m-avg', 0, gs.masculino.avg || 0, 2000, '', true);
            animateValue('kpi-m-count', 0, gs.masculino.count || 0, 2000, '', false);
            animateValue('kpi-m-pct', 0, gs.masculino.pct || 0, 2000, '%', true);
            animateValue('kpi-m-enrolled', 0, gs.masculino.enrolled || 0, 2000, '', false);
            animateValue('kpi-m-part', 0, gs.masculino.participation_rate || 0, 2000, '%', true);
        }

        document.getElementById('last-update').innerText = dashboardData.kpis.last_updated || 'Desconocido';

        if (dashboardData.extra_users && Array.isArray(dashboardData.extra_users)) {
            syncAuditStateFromPayload(dashboardData);
        } else if (Array.isArray(dashboardData.usabilidad_logs)) {
            syncAuditStateFromPayload(dashboardData);
        }

        const btnDownload = document.getElementById('btn-download');
        if (btnDownload && dashboardData.kpis.download_url) {
            btnDownload.href = dashboardData.kpis.download_url;
            if (isAuthorized()) btnDownload.classList.remove('hidden');
        }

        applyRoleUI();

        const indicator = document.getElementById('online-indicator');
        if (indicator) indicator.classList.remove('hidden');

        const errorToast = document.getElementById('error-toast');
        if (errorToast) errorToast.classList.add('hidden');
    } catch (error) {
        console.error('No se pudieron cargar los datos', error);
        const indicator = document.getElementById('online-indicator');
        if (indicator) indicator.classList.add('hidden');

        const errorToast = document.getElementById('error-toast');
        if (errorToast) {
            errorToast.classList.remove('hidden');
            document.getElementById('error-text').innerText = `Error: ${error.message}`;
        }
    }
}

/**
 * Carga las 7.067+ filas detalladas de la hoja "Histórico" (Columnas A..Q)
 * y la hoja "Contenido de Capacitación" si existe en Google Sheets.
 */
async function ensureHistoricoDetailedData() {
    if (historicoDetailedLoaded || historicoDetailedLoading) return;
    historicoDetailedLoading = true;
    const statusEl = document.getElementById('gh-sync-status');
    if (statusEl) statusEl.textContent = '⏳ Cargando registros de Histórico...';

    // 1. Si el Apps Script ya trajo historial_cursos dentro de colaboradores_trazabilidad, aprovecharlo primero
    if (dashboardData.colaboradores_trazabilidad && dashboardData.colaboradores_trazabilidad.some(c => Array.isArray(c.historial_cursos) && c.historial_cursos.length > 0)) {
        const list = [];
        dashboardData.colaboradores_trazabilidad.forEach(c => {
            (c.historial_cursos || []).forEach(hc => {
                list.push({
                    programa: hc.programa || '',
                    curso: hc.curso || hc.programa || '',
                    cedula: c.cedula || '',
                    nombre: c.nombre || '',
                    email: c.email || '',
                    avance: hc.avance || '0',
                    estado_aprobacion: hc.estado_aprobacion || 'Inscrito',
                    nota: hc.nota || '',
                    estado_colab: hc.estado_colab || c.estado_colab || '',
                    instancia: hc.instancia || '',
                    fecha_primer_ingreso: hc.fecha_primer_ingreso || '',
                    fecha_completado: hc.fecha_completado || '',
                    valoracion: hc.valoracion || '',
                    comentario: hc.comentario || '',
                    centro_costos: hc.centro_costos || c.centro_costos || '',
                    area: hc.area || c.area || '',
                    genero: c.genero || ''
                });
            });
        });
        if (list.length > 0) {
            historicoDetailedRecords = list;
            historicoDetailedLoaded = true;
            historicoDetailedLoading = false;
            if (statusEl) statusEl.textContent = `✅ ${list.length.toLocaleString('es-CO')} registros sincronizados`;
            populateGHFilters();
            filterGHRecords();
            return;
        }
    }

    // 2. Consultar directamente la hoja "Histórico" vía CSV público de Google Sheets
    try {
        const res = await fetch(HISTORICO_CSV_URL);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const csvText = await res.text();
        const rows = parseCSV(csvText);
        if (rows.length > 1) {
            const headers = rows[0].map(h => (h || '').toString().trim().toLowerCase());
            const idx = (names, fallback) => {
                for (const n of names) {
                    const found = headers.findIndex(h => h === n);
                    if (found !== -1) return found;
                }
                for (const n of names) {
                    const found = headers.findIndex(h => h.includes(n));
                    if (found !== -1) return found;
                }
                return fallback;
            };

            const iProg = idx(['nombre capacitación', 'nombre capacitacion'], 0);
            const iCurso = idx(['curso'], 1);
            const iId = idx(['identificador', 'cédula', 'cedula', 'documento'], 2);
            const iNom = idx(['nombre'], 3);
            const iEmail = idx(['email', 'correo'], 4);
            const iAvance = idx(['porcentaje de avance', 'avance'], 5);
            const iEstApr = idx(['estado de aprobación', 'estado de aprobacion'], 6);
            const iNota = idx(['nota'], 7);
            const iEstado = idx(['estado'], 8);
            const iInstancia = idx(['nombre de la instancia', 'instancia'], 9);
            const iFecIng = idx(['fecha primer ingreso'], 10);
            const iFecComp = idx(['fecha completado'], 11);
            const iVal = idx(['valoración', 'valoracion'], 12);
            const iCom = idx(['comentario'], 13);
            const iCC = idx(['centro de costos', 'centro de costo'], 14);
            const iArea = idx(['área', 'area'], 15);
            const iGen = idx(['genero', 'género'], 16);

            const parsed = [];
            for (let r = 1; r < rows.length; r++) {
                const row = rows[r];
                const prog = (row[iProg] || '').trim();
                const nom = (row[iNom] || '').trim();
                const ced = (row[iId] || '').trim().replace(/\.0$/, '');
                if (!prog && !nom && !ced) continue;
                parsed.push({
                    programa: prog,
                    curso: (row[iCurso] || prog).trim(),
                    cedula: ced,
                    nombre: nom,
                    email: (row[iEmail] || '').trim(),
                    avance: (row[iAvance] || '0').trim(),
                    estado_aprobacion: (row[iEstApr] || 'Inscrito').trim(),
                    nota: (row[iNota] || '').trim(),
                    estado_colab: (row[iEstado] || '').trim(),
                    instancia: (row[iInstancia] || '').trim(),
                    fecha_primer_ingreso: (row[iFecIng] || '').trim(),
                    fecha_completado: (row[iFecComp] || '').trim(),
                    valoracion: (row[iVal] || '').trim(),
                    comentario: (row[iCom] || '').trim(),
                    centro_costos: (row[iCC] || '').trim(),
                    area: (row[iArea] || '').trim(),
                    genero: (row[iGen] || '').trim()
                });
            }
            historicoDetailedRecords = parsed;
            historicoDetailedLoaded = true;
            if (statusEl) statusEl.textContent = `✅ ${parsed.length.toLocaleString('es-CO')} registros en vivo (Histórico)`;
            populateGHFilters();
            filterGHRecords();
        }
    } catch (err) {
        console.warn('No se pudo cargar CSV directo de Histórico:', err);
        if (statusEl) statusEl.textContent = '⚠️ Sin conexión directa a Histórico';
    }

    // 3. Intentar leer también la hoja "Contenido de Capacitación" si existe en Google Sheets
    try {
        if (sheetContentList.length === 0) {
            const cRes = await fetch(CONTENIDO_CSV_URL);
            if (cRes.ok) {
                const cText = await cRes.text();
                const cRows = parseCSV(cText);
                if (cRows.length > 1 && (cRows[0][1] || '').toLowerCase().includes('mes')) {
                    const loaded = [];
                    for (let r = 1; r < cRows.length; r++) {
                        const row = cRows[r];
                        if (!row[3] && !row[7]) continue;
                        loaded.push({
                            id: (row[0] || `CONT-${r}`).trim(),
                            mes: (row[1] || '').trim(),
                            programa: (row[2] || '').trim(),
                            capacitacion: (row[3] || '').trim(),
                            unidad: (row[4] || '').trim(),
                            capitulo: (row[5] || '').trim(),
                            formato: (row[6] || 'Link').trim(),
                            url: (row[7] || '').trim(),
                            fecha_registro: (row[8] || '').trim(),
                            autor: (row[9] || '').trim()
                        });
                    }
                    if (loaded.length > 0) {
                        sheetContentList = loaded;
                        populateCatalogoFilters();
                        renderCatalogoContenidos();
                    }
                }
            }
        }
    } catch (e) {}

    historicoDetailedLoading = false;
}

// ================================================================
// KPIs, GRÁFICA Y TABLAS PRINCIPALES
// ================================================================

function animateValue(elementOrId, start, end, duration, formatStr = '', isFloat = false) {
    const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!el) return;
    if (isNaN(end) || end === null || end === undefined) end = 0;

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 4);
        const current = start + easeOut * (end - start);

        el.innerText = isFloat ? current.toFixed(1) + formatStr : Math.floor(current) + formatStr;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            el.innerText = (isFloat ? Number(end).toFixed(1) : end) + formatStr;
        }
    };
    window.requestAnimationFrame(step);
}

function updateKPIs(kpis) {
    animateValue('kpi-participation', 0, kpis.participation_rate, 2000, '%', true);
    animateValue('kpi-approval', 0, kpis.approval_rate, 2000, '%', true);
    animateValue('kpi-courses', 0, kpis.total_courses, 2000, '', false);
    animateValue('kpi-attendees', 0, kpis.total_attendees, 2000, '', false);

    if (kpis.global_started !== undefined) animateValue('kpi-part-count', 0, kpis.global_started, 2000, '', false);
    if (kpis.global_approved !== undefined) animateValue('kpi-appr-count', 0, kpis.global_approved, 2000, '', false);
}

function renderChart(courses) {
    const ctx = document.getElementById('coursesChart').getContext('2d');
    const labels = courses.map(c => c.name);
    const participationData = courses.map(c => c.participation);
    const approvalData = courses.map(c => c.approval);

    if (coursesChartInstance) coursesChartInstance.destroy();

    const gradientPart = ctx.createLinearGradient(0, 0, 0, 400);
    gradientPart.addColorStop(0, '#ffffff');
    gradientPart.addColorStop(1, 'rgba(255, 255, 255, 0.18)');

    const gradientAppr = ctx.createLinearGradient(0, 0, 0, 400);
    gradientAppr.addColorStop(0, '#CDD400');
    gradientAppr.addColorStop(1, 'rgba(205, 212, 0, 0.22)');

    coursesChartInstance = new Chart(ctx, {
        type: 'bar',
        plugins: [ChartDataLabels],
        data: {
            labels: labels,
            datasets: [
                {
                    label: '% Participación',
                    data: courses.map(() => 0),
                    backgroundColor: gradientPart,
                    borderColor: '#ffffff',
                    borderWidth: { top: 1, right: 0, bottom: 0, left: 0 },
                    borderRadius: 6
                },
                {
                    label: '% Aprobación',
                    data: courses.map(() => 0),
                    backgroundColor: gradientAppr,
                    borderColor: '#CDD400',
                    borderWidth: { top: 1, right: 0, bottom: 0, left: 0 },
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            layout: { padding: { top: 30 } },
            plugins: {
                legend: { position: 'top', labels: { color: '#ffffff', font: { weight: 'bold' } } },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 30, 71, 0.92)',
                    titleColor: '#CDD400',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(205, 212, 0, 0.45)',
                    borderWidth: 1
                },
                datalabels: {
                    color: '#CDD400',
                    anchor: 'end',
                    align: 'top',
                    offset: 4,
                    font: { size: 18, weight: 'bold', family: "'Inter', sans-serif" },
                    formatter: value => value.toFixed(1)
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 112,
                    grid: { color: 'rgba(255,255,255,0.07)', drawBorder: false },
                    ticks: { color: '#cbd5e1', callback: value => (value <= 100 ? value + '%' : '') }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#ffffff' }
                }
            }
        }
    });

    let startTime = null;
    const duration = 2000;
    const animateChart = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 4);

        coursesChartInstance.data.datasets[0].data = participationData.map(v => v * easeOut);
        coursesChartInstance.data.datasets[1].data = approvalData.map(v => v * easeOut);
        coursesChartInstance.update('none');

        if (progress < 1) {
            window.requestAnimationFrame(animateChart);
        } else {
            coursesChartInstance.data.datasets[0].data = participationData;
            coursesChartInstance.data.datasets[1].data = approvalData;
            coursesChartInstance.update('none');
        }
    };
    window.requestAnimationFrame(animateChart);
}

function renderTable(courses) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    if (!courses || courses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-white/60">No se encontraron cursos.</td></tr>`;
        return;
    }

    courses.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-white/5 transition-colors course-row';
        tr.dataset.name = c.name.toLowerCase();
        tr.innerHTML = `
            <td class="px-6 py-4 font-semibold text-white">${escapeHtml(c.name)}</td>
            <td class="px-6 py-4 text-center text-white/85 font-semibold table-number-int" data-val="${c.enrolled}">0</td>
            <td class="px-6 py-4">
                <div class="flex flex-col">
                    <span class="text-right font-bold text-white table-number-float" data-val="${c.participation}">0.0%</span>
                    <div class="table-progress-bar">
                        <div class="table-progress-fill participation-fill" style="width: 0%" data-target-width="${c.participation}%"></div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="flex flex-col">
                    <span class="text-right font-bold text-[#CDD400] table-number-float" data-val="${c.approval}">0.0%</span>
                    <div class="table-progress-bar">
                        <div class="table-progress-fill approval-fill" style="width: 0%" data-target-width="${c.approval}%"></div>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.table-number-int').forEach(el => animateValue(el, 0, parseFloat(el.getAttribute('data-val')), 2000, '', false));
    tbody.querySelectorAll('.table-number-float').forEach(el => animateValue(el, 0, parseFloat(el.getAttribute('data-val')), 2000, '%', true));
    setTimeout(() => {
        document.querySelectorAll('#table-body .table-progress-fill').forEach(fill => {
            fill.style.width = fill.getAttribute('data-target-width');
        });
    }, 100);
}

function renderAreasTable(areas) {
    const tbody = document.getElementById('areas-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!areas || areas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-white/60">No se encontraron áreas.</td></tr>`;
        return;
    }

    areas.forEach((a, index) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-white/5 transition-colors cursor-pointer group';
        tr.onclick = () => openModal(index);
        tr.innerHTML = `
            <td class="px-6 py-4 font-semibold text-white group-hover:text-[#CDD400] transition-colors flex items-center space-x-2">
                <svg class="w-4 h-4 text-white/50 group-hover:text-[#CDD400] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                <span>${escapeHtml(a.name)}</span>
            </td>
            <td class="px-6 py-4 text-center text-white/85 font-semibold area-number-int" data-val="${a.enrolled}">0</td>
            <td class="px-6 py-4">
                <div class="flex flex-col">
                    <span class="text-right font-bold text-white area-number-float" data-val="${a.participation}">0.0%</span>
                    <div class="table-progress-bar">
                        <div class="table-progress-fill participation-fill" style="width: 0%" data-target-width="${a.participation}%"></div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="flex flex-col">
                    <span class="text-right font-bold text-[#CDD400] area-number-float" data-val="${a.approval}">0.0%</span>
                    <div class="table-progress-bar">
                        <div class="table-progress-fill approval-fill" style="width: 0%" data-target-width="${a.approval}%"></div>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.area-number-int').forEach(el => animateValue(el, 0, parseFloat(el.getAttribute('data-val')), 2000, '', false));
    tbody.querySelectorAll('.area-number-float').forEach(el => animateValue(el, 0, parseFloat(el.getAttribute('data-val')), 2000, '%', true));
    setTimeout(() => {
        document.querySelectorAll('#areas-table-body .table-progress-fill').forEach(fill => {
            if (fill.hasAttribute('data-target-width')) fill.style.width = fill.getAttribute('data-target-width');
        });
    }, 100);
}

function openModal(areaIndex) {
    const area = dashboardData.areas[areaIndex];
    document.getElementById('modal-title').innerText = `Participantes: ${area.name}`;
    const tbody = document.getElementById('modal-tbody');
    tbody.innerHTML = '';

    if (!area.participants || area.participants.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-4 text-center text-white/60">No hay participantes registrados.</td></tr>`;
    } else {
        area.participants.forEach(p => {
            const s = (p.status || '').toString().trim().toLowerCase();
            let statusColor = 'text-white/70';
            if (s === 'aprobado' || s === 'aprobados') statusColor = 'text-[#CDD400] font-bold';
            else if (s.includes('no aprob') || s.includes('reprob')) statusColor = 'text-red-300 font-semibold';
            else if (s.includes('finaliz')) statusColor = 'text-white font-semibold';
            else if (s.includes('inscrit')) statusColor = 'text-orange-300 font-semibold';
            else if (s.includes('curso')) statusColor = 'text-yellow-200 font-semibold';

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-white/5 transition-colors';
            tr.innerHTML = `
                <td class="px-6 py-3 font-medium text-white">${escapeHtml(p.name)}</td>
                <td class="px-6 py-3 text-white/80">${escapeHtml(p.course)}</td>
                <td class="px-6 py-3 ${statusColor}">${escapeHtml(p.status || 'Sin Estado')}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    const modal = document.getElementById('participants-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (isAuthorized()) {
        recordAuditEvent('CONSULTA', 'Consulta de participantes por Área', `Área: ${area.name}`);
    }
}

function closeModal() {
    const modal = document.getElementById('participants-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function openRatingsModal() {
    if (!isAuthorized() || !dashboardData.kpis) return;

    document.getElementById('modal-avg-rating').innerHTML = `${Number(dashboardData.kpis.average_rating || 0).toFixed(1)} <svg class="w-6 h-6 text-[#CDD400]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>`;
    document.getElementById('modal-rating-count').innerText = dashboardData.kpis.ratings_count || 0;
    document.getElementById('modal-rating-participation').innerText = `${Number(dashboardData.kpis.rating_participation || 0).toFixed(1)}%`;

    if (dashboardData.ai_insights) {
        document.getElementById('ai-positive-text').innerText = dashboardData.ai_insights.positive || 'No hay comentarios positivos suficientes.';
        document.getElementById('ai-improvement-text').innerText = dashboardData.ai_insights.improvement || 'No se detectaron alertas críticas u oportunidades de mejora.';
    }

    const modal = document.getElementById('ratings-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    recordAuditEvent('CONSULTA', 'Análisis de Valoraciones e IA', `Promedio ${Number(dashboardData.kpis.average_rating || 0).toFixed(1)} estrellas`);
}

function closeRatingsModal() {
    const modal = document.getElementById('ratings-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// ================================================================
// MÓDULO HISTÓRICO, TRAZABILIDAD, GESTIÓN HUMANA & CONTENIDOS
// ================================================================

let currentHistoricoTab = 'cards';
let filteredColaboradoresData = [];

function openHistoricoModal(initialTab = 'cards') {
    if (!isAuthorized()) {
        openLoginModal();
        return;
    }

    const targetTab = (initialTab === 'auditoria' && !isSuperAdmin()) ? 'cards' : initialTab;

    applyRoleUI();
    renderHistoricoCards();
    renderHistoricoColaboradores();
    populateHistoricoAreaFilter();
    populateCatalogoFilters();
    renderCatalogoContenidos();
    ensureHistoricoDetailedData();

    const modal = document.getElementById('historico-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    switchHistoricoTab(targetTab);
}

function closeHistoricoModal() {
    const modal = document.getElementById('historico-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function switchHistoricoTab(tabName) {
    const resolvedTab = (tabName === 'auditoria' && !isSuperAdmin()) ? 'cards' : tabName;
    currentHistoricoTab = resolvedTab;
    const tabs = ['cards', 'trazabilidad', 'gh', 'catalogo', 'auditoria'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        const content = document.getElementById(`tab-content-${t}`);
        if (t === resolvedTab) {
            btn?.classList.add('active', 'text-white');
            btn?.classList.remove('text-white/65');
            content?.classList.remove('hidden');
        } else {
            btn?.classList.remove('active', 'text-white');
            btn?.classList.add('text-white/65');
            content?.classList.add('hidden');
        }
    });

    const tabLabels = {
        cards: 'Visión General (Programas)',
        trazabilidad: 'Trazabilidad & Recurrencia',
        gh: 'Gestión Humana: Contenido, Notas & Actas',
        catalogo: 'Catálogo de Contenidos',
        auditoria: 'Usabilidad & Auditoría JSON'
    };
    if (isAuthorized()) {
        recordAuditEvent('CONSULTA', 'Navegación en Ecosistema', `Pestaña: ${tabLabels[resolvedTab] || resolvedTab}`);
    }

    if (resolvedTab === 'gh') {
        ensureHistoricoDetailedData();
        populateGHFilters();
        filterGHRecords();
    } else if (resolvedTab === 'catalogo') {
        populateCatalogoFilters();
        renderCatalogoContenidos();
    } else if (resolvedTab === 'auditoria') {
        renderAuditDashboard();
        refreshAuditLogsFromCloud(true);
    }
}

const MESES_ORDEN = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
    'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
};

function getMonthOrderVal(mesStr) {
    if (!mesStr) return 99;
    const str = mesStr.toString().toLowerCase().trim();
    for (const [mes, val] of Object.entries(MESES_ORDEN)) {
        if (str.includes(mes)) return val;
    }
    return 99;
}

function getHistoricoCursosData() {
    let list = [];
    if (dashboardData.historico_cursos && dashboardData.historico_cursos.length > 0) {
        list = [...dashboardData.historico_cursos];
    } else {
        list = [
            {
                mes: 'Capacitación bimensual Enero-Febrero 2026',
                curso: 'Capacitación bimensual Enero-Febrero 2026',
                publico_objetivo: 1784,
                participacion_cant: 1685,
                participacion_pct: 94.5,
                aprobacion_cant: 1649,
                aprobacion_pct: 92.4,
                promedio_satisfaccion: 4.8,
                foto_portada: 'https://drive.google.com/thumbnail?id=1VtOgctl2pkiVvS9gQii4m5K8yzLfCSnH&sz=w1200',
                areas: [
                    { area: 'RA', publico_objetivo: 1678, participacion_cant: 1601, participacion_pct: 95.4, aprobacion_cant: 1571, aprobacion_pct: 93.6 },
                    { area: 'RAP', publico_objetivo: 101, participacion_cant: 98, participacion_pct: 97.0, aprobacion_cant: 92, aprobacion_pct: 91.1 },
                    { area: 'SO', publico_objetivo: 65, participacion_cant: 52, participacion_pct: 80.0, aprobacion_cant: 52, aprobacion_pct: 80.0 }
                ]
            }
        ];
    }
    return list.sort((a, b) => getMonthOrderVal(a.mes) - getMonthOrderVal(b.mes));
}

function formatDriveImageUrl(urlStr) {
    if (!urlStr) return '';
    const str = String(urlStr).trim();
    const match = str.match(/\/d\/([^\/\?]+)/) || str.match(/id=([^&]+)/);
    if (match && match[1]) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1200`;
    }
    return str;
}

function renderHistoricoCards() {
    const container = document.getElementById('historico-cards-container');
    const countEl = document.getElementById('historico-cards-count');
    if (!container) return;

    const items = getHistoricoCursosData();
    if (countEl) countEl.innerText = `${items.length} Tarjeta(s) de Capacitación`;

    if (items.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-white/60 py-8">No hay registros históricos disponibles.</div>`;
        return;
    }

    const metadata = dashboardData.datos_capacitacion || {};

    container.innerHTML = items.map(item => {
        const meta = metadata[item.curso] || metadata[item.mes] || {};
        let satRaw = Number(item.promedio_satisfaccion || 4.8);
        if (satRaw > 5) satRaw = 4.8;
        const satVal = satRaw.toFixed(1);

        const partPct = Number(item.participacion_pct || 0).toFixed(1);
        const aprPct = Number(item.aprobacion_pct || 0).toFixed(1);
        const fInicio = meta.fecha_inicio ? String(meta.fecha_inicio).slice(0, 10) : '';
        const fFin = meta.fecha_fin ? String(meta.fecha_fin).slice(0, 10) : '';

        const rawFoto = meta.foto_portada || item.foto_portada || '';
        const driveFoto = formatDriveImageUrl(rawFoto);
        const fallbackFoto = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1000&auto=format&fit=crop&q=80';
        const finalBgImage = driveFoto || fallbackFoto;

        const areasHtml = (item.areas && item.areas.length > 0) ? `
            <div class="mt-3 pt-3 border-t border-white/15 relative z-10">
                <p class="text-[11px] font-bold uppercase tracking-wider text-[#CDD400] mb-2 flex items-center gap-1">
                    <span>🏢</span> Desglose por Área
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    ${item.areas.map(a => `
                        <div class="area-breakdown-box p-2">
                            <div class="flex justify-between items-center text-xs font-bold text-white mb-1">
                                <span class="text-[#CDD400]">${escapeHtml(a.area)}</span>
                                <span class="text-[10px] text-white/75">${a.publico_objetivo} colab.</span>
                            </div>
                            <div class="flex justify-between text-[11px] font-mono">
                                <span class="text-white/80">Part: <strong class="text-white">${Number(a.participacion_pct).toFixed(1)}%</strong></span>
                                <span class="text-white/80">Apr: <strong class="text-[#CDD400]">${Number(a.aprobacion_pct).toFixed(1)}%</strong></span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        return `
            <div class="historico-card p-5 rounded-2xl flex flex-col justify-between space-y-4 group">
                <div class="card-full-bg" style="background-image: url('${finalBgImage}'), url('${fallbackFoto}');"></div>
                <div class="card-full-overlay"></div>

                <div class="relative z-10">
                    <div class="flex justify-between items-center mb-2.5">
                        <span class="px-3 py-1 rounded-full text-xs font-extrabold bg-[#001e47]/90 backdrop-blur-md border border-[#CDD400]/60 text-[#CDD400] shadow-md">
                            📅 ${escapeHtml(item.mes)}
                        </span>
                        <div class="flex items-center space-x-1 bg-[#001e47]/90 backdrop-blur-md border border-[#CDD400]/50 px-2.5 py-1 rounded-md shadow-md">
                            <span class="text-xs font-bold text-[#CDD400]">${satVal}</span>
                            <span class="text-[#CDD400] text-xs">★</span>
                        </div>
                    </div>
                    <h4 class="font-bold text-white text-base leading-snug drop-shadow-lg">${escapeHtml(item.curso)}</h4>
                    ${(fInicio || fFin) ? `<p class="text-xs text-white/80 mt-1.5 font-medium">📆 Período: ${escapeHtml(fInicio)} ${fFin ? 'al ' + escapeHtml(fFin) : ''}</p>` : ''}
                </div>

                <div class="relative z-10 bg-[#001e47]/85 backdrop-blur-md rounded-xl p-4 space-y-3 border border-white/15 shadow-lg">
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-white/80 font-semibold">Público Objetivo General</span>
                        <span class="font-extrabold text-white text-base">${item.publico_objetivo} <span class="text-[10px] font-normal text-white/60">colab.</span></span>
                    </div>

                    <div>
                        <div class="flex justify-between items-center text-xs mb-1">
                            <span class="text-white/80 font-semibold">Participación Total</span>
                            <span class="font-bold text-white">${item.participacion_cant} (${partPct}%)</span>
                        </div>
                        <div class="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
                            <div class="h-full bg-gradient-to-r from-white/70 to-[#CDD400] rounded-full transition-all duration-1000" style="width: ${Math.min(partPct, 100)}%"></div>
                        </div>
                    </div>

                    <div>
                        <div class="flex justify-between items-center text-xs mb-1">
                            <span class="text-white/80 font-semibold">Aprobación Total</span>
                            <span class="font-bold text-[#CDD400]">${item.aprobacion_cant} (${aprPct}%)</span>
                        </div>
                        <div class="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
                            <div class="h-full bg-gradient-to-r from-[#98a920] to-[#CDD400] rounded-full transition-all duration-1000" style="width: ${Math.min(aprPct, 100)}%"></div>
                        </div>
                    </div>

                    ${areasHtml}

                    <button onclick="openGHForPrograma('${escapeHtml(item.curso).replace(/'/g, "\\'")}')"
                        class="w-full mt-2 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-[#CDD400] text-white hover:text-[#001e47] border border-[#CDD400]/40 transition-all">
                        ⚖️ Ver Contenidos y Colaboradores en Gestión Humana →
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function openGHForPrograma(programaName) {
    switchHistoricoTab('gh');
    const selMes = document.getElementById('gh-filter-mes');
    if (selMes) {
        const opt = Array.from(selMes.options).find(o => o.value === programaName || normalizeText(o.value) === normalizeText(programaName));
        if (opt) selMes.value = opt.value;
    }
    onGHProgramaChange();
}

function getColaboradoresTrazabilidadData() {
    if (dashboardData.colaboradores_trazabilidad && dashboardData.colaboradores_trazabilidad.length > 0) {
        return dashboardData.colaboradores_trazabilidad;
    }
    return [];
}

function populateHistoricoAreaFilter() {
    const select = document.getElementById('historico-filter-area');
    if (!select) return;
    const colabs = getColaboradoresTrazabilidadData();
    const areasSet = new Set(colabs.map(c => c.area).filter(Boolean));
    select.innerHTML = '<option value="ALL">Todas las Áreas</option>' +
        Array.from(areasSet).sort().map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
}

function renderHistoricoColaboradores() {
    filterHistoricoColaboradores();
}

function filterHistoricoColaboradores() {
    const areaFilter = document.getElementById('historico-filter-area')?.value || 'ALL';
    const searchText = (document.getElementById('historico-search-colab')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('historico-filter-status')?.value || 'ALL';
    const tbody = document.getElementById('historico-table-body');
    if (!tbody) return;

    const rawColabs = getColaboradoresTrazabilidadData();

    filteredColaboradoresData = rawColabs.filter(item => {
        if (areaFilter !== 'ALL' && item.area !== areaFilter) return false;
        if (searchText) {
            const matchCed = (item.cedula || '').toLowerCase().includes(searchText);
            const matchNom = (item.nombre || '').toLowerCase().includes(searchText);
            if (!matchCed && !matchNom) return false;
        }
        const partPct = item.pct_participacion;
        const aprPct = item.pct_aprobacion;

        if (statusFilter === 'CRITICAL') return (partPct < 50 || aprPct < 50);
        if (statusFilter === 'LOW_PART') return (partPct < 70);
        if (statusFilter === 'LOW_APR') return (aprPct < 70);
        if (statusFilter === 'OK') return (partPct >= 70 && aprPct >= 70);
        return true;
    });

    const totalEval = filteredColaboradoresData.length;
    const noPartCount = filteredColaboradoresData.filter(c => c.pct_participacion < 70).length;
    const noAprCount = filteredColaboradoresData.filter(c => c.pct_aprobacion < 70).length;

    const elTotal = document.getElementById('kpi-colab-total');
    const elNoPart = document.getElementById('kpi-colab-no-part');
    const elNoApr = document.getElementById('kpi-colab-no-apr');
    if (elTotal) elTotal.innerText = totalEval;
    if (elNoPart) elNoPart.innerText = noPartCount;
    if (elNoApr) elNoApr.innerText = noAprCount;

    if (filteredColaboradoresData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="px-5 py-6 text-center text-white/60">No se encontraron colaboradores que coincidan con los filtros.</td></tr>`;
        return;
    }

    const displaySlice = filteredColaboradoresData.slice(0, 250);
    tbody.innerHTML = displaySlice.map(c => {
        const partPct = Number(c.pct_participacion || 0).toFixed(1);
        const aprPct = Number(c.pct_aprobacion || 0).toFixed(1);

        let badgeHtml = '';
        if (partPct < 50 || aprPct < 50) {
            badgeHtml = `<span class="px-2.5 py-1 rounded-full text-xs font-bold badge-risk">⚠️ Recurrencia Crítica</span>`;
        } else if (partPct < 70) {
            badgeHtml = `<span class="px-2.5 py-1 rounded-full text-xs font-bold badge-warning">🚫 Baja Participación</span>`;
        } else if (aprPct < 70) {
            badgeHtml = `<span class="px-2.5 py-1 rounded-full text-xs font-bold badge-warning">❌ Baja Aprobación</span>`;
        } else {
            badgeHtml = `<span class="px-2.5 py-1 rounded-full text-xs font-bold badge-success">✅ Destacado</span>`;
        }

        const cedSafe = escapeHtml(c.cedula || '').replace(/'/g, "\\'");
        return `
            <tr class="hover:bg-white/5 transition-colors">
                <td class="px-3.5 py-3 font-mono text-xs text-[#CDD400] font-bold">${escapeHtml(c.cedula || 'N/A')}</td>
                <td class="px-3.5 py-3 font-semibold text-white">${escapeHtml(c.nombre)}</td>
                <td class="px-3.5 py-3 text-white/75 text-xs">${escapeHtml(c.area || 'Sin Área')}</td>
                <td class="px-3.5 py-3 text-center font-extrabold text-white text-sm bg-white/5 rounded-md">${c.asignados}</td>
                <td class="px-3.5 py-3 text-center font-bold text-white">${c.participados}</td>
                <td class="px-3.5 py-3 text-center font-bold text-[#CDD400]">${c.aprobados}</td>
                <td class="px-3.5 py-3 text-center"><span class="font-extrabold ${partPct < 70 ? 'text-red-300' : 'text-white'}">${partPct}%</span></td>
                <td class="px-3.5 py-3 text-center"><span class="font-extrabold ${aprPct < 70 ? 'text-orange-300' : 'text-[#CDD400]'}">${aprPct}%</span></td>
                <td class="px-3.5 py-3 text-center">${badgeHtml}</td>
                <td class="px-3.5 py-3 text-center">
                    <button onclick="inspectColabInGH('${cedSafe}')" class="px-2.5 py-1 rounded-lg bg-[#CDD400]/20 hover:bg-[#CDD400] text-[#CDD400] hover:text-[#001e47] border border-[#CDD400]/40 text-xs font-bold transition-all">
                        ⚖️ Ver Contenido / Acta
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function inspectColabInGH(cedulaOrName) {
    if (isAuthorized()) {
        recordAuditEvent('CONSULTA', 'Inspección de Colaborador en GH', `Cédula/Nombre: ${cedulaOrName}`);
    }
    switchHistoricoTab('gh');
    const input = document.getElementById('gh-search-colab');
    if (input) input.value = cedulaOrName;
    filterGHRecords();
}

// ================================================================
// MODAL EXPLICATIVO DE KPIs DE RECURRENCIA
// ================================================================

function openRecurrenciaInfoModal(type) {
    const modal = document.getElementById('recurrencia-info-modal');
    const titleEl = document.getElementById('recurrencia-info-title');
    const bodyEl = document.getElementById('recurrencia-info-body');
    if (!modal || !titleEl || !bodyEl) return;

    const baseData = filteredColaboradoresData.length > 0 ? filteredColaboradoresData : getColaboradoresTrazabilidadData();
    const total = baseData.length;
    const noPartList = baseData.filter(c => Number(c.pct_participacion || 0) < 70);
    const noAprList = baseData.filter(c => Number(c.pct_aprobacion || 0) < 70);
    const zeroPart = noPartList.filter(c => Number(c.pct_participacion || 0) === 0).length;
    const critPart = noPartList.filter(c => Number(c.pct_participacion || 0) > 0 && Number(c.pct_participacion || 0) < 50).length;
    const modPart = noPartList.length - zeroPart - critPart;

    const zeroApr = noAprList.filter(c => Number(c.pct_aprobacion || 0) === 0).length;
    const critApr = noAprList.filter(c => Number(c.pct_aprobacion || 0) > 0 && Number(c.pct_aprobacion || 0) < 50).length;
    const modApr = noAprList.length - zeroApr - critApr;

    const avgAsignados = total > 0 ? (baseData.reduce((s, c) => s + (Number(c.asignados) || 0), 0) / total).toFixed(1) : '0.0';
    const okCount = baseData.filter(c => Number(c.pct_participacion || 0) >= 70 && Number(c.pct_aprobacion || 0) >= 70).length;

    const areaCounts = (list) => {
        const map = {};
        list.forEach(c => {
            const a = c.area || 'Sin Área';
            map[a] = (map[a] || 0) + 1;
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 4);
    };

    if (type === 'no_part') {
        titleEl.innerText = `Recurrencia No Participación (${noPartList.length} colaboradores)`;
        const topAreas = areaCounts(noPartList);
        bodyEl.innerHTML = `
            <div class="bg-red-500/10 border border-red-400/35 rounded-xl p-4 space-y-2">
                <p class="text-xs font-extrabold uppercase tracking-wider text-red-300">📌 ¿Con base en qué se calcula este número?</p>
                <p class="text-white/90 leading-relaxed">
                    Representa la cantidad de colaboradores evaluados cuyo <strong>% de Participación acumulado es menor al 70%</strong> sobre el total de capacitaciones bimensuales que tienen asignadas (meta mínima esperada de estabilidad: <strong>&ge; 70%</strong>).
                </p>
                <div class="bg-[#001433]/80 rounded-lg p-3 font-mono text-xs text-[#CDD400] border border-white/10">
                    Fórmula: % Participación = (Cursos Participados &divide; Cursos Asignados) &times; 100 &lt; 70%
                </div>
                <p class="text-xs text-white/70">
                    Ejemplo: Si un colaborador tiene <strong>4 cursos asignados</strong> y solo ingresó a <strong>0, 1 o 2</strong> (0%, 25% o 50%), queda clasificado en Recurrencia de No Participación. Con 3 o 4 de 4 (75% o 100%), cumple la meta.
                </p>
            </div>
            <div class="grid grid-cols-3 gap-2.5 text-center">
                <div class="glass-subpanel p-3 border-red-400/30">
                    <p class="text-[10px] uppercase text-white/60 font-bold">0% (Nunca ingresó)</p>
                    <p class="text-xl font-black text-red-300 mt-0.5">${zeroPart}</p>
                </div>
                <div class="glass-subpanel p-3 border-red-400/30">
                    <p class="text-[10px] uppercase text-white/60 font-bold">1% - 49.9% (Crítica)</p>
                    <p class="text-xl font-black text-red-200 mt-0.5">${critPart}</p>
                </div>
                <div class="glass-subpanel p-3 border-yellow-400/30">
                    <p class="text-[10px] uppercase text-white/60 font-bold">50% - 69.9% (Alerta)</p>
                    <p class="text-xl font-black text-yellow-200 mt-0.5">${modPart}</p>
                </div>
            </div>
            <div class="bg-white/5 border border-white/15 rounded-xl p-3.5 text-xs space-y-2">
                <p class="font-bold text-[#CDD400] uppercase text-[11px]">📍 Áreas con mayor recurrencia (vista actual):</p>
                <div class="flex flex-wrap gap-2">
                    ${topAreas.map(([ar, cnt]) => `<span class="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 font-semibold text-white">${escapeHtml(ar)}: <strong class="text-red-300">${cnt}</strong></span>`).join('') || '<span class="text-white/60">Sin registros</span>'}
                </div>
                <p class="text-white/65 pt-1">Total evaluado actual: <strong>${total}</strong> colaboradores (promedio <strong>${avgAsignados}</strong> cursos asignados/persona). Equivale al <strong>${total ? ((noPartList.length / total) * 100).toFixed(1) : '0.0'}%</strong> de la población filtrada.</p>
            </div>
            <div class="flex justify-end gap-2 pt-1">
                <button onclick="applyRecurrenciaFilterFromModal('LOW_PART')" class="luxury-btn-primary px-4 py-2 rounded-xl text-xs">
                    🔍 Filtrar estos ${noPartList.length} colaboradores en la tabla
                </button>
            </div>
        `;
    } else if (type === 'no_apr') {
        titleEl.innerText = `Recurrencia No Aprobación (${noAprList.length} colaboradores)`;
        const topAreas = areaCounts(noAprList);
        bodyEl.innerHTML = `
            <div class="bg-yellow-500/10 border border-yellow-400/35 rounded-xl p-4 space-y-2">
                <p class="text-xs font-extrabold uppercase tracking-wider text-yellow-200">📌 ¿Con base en qué se calcula este número?</p>
                <p class="text-white/90 leading-relaxed">
                    Representa la cantidad de colaboradores evaluados cuyo <strong>% de Aprobación acumulado es menor al 70%</strong> sobre sus cursos asignados. Incluye tanto a quienes reprobaron la evaluación como a quienes no completaron o nunca ingresaron al curso.
                </p>
                <div class="bg-[#001433]/80 rounded-lg p-3 font-mono text-xs text-[#CDD400] border border-white/10">
                    Fórmula: % Aprobación = (Cursos Aprobados &divide; Cursos Asignados) &times; 100 &lt; 70%
                </div>
                <p class="text-xs text-white/70">
                    Nota: Por eso suele ser igual o mayor que No Participación (por ejemplo <strong>${noAprList.length}</strong> vs <strong>${noPartList.length}</strong>): incluye personas que sí participaron (&ge;70%) pero reprobaron al menos una evaluación.
                </p>
            </div>
            <div class="grid grid-cols-3 gap-2.5 text-center">
                <div class="glass-subpanel p-3 border-red-400/30">
                    <p class="text-[10px] uppercase text-white/60 font-bold">0% Aprobación</p>
                    <p class="text-xl font-black text-red-300 mt-0.5">${zeroApr}</p>
                </div>
                <div class="glass-subpanel p-3 border-red-400/30">
                    <p class="text-[10px] uppercase text-white/60 font-bold">1% - 49.9% (Crítica)</p>
                    <p class="text-xl font-black text-red-200 mt-0.5">${critApr}</p>
                </div>
                <div class="glass-subpanel p-3 border-yellow-400/30">
                    <p class="text-[10px] uppercase text-white/60 font-bold">50% - 69.9% (Alerta)</p>
                    <p class="text-xl font-black text-yellow-200 mt-0.5">${modApr}</p>
                </div>
            </div>
            <div class="bg-white/5 border border-white/15 rounded-xl p-3.5 text-xs space-y-2">
                <p class="font-bold text-[#CDD400] uppercase text-[11px]">📍 Áreas con mayor recurrencia de no aprobación:</p>
                <div class="flex flex-wrap gap-2">
                    ${topAreas.map(([ar, cnt]) => `<span class="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 font-semibold text-white">${escapeHtml(ar)}: <strong class="text-yellow-300">${cnt}</strong></span>`).join('') || '<span class="text-white/60">Sin registros</span>'}
                </div>
                <p class="text-white/65 pt-1">Total evaluado actual: <strong>${total}</strong> colaboradores. Equivale al <strong>${total ? ((noAprList.length / total) * 100).toFixed(1) : '0.0'}%</strong> de la población filtrada.</p>
            </div>
            <div class="flex justify-end gap-2 pt-1">
                <button onclick="applyRecurrenciaFilterFromModal('LOW_APR')" class="luxury-btn-primary px-4 py-2 rounded-xl text-xs">
                    🔍 Filtrar estos ${noAprList.length} colaboradores en la tabla
                </button>
            </div>
        `;
    } else {
        titleEl.innerText = `Criterio General de Evaluación (${total} colaboradores)`;
        bodyEl.innerHTML = `
            <div class="bg-white/5 border border-white/15 rounded-xl p-4 space-y-2">
                <p class="text-xs font-extrabold uppercase tracking-wider text-[#CDD400]">📊 Base del Consolidado Histórico</p>
                <p class="text-white/90 leading-relaxed">
                    El indicador <strong>Total Evaluados (${total})</strong> consolida a todos los colaboradores únicos identificados por cédula/nombre en la hoja <strong>Histórico</strong> de Google Sheets (Enero–Febrero, Marzo–Abril, Mayo y Junio 2026) con al menos 1 capacitación asignada.
                </p>
                <p class="text-xs text-white/75">
                    Promedio de cursos asignados por colaborador en esta vista: <strong class="text-[#CDD400]">${avgAsignados}</strong>.
                    Umbral institucional de estabilidad: <strong class="text-white">&ge; 70%</strong> tanto en participación como en aprobación.
                </p>
            </div>
            <div class="grid grid-cols-3 gap-2.5 text-center">
                <div class="glass-subpanel p-3 border-[#CDD400]/35">
                    <p class="text-[10px] uppercase text-white/65 font-bold">✅ Destacados (&ge;70%)</p>
                    <p class="text-xl font-black text-[#CDD400] mt-0.5">${okCount}</p>
                </div>
                <div class="glass-subpanel p-3 border-red-400/30">
                    <p class="text-[10px] uppercase text-white/65 font-bold">⚠️ Baja Part. (&lt;70%)</p>
                    <p class="text-xl font-black text-red-300 mt-0.5">${noPartList.length}</p>
                </div>
                <div class="glass-subpanel p-3 border-yellow-400/30">
                    <p class="text-[10px] uppercase text-white/65 font-bold">❌ Baja Aprob. (&lt;70%)</p>
                    <p class="text-xl font-black text-yellow-200 mt-0.5">${noAprList.length}</p>
                </div>
            </div>
            <div class="flex justify-end gap-2 pt-1">
                <button onclick="applyRecurrenciaFilterFromModal('ALL')" class="luxury-btn-secondary px-4 py-2 rounded-xl text-xs">
                    Ver todos los ${total} colaboradores
                </button>
            </div>
        `;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (isAuthorized()) {
        recordAuditEvent('CONSULTA', 'Consulta Criterio Recurrencia', `Tarjeta: ${type}`);
    }
}

function closeRecurrenciaInfoModal() {
    const modal = document.getElementById('recurrencia-info-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function applyRecurrenciaFilterFromModal(statusVal) {
    const sel = document.getElementById('historico-filter-status');
    if (sel) sel.value = statusVal || 'ALL';
    filterHistoricoColaboradores();
    closeRecurrenciaInfoModal();
}

// ================================================================
// PESTAÑA 3: GESTIÓN HUMANA — CONTENIDO, NOTAS & ACTAS DISCIPLINARIAS
// ================================================================

function populateGHFilters() {
    const selMes = document.getElementById('gh-filter-mes');
    const selCurso = document.getElementById('gh-filter-curso');
    if (!selMes || !selCurso) return;

    const currentMes = selMes.value;
    const programas = Array.from(new Set(historicoDetailedRecords.map(r => r.programa).filter(Boolean)))
        .sort((a, b) => getMonthOrderVal(a) - getMonthOrderVal(b));

    selMes.innerHTML = '<option value="ALL">Todos los Meses / Programas</option>' +
        programas.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    if (programas.includes(currentMes)) selMes.value = currentMes;

    updateGHCursoOptions();
}

function updateGHCursoOptions() {
    const selMes = document.getElementById('gh-filter-mes');
    const selCurso = document.getElementById('gh-filter-curso');
    if (!selMes || !selCurso) return;

    const progVal = selMes.value;
    const currentCurso = selCurso.value;

    const filtered = progVal === 'ALL'
        ? historicoDetailedRecords
        : historicoDetailedRecords.filter(r => r.programa === progVal);

    const cursos = Array.from(new Set(filtered.map(r => r.curso).filter(Boolean))).sort();
    selCurso.innerHTML = '<option value="ALL">Todas las Capacitaciones</option>' +
        cursos.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if (cursos.includes(currentCurso)) selCurso.value = currentCurso;
}

function onGHProgramaChange() {
    updateGHCursoOptions();
    filterGHRecords();
}

function filterGHRecords(resetLimit = true) {
    if (resetLimit) ghRenderLimit = 35;

    const search = normalizeText(document.getElementById('gh-search-colab')?.value || '');
    const mesFilter = document.getElementById('gh-filter-mes')?.value || 'ALL';
    const cursoFilter = document.getElementById('gh-filter-curso')?.value || 'ALL';
    const estadoFilter = document.getElementById('gh-filter-estado')?.value || 'ALL';

    ghFilteredCache = historicoDetailedRecords.filter(rec => {
        if (mesFilter !== 'ALL' && rec.programa !== mesFilter) return false;
        if (cursoFilter !== 'ALL' && rec.curso !== cursoFilter) return false;

        if (estadoFilter !== 'ALL') {
            const evalInfo = evaluateCourseRecord(rec);
            if (estadoFilter === 'Aprobado' && evalInfo.estadoLabel !== 'Aprobado') return false;
            if (estadoFilter === 'No Aprobado' && evalInfo.estadoLabel !== 'No Aprobó') return false;
            if (estadoFilter === 'En curso' && evalInfo.estadoLabel !== 'En Curso') return false;
            if (estadoFilter === 'Inscrito' && evalInfo.estadoLabel !== 'Inscrito') return false;
        }

        if (search) {
            const matchNom = normalizeText(rec.nombre).includes(search);
            const matchCed = (rec.cedula || '').toLowerCase().includes(search.replace(/\s+/g, ''));
            if (!matchNom && !matchCed) return false;
        }
        return true;
    });

    // Estadísticas de los registros filtrados
    let cAprob = 0, cNoAprob = 0, cEnCurso = 0, cInsc = 0;
    ghFilteredCache.forEach(r => {
        const st = evaluateCourseRecord(r).estadoLabel;
        if (st === 'Aprobado') cAprob++;
        else if (st === 'No Aprobó') cNoAprob++;
        else if (st === 'En Curso') cEnCurso++;
        else cInsc++;
    });

    document.getElementById('gh-stat-total').innerText = ghFilteredCache.length.toLocaleString('es-CO');
    document.getElementById('gh-stat-aprobado').innerText = cAprob.toLocaleString('es-CO');
    document.getElementById('gh-stat-noaprobado').innerText = cNoAprob.toLocaleString('es-CO');
    document.getElementById('gh-stat-encurso').innerText = cEnCurso.toLocaleString('es-CO');
    document.getElementById('gh-stat-inscrito').innerText = cInsc.toLocaleString('es-CO');

    if (isAuthorized() && (search.length >= 2 || mesFilter !== 'ALL' || cursoFilter !== 'ALL' || estadoFilter !== 'ALL')) {
        clearTimeout(ghAuditDebounceTimer);
        ghAuditDebounceTimer = setTimeout(() => {
            const parts = [];
            if (search) parts.push(`Búsqueda: "${search}"`);
            if (mesFilter !== 'ALL') parts.push(`Mes/Prog: ${mesFilter}`);
            if (cursoFilter !== 'ALL') parts.push(`Curso: ${cursoFilter}`);
            if (estadoFilter !== 'ALL') parts.push(`Estado: ${estadoFilter}`);
            recordAuditEvent('CONSULTA', 'Consulta en Gestión Humana', `${parts.join(' • ')} (${ghFilteredCache.length} resultado(s))`);
        }, 1200);
    }

    renderGHResults();
}

function getFormatBadgeClass(fmt) {
    const f = (fmt || '').toLowerCase();
    if (f.includes('mp4')) return 'badge-fmt-mp4';
    if (f.includes('pdf')) return 'badge-fmt-pdf';
    if (f.includes('scorm')) return 'badge-fmt-scorm';
    return 'badge-fmt-link';
}

/**
 * Renderiza unidades y capítulos agrupados: si una unidad tiene múltiples capítulos
 * (ej: Unidad 4 con 6 capítulos), muestra una sola cabecera colapsable con el conteo.
 */
function renderGroupedCourseContent(items, opts = {}) {
    const prefix = opts.prefix || 'cnt';
    const showDelete = Boolean(opts.showDelete);
    const unitMap = new Map();

    items.forEach(item => {
        const uLabel = (item.unidad || 'Unidad sin título').trim();
        const uKey = normalizeText(uLabel) || uLabel.toLowerCase();
        if (!unitMap.has(uKey)) {
            unitMap.set(uKey, { unidad: uLabel, items: [] });
        }
        unitMap.get(uKey).items.push(item);
    });

    const groups = Array.from(unitMap.values());
    const singleFlatCards = [];
    const accordionBlocks = [];

    groups.forEach((grp, gIdx) => {
        const isMulti = grp.items.length > 1 || Boolean((grp.items[0]?.capitulo || '').trim());
        if (!isMulti) {
            const it = grp.items[0];
            singleFlatCards.push(`
                <div class="flex items-center justify-between gap-2 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl p-2.5 transition-all">
                    <div class="min-w-0 flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${getFormatBadgeClass(it.formato)}">${escapeHtml(it.formato)}</span>
                        <span class="text-xs font-semibold text-white truncate" title="${escapeHtml(it.unidad)}">${escapeHtml(it.unidad)}</span>
                    </div>
                    <div class="flex items-center gap-1.5 flex-shrink-0">
                        <button onclick="openMediaPreview('${escapeHtml(it.unidad).replace(/'/g, "\\'")}', '${escapeHtml(it.formato).replace(/'/g, "\\'")}', '${escapeHtml(it.url).replace(/'/g, "\\'")}')"
                            class="px-2.5 py-1 rounded-lg bg-[#CDD400] text-[#001e47] font-bold text-[11px] hover:scale-105 transition-transform">
                            ▶ Ver
                        </button>
                        <a href="${escapeHtml(it.url)}" target="_blank" rel="noopener noreferrer"
                            class="px-2 py-1 rounded-lg bg-white/10 text-white border border-white/20 text-[11px] hover:bg-white/20" title="Abrir enlace externo">
                            ↗
                        </a>
                        ${showDelete ? `<button onclick="deleteTrainingContentItem('${escapeHtml(it.id).replace(/'/g, "\\'")}')" class="px-2 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-400/30 text-[11px] hover:bg-red-500/40" title="Eliminar recurso">&times;</button>` : ''}
                    </div>
                </div>
            `);
        } else {
            const accId = `${prefix}-u-${gIdx}-${Math.random().toString(36).slice(2, 6)}`;
            const countLabel = grp.items.some(x => (x.capitulo || '').trim())
                ? `${grp.items.length} Capítulos`
                : `${grp.items.length} Recursos`;
            const uniqueFormats = Array.from(new Set(grp.items.map(x => x.formato).filter(Boolean))).join(', ');

            const chaptersHtml = grp.items.map((it, cIdx) => {
                const capName = (it.capitulo || '').trim() || `Capítulo ${cIdx + 1}`;
                const title = `${grp.unidad} • ${capName}`;
                return `
                    <div class="flex items-center justify-between gap-2 bg-[#001433]/65 hover:bg-white/10 border border-white/15 rounded-xl px-3 py-2 transition-all">
                        <div class="min-w-0 flex items-center gap-2">
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${getFormatBadgeClass(it.formato)}">${escapeHtml(it.formato)}</span>
                            <span class="text-xs font-semibold text-[#CDD400] truncate" title="${escapeHtml(capName)}">↳ ${escapeHtml(capName)}</span>
                        </div>
                        <div class="flex items-center gap-1.5 flex-shrink-0">
                            <button onclick="openMediaPreview('${escapeHtml(title).replace(/'/g, "\\'")}', '${escapeHtml(it.formato).replace(/'/g, "\\'")}', '${escapeHtml(it.url).replace(/'/g, "\\'")}')"
                                class="px-2.5 py-1 rounded-lg bg-[#CDD400] text-[#001e47] font-bold text-[11px] hover:scale-105 transition-transform">
                                ▶ Ver
                            </button>
                            <a href="${escapeHtml(it.url)}" target="_blank" rel="noopener noreferrer"
                                class="px-2 py-1 rounded-lg bg-white/10 text-white border border-white/20 text-[11px] hover:bg-white/20" title="Abrir enlace externo">
                                ↗
                            </a>
                            ${showDelete ? `<button onclick="deleteTrainingContentItem('${escapeHtml(it.id).replace(/'/g, "\\'")}')" class="px-2 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-400/30 text-[11px] hover:bg-red-500/40" title="Eliminar capítulo">&times;</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            accordionBlocks.push(`
                <div class="unit-accordion md:col-span-2">
                    <button type="button" onclick="toggleUnitChapters('${accId}')" class="unit-accordion-header w-full px-3.5 py-3 flex items-center justify-between gap-3 text-left">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <span class="w-8 h-8 rounded-lg bg-[#CDD400]/20 border border-[#CDD400]/45 flex items-center justify-center text-sm flex-shrink-0">📂</span>
                            <div class="min-w-0">
                                <p class="text-xs sm:text-sm font-bold text-white truncate">${escapeHtml(grp.unidad)}</p>
                                <div class="flex flex-wrap items-center gap-2 mt-0.5">
                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#CDD400] text-[#001e47]">📑 ${countLabel}</span>
                                    ${uniqueFormats ? `<span class="text-[10px] text-white/60 font-mono">${escapeHtml(uniqueFormats)}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0 text-xs font-bold text-[#CDD400]">
                            <span id="${accId}-label" class="hidden sm:inline">Ver capítulos</span>
                            <svg id="${accId}-chevron" class="unit-chevron w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </div>
                    </button>
                    <div id="${accId}-body" class="hidden p-3 pt-2 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-2 bg-black/20">
                        ${chaptersHtml}
                    </div>
                </div>
            `);
        }
    });

    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2">
            ${singleFlatCards.join('')}
            ${accordionBlocks.join('')}
        </div>
    `;
}

function toggleUnitChapters(accId) {
    const body = document.getElementById(`${accId}-body`);
    const chev = document.getElementById(`${accId}-chevron`);
    const lbl = document.getElementById(`${accId}-label`);
    if (!body) return;
    const isHidden = body.classList.contains('hidden');
    if (isHidden) {
        body.classList.remove('hidden');
        chev?.classList.add('open');
        if (lbl) lbl.textContent = 'Contraer';
    } else {
        body.classList.add('hidden');
        chev?.classList.remove('open');
        if (lbl) lbl.textContent = 'Ver capítulos';
    }
}

function renderGHResults() {
    const container = document.getElementById('gh-results-container');
    if (!container) return;

    if (!historicoDetailedLoaded) {
        container.innerHTML = `<div class="glass-subpanel p-8 text-center text-white/75 text-sm">⏳ Cargando base de datos de Gestión Humana desde Google Sheets ("Histórico")...</div>`;
        return;
    }

    if (ghFilteredCache.length === 0) {
        container.innerHTML = `<div class="glass-subpanel p-8 text-center text-white/70 text-sm">No se encontraron registros que coincidan con los filtros seleccionados.</div>`;
        return;
    }

    const slice = ghFilteredCache.slice(0, ghRenderLimit);

    let html = slice.map((rec, idx) => {
        const evalInfo = evaluateCourseRecord(rec);
        const contentItems = getContentForTraining(rec.programa, rec.curso);
        const colabSafeKey = escapeHtml(rec.cedula || rec.nombre).replace(/'/g, "\\'");

        const contentHtml = contentItems.length > 0
            ? renderGroupedCourseContent(contentItems, { prefix: `gh-${idx}`, showDelete: false })
            : `<p class="text-xs text-white/60 italic mt-2">No hay enlaces multimedia vinculados aún para esta capacitación. Un Super Administrador puede agregarlos en la pestaña Catálogo.</p>`;

        return `
            <div class="glass-panel p-5 space-y-4 border border-white/20">
                <!-- Header Colaborador & Nota -->
                <div class="flex flex-col lg:flex-row justify-between gap-4 border-b border-white/15 pb-4">
                    <div class="space-y-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${evalInfo.badgeClass}">${evalInfo.estadoLabel}</span>
                            <span class="text-xs font-mono font-bold text-[#CDD400] bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">CC: ${escapeHtml(rec.cedula || 'N/A')}</span>
                            <span class="text-xs text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full">Área: <strong>${escapeHtml(rec.area || 'N/A')}</strong></span>
                            ${rec.centro_costos ? `<span class="text-xs text-white/70 bg-white/5 px-2.5 py-0.5 rounded-full">CCosto: ${escapeHtml(rec.centro_costos)}</span>` : ''}
                        </div>
                        <h4 class="text-lg font-extrabold text-white pt-1">${escapeHtml(rec.nombre)}</h4>
                        <p class="text-xs text-white/70">
                            ${rec.email ? `✉️ ${escapeHtml(rec.email)} • ` : ''}
                            Programa (Col. A): <strong class="text-white">${escapeHtml(rec.programa)}</strong> •
                            Capacitación (Col. B): <strong class="text-[#CDD400]">${escapeHtml(rec.curso)}</strong>
                        </p>
                    </div>

                    <div class="flex items-center gap-3 flex-shrink-0">
                        <div class="bg-[#001433]/80 border border-[#CDD400]/45 rounded-2xl px-4 py-2.5 text-center min-w-[100px]">
                            <p class="text-[10px] uppercase tracking-wider text-white/65 font-bold">Nota Final</p>
                            <p class="text-2xl font-black ${evalInfo.notaFinal === '0' ? 'text-red-300' : 'text-[#CDD400]'}">${escapeHtml(evalInfo.notaFinal)}</p>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <button onclick="openActaForSingleRecord(${idx})" class="luxury-btn-primary px-3.5 py-2 rounded-xl text-xs whitespace-nowrap">
                                📄 Acta de este Curso
                            </button>
                            <button onclick="openActaConsolidatedForColab('${colabSafeKey}')" class="luxury-btn-secondary px-3.5 py-1.5 rounded-xl text-[11px] whitespace-nowrap">
                                📑 Acta Consolidada
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Trazabilidad Columnas F, K, L, M, N y Observación -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div class="bg-white/5 rounded-xl p-2.5 border border-white/10">
                        <p class="text-white/55 text-[10px] uppercase font-bold">Primer Ingreso (Col. K)</p>
                        <p class="font-bold text-white mt-0.5">${escapeHtml(rec.fecha_primer_ingreso || 'Sin registro de ingreso')}</p>
                    </div>
                    <div class="bg-white/5 rounded-xl p-2.5 border border-white/10">
                        <p class="text-white/55 text-[10px] uppercase font-bold">Avance (Col. F)</p>
                        <p class="font-bold text-[#CDD400] mt-0.5">${escapeHtml(rec.avance || '0')}%</p>
                    </div>
                    <div class="bg-white/5 rounded-xl p-2.5 border border-white/10">
                        <p class="text-white/55 text-[10px] uppercase font-bold">Valoración (Col. M)</p>
                        <p class="font-bold text-white mt-0.5">${rec.valoracion ? `${escapeHtml(rec.valoracion)} ★` : 'Sin valoración'}</p>
                    </div>
                    <div class="bg-white/5 rounded-xl p-2.5 border border-white/10">
                        <p class="text-white/55 text-[10px] uppercase font-bold">Estado Colaborador</p>
                        <p class="font-bold text-white mt-0.5">${escapeHtml(rec.estado_colab || 'Activo')}</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                    <div class="bg-[#001433]/65 border border-[#CDD400]/30 rounded-xl p-3">
                        <span class="font-bold text-[#CDD400] uppercase text-[10px] tracking-wider block mb-1">Observación Oficial de Estado (Col. G):</span>
                        <p class="text-white/90 font-medium">${escapeHtml(evalInfo.observacion)}</p>
                    </div>
                    <div class="bg-white/5 border border-white/15 rounded-xl p-3">
                        <span class="font-bold text-white/70 uppercase text-[10px] tracking-wider block mb-1">Comentario del Colaborador (Col. N):</span>
                        <p class="text-white/85 italic">${rec.comentario ? `"${escapeHtml(rec.comentario)}"` : 'El colaborador no registró comentarios.'}</p>
                    </div>
                </div>

                <!-- Contenido de la Capacitación -->
                <div class="pt-1">
                    <div class="flex items-center justify-between">
                        <h5 class="text-xs font-extrabold uppercase tracking-wider text-[#CDD400]">
                            🎬 Contenido Asignado en esta Capacitación (${contentItems.length} recurso(s))
                        </h5>
                    </div>
                    ${contentHtml}
                </div>
            </div>
        `;
    }).join('');

    if (ghFilteredCache.length > ghRenderLimit) {
        html += `
            <div class="text-center pt-2">
                <button onclick="loadMoreGHResults()" class="luxury-btn-secondary px-6 py-2.5 rounded-xl text-xs">
                    Mostrar más resultados (${ghRenderLimit} de ${ghFilteredCache.length.toLocaleString('es-CO')})
                </button>
            </div>
        `;
    }

    container.innerHTML = html;
}

function loadMoreGHResults() {
    ghRenderLimit += 35;
    renderGHResults();
}

// ================================================================
// VISOR MULTIMEDIA (.mp4 / JWPlayer / .pdf / Scorm)
// ================================================================

function openMediaPreview(title, formato, url) {
    const modal = document.getElementById('media-preview-modal');
    const titleEl = document.getElementById('media-modal-title');
    const badgeEl = document.getElementById('media-modal-badge');
    const extEl = document.getElementById('media-modal-external');
    const bodyEl = document.getElementById('media-modal-body');

    if (!modal || !bodyEl) return;
    titleEl.innerText = title || 'Recurso de Capacitación';
    badgeEl.innerText = formato || 'Contenido';
    extEl.href = url;

    const fLower = (formato || '').toLowerCase();
    const safeUrl = escapeHtml(url);

    if (fLower.includes('mp4') && url.match(/\.(mp4|webm|ogg)(\?|$)/i)) {
        bodyEl.innerHTML = `<video controls autoplay class="w-full max-h-[75vh] bg-black"><source src="${safeUrl}" type="video/mp4">Tu navegador no soporta video HTML5.</video>`;
    } else {
        // JWPlayer previews, S3 PDFs, and SCORM Cloud players work directly inside iframe
        bodyEl.innerHTML = `<iframe src="${safeUrl}" class="w-full h-[72vh] border-0 bg-white" allowfullscreen allow="autoplay; fullscreen"></iframe>`;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (isAuthorized()) {
        recordAuditEvent('CONTENIDO', 'Reproducción / Vista de Contenido', `${title || 'Recurso'} (${formato || 'Link'})`);
    }
}

function closeMediaPreviewModal() {
    const modal = document.getElementById('media-preview-modal');
    const bodyEl = document.getElementById('media-modal-body');
    if (bodyEl) bodyEl.innerHTML = '';
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// ================================================================
// GENERADOR DE ACTA OFICIAL (SOPORTE DISCIPLINARIO & GESTIÓN HUMANA)
// ================================================================

let lastActaMeta = { title: 'Acta_Capacitacion_RB' };

function openActaForSingleRecord(filteredIdx) {
    const rec = ghFilteredCache[filteredIdx];
    if (!rec) return;
    if (isAuthorized()) {
        recordAuditEvent('CONSULTA', 'Vista previa de Acta Individual', `${rec.nombre || ''} (CC ${rec.cedula || 'N/A'}) — ${rec.curso || ''}`);
    }
    renderActaDocument(rec, [rec], false);
}

function openActaConsolidatedForColab(cedulaOrName) {
    const normTarget = cedulaOrName.toString().trim().toLowerCase();
    const records = historicoDetailedRecords.filter(r =>
        (r.cedula || '').toLowerCase() === normTarget ||
        (r.nombre || '').toLowerCase() === normTarget
    );
    if (records.length === 0) {
        alert('No se encontraron registros para consolidar.');
        return;
    }
    if (isAuthorized()) {
        recordAuditEvent('CONSULTA', 'Vista previa de Acta Consolidada', `${records[0].nombre || ''} (CC ${records[0].cedula || cedulaOrName}) — ${records.length} curso(s)`);
    }
    renderActaDocument(records[0], records, true);
}

function renderActaDocument(primaryColab, records, isConsolidated) {
    const modal = document.getElementById('acta-modal');
    const area = document.getElementById('acta-printable-area');
    if (!modal || !area) return;

    const now = new Date();
    const fechaGeneracion = now.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const horaGeneracion = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const actaCode = `RB-GH-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${(primaryColab.cedula || 'SN').slice(-4)}`;
    const generador = currentUser ? `${currentUser.name} (${currentUser.role})` : 'Gestión Humana Recaudo Bogotá';

    lastActaMeta = {
        title: `Acta_${(primaryColab.nombre || 'Colaborador').replace(/\s+/g, '_')}_${primaryColab.cedula || 'SN'}`
    };

    const recordsHtml = records.map((rec, i) => {
        const evalInfo = evaluateCourseRecord(rec);
        const contents = getContentForTraining(rec.programa, rec.curso);
        const statusBg = evalInfo.estadoLabel === 'Aprobado'
            ? 'background:#ecfdf5; color:#065f46; border:1px solid #10b981;'
            : (evalInfo.estadoLabel === 'En Curso'
                ? 'background:#fffbeb; color:#92400e; border:1px solid #f59e0b;'
                : 'background:#fef2f2; color:#991b1b; border:1px solid #ef4444;');

        return `
            <div style="border:1px solid #cbd5e1; border-radius:10px; padding:14px; margin-bottom:14px; page-break-inside:avoid;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:10px;">
                    <div>
                        <div style="font-size:11px; color:#64748b; font-weight:700; text-transform:uppercase;">${isConsolidated ? `Capacitación #${i + 1} • ` : ''}${escapeHtml(rec.programa)}</div>
                        <div style="font-size:15px; font-weight:800; color:#001e47;">${escapeHtml(rec.curso)}</div>
                    </div>
                    <div style="text-align:right;">
                        <span style="display:inline-block; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:700; ${statusBg}">${escapeHtml(evalInfo.estadoLabel)}</span>
                        <div style="font-size:18px; font-weight:900; color:#001e47; margin-top:4px;">Nota: ${escapeHtml(evalInfo.notaFinal)}</div>
                    </div>
                </div>

                <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:10px;">
                    <tr>
                        <td style="padding:5px 8px; background:#f8fafc; border:1px solid #e2e8f0; width:25%;"><strong>Fecha Primer Ingreso (Col. K):</strong></td>
                        <td style="padding:5px 8px; border:1px solid #e2e8f0; width:25%;">${escapeHtml(rec.fecha_primer_ingreso || 'No registra ingreso')}</td>
                        <td style="padding:5px 8px; background:#f8fafc; border:1px solid #e2e8f0; width:25%;"><strong>Porcentaje de Avance (Col. F):</strong></td>
                        <td style="padding:5px 8px; border:1px solid #e2e8f0; width:25%;">${escapeHtml(rec.avance || '0')}%</td>
                    </tr>
                    <tr>
                        <td style="padding:5px 8px; background:#f8fafc; border:1px solid #e2e8f0;"><strong>Fecha Completado (Col. L):</strong></td>
                        <td style="padding:5px 8px; border:1px solid #e2e8f0;">${escapeHtml(rec.fecha_completado || 'No completado')}</td>
                        <td style="padding:5px 8px; background:#f8fafc; border:1px solid #e2e8f0;"><strong>Valoración del Curso (Col. M):</strong></td>
                        <td style="padding:5px 8px; border:1px solid #e2e8f0;">${rec.valoracion ? `${escapeHtml(rec.valoracion)} / 5` : 'Sin valoración'}</td>
                    </tr>
                    <tr>
                        <td style="padding:5px 8px; background:#f8fafc; border:1px solid #e2e8f0;"><strong>Comentario (Col. N):</strong></td>
                        <td colspan="3" style="padding:5px 8px; border:1px solid #e2e8f0;">${rec.comentario ? escapeHtml(rec.comentario) : 'Sin comentarios registrados por el colaborador.'}</td>
                    </tr>
                    <tr>
                        <td style="padding:5px 8px; background:#f8fafc; border:1px solid #e2e8f0;"><strong>Observación Oficial (Col. G):</strong></td>
                        <td colspan="3" style="padding:5px 8px; border:1px solid #e2e8f0; font-weight:600; color:#001e47;">${escapeHtml(evalInfo.observacion)}</td>
                    </tr>
                </table>

                <div style="font-size:11px; font-weight:800; color:#001e47; text-transform:uppercase; margin-bottom:6px;">
                    Contenido Temático y Material Disponible para el Colaborador (${contents.length} recurso(s)):
                </div>
                ${contents.length > 0 ? `
                    <table style="width:100%; border-collapse:collapse; font-size:11px;">
                        <thead>
                            <tr style="background:#001e47; color:#CDD400;">
                                <th style="padding:5px 8px; text-align:left;">Unidad / Módulo</th>
                                <th style="padding:5px 8px; text-align:left;">Capítulo</th>
                                <th style="padding:5px 8px; text-align:center;">Formato</th>
                                <th style="padding:5px 8px; text-align:left;">Enlace de Evidencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${contents.map(c => `
                                <tr>
                                    <td style="padding:4px 8px; border:1px solid #e2e8f0;">${escapeHtml(c.unidad)}</td>
                                    <td style="padding:4px 8px; border:1px solid #e2e8f0;">${escapeHtml(c.capitulo || 'Unidad completa')}</td>
                                    <td style="padding:4px 8px; border:1px solid #e2e8f0; text-align:center; font-weight:700;">${escapeHtml(c.formato)}</td>
                                    <td style="padding:4px 8px; border:1px solid #e2e8f0; word-break:break-all; color:#0369a1;">${escapeHtml(c.url)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p style="font-size:11px; color:#64748b;">Sin contenido temático vinculado en el catálogo.</p>'}
            </div>
        `;
    }).join('');

    area.innerHTML = `
        <div style="border-bottom:3px solid #001e47; padding-bottom:14px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; gap:16px;">
            <div style="display:flex; align-items:center; gap:14px;">
                <div style="background:#001e47; padding:8px 12px; border-radius:10px;">
                    <img src="${RB_LOGO_URL}" alt="Recaudo Bogotá" style="height:44px; width:auto;">
                </div>
                <div>
                    <h2 style="margin:0; font-size:18px; font-weight:900; color:#001e47;">ACTA DE TRAZABILIDAD Y SEGUIMIENTO DE CAPACITACIÓN</h2>
                    <p style="margin:2px 0 0; font-size:12px; color:#475569;">Soporte de Gestión Humana y Procesos Disciplinarios — Recaudo Bogotá S.A.S.</p>
                </div>
            </div>
            <div style="text-align:right; font-size:11px; color:#334155;">
                <div><strong>Código Acta:</strong> ${escapeHtml(actaCode)}</div>
                <div><strong>Fecha Emisión:</strong> ${escapeHtml(fechaGeneracion)}</div>
                <div><strong>Hora:</strong> ${escapeHtml(horaGeneracion)}</div>
            </div>
        </div>

        <div style="background:#f1f5f9; border-left:4px solid #CDD400; padding:12px 14px; border-radius:6px; margin-bottom:18px;">
            <div style="font-size:11px; font-weight:800; color:#001e47; text-transform:uppercase; margin-bottom:8px;">1. Datos Personales del Colaborador</div>
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
                <tr>
                    <td style="padding:4px 6px; width:50%;"><strong>Nombre Completo:</strong> ${escapeHtml(primaryColab.nombre)}</td>
                    <td style="padding:4px 6px; width:50%;"><strong>Documento / Identificación:</strong> ${escapeHtml(primaryColab.cedula || 'N/A')}</td>
                </tr>
                <tr>
                    <td style="padding:4px 6px;"><strong>Área / Operación:</strong> ${escapeHtml(primaryColab.area || 'N/A')}</td>
                    <td style="padding:4px 6px;"><strong>Centro de Costos:</strong> ${escapeHtml(primaryColab.centro_costos || 'N/A')}</td>
                </tr>
                <tr>
                    <td style="padding:4px 6px;"><strong>Correo Corporativo:</strong> ${escapeHtml(primaryColab.email || 'No registrado')}</td>
                    <td style="padding:4px 6px;"><strong>Estado Laboral en Plataforma:</strong> ${escapeHtml(primaryColab.estado_colab || 'Activo')}</td>
                </tr>
            </table>
        </div>

        <div style="margin-bottom:18px;">
            <div style="font-size:11px; font-weight:800; color:#001e47; text-transform:uppercase; margin-bottom:8px;">
                2. Detalle de Capacitación(es), Calificación y Contenido Asignado
            </div>
            ${recordsHtml}
        </div>

        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; font-size:11px; color:#334155; line-height:1.5; margin-bottom:26px;">
            <strong>3. Constancia de Trazabilidad y Soporte Jurídico / Disciplinario:</strong><br>
            La presente acta certifica la información registrada en la plataforma oficial de formación corporativa (hoja <em>"Histórico"</em>) de Recaudo Bogotá. Los estados de <em>"Inscrito"</em> (nunca ingresó) y <em>"En curso"</em> (no culminó o no presentó evaluación) registran calificación <strong>0</strong> conforme a la política de seguimiento de Gestión Humana, sirviendo como soporte documental objetivo para descargos, llamados de atención o procesos disciplinarios a que haya lugar.
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:36px; margin-top:34px; font-size:12px; color:#0f172a;">
            <div style="border-top:1px solid #334155; padding-top:6px;">
                <strong>Emitido por (Gestión Humana / Formación):</strong><br>
                <span style="color:#475569;">${escapeHtml(generador)}</span>
            </div>
            <div style="border-top:1px solid #334155; padding-top:6px;">
                <strong>Firma / Recibido Colaborador / Líder / Jurídica:</strong><br>
                <span style="color:#475569;">C.C.: ___________________________</span>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (isAuthorized()) {
        recordAuditEvent('CONTENIDO', 'Reproducción / Vista de Contenido', `${title || 'Recurso'} (${formato || 'Link'})`);
    }
}

function closeActaModal() {
    const modal = document.getElementById('acta-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function printActa() {
    if (isAuthorized()) {
        recordAuditEvent('DESCARGA', 'Impresión / Descarga PDF de Acta', lastActaMeta.title || 'Acta_Capacitacion_RB');
    }
    window.print();
}

function downloadActaWord() {
    const area = document.getElementById('acta-printable-area');
    if (!area) return;
    if (isAuthorized()) {
        recordAuditEvent('DESCARGA', 'Descarga Acta Oficial Word (.doc)', `${lastActaMeta.title || 'Acta_Capacitacion_RB'}.doc`);
    }
    const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${escapeHtml(lastActaMeta.title)}</title></head>
        <body style="font-family: Arial, sans-serif; color:#0f172a;">
            ${area.innerHTML}
        </body></html>
    `;
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${lastActaMeta.title}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ================================================================
// PESTAÑA 4: CATÁLOGO DE CONTENIDOS & GESTIÓN SUPER ADMINISTRADOR
// ================================================================

function populateCatalogoFilters() {
    const selMes = document.getElementById('cat-filter-mes');
    const selCap = document.getElementById('cat-filter-cap');
    if (!selMes || !selCap) return;

    const all = getAllTrainingContent();
    const meses = Array.from(new Set(all.map(i => i.mes).filter(Boolean)));
    const caps = Array.from(new Set(all.map(i => i.capacitacion).filter(Boolean)));

    const curMes = selMes.value;
    const curCap = selCap.value;

    selMes.innerHTML = '<option value="ALL">Todos los Meses / Programas</option>' +
        meses.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
    if (meses.includes(curMes)) selMes.value = curMes;

    selCap.innerHTML = '<option value="ALL">Todas las Capacitaciones</option>' +
        caps.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if (caps.includes(curCap)) selCap.value = curCap;
}

function renderCatalogoContenidos() {
    const container = document.getElementById('catalogo-list-container');
    if (!container) return;

    const mesFilter = document.getElementById('cat-filter-mes')?.value || 'ALL';
    const capFilter = document.getElementById('cat-filter-cap')?.value || 'ALL';
    const search = normalizeText(document.getElementById('cat-search-text')?.value || '');

    const all = getAllTrainingContent().filter(item => {
        if (mesFilter !== 'ALL' && item.mes !== mesFilter) return false;
        if (capFilter !== 'ALL' && item.capacitacion !== capFilter) return false;
        if (search) {
            const hay = normalizeText(`${item.mes} ${item.programa} ${item.capacitacion} ${item.unidad} ${item.capitulo} ${item.formato}`);
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    if (all.length === 0) {
        container.innerHTML = `<div class="glass-subpanel p-6 text-center text-white/60 text-sm">No hay contenidos que coincidan con el filtro.</div>`;
        return;
    }

    // Agrupar por Mes -> Programa -> Capacitación
    const groups = {};
    all.forEach(item => {
        const key = `${item.mes}|||${item.programa}|||${item.capacitacion}`;
        if (!groups[key]) {
            groups[key] = { mes: item.mes, programa: item.programa, capacitacion: item.capacitacion, items: [] };
        }
        groups[key].items.push(item);
    });

    const saMode = isSuperAdmin();

    container.innerHTML = Object.values(groups).map((g, gIdx) => `
        <div class="glass-panel p-5 space-y-3 border border-white/15">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/15 pb-3">
                <div>
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#CDD400]/20 text-[#CDD400] border border-[#CDD400]/45">📅 ${escapeHtml(g.mes)}</span>
                        <span class="text-xs text-white/75">${escapeHtml(g.programa)}</span>
                    </div>
                    <h4 class="text-base font-extrabold text-white mt-1">${escapeHtml(g.capacitacion)}</h4>
                </div>
                <span class="text-xs font-bold text-[#CDD400]">${g.items.length} Recurso(s)</span>
            </div>

            ${renderGroupedCourseContent(g.items, { prefix: `cat-${gIdx}`, showDelete: saMode })}
        </div>
    `).join('');
}

function showSaFeedback(msg, isOk = true) {
    const el = document.getElementById('sa-feedback');
    if (!el) return;
    el.classList.remove('hidden', 'bg-red-900/40', 'text-red-200', 'bg-white/10', 'text-[#CDD400]');
    el.classList.add(isOk ? 'bg-white/10' : 'bg-red-900/40', isOk ? 'text-[#CDD400]' : 'text-red-200');
    el.innerText = msg;
}

async function addTrainingContentItem() {
    if (!isSuperAdmin()) {
        alert('Acceso denegado: Solo un Super Administrador puede agregar contenido.');
        return;
    }

    const mes = document.getElementById('sa-mes').value.trim();
    const programa = document.getElementById('sa-programa').value.trim();
    const capacitacion = document.getElementById('sa-capacitacion').value.trim();
    const unidad = document.getElementById('sa-unidad').value.trim();
    const capitulo = document.getElementById('sa-capitulo').value.trim();
    const formato = document.getElementById('sa-formato').value;
    const url = document.getElementById('sa-url').value.trim();

    if (!mes || !programa || !capacitacion || !unidad || !url) {
        showSaFeedback('⚠️ Por favor completa Mes, Programa, Capacitación, Unidad y URL.', false);
        return;
    }

    const newItem = {
        id: 'CONT-' + Date.now(),
        mes,
        programa,
        capacitacion,
        unidad,
        capitulo,
        formato,
        url,
        autor: currentUser.name
    };

    const extras = getLocalExtraContent();
    extras.push(newItem);
    saveLocalExtraContent(extras);

    document.getElementById('sa-unidad').value = '';
    document.getElementById('sa-capitulo').value = '';
    document.getElementById('sa-url').value = '';

    populateCatalogoFilters();
    renderCatalogoContenidos();
    recordAuditEvent('CONTENIDO', 'Carga de Nuevo Recurso Multimedia', `${mes} • ${capacitacion} • ${unidad}${capitulo ? ' / ' + capitulo : ''}`);
    showSaFeedback('⏳ Guardado localmente. Sincronizando con Google Sheets...', true);

    try {
        const res = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify({ action: 'add_content', item: newItem, autor: currentUser.name })
        });
        const data = await res.json();
        if (data.ok && Array.isArray(data.contenido)) {
            sheetContentList = data.contenido;
            populateCatalogoFilters();
            renderCatalogoContenidos();
            showSaFeedback('✅ Recurso guardado y sincronizado en la hoja "Contenido de Capacitación" de Google Sheets.', true);
        } else {
            showSaFeedback('✅ Recurso guardado en el navegador. (Recuerda actualizar/implementar el nuevo app_script.gs para sincronizar directo al Sheet).', true);
        }
    } catch (e) {
        showSaFeedback('✅ Recurso agregado localmente. Puedes exportarlo como CSV o actualizar tu Apps Script para persistir directo en Sheets.', true);
    }
}

async function deleteTrainingContentItem(id) {
    if (!isSuperAdmin()) return;
    if (!confirm('¿Eliminar este recurso del catálogo?')) return;

    const extras = getLocalExtraContent().filter(i => i.id !== id);
    saveLocalExtraContent(extras);
    if (sheetContentList.length > 0) {
        sheetContentList = sheetContentList.filter(i => i.id !== id);
    }
    renderCatalogoContenidos();
    recordAuditEvent('CONTENIDO', 'Eliminación de Recurso Multimedia', `ID recurso: ${id}`);

    try {
        await fetch(API_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete_content', id })
        });
    } catch (e) {}
}

async function syncContentSheetToGoogle() {
    if (!isSuperAdmin()) return;
    showSaFeedback('⏳ Creando y sincronizando la hoja "Contenido de Capacitación" en Google Sheets...', true);
    try {
        const res = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify({ action: 'init_content_sheet' })
        });
        const data = await res.json();
        if (data.ok && Array.isArray(data.contenido)) {
            sheetContentList = data.contenido;
            populateCatalogoFilters();
            renderCatalogoContenidos();
            showSaFeedback(`✅ Hoja "Contenido de Capacitación" creada y sincronizada con ${data.contenido.length} registros.`, true);
        } else {
            showSaFeedback('⚠️ El Apps Script publicado aún no tiene la acción init_content_sheet. Copia el código actualizado de app_script.gs en tu editor de Google Apps Script y crea una nueva implementación.', false);
        }
    } catch (e) {
        showSaFeedback('⚠️ No se pudo conectar con Apps Script para crear la hoja automáticamente. Puedes descargar el .csv e importarlo, o redesplegar app_script.gs.', false);
    }
}

function exportContentSheetCSV() {
    const all = getAllTrainingContent();
    if (isAuthorized()) {
        recordAuditEvent('DESCARGA', 'Descarga Catálogo Contenido (.csv)', `${all.length} recursos exportados`);
    }
    let csv = '\uFEFF';
    csv += 'ID,Mes,Programa,Capacitación,Unidad,Capítulo,Formato,URL\n';
    all.forEach(item => {
        const q = v => `"${String(v || '').replace(/"/g, '""')}"`;
        csv += [q(item.id), q(item.mes), q(item.programa), q(item.capacitacion), q(item.unidad), q(item.capitulo), q(item.formato), q(item.url)].join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Contenido_de_Capacitacion_RB_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/** Exportación del reporte histórico a archivo CSV de Excel */
function downloadHistoricoReport() {
    if (!isAuthorized()) return;
    const colabs = filteredColaboradoresData.length > 0 ? filteredColaboradoresData : getColaboradoresTrazabilidadData();
    const cursos = getHistoricoCursosData();
    recordAuditEvent('DESCARGA', 'Descarga Reporte Histórico (.csv)', `${cursos.length} cursos y ${colabs.length} colaboradores`);

    let csvContent = '\uFEFF';
    csvContent += '--- REPORTES DE CAPACITACIÓN BUK-RB - HISTÓRICO Y TRAZABILIDAD ---\n\n';
    csvContent += '1. HISTÓRICO DE CAPACITACIONES POR MES\n';
    csvContent += 'Mes,Curso,Público Objetivo,Participación (Cant.),% Participación,Aprobación (Cant.),% Aprobación,Promedio Valoración\n';
    cursos.forEach(c => {
        csvContent += `"${c.mes}","${c.curso}",${c.publico_objetivo},${c.participacion_cant},${Number(c.participacion_pct).toFixed(1)}%,${c.aprobacion_cant},${Number(c.aprobacion_pct).toFixed(1)}%,${Number(c.promedio_satisfaccion).toFixed(1)}\n`;
    });

    csvContent += '\n2. TRAZABILIDAD DE COLABORADORES Y RECURRENCIA POR ÁREA\n';
    csvContent += 'Cédula,Nombre,Área,Cursos Asignados,Cursos Participados,Cursos Aprobados,% Participación,% Aprobación,Estado Alerta\n';
    colabs.forEach(c => {
        let estadoStr = 'Destacado';
        if (c.pct_participacion < 50 || c.pct_aprobacion < 50) estadoStr = 'Recurrencia Critica';
        else if (c.pct_participacion < 70) estadoStr = 'Baja Participacion';
        else if (c.pct_aprobacion < 70) estadoStr = 'Baja Aprobacion';

        csvContent += `"${c.cedula || ''}","${c.nombre}","${c.area}",${c.asignados},${c.participados},${c.aprobados},${Number(c.pct_participacion).toFixed(1)}%,${Number(c.pct_aprobacion).toFixed(1)}%,"${estadoStr}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Historico_Capacitaciones_RB_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ================================================================
// PESTAÑA 5: AUDITORÍA & USABILIDAD JSON (EXCLUSIVO SUPER ADMIN)
// Lectura y escritura automática en la nube independiente de caché
// ================================================================

function getFormattedColDate(d) {
    return d.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

function mergeAuditLogArrays(...lists) {
    const map = new Map();
    lists.flat().forEach(item => {
        if (!item || typeof item !== 'object') return;
        const key = item.id || `${item.fecha_iso || ''}|${item.usuario || ''}|${item.accion || ''}|${item.detalle || ''}`;
        if (!map.has(key)) {
            map.set(key, item);
        }
    });
    return Array.from(map.values()).sort((a, b) => {
        const da = String(a.fecha_iso || '');
        const db = String(b.fecha_iso || '');
        return db.localeCompare(da);
    });
}

function extractFallbackAuditLogsFromExtraUsers(extraUsersList) {
    if (!Array.isArray(extraUsersList)) return [];
    const logs = [];
    extraUsersList.forEach(u => {
        if (isAuditLogCarrier(u) && u.log && typeof u.log === 'object') {
            logs.push(u.log);
        }
    });
    return logs;
}

function syncAuditStateFromPayload(payload) {
    if (!payload || typeof payload !== 'object') return;
    if (Array.isArray(payload.extra_users)) {
        apiExtraUsers = payload.extra_users.filter(u => !isAuditLogCarrier(u));
    }
    const cloudDirect = Array.isArray(payload.usabilidad_logs) ? payload.usabilidad_logs : [];
    const cloudFallback = extractFallbackAuditLogsFromExtraUsers(payload.extra_users || []);
    auditLogs = mergeAuditLogArrays(cloudDirect, cloudFallback, staticSeedLogs, sessionUnsyncedLogs);
    if (isSuperAdmin() && currentHistoricoTab === 'auditoria') {
        renderAuditDashboard();
    }
}

async function loadStaticAuditSeedJson() {
    if (window.location.protocol === 'file:') return;
    try {
        const res = await fetch(`usabilidad_logs.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (json && Array.isArray(json.logs)) {
            staticSeedLogs = json.logs;
            auditLogs = mergeAuditLogArrays(auditLogs, staticSeedLogs, sessionUnsyncedLogs);
            if (isSuperAdmin() && currentHistoricoTab === 'auditoria') {
                renderAuditDashboard();
            }
        }
    } catch (e) {}
}

function setAuditSyncBadge(text, ok = true) {
    const badge = document.getElementById('audit-sync-badge');
    if (!badge) return;
    badge.textContent = text;
    badge.className = `text-[11px] font-mono ${ok ? 'text-[#CDD400]' : 'text-yellow-300'}`;
}

async function persistAuditLogToCloud(entry) {
    setAuditSyncBadge('⏳ Guardando huella en JSON nube...', true);
    try {
        const res = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify({ action: 'log_activity', entry })
        });
        const data = await res.json();
        if (data && data.ok) {
            if (Array.isArray(data.logs)) {
                auditLogs = mergeAuditLogArrays(data.logs, staticSeedLogs, sessionUnsyncedLogs);
            }
            sessionUnsyncedLogs = sessionUnsyncedLogs.filter(x => x.id !== entry.id);
            setAuditSyncBadge(`✅ Sincronizado en nube (.json / Apps Script) • ${getFormattedColDate(new Date())}`, true);
            if (isSuperAdmin() && currentHistoricoTab === 'auditoria') {
                renderAuditDashboard();
            }
            return;
        }
    } catch (e) {}

    // Fallback automático sobre Apps Script existente (PropertiesService JSON) si aún no se redesplegó log_activity
    try {
        const carrierUser = {
            password: `__AUDIT_LOG__${entry.id}`,
            name: '__AUDIT_LOG__',
            role: '__AUDIT_LOG__',
            log: entry
        };
        const res2 = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify({ action: 'add_user', user: carrierUser })
        });
        const data2 = await res2.json();
        if (data2 && data2.ok) {
            const fallbackLogs = extractFallbackAuditLogsFromExtraUsers(data2.users || []);
            auditLogs = mergeAuditLogArrays(auditLogs, fallbackLogs, staticSeedLogs, sessionUnsyncedLogs);
            sessionUnsyncedLogs = sessionUnsyncedLogs.filter(x => x.id !== entry.id);
            setAuditSyncBadge(`✅ Guardado en JSON Nube (Compatible) • ${getFormattedColDate(new Date())}`, true);
            if (isSuperAdmin() && currentHistoricoTab === 'auditoria') {
                renderAuditDashboard();
            }
            return;
        }
    } catch (e2) {}

    setAuditSyncBadge('⚠️ Registrado en sesión actual (reintentando nube)', false);
}

function recordAuditEvent(categoria, accion, detalle = '') {
    if (!currentUser) return;
    const now = new Date();
    const entry = {
        id: `LOG-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
        fecha_iso: now.toISOString(),
        fecha_local: getFormattedColDate(now),
        usuario: currentUser.name || 'Usuario',
        documento: currentUser.password || '',
        rol: currentUser.role || 'Administrador',
        categoria: categoria || 'CONSULTA',
        accion: accion || 'Actividad',
        detalle: String(detalle || '').slice(0, 240),
        origen: window.location.protocol === 'file:' ? 'Local HTML' : window.location.hostname
    };

    sessionUnsyncedLogs.unshift(entry);
    auditLogs = mergeAuditLogArrays(auditLogs, sessionUnsyncedLogs, staticSeedLogs);

    if (isSuperAdmin() && currentHistoricoTab === 'auditoria') {
        renderAuditDashboard();
    }

    persistAuditLogToCloud(entry);
}

async function refreshAuditLogsFromCloud(silent = false) {
    if (!isSuperAdmin()) return;
    if (!silent) setAuditSyncBadge('⏳ Sincronizando bitácora desde la nube...', true);
    try {
        const res = await fetch(`${API_ENDPOINT}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const payload = await res.json();
        syncAuditStateFromPayload(payload);
        await loadStaticAuditSeedJson();
        setAuditSyncBadge(`✅ Bitácora JSON al día (${auditLogs.length} eventos)`, true);
        renderAuditDashboard();
    } catch (err) {
        setAuditSyncBadge('⚠️ Error al consultar nube (mostrando últimos registros)', false);
        renderAuditDashboard();
    }
}

function getCategoryBadgeHtml(cat) {
    const c = String(cat || '').toUpperCase();
    if (c.includes('CONEX')) return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#CDD400]/20 text-[#CDD400] border border-[#CDD400]/45">🔑 Conexión</span>';
    if (c.includes('DESCARGA')) return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">📥 Descarga</span>';
    if (c.includes('CONTENIDO')) return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-200 border border-sky-400/40">🎬 Contenido</span>';
    return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white border border-white/25">🔍 Consulta</span>';
}

function renderAuditDashboard() {
    if (!isSuperAdmin()) return;
    const logs = auditLogs || [];

    const totalEl = document.getElementById('audit-kpi-total');
    const loginsEl = document.getElementById('audit-kpi-logins');
    const queriesEl = document.getElementById('audit-kpi-queries');
    const downloadsEl = document.getElementById('audit-kpi-downloads');

    const loginsCnt = logs.filter(l => String(l.categoria).toUpperCase().includes('CONEX')).length;
    const queriesCnt = logs.filter(l => {
        const c = String(l.categoria).toUpperCase();
        return c.includes('CONSULTA') || c.includes('CONTENIDO');
    }).length;
    const downloadsCnt = logs.filter(l => String(l.categoria).toUpperCase().includes('DESCARGA')).length;

    if (totalEl) totalEl.innerText = logs.length.toLocaleString('es-CO');
    if (loginsEl) loginsEl.innerText = loginsCnt.toLocaleString('es-CO');
    if (queriesEl) queriesEl.innerText = queriesCnt.toLocaleString('es-CO');
    if (downloadsEl) downloadsEl.innerText = downloadsCnt.toLocaleString('es-CO');

    // Resumen por usuario
    const userSummaryEl = document.getElementById('audit-users-summary');
    const selUser = document.getElementById('audit-filter-user');
    const userMap = new Map();

    logs.forEach(l => {
        const name = l.usuario || 'Desconocido';
        if (!userMap.has(name)) {
            userMap.set(name, {
                usuario: name,
                rol: l.rol || 'Administrador',
                ultima_fecha: l.fecha_local || l.fecha_iso || '',
                conexiones: 0,
                consultas: 0,
                descargas: 0,
                total: 0
            });
        }
        const entry = userMap.get(name);
        entry.total++;
        const cat = String(l.categoria).toUpperCase();
        if (cat.includes('CONEX')) entry.conexiones++;
        else if (cat.includes('DESCARGA')) entry.descargas++;
        else entry.consultas++;
    });

    if (userSummaryEl) {
        const summaryCards = Array.from(userMap.values()).sort((a, b) => b.total - a.total);
        userSummaryEl.innerHTML = summaryCards.length > 0
            ? summaryCards.map(u => `
                <div class="glass-subpanel p-3.5 border border-white/15 space-y-2">
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <p class="text-sm font-extrabold text-white truncate">${escapeHtml(u.usuario)}</p>
                            <p class="text-[11px] font-semibold ${u.rol === 'Super Administrador' ? 'text-[#CDD400]' : 'text-white/70'}">${escapeHtml(u.rol)}</p>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#CDD400] text-[#001e47] flex-shrink-0">${u.total} mov.</span>
                    </div>
                    <p class="text-[11px] text-white/65">🕒 Última actividad: <strong class="text-white/90">${escapeHtml(u.ultima_fecha)}</strong></p>
                    <div class="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                        <div class="bg-white/5 rounded-lg py-1 border border-white/10">
                            <span class="text-white/60 block">Conexiones</span>
                            <strong class="text-[#CDD400] text-xs">${u.conexiones}</strong>
                        </div>
                        <div class="bg-white/5 rounded-lg py-1 border border-white/10">
                            <span class="text-white/60 block">Consultas</span>
                            <strong class="text-white text-xs">${u.consultas}</strong>
                        </div>
                        <div class="bg-white/5 rounded-lg py-1 border border-white/10">
                            <span class="text-white/60 block">Descargas</span>
                            <strong class="text-emerald-300 text-xs">${u.descargas}</strong>
                        </div>
                    </div>
                </div>
            `).join('')
            : '<p class="text-xs text-white/60 col-span-full text-center py-4">Aún no hay movimientos registrados en la bitácora JSON.</p>';
    }

    if (selUser) {
        const cur = selUser.value;
        const names = Array.from(userMap.keys()).sort();
        selUser.innerHTML = '<option value="ALL">Todos los Usuarios</option>' +
            names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
        if (names.includes(cur)) selUser.value = cur;
    }

    renderAuditTable();
}

function renderAuditTable() {
    const tbody = document.getElementById('audit-table-body');
    if (!tbody) return;

    const userFilter = document.getElementById('audit-filter-user')?.value || 'ALL';
    const catFilter = document.getElementById('audit-filter-cat')?.value || 'ALL';
    const search = normalizeText(document.getElementById('audit-search-text')?.value || '');

    const filtered = (auditLogs || []).filter(l => {
        if (userFilter !== 'ALL' && l.usuario !== userFilter) return false;
        if (catFilter !== 'ALL' && String(l.categoria || '').toUpperCase() !== catFilter.toUpperCase()) return false;
        if (search) {
            const hay = normalizeText(`${l.usuario} ${l.rol} ${l.categoria} ${l.accion} ${l.detalle} ${l.fecha_local}`);
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-6 text-center text-white/60">No hay registros de usabilidad que coincidan con el filtro.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.slice(0, 300).map(l => `
        <tr class="hover:bg-white/5 transition-colors">
            <td class="px-4 py-2.5 font-mono text-xs text-white/80 whitespace-nowrap">${escapeHtml(l.fecha_local || l.fecha_iso || '')}</td>
            <td class="px-4 py-2.5 font-semibold text-white whitespace-nowrap">${escapeHtml(l.usuario || 'N/A')}</td>
            <td class="px-4 py-2.5 text-xs ${l.rol === 'Super Administrador' ? 'text-[#CDD400] font-bold' : 'text-white/75'} whitespace-nowrap">${escapeHtml(l.rol || '')}</td>
            <td class="px-4 py-2.5 whitespace-nowrap">${getCategoryBadgeHtml(l.categoria)}</td>
            <td class="px-4 py-2.5 font-semibold text-white/95">${escapeHtml(l.accion || '')}</td>
            <td class="px-4 py-2.5 text-xs text-white/75">${escapeHtml(l.detalle || '—')}</td>
        </tr>
    `).join('');
}

function downloadAuditJsonFile() {
    if (!isSuperAdmin()) return;
    recordAuditEvent('DESCARGA', 'Descarga Bitácora usabilidad_logs.json', `${auditLogs.length} registros exportados en JSON`);
    const payload = {
        version: '1.0',
        actualizado_en: new Date().toISOString(),
        total_registros: auditLogs.length,
        logs: auditLogs
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'usabilidad_logs.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportAuditCSV() {
    if (!isSuperAdmin()) return;
    recordAuditEvent('DESCARGA', 'Exportación Bitácora Usabilidad (.csv)', `${auditLogs.length} eventos`);
    let csv = '\uFEFF';
    csv += 'ID,Fecha ISO,Fecha Hora Local,Usuario,Documento,Rol,Categoría,Acción,Detalle,Origen\n';
    (auditLogs || []).forEach(l => {
        const q = v => `"${String(v || '').replace(/"/g, '""')}"`;
        csv += [q(l.id), q(l.fecha_iso), q(l.fecha_local), q(l.usuario), q(l.documento), q(l.rol), q(l.categoria), q(l.accion), q(l.detalle), q(l.origen)].join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bitacora_Usabilidad_RB_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
