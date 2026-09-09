let companies = [];
let authMode = 'login';
let pendingAttachments = [];
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

async function api(path, options = {}) { const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || '通信に失敗しました'); return body; }
async function loadCompanies() { const result = await api('/api/companies'); companies = result.companies || []; }
async function persist() { await api('/api/companies', { method: 'PUT', body: JSON.stringify({ companies }) }); }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
function statusLabel(status) { return { active: '選考中', offer: '内定', closed: '終了' }[status] || status; }
function dateLabel(value) { return value ? new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric' }).format(new Date(value)) : ''; }
function initials(name) { return [...(name || '？')].slice(0, 2).join(''); }
async function saveAndRender(message) { try { await persist(); renderAll(); if (message) showToast(message); } catch (error) { showToast(error.message); } }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2400); }

function renderAll() {
  $('#companyCount').textContent = companies.length;
  $('#activeCount').textContent = companies.filter((company) => company.status === 'active').length;
  $('#memoCount').textContent = companies.filter((company) => company.esNote || company.interviewNote).length;
  renderRecent(); renderCompanyGrid(); renderNotes(); populateQuickCompany();
}
function companyMarkup(company, compact = false) {
  return `<article class="company-row ${compact ? 'compact' : ''}" data-id="${company.id}"><div class="company-avatar">${escapeHtml(initials(company.name))}</div><div class="company-main"><div class="company-title"><h3>${escapeHtml(company.name)}</h3><span class="status status-${company.status}">${statusLabel(company.status)}</span></div><p>${escapeHtml(company.industry || '業界未登録')}</p></div><div class="company-date">${dateLabel(company.updatedAt)}</div><button class="more-button" data-edit="${company.id}" aria-label="編集">•••</button></article>`;
}
function renderRecent() { $('#recentCompanies').innerHTML = companies.length ? companies.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 4).map((company) => companyMarkup(company, true)).join('') : emptyState('まだ企業がありません', '最初の企業を登録してみましょう。', '企業を追加'); }
function renderCompanyGrid() {
  const query = ($('#searchInput')?.value || '').toLowerCase(); const filter = $('#statusFilter')?.value || 'all';
  const filtered = companies.filter((company) => `${company.name} ${company.industry}`.toLowerCase().includes(query) && (filter === 'all' || company.status === filter));
  $('#companiesGrid').innerHTML = filtered.length ? filtered.map((company) => `<article class="company-card"><div class="card-top"><div class="company-avatar">${escapeHtml(initials(company.name))}</div><span class="status status-${company.status}">${statusLabel(company.status)}</span><button class="more-button" data-edit="${company.id}" aria-label="編集">•••</button></div><h2>${escapeHtml(company.name)}</h2><p class="industry">${escapeHtml(company.industry || '業界未登録')}</p><div class="card-links">${company.mypageUrl ? `<a href="${safeUrl(company.mypageUrl)}" target="_blank" rel="noopener">マイページ ↗</a>` : '<span class="muted">マイページ未登録</span>'}${company.homepageUrl ? `<a href="${safeUrl(company.homepageUrl)}" target="_blank" rel="noopener">公式サイト ↗</a>` : ''}</div><div class="credential-strip"><span>ログイン情報</span><strong>${escapeHtml(company.loginId || '未登録')}</strong><button data-copy="${escapeHtml(company.loginPassword || '')}" title="パスワードをコピー">パスワードをコピー</button></div><div class="card-foot"><span>${company.attachments?.length || 0} 件の資料</span><span>${dateLabel(company.updatedAt)} 更新</span></div></article>`).join('') : emptyState('条件に合う企業がありません', '検索条件やステータスを変えてみてください。', '企業を追加');
}
function renderNotes() {
  const notes = companies.filter((company) => company.esNote || company.interviewNote);
  $('#notesList').innerHTML = notes.length ? notes.map((company) => `<article class="note-card"><div class="note-card-head"><div class="company-avatar small">${escapeHtml(initials(company.name))}</div><div><h2>${escapeHtml(company.name)}</h2><span>${statusLabel(company.status)} · ${dateLabel(company.updatedAt)}更新</span></div><button class="outline-button" data-edit="${company.id}">開く ↗</button></div><div class="note-columns"><div><span class="note-label">ES・志望動機</span><p>${escapeHtml(company.esNote || '未登録')}</p></div><div><span class="note-label">面接メモ</span><p>${escapeHtml(company.interviewNote || '未登録')}</p></div></div></article>`).join('') : emptyState('まだメモがありません', '企業情報にESや面接メモを追加できます。', '企業を追加');
}
function emptyState(title, copy, action) { return `<div class="empty-state"><span>✦</span><h2>${title}</h2><p>${copy}</p><button class="outline-button" id="emptyAddButton">＋ ${action}</button></div>`; }
function safeUrl(url) { return /^https?:\/\//i.test(url) ? escapeHtml(url) : '#'; }
function populateQuickCompany() { $('#quickCompany').innerHTML = `<option value="">企業を選ぶ</option>${companies.map((company) => `<option value="${company.id}">${escapeHtml(company.name)}</option>`).join('')}`; }

function openCompanyDialog(id) {
  const company = companies.find((item) => item.id === id);
  $('#companyForm').reset(); $('#editingId').value = company?.id || ''; $('#dialogTitle').textContent = company ? '企業情報を編集' : '企業を追加';
  $('#companyName').value = company?.name || ''; $('#companyIndustry').value = company?.industry || ''; $('#companyStatus').value = company?.status || 'active'; $('#mypageUrl').value = company?.mypageUrl || ''; $('#homepageUrl').value = company?.homepageUrl || ''; $('#loginId').value = company?.loginId || ''; $('#loginPassword').value = company?.password || ''; $('#esNote').value = company?.esNote || ''; $('#interviewNote').value = company?.interviewNote || '';
  pendingAttachments = company?.attachments ? [...company.attachments] : []; renderCustomFields(company?.fields || []); renderAttachments(); $('#companyDialog').showModal();
}
function renderCustomFields(fields = []) { $('#customFieldsList').innerHTML = fields.map((field) => customFieldMarkup(field.key, field.value)).join(''); }
function customFieldMarkup(key = '', value = '') { return `<div class="custom-field-row"><input class="field-key" placeholder="項目名（例：締切）" value="${escapeHtml(key)}" /><input class="field-value" placeholder="内容" value="${escapeHtml(value)}" /><button type="button" class="remove-field" aria-label="項目を削除">×</button></div>`; }
function renderAttachments() { $('#attachmentsList').innerHTML = pendingAttachments.map((file, index) => `<div class="attachment-item"><span>▧</span><strong>${escapeHtml(file.name)}</strong><small>${formatBytes(file.size)}</small><button type="button" data-remove-file="${index}">×</button></div>`).join(''); }
function formatBytes(bytes = 0) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function readFiles(fileList) { [...fileList].forEach((file) => { if (file.size > 10 * 1024 * 1024) return showToast('10MBを超えるファイルは追加できません'); const reader = new FileReader(); reader.onload = () => { pendingAttachments.push({ name: file.name, size: file.size, type: file.type, data: reader.result }); renderAttachments(); }; reader.readAsDataURL(file); }); }
function getFormCompany() { const id = $('#editingId').value || crypto.randomUUID(); const current = companies.find((company) => company.id === id); return { id, name: $('#companyName').value.trim(), industry: $('#companyIndustry').value.trim(), status: $('#companyStatus').value, mypageUrl: $('#mypageUrl').value.trim(), homepageUrl: $('#homepageUrl').value.trim(), loginId: $('#loginId').value.trim(), password: $('#loginPassword').value, esNote: $('#esNote').value.trim(), interviewNote: $('#interviewNote').value.trim(), fields: $$('.custom-field-row').map((row) => ({ key: row.querySelector('.field-key').value.trim(), value: row.querySelector('.field-value').value.trim() })).filter((field) => field.key || field.value), attachments: pendingAttachments, updatedAt: new Date().toISOString(), createdAt: current?.createdAt || new Date().toISOString() }; }

$$('.nav-item').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
$$('[data-view-target]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.viewTarget)));
function switchView(view) { $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === view)); $$('.view').forEach((section) => section.classList.toggle('active', section.id === `${view}View`)); $('#pageTitle').textContent = { dashboard: 'ダッシュボード', companies: '企業リスト', notes: 'ES・面接メモ' }[view]; }
$('#addCompanyButton').addEventListener('click', () => openCompanyDialog());
$('#cancelDialog').addEventListener('click', () => $('#companyDialog').close());
$('#togglePassword').addEventListener('click', () => { const input = $('#loginPassword'); input.type = input.type === 'password' ? 'text' : 'password'; });
$('#addFieldButton').addEventListener('click', () => $('#customFieldsList').insertAdjacentHTML('beforeend', customFieldMarkup()));
$('#fileInput').addEventListener('change', (event) => { readFiles(event.target.files); event.target.value = ''; });
$('#companyForm').addEventListener('submit', async (event) => { event.preventDefault(); const company = getFormCompany(); if (!company.name) return; const index = companies.findIndex((item) => item.id === company.id); if (index === -1) companies.unshift(company); else companies[index] = company; $('#companyDialog').close(); await saveAndRender(index === -1 ? '企業を登録しました' : '企業情報を更新しました'); });
$('#quickNoteForm').addEventListener('submit', async (event) => { event.preventDefault(); const company = companies.find((item) => item.id === $('#quickCompany').value); if (!company) return; company.interviewNote = `${company.interviewNote ? `${company.interviewNote}\n` : ''}${$('#quickNote').value.trim()}`; company.updatedAt = new Date().toISOString(); $('#quickNoteForm').reset(); await saveAndRender('面接メモを保存しました'); });
$('#searchInput').addEventListener('input', renderCompanyGrid); $('#statusFilter').addEventListener('change', renderCompanyGrid);
document.addEventListener('click', async (event) => { const edit = event.target.closest('[data-edit]'); if (edit) openCompanyDialog(edit.dataset.edit); const remove = event.target.closest('[data-remove-file]'); if (remove) { pendingAttachments.splice(Number(remove.dataset.removeFile), 1); renderAttachments(); } const removeField = event.target.closest('.remove-field'); if (removeField) removeField.closest('.custom-field-row').remove(); const copy = event.target.closest('[data-copy]'); if (copy && copy.dataset.copy) { await navigator.clipboard?.writeText(copy.dataset.copy); showToast('パスワードをコピーしました'); } if (event.target.id === 'emptyAddButton') openCompanyDialog(); });
$('#exportButton').addEventListener('click', () => { const blob = new Blob([JSON.stringify(companies, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `career-cabinet-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href); showToast('データを書き出しました'); });
$('#importButton').addEventListener('click', () => $('#importInput').click()); $('#importInput').addEventListener('change', (event) => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = async () => { try { const imported = JSON.parse(reader.result); if (!Array.isArray(imported)) throw new Error(); companies = imported; await saveAndRender('データを読み込みました'); } catch { showToast('読み込めるデータではありません'); } }; reader.readAsText(file); event.target.value = ''; });
$('#logoutButton').addEventListener('click', async () => { await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'logout', email: 'logout', password: 'logout123' }) }); location.reload(); });
$('#todayLabel').textContent = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
$('#authModeButton').addEventListener('click', () => { authMode = authMode === 'login' ? 'register' : 'login'; $('#authModeButton').textContent = authMode === 'login' ? '初めて使う方はこちら（アカウント登録）' : '登録済みの方はこちら（ログイン）'; $('#authSubmit').innerHTML = authMode === 'login' ? 'ログイン <span>↗</span>' : 'アカウントを作成 <span>↗</span>'; $('#authPassword').autocomplete = authMode === 'login' ? 'current-password' : 'new-password'; $('#authError').textContent = ''; });
$('#authForm').addEventListener('submit', async (event) => { event.preventDefault(); const submit = $('#authSubmit'); submit.disabled = true; $('#authError').textContent = ''; try { await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: authMode, email: $('#authEmail').value, password: $('#authPassword').value }) }); await loadCompanies(); $('#authScreen').classList.add('hidden'); renderAll(); } catch (error) { $('#authError').textContent = error.message; } finally { submit.disabled = false; } });
async function boot() { try { const session = await api('/api/auth'); if (!session.authenticated) return; await loadCompanies(); $('#authScreen').classList.add('hidden'); renderAll(); } catch { $('#authError').textContent = 'サーバーに接続できません。Vercelの設定を確認してください。'; } }
boot();
