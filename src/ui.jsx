/* =========================================================================
   Shared UI primitives — window.UI
   ========================================================================= */
(function () {
  const { theme, Icon, initials } = window.TC;
  const { useState } = React;

  // ---- Logo: square mark with a slot for an uploaded logo file.
  // Drop a file at logo.(svg|png) next to the HTML and it shows automatically.
  function Logo({ size=52, rounded=14, showWordmark=false, lang='ar', light=false }) {
    const [src, setSrc] = useState(null);
    React.useEffect(() => {
      let alive = true;
      // probe for a user-supplied logo; silently ignore if absent
      const tryLoad = (url) => new Promise((res) => {
        const im = new Image(); im.onload = () => res(url); im.onerror = () => res(null); im.src = url;
      });
      (async () => {
        for (const u of ['assets/logo.jpeg','logo.jpeg','logo.svg','logo.png','assets/logo.svg','assets/logo.png']) {
          const ok = await tryLoad(u); if (ok && alive) { setSrc(ok); return; }
        }
      })();
      return () => { alive = false; };
    }, []);
    const mark = src ? (
      <img src={src} alt="logo" style={{ width:size, height:size, objectFit:'cover', borderRadius:'50%', flexShrink:0 }} />
    ) : (
      <div style={{
        width:size, height:size, borderRadius:rounded,
        background:`linear-gradient(150deg, ${theme.primary}, ${theme.primaryDeep})`,
        display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
        boxShadow:'inset 0 1px 0 rgba(255,255,255,.18)', flexShrink:0,
      }}>
        <svg width={size*0.56} height={size*0.56} viewBox="0 0 24 24" fill="none" stroke={theme.goldSoft} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5"/>
        </svg>
        <span style={{ position:'absolute', bottom:-1, right:rounded*0.35, fontFamily:'Amiri, serif', fontWeight:700, color:theme.goldSoft, fontSize:size*0.30, lineHeight:1 }}>ت</span>
      </div>
    );
    if (!showWordmark) return mark;
    return (
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {mark}
        <div style={{ lineHeight:1.15 }}>
          <div style={{ fontFamily:'Amiri, serif', fontWeight:700, fontSize:size*0.46, color: light ? '#fff' : theme.ink }}>
            {lang==='ar' ? 'مركز تمكين' : 'Tamkeen Center'}
          </div>
        </div>
      </div>
    );
  }

  function Avatar({ name, img, size=40, accent }) {
    if (img) return <img src={img} alt="" style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', border:`1.5px solid ${theme.line}`, flexShrink:0 }} />;
    return (
      <div style={{ width:size, height:size, borderRadius:'50%', background:accent || theme.tan,
        color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
        fontWeight:700, fontSize:size*0.42, flexShrink:0, fontFamily:'Cairo, sans-serif' }}>
        {initials(name)}
      </div>
    );
  }

  // قراءة ملف صورة كـ Data URL (مع تصغير للحفاظ على حجم معقول)
  function readImageAsDataURL(file, maxDim=512) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const s = maxDim / Math.max(width, height); width = Math.round(width*s); height = Math.round(height*s);
          }
          const cv = document.createElement('canvas'); cv.width = width; cv.height = height;
          cv.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(cv.toDataURL('image/jpeg', 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  // قراءة أي ملف كـ Data URL (للمقررات)
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader(); r.onerror = reject; r.onload = () => resolve(r.result); r.readAsDataURL(file);
    });
  }

  // أفاتار قابل للرفع — تظهر شارة كاميرا، والنقر يفتح اختيار صورة (للإدارة فقط)
  function AvatarUpload({ name, img, size=64, accent, onPick }) {
    const ref = React.useRef(null);
    const onChange = async (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      try { const url = await readImageAsDataURL(f); onPick && onPick(url); } catch {}
      e.target.value = '';
    };
    return (
      <div style={{ position:'relative', width:size, height:size, flexShrink:0, cursor:'pointer' }} onClick={()=>ref.current && ref.current.click()} title="تغيير الصورة">
        <Avatar name={name} img={img} size={size} accent={accent} />
        <div style={{ position:'absolute', bottom:-2, insetInlineEnd:-2, width:size*0.36, height:size*0.36, minWidth:22, minHeight:22, borderRadius:'50%', background:theme.primary, border:`2px solid ${theme.paper}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon name="camera" size={Math.max(11, size*0.18)} color="#fff" />
        </div>
        <input ref={ref} type="file" accept="image/*" onChange={onChange} style={{ display:'none' }} />
      </div>
    );
  }

  function Btn({ children, onClick, variant='primary', size='md', icon, iconRight, full, disabled, style, type='button' }) {
    const sizes = { sm:{ p:'7px 14px', fs:13, gap:6 }, md:{ p:'10px 18px', fs:14, gap:8 }, lg:{ p:'13px 26px', fs:15.5, gap:9 } };
    const s = sizes[size];
    const variants = {
      primary:{ background:theme.primary, color:'#fff', border:`1px solid ${theme.primary}` },
      gold:{ background:theme.gold, color:'#fff', border:`1px solid ${theme.gold}` },
      soft:{ background:theme.creamDeep, color:theme.brown, border:`1px solid ${theme.line}` },
      ghost:{ background:'transparent', color:theme.primary, border:`1px solid ${theme.line}` },
      danger:{ background:theme.badBg, color:theme.bad, border:`1px solid ${theme.badBg}` },
      dark:{ background:theme.ink, color:'#fff', border:`1px solid ${theme.ink}` },
    };
    const [hov, setHov] = useState(false);
    return (
      <button type={type} onClick={onClick} disabled={disabled}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:s.gap,
          padding:s.p, fontSize:s.fs, fontWeight:600, borderRadius:11, cursor:disabled?'not-allowed':'pointer',
          fontFamily:'Cairo, sans-serif', width:full?'100%':'auto', transition:'all .18s ease',
          opacity:disabled?0.55:1, filter:hov && !disabled ? 'brightness(0.94)' : 'none',
          transform: hov && !disabled ? 'translateY(-1px)' : 'none',
          ...variants[variant], ...style }}>
        {icon && <Icon name={icon} size={s.fs+2} />}
        {children}
        {iconRight && <Icon name={iconRight} size={s.fs+2} />}
      </button>
    );
  }

  function Badge({ children, tone='neutral', style }) {
    const tones = {
      neutral:{ bg:theme.creamDeep, c:theme.brown },
      gold:{ bg:theme.goldSoft, c:theme.primaryDeep },
      ok:{ bg:theme.okBg, c:theme.ok },
      warn:{ bg:theme.warnBg, c:theme.warn },
      bad:{ bg:theme.badBg, c:theme.bad },
      info:{ bg:theme.infoBg, c:theme.info },
    };
    const t = tones[tone] || tones.neutral;
    return <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:t.bg, color:t.c,
      fontSize:11.5, fontWeight:600, padding:'3px 9px', borderRadius:999, ...style }}>{children}</span>;
  }

  function Card({ children, style, pad=20, hover, onClick }) {
    const [h, setH] = useState(false);
    return (
      <div onClick={onClick}
        onMouseEnter={()=>hover&&setH(true)} onMouseLeave={()=>hover&&setH(false)}
        style={{ background:theme.paper, border:`1px solid ${theme.line}`, borderRadius:18, padding:pad,
          transition:'all .2s ease', cursor:onClick?'pointer':'default',
          boxShadow: h ? '0 14px 34px -18px rgba(71,60,40,.35)' : '0 1px 2px rgba(71,60,40,.04)',
          transform: h ? 'translateY(-2px)' : 'none', ...style }}>
        {children}
      </div>
    );
  }

  function Field({ label, required, children, hint }) {
    return (
      <div>
        {label && <label style={{ display:'block', fontSize:13, fontWeight:600, color:theme.brown, marginBottom:6 }}>
          {label} {required && <span style={{ color:theme.gold }}>*</span>}
        </label>}
        {children}
        {hint && <p style={{ fontSize:11.5, color:theme.muted, marginTop:5 }}>{hint}</p>}
      </div>
    );
  }

  const inputBase = {
    width:'100%', padding:'11px 14px', borderRadius:11, fontSize:14, outline:'none',
    background:theme.paper, border:`1px solid ${theme.line}`, color:theme.ink,
    fontFamily:'Cairo, sans-serif', transition:'border-color .15s ease',
  };
  function Input(props) {
    const { style, ...rest } = props;
    return <input {...rest} style={{ ...inputBase, ...style }}
      onFocus={(e)=>{ e.target.style.borderColor = theme.primary; props.onFocus&&props.onFocus(e); }}
      onBlur={(e)=>{ e.target.style.borderColor = theme.line; props.onBlur&&props.onBlur(e); }} />;
  }
  // قائمة منسدلة مخصّصة وأنيقة — بديل عن <select> الأصلي القبيح.
  // تحافظ على نفس الواجهة (value / onChange / <option>) فلا تتغيّر مواضع الاستدعاء.
  function Select(props) {
    const { style = {}, children, value, onChange, disabled, placeholder } = props;
    const { width, ...restStyle } = style;
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState(null);
    const [hov, setHov] = useState(-1);
    const btnRef = React.useRef(null);
    const popRef = React.useRef(null);

    const opts = [];
    React.Children.forEach(children, (ch) => {
      if (!ch || ch.type !== 'option') return;
      opts.push({ value: ch.props.value, label: ch.props.children, disabled: ch.props.disabled });
    });
    const current = opts.find((o) => String(o.value) === String(value));

    const place = () => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      const openUp = below < 240 && r.top > below; // افتح لأعلى إذا لم تكفِ المساحة بالأسفل
      setCoords({
        left: r.left,
        right: window.innerWidth - r.right, // مرساة الحافة اليمنى (اتجاه RTL) كي تتمدّد القائمة يسارًا
        width: r.width,
        top: openUp ? null : r.bottom + 6,
        bottom: openUp ? (window.innerHeight - r.top + 6) : null,
      });
    };
    const openMenu = () => { if (disabled) return; place(); setHov(opts.findIndex((o) => String(o.value) === String(value))); setOpen(true); };

    React.useEffect(() => {
      if (!open) return;
      const onDoc = (e) => {
        if (btnRef.current && btnRef.current.contains(e.target)) return;
        if (popRef.current && popRef.current.contains(e.target)) return;
        setOpen(false);
      };
      const onScrollOrResize = () => setOpen(false);
      document.addEventListener('mousedown', onDoc);
      window.addEventListener('scroll', onScrollOrResize, true);
      window.addEventListener('resize', onScrollOrResize);
      return () => {
        document.removeEventListener('mousedown', onDoc);
        window.removeEventListener('scroll', onScrollOrResize, true);
        window.removeEventListener('resize', onScrollOrResize);
      };
    }, [open]);

    const choose = (v) => { setOpen(false); if (onChange) onChange({ target: { value: v } }); };
    const auto = width === 'auto';
    return (
      <div style={{ position: 'relative', display: auto ? 'inline-block' : 'block', width: auto ? 'auto' : (width || '100%') }}>
        <button ref={btnRef} type="button" disabled={disabled}
          onClick={() => (open ? setOpen(false) : openMenu())}
          style={{ ...inputBase, width: auto ? 'auto' : '100%', minWidth: auto ? 120 : undefined, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'start', opacity: disabled ? 0.6 : 1, borderColor: open ? theme.primary : theme.line, boxShadow: open ? `0 0 0 3px ${theme.goldSoft}` : 'none', transition: 'border-color .15s ease, box-shadow .15s ease', ...restStyle }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: current ? theme.ink : theme.muted }}>{current ? current.label : (placeholder || '—')}</span>
          <Icon name="chevronDown" size={16} color={theme.muted} style={{ flexShrink: 0, transition: 'transform .2s ease', transform: open ? 'rotate(180deg)' : 'none' }} />
        </button>
        {open && coords && ReactDOM.createPortal(
          <div ref={popRef} style={{ position: 'fixed', right: coords.right, top: coords.top != null ? coords.top : undefined, bottom: coords.bottom != null ? coords.bottom : undefined, width: 'max-content', minWidth: Math.max(coords.width, 180), maxWidth: Math.max(220, window.innerWidth - coords.right - 14), zIndex: 200, background: theme.paper, border: `1px solid ${theme.line}`, borderRadius: 14, boxShadow: '0 22px 52px -16px rgba(50,46,38,.5)', padding: 6, maxHeight: 320, overflowY: 'auto', animation: 'tcFade .15s ease' }}>
            {opts.length === 0 && <div style={{ padding: '9px 11px', fontSize: 13, color: theme.muted }}>—</div>}
            {opts.map((o, i) => {
              const sel = String(o.value) === String(value);
              const hot = hov === i;
              return (
                <button key={i} type="button" disabled={o.disabled}
                  onMouseEnter={() => setHov(i)}
                  onClick={() => !o.disabled && choose(o.value)}
                  style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, width: '100%', padding: '9px 11px', borderRadius: 9, border: 'none', cursor: o.disabled ? 'default' : 'pointer', background: sel ? theme.goldSoft : (hot ? theme.creamDeep : 'transparent'), color: sel ? theme.primaryDeep : theme.ink, fontFamily: 'Cairo, sans-serif', fontSize: 13.5, fontWeight: sel ? 700 : 500, textAlign: 'start', opacity: o.disabled ? 0.45 : 1, transition: 'background .12s ease' }}>
                  <span style={{ whiteSpace: 'normal', lineHeight: 1.45, wordBreak: 'break-word', textAlign: 'start' }}>{o.label}</span>
                  {sel && <Icon name="check" size={15} color={theme.primary} style={{ flexShrink: 0, marginTop: 2 }} />}
                </button>
              );
            })}
          </div>, document.body)}
      </div>
    );
  }
  function Textarea(props) {
    const { style, ...rest } = props;
    return <textarea {...rest} style={{ ...inputBase, resize:'vertical', minHeight:80, ...style }}
      onFocus={(e)=>{ e.target.style.borderColor = theme.primary; }} onBlur={(e)=>{ e.target.style.borderColor = theme.line; }} />;
  }

  function Modal({ title, onClose, children, width=460 }) {
    return (
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:90, background:'rgba(50,46,38,.46)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(3px)' }}>
        <div onClick={(e)=>e.stopPropagation()} style={{ width:'100%', maxWidth:width, background:theme.paper,
          borderRadius:20, border:`1px solid ${theme.line}`, boxShadow:'0 30px 70px -20px rgba(50,46,38,.5)',
          maxHeight:'90vh', overflowY:'auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:`1px solid ${theme.lineSoft}`, position:'sticky', top:0, background:theme.paper, borderRadius:'20px 20px 0 0' }}>
            <h3 style={{ fontSize:17, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{title}</h3>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:theme.muted, padding:4 }}><Icon name="x" size={20} /></button>
          </div>
          <div style={{ padding:22 }}>{children}</div>
        </div>
      </div>
    );
  }

  function EmptyState({ icon, title, body }) {
    return (
      <div style={{ textAlign:'center', padding:'60px 20px', background:theme.paper, borderRadius:18, border:`1px solid ${theme.lineSoft}` }}>
        <div style={{ width:64, height:64, borderRadius:18, background:theme.creamDeep, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <Icon name={icon} size={28} color={theme.mutedSoft} />
        </div>
        <p style={{ fontSize:15, fontWeight:700, color:theme.brown, marginBottom:5 }}>{title}</p>
        {body && <p style={{ fontSize:13, color:theme.muted }}>{body}</p>}
      </div>
    );
  }

  // statistic ring for behavior score
  function ScoreRing({ value, max=100, size=120, label }) {
    const r = size/2 - 10, c = 2*Math.PI*r, off = c*(1 - value/max);
    const col = value>=80 ? theme.ok : value>=60 ? theme.warn : theme.bad;
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7 }}>
        <div style={{ position:'relative', width:size, height:size }}>
          <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={theme.creamDeep} strokeWidth="9" />
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ transition:'stroke-dashoffset .8s ease' }} />
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:size*0.30, fontWeight:800, color:col, fontFamily:'Cairo, sans-serif', lineHeight:1 }}>{value}</span>
          </div>
        </div>
        {label && <span style={{ fontSize:12.5, color:theme.muted, fontWeight:600, whiteSpace:'nowrap' }}>{label}</span>}
      </div>
    );
  }

  // ---- نافذة تأكيد أنيقة (بديل confirm() الافتراضي) ----
  // الاستخدام:  const ok = await window.UI.confirm({ title, message, danger });  (يُرجع Promise<boolean>)
  function ConfirmHost() {
    const [state, setState] = useState(null); // { title, message, confirmText, cancelText, danger, resolve }
    React.useEffect(() => {
      window.UI.confirm = (opts = {}) => new Promise((resolve) => {
        setState({
          title: opts.title || 'تأكيد',
          message: opts.message || 'هل أنت متأكد؟',
          confirmText: opts.confirmText || 'تأكيد',
          cancelText: opts.cancelText || 'إلغاء',
          danger: opts.danger !== false,
          icon: opts.icon || (opts.danger === false ? 'info' : 'trash'),
          resolve,
        });
      });
    }, []);
    if (!state) return null;
    const close = (val) => { state.resolve(val); setState(null); };
    const accent = state.danger ? theme.bad : theme.primary;
    const accentBg = state.danger ? theme.badBg : theme.creamDeep;
    return (
      <div onClick={() => close(false)} style={{ position:'fixed', inset:0, zIndex:120, background:'rgba(50,46,38,.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' }}>
        <div onClick={(e)=>e.stopPropagation()} style={{ width:'100%', maxWidth:380, background:theme.paper, borderRadius:20, border:`1px solid ${theme.line}`, boxShadow:'0 30px 70px -20px rgba(50,46,38,.55)', overflow:'hidden', textAlign:'center', padding:'30px 26px 24px' }}>
          <div style={{ width:60, height:60, borderRadius:18, background:accentBg, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
            <Icon name={state.icon} size={27} color={accent} />
          </div>
          <h3 style={{ fontSize:18, fontWeight:800, color:theme.ink, fontFamily:'Cairo, sans-serif', marginBottom:8 }}>{state.title}</h3>
          <p style={{ fontSize:14, color:theme.brown, lineHeight:1.7, marginBottom:24 }}>{state.message}</p>
          <div style={{ display:'flex', gap:10 }}>
            <Btn full variant="soft" onClick={()=>close(false)}>{state.cancelText}</Btn>
            <Btn full variant={state.danger ? 'danger' : 'primary'} onClick={()=>close(true)} style={state.danger ? { background:theme.bad, color:'#fff', border:`1px solid ${theme.bad}` } : undefined}>{state.confirmText}</Btn>
          </div>
        </div>
      </div>
    );
  }

  window.UI = { Logo, Avatar, AvatarUpload, readImageAsDataURL, readFileAsDataURL, Btn, Badge, Card, Field, Input, Select, Textarea, Modal, EmptyState, ScoreRing, ConfirmHost, inputBase };
  // fallback قبل تركيب ConfirmHost
  window.UI.confirm = window.UI.confirm || ((opts={}) => Promise.resolve(window.confirm((opts.message)||'تأكيد')));
})();
