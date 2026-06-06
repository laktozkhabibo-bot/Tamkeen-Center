/* =========================================================================
   Dashboard shared shell + inbox — window.Dash
   ========================================================================= */
(function () {
  const { theme, L, Icon, fmtDate, roleLabel, roleColor } = window.TC;
  const { Avatar, AvatarUpload, Btn, Badge, Card, EmptyState, Modal, Field, Input } = window.UI;
  const { useState } = React;

  // ---- Calculator popover ----------------------------------------------
  function Calculator({ onClose, lang }) {
    const [expr, setExpr] = useState('');
    const [result, setResult] = useState('');
    const safeEval = (s) => {
      try {
        const clean = s.replace(/×/g,'*').replace(/÷/g,'/').replace(/[^0-9.+\-*/%() ]/g,'');
        if (!clean) return '';
        let r = Function('"use strict";return (' + clean.replace(/%/g,'/100') + ')')();
        if (r==null || !isFinite(r)) return '—';
        return String(Math.round(r*1e8)/1e8);
      } catch { return '—'; }
    };
    const push = (v) => { const ne = expr + v; setExpr(ne); setResult(safeEval(ne)); };
    const clear = () => { setExpr(''); setResult(''); };
    const back = () => { const ne = expr.slice(0,-1); setExpr(ne); setResult(safeEval(ne)); };
    const equals = () => { const r = safeEval(expr); if (r && r!=='—') { setExpr(r); setResult(''); } };
    const keys = [['C','÷','×','⌫'],['7','8','9','-'],['4','5','6','+'],['1','2','3','%'],['0','.','=']];
    const press = (k) => k==='C'?clear():k==='⌫'?back():k==='='?equals():push(k);
    const keyStyle = (k) => {
      const op = ['÷','×','-','+','%'].includes(k);
      const eq = k==='=';
      const fn = k==='C'||k==='⌫';
      return { background: eq?theme.primary: op?theme.goldSoft: fn?theme.badBg: theme.paperAlt,
        color: eq?'#fff': op?theme.primaryDeep: fn?theme.bad: theme.ink,
        border:'none', borderRadius:11, padding:'13px 0', fontSize:17, fontWeight:700, cursor:'pointer',
        fontFamily:'Cairo, sans-serif', gridColumn: k==='0'?'span 2':'span 1', transition:'filter .12s ease' };
    };
    return (
      <div onClick={(e)=>e.stopPropagation()} style={{ position:'absolute', top:'calc(100% + 10px)', insetInlineEnd:0, zIndex:60,
        width:264, background:theme.paper, border:`1px solid ${theme.line}`, borderRadius:18, padding:14,
        boxShadow:'0 24px 56px -18px rgba(50,46,38,.45)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <span style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, fontWeight:700, color:theme.brown }}><Icon name="calculator" size={15} color={theme.primary} />{lang==='ar'?'الآلة الحاسبة':'Calculator'}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:theme.muted }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ background:theme.creamDeep, borderRadius:12, padding:'12px 14px', marginBottom:12, minHeight:60, textAlign:'end' }}>
          <div style={{ fontSize:15, color:theme.muted, minHeight:18, direction:'ltr', wordBreak:'break-all' }}>{expr||'0'}</div>
          <div style={{ fontSize:24, fontWeight:800, color:theme.ink, direction:'ltr', fontFamily:'Cairo, sans-serif' }}>{result!==''?result:''}</div>
        </div>
        <div dir="ltr" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {keys.flat().map((k,i)=>(
            <button key={i} onClick={()=>press(k)} style={keyStyle(k)}
              onMouseDown={(e)=>e.currentTarget.style.filter='brightness(0.93)'} onMouseUp={(e)=>e.currentTarget.style.filter='none'} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}>
              {k}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function DashShell({ user, lang, setLang, panelLabel, accent, tabs, active, setActive, onLogout, onHome, onEditAvatar, children }) {
    const t = L(lang);
    const [calc, setCalc] = useState(false);
    return (
      <div style={{ minHeight:'100vh', background:theme.cream, display:'flex', flexDirection:'column' }}>
        <header style={{ position:'sticky', top:0, zIndex:40, background:theme.paper, borderBottom:`1px solid ${theme.line}`, boxShadow:'0 2px 12px -8px rgba(71,60,40,.35)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {onEditAvatar
                ? <AvatarUpload name={user.name} img={user.img} size={40} accent={accent} onPick={onEditAvatar} />
                : <Avatar name={user.name} img={user.img} size={40} accent={accent} />}
              <div>
                <p style={{ fontSize:14.5, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{user.name}</p>
                <p style={{ fontSize:12, color:theme.muted }}>{panelLabel}</p>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <button onClick={()=>setLang(lang==='ar'?'en':'ar')} style={{ display:'flex', alignItems:'center', gap:6, height:38, boxSizing:'border-box', background:theme.creamDeep, border:`1px solid ${theme.line}`, borderRadius:10, padding:'0 13px', color:theme.brown, cursor:'pointer', fontFamily:'Cairo, sans-serif', fontWeight:600, fontSize:13 }}>
                <Icon name="globe" size={15} /> {t('langLabel')}
              </button>
              <div style={{ position:'relative', display:'flex' }}>
                <button onClick={()=>setCalc(!calc)} title={lang==='ar'?'الآلة الحاسبة':'Calculator'} style={{ display:'flex', alignItems:'center', justifyContent:'center', height:38, width:42, boxSizing:'border-box', background:calc?theme.goldSoft:theme.creamDeep, border:`1px solid ${calc?theme.gold:theme.line}`, borderRadius:10, color:calc?theme.primaryDeep:theme.brown, cursor:'pointer' }}>
                  <Icon name="calculator" size={17} />
                </button>
                {calc && <Calculator lang={lang} onClose={()=>setCalc(false)} />}
              </div>
              <button onClick={onLogout} style={{ display:'flex', alignItems:'center', gap:6, height:38, boxSizing:'border-box', background:theme.badBg, border:`1px solid ${theme.badBg}`, borderRadius:10, padding:'0 14px', color:theme.bad, cursor:'pointer', fontFamily:'Cairo, sans-serif', fontWeight:600, fontSize:13, whiteSpace:'nowrap' }}>
                <Icon name="logout" size={15} /> {t('logout')}
              </button>
            </div>
          </div>
          <nav style={{ display:'flex', gap:2, padding:'0 14px', borderTop:`1px solid ${theme.lineSoft}`, overflowX:'auto' }}>
            {tabs.map(tab=>{
              const on = active===tab.id;
              return (
                <button key={tab.id} onClick={()=>setActive(tab.id)} style={{ display:'flex', alignItems:'center', gap:8, padding:'13px 16px', fontSize:14, fontWeight:600, whiteSpace:'nowrap',
                  color:on?theme.ink:theme.muted, background:'none', border:'none', borderBottom:on?`2.5px solid ${theme.primary}`:'2.5px solid transparent', cursor:'pointer', fontFamily:'Cairo, sans-serif', marginBottom:-1 }}>
                  <Icon name={tab.icon} size={17} color={on?theme.primary:theme.mutedSoft} />
                  {tab.label}
                  {tab.badge>0 && <span style={{ fontSize:11, fontWeight:700, minWidth:18, textAlign:'center', padding:'1px 5px', borderRadius:999, background:theme.primary, color:'#fff' }}>{tab.badge}</span>}
                </button>
              );
            })}
          </nav>
        </header>
        <main style={{ flex:1, padding:'26px 22px 50px', maxWidth:1180, margin:'0 auto', width:'100%' }}>{children}</main>
      </div>
    );
  }

  function ScheduleTable({ data }) {
    if (!data || !data.columns) return null;
    return (
      <div style={{ borderRadius:13, overflow:'hidden', border:`1px solid ${theme.line}`, overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead><tr>{data.columns.map((c,i)=>(
            <th key={i} style={{ padding:'11px 14px', textAlign:'center', fontWeight:700, color:theme.ink, background:theme.creamDeep, borderInlineStart:i>0?`1px solid ${theme.line}`:'none', whiteSpace:'nowrap' }}>{c}</th>
          ))}</tr></thead>
          <tbody>{data.rows.map((row,ri)=>(
            <tr key={ri} style={{ borderTop:`1px solid ${theme.lineSoft}` }}>{row.map((cell,ci)=>(
              <td key={ci} style={{ padding:'11px 14px', textAlign:'center', color:cell&&cell!=='—'?theme.brown:theme.mutedSoft, borderInlineStart:ci>0?`1px solid ${theme.lineSoft}`:'none', fontWeight:ci===0?700:400 }}>{cell||'—'}</td>
            ))}</tr>
          ))}</tbody>
        </table>
      </div>
    );
  }

  function InboxView({ items, users, lang, onMarkRead, onDownloadSchedule, onDelete }) {
    const t = L(lang);
    const [open, setOpen] = useState(null);
    const unread = items.filter(i=>!i.isRead).length;
    const doDelete = async (e, id) => {
      e.stopPropagation();
      const ok = await window.UI.confirm({ title: lang==='ar'?'حذف الرسالة':'Delete message', message: lang==='ar'?'هل تريد حذف هذه الرسالة نهائيًا من صندوق الوارد؟':'Permanently delete this message from your inbox?', confirmText: lang==='ar'?'حذف':'Delete', icon:'trash' });
      if (ok) onDelete && onDelete(id);
    };
    const sender = (id) => {
      const u = users.find(x=>x.accessKey===id);
      if (!u) return { name:id, label:'' };
      return { name:u.name, label:roleLabel(u.role, lang), color:roleColor(u.role) };
    };
    return (
      <div style={{ maxWidth:760, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:theme.goldSoft, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="inbox" size={21} color={theme.primaryDeep} /></div>
          <div>
            <h2 style={{ fontSize:19, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{t('inbox')}</h2>
            <p style={{ fontSize:12.5, color:theme.muted }}>{items.length} {t('item')}{unread>0?` • ${unread} ${t('unread')}`:''}</p>
          </div>
        </div>
        {items.length===0 ? <EmptyState icon="inbox" title={t('inboxEmpty')} body={t('inboxEmptyB')} /> : (
          <div style={{ display:'grid', gap:12 }}>
            {[...items].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(item=>{
              const s = sender(item.fromUserId);
              const isOpen = open===item.id;
              return (
                <Card key={item.id} pad={0} style={{ overflow:'hidden', border:`1.5px solid ${item.isRead?theme.lineSoft:theme.gold}` }}>
                  <div onClick={()=>setOpen(isOpen?null:item.id)} style={{ display:'flex', alignItems:'center', gap:13, padding:16, cursor:'pointer' }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:item.isRead?theme.creamDeep:theme.goldSoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon name={item.itemType==='schedule'?'calendar':'fileText'} size={19} color={theme.primary} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                        {!item.isRead && <span style={{ width:8, height:8, borderRadius:'50%', background:theme.gold, flexShrink:0 }} />}
                        <span style={{ fontSize:14.5, fontWeight:700, color:theme.ink }}>{item.itemName}</span>
                        <Badge tone={item.itemType==='schedule'?'gold':'neutral'}>{item.itemType==='schedule'?t('schedule'):t('file')}</Badge>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', fontSize:12.5, color:theme.muted }}>
                        <span>{t('from')}: {s.name}</span>
                        {s.label && <Badge tone="neutral" style={{ fontSize:10.5 }}>{s.label}</Badge>}
                        <span style={{ color:theme.line }}>•</span>
                        <span>{fmtDate(item.createdAt, lang)}</span>
                      </div>
                    </div>
                    <Icon name={isOpen?'chevronUp':'chevronDown'} size={17} color={theme.mutedSoft} />
                    {onDelete && (
                      <button onClick={(e)=>doDelete(e, item.id)} title={lang==='ar'?'حذف الرسالة':'Delete message'}
                        style={{ width:32, height:32, borderRadius:9, background:theme.badBg, border:'none', color:theme.bad, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Icon name="trash" size={15} />
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <div style={{ borderTop:`1px solid ${theme.lineSoft}`, padding:16 }}>
                      {item.itemType==='schedule' && item.scheduleData ? <ScheduleTable data={item.scheduleData} /> : (
                        <div style={{ display:'flex', alignItems:'center', gap:13, padding:14, borderRadius:12, background:theme.paperAlt }}>
                          <div style={{ width:42, height:42, borderRadius:11, background:theme.creamDeep, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="fileText" size={19} color={theme.primary} /></div>
                          <div><p style={{ fontSize:14, fontWeight:700, color:theme.ink }}>{item.fileName||item.itemName}</p>{item.fileSize && <p style={{ fontSize:12, color:theme.muted }}>{item.fileSize}</p>}</div>
                        </div>
                      )}
                      <div style={{ display:'flex', gap:10, marginTop:14 }}>
                        {item.itemType==='schedule' && item.scheduleData && <Btn size="sm" variant="primary" icon="download" onClick={()=>onDownloadSchedule&&onDownloadSchedule(item)}>{t('downloadExcel')}</Btn>}
                        {item.itemType==='file' && <Btn size="sm" variant="primary" icon="download" onClick={()=>alert(lang==='ar'?'تحميل (عرض تجريبي)':'Download (demo)')}>{t('downloadFile')}</Btn>}
                        {!item.isRead && <Btn size="sm" variant="soft" icon="eye" onClick={()=>onMarkRead(item.id)}>{t('markRead')}</Btn>}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // CSV download as a lightweight stand-in for xlsx
  function downloadScheduleCSV(item) {
    const d = item.scheduleData; if (!d) return;
    const rows = [d.columns, ...d.rows];
    const csv = '\uFEFF' + rows.map(r=>r.map(c=>`"${(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${item.itemName}.csv`; a.click();
  }

  // ---- recipient picker modal (reusable) -------------------------------
  function ShareModal({ lang, db, onShare, onClose, label }) {
    const t = L(lang);
    const [recips, setRecips] = useState([]);
    const [q, setQ] = useState('');
    const people = db.users.filter(u=>['student','teacher','management','director'].includes(u.role));
    const filtered = people.filter(u=>u.name.includes(q)||u.accessKey.includes(q.toUpperCase()));
    const toggle = (k)=>setRecips(p=>p.includes(k)?p.filter(x=>x!==k):[...p,k]);
    const roleTone = (r)=> r==='student'?'gold':r==='teacher'?'neutral':'info';
    const roleTxt = (r)=> r==='student'?t('student'):r==='teacher'?t('teacher'):t('admin');
    return (
      <Modal title={label||t('shareTo')} onClose={onClose} width={460}>
        <div style={{ position:'relative', marginBottom:12 }}>
          <Icon name="search" size={15} color={theme.muted} style={{ position:'absolute', insetInlineStart:12, top:'50%', transform:'translateY(-50%)' }} />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder={t('search')} style={{ width:'100%', padding:'10px 14px', paddingInlineStart:36, borderRadius:11, border:`1px solid ${theme.line}`, background:theme.paper, fontFamily:'Cairo, sans-serif', fontSize:14, color:theme.ink, outline:'none', boxSizing:'border-box' }} />
        </div>
        <div style={{ display:'grid', gap:6, maxHeight:300, overflowY:'auto', marginBottom:16 }}>
          {filtered.map(u=>{
            const on=recips.includes(u.accessKey);
            return (
              <button key={u.accessKey} onClick={()=>toggle(u.accessKey)} style={{ display:'flex', alignItems:'center', gap:11, padding:'8px 10px', borderRadius:11, background:on?theme.goldSoft:theme.paperAlt, border:'none', cursor:'pointer', textAlign:lang==='ar'?'right':'left', width:'100%' }}>
                <Avatar name={u.name} img={u.img} size={32} accent={u.role==='student'?theme.gold:u.role==='teacher'?theme.tan:theme.primaryDeep} />
                <div style={{ flex:1, minWidth:0 }}><p style={{ fontSize:13, fontWeight:600, color:theme.ink }}>{u.name}</p><span style={{ fontSize:11, color:theme.muted }} dir="ltr">{u.accessKey}</span></div>
                <Badge tone={roleTone(u.role)}>{roleTxt(u.role)}</Badge>
                <span style={{ width:20, height:20, borderRadius:6, border:`1.5px solid ${on?theme.primary:theme.line}`, background:on?theme.primary:'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>{on && <Icon name="check" size={13} color="#fff" />}</span>
              </button>
            );
          })}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Btn full variant="soft" onClick={onClose}>{t('cancel')}</Btn>
          <Btn full variant="primary" icon="send" disabled={recips.length===0} onClick={()=>onShare(recips)}>{t('send')} {recips.length>0?`(${recips.length})`:''}</Btn>
        </div>
      </Modal>
    );
  }

  // ---- unified cloud storage (drag-drop) used by teacher & admin -------
  function CloudView({ lang, db, actions, uid, canShare, schedules }) {
    const t = L(lang);
    const fileRef = React.useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [shareItem, setShareItem] = useState(null);
    const [toast, setToast] = useState('');
    const cloud = db.cloudItems.filter(c=>c.ownerId===uid);

    const addFile = (file) => actions.uploadCloud(uid, file);
    const onDrop = (e)=>{ e.preventDefault(); setDragOver(false); [...(e.dataTransfer.files||[])].forEach(addFile); };
    const flash = (m)=>{ setToast(m); setTimeout(()=>setToast(''), 2400); };

    const doShare = (recips) => {
      const it = shareItem;
      const payload = it.itemType==='schedule'
        ? { name:it.itemName, type:'schedule', scheduleData:it.scheduleData }
        : { name:it.name, type:'file', fileSize:it.fileSize };
      actions.shareItems([payload], recips, uid);
      setShareItem(null);
      flash(t('sent'));
    };

    return (
      <div style={{ maxWidth:680, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          <Icon name="cloud" size={20} color={theme.primary} />
          <h2 style={{ fontSize:19, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{t('cloudSystem')}</h2>
          {cloud.length>0 && <Badge tone="neutral">{cloud.length} {t('item')}</Badge>}
        </div>

        {toast && <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px', borderRadius:12, background:theme.okBg, color:theme.ok, fontWeight:700, fontSize:14, marginBottom:14 }}><Icon name="checkCircle" size={18} />{toast}</div>}

        <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={onDrop}
          onClick={()=>fileRef.current?.click()}
          style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'34px 20px', borderRadius:18, cursor:'pointer',
            border:dragOver?`2px solid ${theme.primary}`:`2px dashed ${theme.line}`, background:dragOver?theme.paperAlt:theme.paper, transition:'all .2s ease' }}>
          <div style={{ width:58, height:58, borderRadius:'50%', background:theme.creamDeep, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:13 }}><Icon name="upload" size={26} color={theme.primary} /></div>
          <p style={{ fontSize:15, fontWeight:700, color:theme.ink, marginBottom:3 }}>{t('dropFiles')}</p>
          <p style={{ fontSize:13, color:theme.muted }}>{t('orAttach')}</p>
        </div>
        <input ref={fileRef} type="file" multiple style={{ display:'none' }} onChange={e=>{ [...(e.target.files||[])].forEach(addFile); e.target.value=''; }} />

        {canShare && schedules && schedules.length>0 && (
          <Card pad={16} style={{ marginTop:16 }}>
            <p style={{ fontSize:12.5, fontWeight:700, color:theme.muted, marginBottom:10 }}>{t('schedules')}</p>
            <div style={{ display:'grid', gap:8 }}>
              {schedules.map(s=>(
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:11, background:theme.paperAlt }}>
                  <Icon name="calendar" size={16} color={theme.primary} />
                  <span style={{ flex:1, fontSize:13.5, fontWeight:600, color:theme.ink }}>{s.title}</span>
                  <Btn size="sm" variant="ghost" icon="send" onClick={()=>setShareItem({ itemType:'schedule', itemName:s.title, scheduleData:{ columns:s.columns, rows:s.rows } })}>{t('shareTo')}</Btn>
                </div>
              ))}
            </div>
          </Card>
        )}

        {cloud.length>0 && (
          <Card pad={16} style={{ marginTop:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:12, marginBottom:12, borderBottom:`1px solid ${theme.lineSoft}` }}>
              <span style={{ display:'flex', alignItems:'center', gap:8, fontWeight:700, fontSize:14, color:theme.ink }}><Icon name="cloud" size={17} color={theme.primary} />{t('cloudSystem')}</span>
              <button onClick={()=>actions.clearCloud(uid)} style={{ display:'flex', alignItems:'center', gap:5, background:theme.badBg, border:'none', borderRadius:9, padding:'6px 11px', color:theme.bad, cursor:'pointer', fontSize:12.5, fontWeight:600, fontFamily:'Cairo, sans-serif' }}><Icon name="trash" size={13} />{t('clearAll')}</button>
            </div>
            <div style={{ display:'grid', gap:8 }}>
              {cloud.map(c=>(
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:11, background:theme.paperAlt }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:theme.creamDeep, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="fileText" size={17} color={theme.primary} /></div>
                  <div style={{ flex:1, minWidth:0 }}><p style={{ fontSize:13.5, fontWeight:600, color:theme.ink }}>{c.name}</p>{c.fileSize && <p style={{ fontSize:11.5, color:theme.muted }}>{c.fileSize}</p>}</div>
                  {c.storagePath && <Btn size="sm" variant="ghost" icon="download" onClick={()=>actions.downloadCloud(c.storagePath)}>{t('downloadFile')}</Btn>}
                  {canShare && <Btn size="sm" variant="ghost" icon="send" onClick={()=>setShareItem({ itemType:'file', name:c.name, fileSize:c.fileSize })}>{t('shareTo')}</Btn>}
                  <button onClick={()=>actions.removeCloudItem(c.id, c.storagePath)} style={{ width:30, height:30, borderRadius:8, background:theme.badBg, border:'none', color:theme.bad, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="x" size={15} /></button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {shareItem && <ShareModal lang={lang} db={db} label={`${t('shareTo')}: ${shareItem.itemName||shareItem.name}`} onClose={()=>setShareItem(null)} onShare={doShare} />}
      </div>
    );
  }

  // shared announcement template styling (matches AnnouncementsTab)
  const ANN_TMPL = {
    general:{ icon:'general', tone:'info', key:'tmplGeneral' },
    exam:{ icon:'exam', tone:'ok', key:'tmplExam' },
    holiday:{ icon:'holiday', tone:'gold', key:'tmplHoliday' },
    event:{ icon:'event', tone:'neutral', key:'tmplEvent' },
    urgent:{ icon:'urgent', tone:'bad', key:'tmplUrgent' },
  };

  // read-only announcements list for students & teachers
  function AnnouncementsView({ announcements, role, lang }) {
    const t = L(lang);
    // role -> audience key
    const aud = role==='student' ? 'students' : role==='teacher' ? 'teachers' : 'admins';
    const visible = announcements
      .filter(a => !a.audience || a.audience.length===0 || a.audience.includes(aud))
      .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    return (
      <div style={{ maxWidth:760, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:theme.goldSoft, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="megaphone" size={21} color={theme.primaryDeep} /></div>
          <div>
            <h2 style={{ fontSize:19, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{t('announcements')}</h2>
            <p style={{ fontSize:12.5, color:theme.muted }}>{visible.length} {t('item')}</p>
          </div>
        </div>
        {visible.length===0 ? <EmptyState icon="megaphone" title={t('noAnnouncements')} body={t('noAnnouncementsB')} /> : (
          <div style={{ display:'grid', gap:12 }}>
            {visible.map(a=>{
              const tm = ANN_TMPL[a.template] || ANN_TMPL.general;
              return (
                <Card key={a.id} pad={20} style={{ borderInlineStart:`4px solid ${theme[tm.tone]||theme.primary}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:9 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:theme[tm.tone+'Bg']||theme.creamDeep, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name={tm.icon} size={17} color={theme[tm.tone]||theme.primary} /></div>
                    <h3 style={{ flex:1, fontSize:16, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{a.title}</h3>
                    <Badge tone={tm.tone}>{t(tm.key)}</Badge>
                  </div>
                  <p style={{ fontSize:14, color:theme.brown, lineHeight:1.8, marginBottom:9 }}>{a.content}</p>
                  <p style={{ fontSize:11.5, color:theme.muted }}>{fmtDate(a.createdAt, lang)}</p>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  window.Dash = { DashShell, InboxView, ScheduleTable, downloadScheduleCSV, AnnouncementsView, ANN_TMPL, ShareModal, CloudView };
})();
