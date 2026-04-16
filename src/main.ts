import './style.css';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface KVRow { id: string; key: string; value: string; enabled: boolean; }
type Method    = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
type ReqTab    = 'params' | 'headers' | 'body' | 'auth';
type ResTab    = 'pretty' | 'raw' | 'headers';
type BodyType  = 'none' | 'json' | 'text' | 'form';
type AuthType  = 'none' | 'bearer' | 'basic';

interface ResponseData {
  status:     number;
  statusText: string;
  headers:    [string, string][];
  body:       string;
  time:       number;
  size:       number;
}

interface State {
  method:      Method;
  url:         string;
  reqTab:      ReqTab;
  resTab:      ResTab;
  params:      KVRow[];
  reqHeaders:  KVRow[];
  bodyType:    BodyType;
  bodyContent: string;
  authType:    AuthType;
  bearerToken: string;
  basicUser:   string;
  basicPass:   string;
  loading:     boolean;
  response:    ResponseData | null;
  error:       string | null;
}

// ─── Utils ─────────────────────────────────────────────────────────────────────

const uid    = () => Math.random().toString(36).slice(2, 9);
const mkRow  = (): KVRow => ({ id: uid(), key: '', value: '', enabled: true });
const qs     = <T extends Element>(sel: string, root: Element | Document = document) =>
  root.querySelector<T>(sel)!;

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightJSON(raw: string): string {
  try {
    const pretty  = JSON.stringify(JSON.parse(raw), null, 2);
    const escaped = escHtml(pretty);
    return escaped.replace(
      /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (m) => {
        let c = 'jh-n';
        if (m.startsWith('"')) c = m.endsWith(':') ? 'jh-k' : 'jh-s';
        else if (m === 'true' || m === 'false') c = 'jh-b';
        else if (m === 'null') c = 'jh-nl';
        return `<span class="${c}">${m}</span>`;
      },
    );
  } catch {
    return escHtml(raw);
  }
}

function isJSON(s: string): boolean {
  try { JSON.parse(s); return true; } catch { return false; }
}

function formatSize(bytes: number): string {
  if (bytes < 1024)          return `${bytes} B`;
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusClass(status: number): string {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'redirect';
  if (status >= 400 && status < 500) return 'client-err';
  if (status >= 500) return 'server-err';
  return '';
}

const METHOD_COLOR: Record<string, string> = {
  GET:     'var(--m-get)',
  POST:    'var(--m-post)',
  PUT:     'var(--m-put)',
  PATCH:   'var(--m-patch)',
  DELETE:  'var(--m-delete)',
  HEAD:    'var(--m-head)',
  OPTIONS: 'var(--m-options)',
};

// ─── State ─────────────────────────────────────────────────────────────────────

const state: State = {
  method:      'GET',
  url:         'https://jsonplaceholder.typicode.com/posts/1',
  reqTab:      'params',
  resTab:      'pretty',
  params:      [mkRow()],
  reqHeaders:  [mkRow()],
  bodyType:    'json',
  bodyContent: '',
  authType:    'none',
  bearerToken: '',
  basicUser:   '',
  basicPass:   '',
  loading:     false,
  response:    null,
  error:       null,
};

// ─── HTML builders ─────────────────────────────────────────────────────────────

function buildKVEditor(rows: KVRow[], ns: string): string {
  return `
    <div class="kv-editor" data-ns="${ns}">
      <div class="kv-head">
        <span></span>
        <span>Key</span>
        <span>Value</span>
        <span></span>
      </div>
      ${rows.map((row, i) => {
        const isLast = i === rows.length - 1;
        return `
          <div class="kv-row" data-id="${row.id}">
            <label><input
              type="checkbox"
              class="kv-check"
              data-ns="${ns}"
              data-id="${row.id}"
              ${row.enabled ? 'checked' : ''}
              ${isLast ? 'disabled' : ''}
            /></label>
            <input
              class="kv-input kv-key"
              type="text"
              placeholder="Key"
              value="${escHtml(row.key)}"
              data-ns="${ns}"
              data-id="${row.id}"
              data-field="key"
              ${!row.enabled && !isLast ? 'style="opacity:.45"' : ''}
            />
            <input
              class="kv-input kv-val"
              type="text"
              placeholder="Value"
              value="${escHtml(row.value)}"
              data-ns="${ns}"
              data-id="${row.id}"
              data-field="value"
              ${!row.enabled && !isLast ? 'style="opacity:.45"' : ''}
            />
            <button
              class="kv-del-btn"
              data-ns="${ns}"
              data-id="${row.id}"
              title="Remove row"
              ${isLast ? 'style="visibility:hidden"' : ''}
            >✕</button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function buildBodyTab(): string {
  const types: { id: BodyType; label: string }[] = [
    { id: 'none', label: 'none' },
    { id: 'json', label: 'JSON' },
    { id: 'text', label: 'Text' },
    { id: 'form', label: 'Form' },
  ];

  const typeRow = `
    <div class="body-type-row">
      ${types.map(t => `
        <button
          class="body-type-btn ${state.bodyType === t.id ? 'active' : ''}"
          data-bodytype="${t.id}"
        >
          ${state.bodyType === t.id ? '<span class="body-dot"></span>' : ''}
          ${t.label}
        </button>
      `).join('')}
      ${state.bodyType === 'json' ? `<button class="format-btn" id="fmt-json-btn">Format</button>` : ''}
    </div>
  `;

  if (state.bodyType === 'none') {
    return `
      <div class="body-tab">
        ${typeRow}
        <div class="body-none-msg">No body for this request.</div>
      </div>
    `;
  }

  const placeholder = state.bodyType === 'json'
    ? '{\n  "key": "value"\n}'
    : state.bodyType === 'form'
    ? 'key1=value1&key2=value2'
    : 'Enter plain text...';

  return `
    <div class="body-tab">
      ${typeRow}
      <textarea
        class="body-textarea"
        id="body-textarea"
        placeholder="${escHtml(placeholder)}"
        spellcheck="false"
      >${escHtml(state.bodyContent)}</textarea>
    </div>
  `;
}

function buildAuthTab(): string {
  const authTypes = [
    { id: 'none',   label: 'No Auth' },
    { id: 'bearer', label: 'Bearer Token' },
    { id: 'basic',  label: 'Basic Auth' },
  ];

  const selectHtml = `
    <div class="auth-type-row">
      <span class="auth-type-label">Auth Type</span>
      <select class="auth-select" id="auth-type-select">
        ${authTypes.map(a => `
          <option value="${a.id}" ${state.authType === a.id ? 'selected' : ''}>${a.label}</option>
        `).join('')}
      </select>
    </div>
  `;

  let fields = '';
  if (state.authType === 'bearer') {
    fields = `
      <div class="auth-fields">
        <div class="auth-field-row">
          <span class="auth-field-label">Token</span>
          <input
            class="auth-field-input"
            id="bearer-token"
            type="password"
            placeholder="Bearer token..."
            value="${escHtml(state.bearerToken)}"
          />
        </div>
      </div>
    `;
  } else if (state.authType === 'basic') {
    fields = `
      <div class="auth-fields">
        <div class="auth-field-row">
          <span class="auth-field-label">Username</span>
          <input
            class="auth-field-input"
            id="basic-user"
            type="text"
            placeholder="Username"
            value="${escHtml(state.basicUser)}"
          />
        </div>
        <div class="auth-field-row">
          <span class="auth-field-label">Password</span>
          <input
            class="auth-field-input"
            id="basic-pass"
            type="password"
            placeholder="Password"
            value="${escHtml(state.basicPass)}"
          />
        </div>
      </div>
    `;
  } else {
    fields = `<p class="auth-none-msg">This request does not use any authorization.</p>`;
  }

  return `<div class="auth-tab">${selectHtml}${fields}</div>`;
}

function countActive(rows: KVRow[]): number {
  return rows.slice(0, -1).filter(r => r.enabled && (r.key || r.value)).length;
}

function buildRequestPanel(): string {
  const tabs: { id: ReqTab; label: string; count?: number }[] = [
    { id: 'params',  label: 'Params',  count: countActive(state.params) },
    { id: 'headers', label: 'Headers', count: countActive(state.reqHeaders) },
    { id: 'body',    label: 'Body' },
    { id: 'auth',    label: 'Auth' },
  ];

  const tabNav = `
    <nav class="tab-nav">
      ${tabs.map(t => {
        const hasCount = t.count !== undefined;
        const showBadge = hasCount && (t.count as number) > 0;
        return `
          <button class="tab-btn ${state.reqTab === t.id ? 'active' : ''}" data-reqtab="${t.id}">
            ${t.label}
            ${showBadge ? `<span class="tab-badge ${state.reqTab === t.id ? 'active-badge' : ''}">${t.count}</span>` : ''}
          </button>
        `;
      }).join('')}
    </nav>
  `;

  let content = '';
  if (state.reqTab === 'params')  content = buildKVEditor(state.params, 'params');
  if (state.reqTab === 'headers') content = buildKVEditor(state.reqHeaders, 'headers');
  if (state.reqTab === 'body')    content = buildBodyTab();
  if (state.reqTab === 'auth')    content = buildAuthTab();

  return `
    <section class="request-panel">
      ${tabNav}
      <div class="tab-content">${content}</div>
    </section>
  `;
}

function buildResponsePanel(): string {
  const resTabs: { id: ResTab; label: string }[] = [
    { id: 'pretty',  label: 'Pretty' },
    { id: 'raw',     label: 'Raw' },
    { id: 'headers', label: 'Headers' },
  ];

  const panelLabel = `
    <div class="panel-label">
      <span class="panel-label-text">Response</span>
    </div>
  `;

  if (state.loading) {
    return `
      <section class="response-panel">
        ${panelLabel}
        <div class="tab-content">
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <span>Sending request…</span>
          </div>
        </div>
      </section>
    `;
  }

  if (state.error) {
    const isCORS = state.error.toLowerCase().includes('failed to fetch') ||
                   state.error.toLowerCase().includes('networkerror') ||
                   state.error.toLowerCase().includes('load failed');
    return `
      <section class="response-panel">
        ${panelLabel}
        <div class="tab-content">
          <div class="error-state">
            <div class="error-title">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 11.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75zm.75-4.5a.75.75 0 0 1-1.5 0V5a.75.75 0 0 1 1.5 0v3z"/>
              </svg>
              Request Failed
            </div>
            <pre class="error-body">${escHtml(state.error)}</pre>
            ${isCORS ? `
              <div class="cors-hint">
                <strong>Possible CORS issue.</strong> The server may not allow requests from this origin.
                Try testing a local API or one with CORS enabled (e.g. <code>jsonplaceholder.typicode.com</code>).
              </div>
            ` : ''}
          </div>
        </div>
      </section>
    `;
  }

  if (!state.response) {
    return `
      <section class="response-panel">
        ${panelLabel}
        <div class="tab-content">
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
            <p class="empty-title">Hit Send to see a response</p>
            <p class="empty-sub">Enter a URL above, configure your request, and press Send.</p>
          </div>
        </div>
      </section>
    `;
  }

  const { status, statusText, headers, body, time, size } = state.response;
  const sc   = statusClass(status);
  const bodyIsJSON = isJSON(body);

  const statusBar = `
    <div class="res-status-bar">
      <span class="status-badge ${sc}">${status} ${escHtml(statusText)}</span>
      <div class="res-meta">
        <span class="res-meta-item"><span class="res-meta-label">Time&nbsp;</span>${time}ms</span>
        <span class="res-meta-item"><span class="res-meta-label">Size&nbsp;</span>${formatSize(size)}</span>
      </div>
      <div class="res-actions">
        <button class="copy-btn" id="copy-btn" title="Copy response body">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1H2V6h1V5H2z"/>
          </svg>
          Copy
        </button>
      </div>
    </div>
  `;

  const tabNav = `
    <nav class="tab-nav">
      ${resTabs.map(t => `
        <button class="tab-btn ${state.resTab === t.id ? 'active' : ''}" data-restab="${t.id}">
          ${t.label}
          ${t.id === 'headers' ? `<span class="tab-badge ${state.resTab === t.id ? 'active-badge' : ''}">${headers.length}</span>` : ''}
        </button>
      `).join('')}
    </nav>
  `;

  let bodyHtml = '';
  if (state.resTab === 'pretty') {
    const rendered = bodyIsJSON ? highlightJSON(body) : escHtml(body);
    bodyHtml = `<pre class="res-pretty">${rendered}</pre>`;
  } else if (state.resTab === 'raw') {
    bodyHtml = `<pre class="res-raw">${escHtml(body)}</pre>`;
  } else {
    bodyHtml = `
      <table class="headers-table">
        <thead>
          <tr><th>Header</th><th>Value</th></tr>
        </thead>
        <tbody>
          ${headers.map(([k, v]) => `
            <tr>
              <td class="hdr-key">${escHtml(k)}</td>
              <td class="hdr-val">${escHtml(v)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  return `
    <section class="response-panel">
      ${panelLabel}
      ${statusBar}
      ${tabNav}
      <div class="tab-content res-body">${bodyHtml}</div>
    </section>
  `;
}

function buildApp(): string {
  const color = METHOD_COLOR[state.method] ?? 'var(--text)';

  return `
    <header class="header">
      <div class="header-logo">
        <div class="header-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
        <span class="header-title">API Tester</span>
        <span class="header-subtitle">HTTP Request Builder</span>
      </div>
    </header>

    <div class="url-bar">
      <div class="method-wrap">
        <select class="method-select" id="method-select" style="color:${color}">
          ${(['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'] as Method[]).map(m => `
            <option value="${m}" ${state.method === m ? 'selected' : ''} style="color:${METHOD_COLOR[m]}">${m}</option>
          `).join('')}
        </select>
        <span class="method-caret">▾</span>
      </div>
      <input
        class="url-input"
        id="url-input"
        type="text"
        placeholder="https://api.example.com/endpoint"
        value="${escHtml(state.url)}"
        spellcheck="false"
        autocomplete="off"
      />
      <button class="send-btn" id="send-btn" ${state.loading ? 'disabled' : ''}>
        ${state.loading
          ? '<span class="spinner"></span> Sending…'
          : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
               <path d="M5 12h14M12 5l7 7-7 7"/>
             </svg> Send`}
      </button>
    </div>

    <div class="main-split">
      ${buildRequestPanel()}
      ${buildResponsePanel()}
    </div>
  `;
}

// ─── Render ─────────────────────────────────────────────────────────────────────

function render() {
  const root = document.getElementById('app')!;
  root.innerHTML = buildApp();
  bindEvents();
}

// ─── Event binding ─────────────────────────────────────────────────────────────

function bindEvents() {
  // Method select
  const methodSel = qs<HTMLSelectElement>('#method-select');
  if (methodSel) {
    methodSel.addEventListener('change', () => {
      state.method = methodSel.value as Method;
      methodSel.style.color = METHOD_COLOR[state.method];
    });
  }

  // URL input
  const urlInput = qs<HTMLInputElement>('#url-input');
  if (urlInput) {
    urlInput.addEventListener('input', () => { state.url = urlInput.value; });
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendRequest();
    });
  }

  // Send button
  const sendBtn = qs<HTMLButtonElement>('#send-btn');
  if (sendBtn) sendBtn.addEventListener('click', sendRequest);

  // Request tabs
  document.querySelectorAll<HTMLButtonElement>('[data-reqtab]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.reqTab = btn.dataset.reqtab as ReqTab;
      render();
    });
  });

  // Response tabs
  document.querySelectorAll<HTMLButtonElement>('[data-restab]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.resTab = btn.dataset.restab as ResTab;
      render();
    });
  });

  // KV editor – params & headers
  for (const ns of ['params', 'headers'] as const) {
    const rows = ns === 'params' ? state.params : state.reqHeaders;

    // key/value input
    document.querySelectorAll<HTMLInputElement>(`.kv-input[data-ns="${ns}"]`).forEach(input => {
      input.addEventListener('input', () => {
        const row = rows.find(r => r.id === input.dataset.id);
        if (!row) return;
        const field = input.dataset.field as 'key' | 'value';
        row[field] = input.value;
        // auto-add row when last row gets content
        const last = rows[rows.length - 1];
        if (row.id === last.id && (last.key || last.value)) {
          rows.push(mkRow());
          render();
        }
      });
    });

    // enable/disable checkbox
    document.querySelectorAll<HTMLInputElement>(`.kv-check[data-ns="${ns}"]`).forEach(cb => {
      cb.addEventListener('change', () => {
        const row = rows.find(r => r.id === cb.dataset.id);
        if (row) { row.enabled = cb.checked; render(); }
      });
    });

    // delete button
    document.querySelectorAll<HTMLButtonElement>(`.kv-del-btn[data-ns="${ns}"]`).forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = rows.findIndex(r => r.id === btn.dataset.id);
        if (idx !== -1) { rows.splice(idx, 1); render(); }
      });
    });
  }

  // Body type buttons
  document.querySelectorAll<HTMLButtonElement>('[data-bodytype]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.bodyType = btn.dataset.bodytype as BodyType;
      render();
    });
  });

  // Body textarea
  const bodyTA = qs<HTMLTextAreaElement>('#body-textarea');
  if (bodyTA) {
    bodyTA.addEventListener('input', () => { state.bodyContent = bodyTA.value; });
  }

  // Format JSON button
  const fmtBtn = qs<HTMLButtonElement>('#fmt-json-btn');
  if (fmtBtn) {
    fmtBtn.addEventListener('click', () => {
      try {
        state.bodyContent = JSON.stringify(JSON.parse(state.bodyContent), null, 2);
        render();
      } catch {
        // not valid JSON – ignore
      }
    });
  }

  // Auth type select
  const authSel = qs<HTMLSelectElement>('#auth-type-select');
  if (authSel) {
    authSel.addEventListener('change', () => {
      state.authType = authSel.value as AuthType;
      render();
    });
  }

  // Bearer token input
  const bearerInput = qs<HTMLInputElement>('#bearer-token');
  if (bearerInput) {
    bearerInput.addEventListener('input', () => { state.bearerToken = bearerInput.value; });
  }

  // Basic auth inputs
  const basicUser = qs<HTMLInputElement>('#basic-user');
  if (basicUser) basicUser.addEventListener('input', () => { state.basicUser = basicUser.value; });
  const basicPass = qs<HTMLInputElement>('#basic-pass');
  if (basicPass) basicPass.addEventListener('input', () => { state.basicPass = basicPass.value; });

  // Copy response button
  const copyBtn = qs<HTMLButtonElement>('#copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      if (!state.response) return;
      try {
        await navigator.clipboard.writeText(state.response.body);
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1H2V6h1V5H2z"/>
          </svg> Copy`;
          copyBtn.classList.remove('copied');
        }, 2000);
      } catch { /* clipboard unavailable */ }
    });
  }
}

// ─── Fetch helper ──────────────────────────────────────────────────────────────
// When running inside Tauri, requests go through the native Rust HTTP client,
// which bypasses browser CORS restrictions entirely.

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function appFetch(url: string, init?: RequestInit): Promise<Response> {
  if (isTauri()) {
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
    return tauriFetch(url, init) as unknown as Response;
  }
  return fetch(url, init);
}

// ─── Send Request ──────────────────────────────────────────────────────────────

async function sendRequest() {
  if (state.loading) return;

  // Build URL with params
  let url = state.url.trim();
  if (!url) return;

  const activeParams = state.params.filter(r => r.enabled && r.key);
  if (activeParams.length > 0) {
    try {
      const u = new URL(url);
      activeParams.forEach(r => u.searchParams.set(r.key, r.value));
      url = u.toString();
    } catch {
      // not a valid URL, still try
    }
  }

  // Build headers
  const headers: Record<string, string> = {};
  state.reqHeaders
    .filter(r => r.enabled && r.key)
    .forEach(r => { headers[r.key] = r.value; });

  // Auth header
  if (state.authType === 'bearer' && state.bearerToken) {
    headers['Authorization'] = `Bearer ${state.bearerToken}`;
  } else if (state.authType === 'basic' && (state.basicUser || state.basicPass)) {
    headers['Authorization'] = `Basic ${btoa(`${state.basicUser}:${state.basicPass}`)}`;
  }

  // Body
  let body: string | undefined;
  const methodHasBody = !['GET', 'HEAD', 'OPTIONS'].includes(state.method);
  if (methodHasBody && state.bodyType !== 'none' && state.bodyContent.trim()) {
    body = state.bodyContent;
    if (state.bodyType === 'json' && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    } else if (state.bodyType === 'form' && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
  }

  state.loading  = true;
  state.response = null;
  state.error    = null;
  render();

  const start = performance.now();

  try {
    const res = await appFetch(url, {
      method:  state.method,
      headers,
      body,
    });

    const elapsed = Math.round(performance.now() - start);
    const text    = await res.text();
    const size    = new TextEncoder().encode(text).byteLength;

    state.response = {
      status:     res.status,
      statusText: res.statusText || httpStatusText(res.status),
      headers:    [...res.headers.entries()],
      body:       text,
      time:       elapsed,
      size,
    };
    // Auto-switch to pretty if response is JSON
    if (isJSON(text)) state.resTab = 'pretty';
    else state.resTab = 'raw';

  } catch (err: unknown) {
    state.error = err instanceof Error ? err.message : String(err);
  } finally {
    state.loading = false;
    render();
  }
}

function httpStatusText(code: number): string {
  const map: Record<number, string> = {
    200: 'OK', 201: 'Created', 204: 'No Content',
    301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
    404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict',
    422: 'Unprocessable Entity', 429: 'Too Many Requests',
    500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable',
  };
  return map[code] ?? '';
}

// ─── Boot ───────────────────────────────────────────────────────────────────────

render();
