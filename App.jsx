import { useState, useEffect, useMemo } from "react";

const STORAGE_KEY = "nuit-de-ran-customers";
const DAYS_JP = ["日", "月", "火", "水", "木", "金", "土"];

function calcAge(birthday) {
  if (!birthday) return null;
  const today = new Date();
  const b = new Date(birthday);
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}`;
}

function analyzeVisits(visits) {
  if (!visits || visits.length === 0) return null;
  const sorted = [...visits].sort((a, b) => new Date(a.date) - new Date(b.date));

  const dayCounts = {};
  sorted.forEach(v => {
    const d = DAYS_JP[new Date(v.date).getDay()];
    dayCounts[d] = (dayCounts[d] || 0) + 1;
  });
  const topDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

  let avgInterval = null;
  if (sorted.length >= 2) {
    const intervals = [];
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i].date) - new Date(sorted[i - 1].date)) / (1000 * 60 * 60 * 24);
      intervals.push(diff);
    }
    avgInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
  }

  const today = new Date();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysLeft = Math.ceil((endOfMonth - today) / (1000 * 60 * 60 * 24));
  let inviteEstimate = null;
  if (avgInterval) {
    inviteEstimate = Math.max(0, Math.floor(daysLeft / avgInterval));
  }

  const lastVisit = new Date(sorted[sorted.length - 1].date);
  const daysSinceLast = Math.floor((today - lastVisit) / (1000 * 60 * 60 * 24));

  let nextVisitEst = null;
  if (avgInterval) {
    const next = new Date(lastVisit.getTime() + avgInterval * 24 * 60 * 60 * 1000);
    nextVisitEst = next > today ? next : null;
  }

  return { topDay, dayCounts, avgInterval, inviteEstimate, daysSinceLast, nextVisitEst, sorted };
}

function IntervalLabel({ days }) {
  if (!days) return <span className="na">—</span>;
  if (days >= 30) return <span>{Math.round(days / 30)}ヶ月に1回</span>;
  if (days >= 7) return <span>{Math.round(days / 7)}週間に1回</span>;
  return <span>{days}日に1回</span>;
}

const emptyForm = {
  id: null, name: "", birthday: "", visits: [],
  newVisitDate: "", newVisitIsDouhan: false, douhanDest: "",
};

export default function App() {
  const [customers, setCustomers] = useState([]);
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) setCustomers(JSON.parse(data));
    } catch (_) {}
  }, []);

  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function openNew() {
    setForm({ ...emptyForm, id: crypto.randomUUID() });
    setView("form");
  }

  function openEdit(c) {
    setForm({ ...c, newVisitDate: "", newVisitIsDouhan: false, douhanDest: "" });
    setView("form");
  }

  function openDetail(c) {
    setSelected(c);
    setView("detail");
  }

  function addVisit() {
    if (!form.newVisitDate) return;
    const visit = {
      id: crypto.randomUUID(),
      date: form.newVisitDate,
      isDouhan: form.newVisitIsDouhan,
      douhanDest: form.newVisitIsDouhan ? form.douhanDest : "",
    };
    setForm(f => ({ ...f, visits: [...f.visits, visit], newVisitDate: "", newVisitIsDouhan: false, douhanDest: "" }));
  }

  function removeVisit(id) {
    setForm(f => ({ ...f, visits: f.visits.filter(v => v.id !== id) }));
  }

  function submitForm() {
    if (!form.name.trim()) return;
    const customer = { id: form.id, name: form.name, birthday: form.birthday, visits: form.visits };
    const exists = customers.find(c => c.id === form.id);
    const next = exists
      ? customers.map(c => c.id === form.id ? customer : c)
      : [...customers, customer];
    setCustomers(next);
    save(next);
    setView("list");
  }

  function deleteCustomer(id) {
    if (!confirm("このお客様を削除しますか？")) return;
    const next = customers.filter(c => c.id !== id);
    setCustomers(next);
    save(next);
    setView("list");
  }

  const filtered = useMemo(() =>
    customers.filter(c => c.name.includes(search)),
    [customers, search]
  );

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Noto+Serif+JP:wght@300;400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0c0c0e;
      --surface: #141418;
      --surface2: #1c1c22;
      --gold: #c9a84c;
      --gold2: #e8c96a;
      --rose: #c47a8a;
      --text: #e8e0d4;
      --muted: #7a7468;
      --border: rgba(201,168,76,0.15);
      --r: 10px;
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
    }
    html, body { height: 100%; overflow: hidden; }
    body { background: var(--bg); color: var(--text); font-family: 'Noto Serif JP', serif; }
    #root { height: 100%; }
    .app { max-width: 480px; margin: 0 auto; height: 100%; display: flex; flex-direction: column; }

    .header {
      padding: calc(16px + var(--safe-top)) 20px 16px;
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; gap: 12px;
      background: linear-gradient(180deg, rgba(201,168,76,0.05) 0%, transparent 100%);
      flex-shrink: 0;
    }
    .header-logo { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 300; color: var(--gold); letter-spacing: 0.12em; flex: 1; }
    .header-sub { font-size: 10px; color: var(--muted); letter-spacing: 0.2em; }
    .btn-icon { background: none; border: 1px solid var(--border); color: var(--gold); border-radius: 8px; width: 38px; height: 38px; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .btn-icon:hover { background: rgba(201,168,76,0.1); }

    .search-wrap { padding: 14px 20px; flex-shrink: 0; }
    .search-input { width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 10px 16px; color: var(--text); font-family: inherit; font-size: 14px; outline: none; transition: border-color 0.2s; }
    .search-input:focus { border-color: var(--gold); }
    .search-input::placeholder { color: var(--muted); }

    .list { flex: 1; padding: 0 20px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; padding-bottom: calc(80px + var(--safe-bottom)); }
    .card {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
      padding: 16px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; flex-shrink: 0;
    }
    .card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, var(--gold), var(--rose)); }
    .card:hover { border-color: rgba(201,168,76,0.4); background: var(--surface2); }
    .card-name { font-size: 17px; font-weight: 500; color: var(--text); margin-bottom: 4px; }
    .card-meta { font-size: 12px; color: var(--muted); display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .badge { background: rgba(201,168,76,0.12); color: var(--gold); border-radius: 4px; padding: 2px 8px; font-size: 11px; }
    .badge-rose { background: rgba(196,122,138,0.12); color: var(--rose); }
    .empty { text-align: center; padding: 60px 20px; color: var(--muted); font-size: 14px; line-height: 2; }

    .page { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .page-header { padding: calc(12px + var(--safe-top)) 20px 12px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
    .back-btn { background: none; border: none; color: var(--gold); cursor: pointer; font-size: 22px; line-height: 1; padding: 4px; }
    .page-title { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 300; color: var(--gold); letter-spacing: 0.08em; }
    .page-body { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 18px; padding-bottom: calc(20px + var(--safe-bottom)); }

    .section { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 18px; }
    .section-title { font-size: 10px; letter-spacing: 0.25em; color: var(--gold); text-transform: uppercase; margin-bottom: 14px; }
    .info-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; font-size: 14px; flex-wrap: wrap; }
    .info-label { color: var(--muted); font-size: 12px; min-width: 80px; }
    .info-value { color: var(--text); }

    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .stat-box { background: var(--surface2); border-radius: 8px; padding: 12px 14px; }
    .stat-label { font-size: 10px; color: var(--muted); letter-spacing: 0.15em; margin-bottom: 6px; }
    .stat-value { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600; color: var(--gold); line-height: 1.1; }
    .stat-sub { font-size: 11px; color: var(--muted); margin-top: 3px; }
    .stat-highlight { grid-column: 1/-1; background: linear-gradient(135deg, rgba(201,168,76,0.1), rgba(196,122,138,0.05)); border: 1px solid rgba(201,168,76,0.2); }
    .stat-value-big { font-size: 32px; }

    .day-bars { display: flex; gap: 6px; align-items: flex-end; height: 50px; margin-top: 8px; }
    .day-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .day-bar { width: 100%; background: rgba(201,168,76,0.15); border-radius: 3px 3px 0 0; min-height: 2px; }
    .day-bar.active { background: linear-gradient(180deg, var(--gold2), var(--gold)); }
    .day-label { font-size: 10px; color: var(--muted); }

    .visit-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; }
    .visit-item:last-child { border-bottom: none; }
    .visit-date { color: var(--text); flex: 1; }
    .visit-day { color: var(--muted); font-size: 11px; }
    .douhan-tag { font-size: 11px; color: var(--rose); background: rgba(196,122,138,0.1); padding: 2px 8px; border-radius: 4px; white-space: nowrap; }

    .form-group { margin-bottom: 16px; }
    .form-label { font-size: 11px; color: var(--gold); letter-spacing: 0.15em; margin-bottom: 6px; display: block; }
    .form-input { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; color: var(--text); font-family: inherit; font-size: 16px; outline: none; transition: border-color 0.2s; -webkit-appearance: none; }
    .form-input:focus { border-color: var(--gold); }
    .checkbox-row { display: flex; align-items: center; gap: 10px; font-size: 14px; cursor: pointer; color: var(--text); }
    .checkbox-row input { accent-color: var(--gold); width: 20px; height: 20px; cursor: pointer; flex-shrink: 0; }

    .btn { border: none; border-radius: 8px; padding: 14px 20px; font-family: inherit; font-size: 15px; cursor: pointer; transition: all 0.2s; font-weight: 500; letter-spacing: 0.05em; -webkit-tap-highlight-color: transparent; }
    .btn-gold { background: linear-gradient(135deg, var(--gold), var(--gold2)); color: #0c0c0e; width: 100%; }
    .btn-gold:active { opacity: 0.85; transform: scale(0.98); }
    .btn-danger { background: rgba(196,122,138,0.15); border: 1px solid rgba(196,122,138,0.3); color: var(--rose); width: 100%; margin-top: 8px; }
    .btn-add-visit { background: rgba(201,168,76,0.08); border: 1px dashed rgba(201,168,76,0.3); color: var(--gold); width: 100%; border-radius: 8px; padding: 12px; cursor: pointer; font-size: 14px; font-family: inherit; transition: all 0.2s; -webkit-tap-highlight-color: transparent; }
    .btn-add-visit:active { background: rgba(201,168,76,0.15); }

    .del-btn { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 20px; padding: 4px 8px; -webkit-tap-highlight-color: transparent; }
    .del-btn:active { color: var(--rose); }
    .na { color: var(--muted); }

    .fab { position: fixed; bottom: calc(28px + var(--safe-bottom)); right: 20px; }
    @media (min-width: 480px) { .fab { right: calc(50vw - 240px + 20px); } }
    .fab-btn { width: 60px; height: 60px; border-radius: 50%; border: none; background: linear-gradient(135deg, var(--gold), var(--gold2)); color: #0c0c0e; font-size: 28px; cursor: pointer; box-shadow: 0 4px 24px rgba(201,168,76,0.45); display: flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent; transition: transform 0.15s; }
    .fab-btn:active { transform: scale(0.92); }
  `;

  // ---- DETAIL VIEW ----
  if (view === "detail" && selected) {
    const c = customers.find(x => x.id === selected.id) || selected;
    const analysis = analyzeVisits(c.visits);
    const maxCount = analysis ? Math.max(...Object.values(analysis.dayCounts), 1) : 1;

    return (
      <div className="app">
        <style>{css}</style>
        <div className="page">
          <div className="page-header">
            <button className="back-btn" onClick={() => setView("list")}>←</button>
            <div className="page-title">{c.name}</div>
            <button className="btn-icon" style={{ marginLeft: "auto" }} onClick={() => openEdit(c)}>✏️</button>
          </div>
          <div className="page-body">
            <div className="section">
              <div className="section-title">基本情報</div>
              <div className="info-row"><span className="info-label">お名前</span><span className="info-value">{c.name}</span></div>
              {c.birthday && (
                <div className="info-row">
                  <span className="info-label">生年月日</span>
                  <span className="info-value">{formatDate(c.birthday)}</span>
                  <span className="badge">{calcAge(c.birthday)}歳</span>
                </div>
              )}
              <div className="info-row"><span className="info-label">来店回数</span><span className="info-value">{c.visits.length}回</span></div>
              <div className="info-row"><span className="info-label">同伴回数</span><span className="info-value">{c.visits.filter(v => v.isDouhan).length}回</span></div>
            </div>

            {analysis && (
              <div className="section">
                <div className="section-title">来店傾向</div>
                <div className="stat-grid">
                  <div className="stat-box">
                    <div className="stat-label">よく来る曜日</div>
                    <div className="stat-value">{analysis.topDay ? `${analysis.topDay[0]}曜` : "—"}</div>
                    <div className="stat-sub">{analysis.topDay ? `${analysis.topDay[1]}回` : ""}</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">来店間隔</div>
                    <div className="stat-value" style={{ fontSize: "16px", marginTop: "4px" }}>
                      <IntervalLabel days={analysis.avgInterval} />
                    </div>
                    <div className="stat-sub">{analysis.avgInterval ? `平均 ${analysis.avgInterval}日` : ""}</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">前回から</div>
                    <div className="stat-value">{analysis.daysSinceLast}<span style={{ fontSize: "14px" }}> 日</span></div>
                    {analysis.nextVisitEst && (
                      <div className="stat-sub">次回予測: {formatDate(analysis.nextVisitEst)}</div>
                    )}
                  </div>
                  <div className="stat-box stat-highlight">
                    <div className="stat-label">今月あと誘える</div>
                    <div className="stat-value stat-value-big">
                      {analysis.inviteEstimate !== null ? analysis.inviteEstimate : "—"}
                      <span style={{ fontSize: "16px" }}> 回</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: "16px" }}>
                  <div className="stat-label">曜日別来店回数</div>
                  <div className="day-bars">
                    {DAYS_JP.map(d => {
                      const count = analysis.dayCounts[d] || 0;
                      const h = Math.round((count / maxCount) * 40) + 4;
                      return (
                        <div className="day-col" key={d}>
                          <div className={`day-bar${count > 0 ? " active" : ""}`} style={{ height: `${h}px` }} />
                          <div className="day-label">{d}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="section">
              <div className="section-title">来店履歴</div>
              {c.visits.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: "13px", textAlign: "center", padding: "16px 0" }}>来店記録なし</div>
              ) : (
                [...c.visits].sort((a, b) => new Date(b.date) - new Date(a.date)).map(v => (
                  <div className="visit-item" key={v.id}>
                    <div>
                      <div className="visit-date">
                        {formatDate(v.date)}
                        <span className="visit-day"> ({DAYS_JP[new Date(v.date).getDay()]})</span>
                      </div>
                      {v.isDouhan && <div style={{ fontSize: "12px", color: "var(--rose)", marginTop: "2px" }}>同伴{v.douhanDest ? ` — ${v.douhanDest}` : ""}</div>}
                    </div>
                    {v.isDouhan && <span className="douhan-tag">同伴</span>}
                  </div>
                ))
              )}
            </div>

            <button className="btn btn-danger" onClick={() => deleteCustomer(c.id)}>削除</button>
          </div>
        </div>
      </div>
    );
  }

  // ---- FORM VIEW ----
  if (view === "form") {
    return (
      <div className="app">
        <style>{css}</style>
        <div className="page">
          <div className="page-header">
            <button className="back-btn" onClick={() => setView("list")}>←</button>
            <div className="page-title">{customers.find(c => c.id === form.id) ? "編集" : "新規登録"}</div>
          </div>
          <div className="page-body">
            <div className="section">
              <div className="section-title">基本情報</div>
              <div className="form-group">
                <label className="form-label">お名前 *</label>
                <input className="form-input" placeholder="例：田中様" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">生年月日（任意）</label>
                <input className="form-input" type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} />
                {form.birthday && <div style={{ marginTop: "6px", fontSize: "12px", color: "var(--gold)" }}>→ {calcAge(form.birthday)}歳</div>}
              </div>
            </div>

            <div className="section">
              <div className="section-title">来店・同伴を追加</div>
              <div className="form-group">
                <label className="form-label">日付</label>
                <input className="form-input" type="date" value={form.newVisitDate} onChange={e => setForm(f => ({ ...f, newVisitDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="checkbox-row">
                  <input type="checkbox" checked={form.newVisitIsDouhan} onChange={e => setForm(f => ({ ...f, newVisitIsDouhan: e.target.checked }))} />
                  同伴あり（来店日＝同伴日）
                </label>
              </div>
              {form.newVisitIsDouhan && (
                <div className="form-group">
                  <label className="form-label">同伴先</label>
                  <input className="form-input" placeholder="例：和食 鮨○○" value={form.douhanDest} onChange={e => setForm(f => ({ ...f, douhanDest: e.target.value }))} />
                </div>
              )}
              <button className="btn-add-visit" onClick={addVisit}>＋ 追加する</button>
            </div>

            {form.visits.length > 0 && (
              <div className="section">
                <div className="section-title">登録済み来店</div>
                {[...form.visits].sort((a, b) => new Date(b.date) - new Date(a.date)).map(v => (
                  <div className="visit-item" key={v.id}>
                    <div style={{ flex: 1 }}>
                      <div className="visit-date">{formatDate(v.date)} ({DAYS_JP[new Date(v.date).getDay()]})</div>
                      {v.isDouhan && <div style={{ fontSize: "11px", color: "var(--rose)" }}>同伴{v.douhanDest ? ` — ${v.douhanDest}` : ""}</div>}
                    </div>
                    <button className="del-btn" onClick={() => removeVisit(v.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn-gold" onClick={submitForm} disabled={!form.name.trim()}>
              保存する
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- LIST VIEW ----
  return (
    <div className="app">
      <style>{css}</style>
      <div className="header">
        <div>
          <div className="header-logo">Nuit de <em>ran</em></div>
          <div className="header-sub">— my customers —</div>
        </div>
      </div>
      <div className="search-wrap">
        <input className="search-input" placeholder="お客様名で検索…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="list">
        {filtered.length === 0 ? (
          <div className="empty">
            {customers.length === 0 ? (
              <>まだ登録がありません<br />右下の ＋ からお客様を追加してください</>
            ) : "該当するお客様が見つかりません"}
          </div>
        ) : (
          filtered.map(c => {
            const lastVisit = c.visits.length ? [...c.visits].sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;
            const analysis = analyzeVisits(c.visits);
            return (
              <div className="card" key={c.id} onClick={() => openDetail(c)}>
                <div className="card-name">
                  {c.name}
                  {c.birthday && <span style={{ fontSize: "13px", color: "var(--muted)" }}> ({calcAge(c.birthday)}歳)</span>}
                </div>
                <div className="card-meta">
                  {lastVisit && <span>最終: {formatDate(lastVisit.date)}</span>}
                  {c.visits.length > 0 && <span className="badge">{c.visits.length}回来店</span>}
                  {c.visits.filter(v => v.isDouhan).length > 0 && <span className="badge badge-rose">同伴{c.visits.filter(v => v.isDouhan).length}回</span>}
                  {analysis?.inviteEstimate != null && (
                    <span style={{ color: "var(--gold)", fontSize: "11px" }}>今月あと{analysis.inviteEstimate}回</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="fab">
        <button className="fab-btn" onClick={openNew}>＋</button>
      </div>
    </div>
  );
}
