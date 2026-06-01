/* =========================================================================
   Public site — window.Public.PublicSite + Header
   ========================================================================= */
(function () {
  const { theme, L, pick, Icon, diplomas, leadership } = window.TC;
  const { Logo, Btn, Card, Badge } = window.UI;
  const { useState, useEffect, useRef } = React;

  const NAV = [
    { id:'home', key:'home' },
    { id:'about', key:'aboutCenter' },
    { id:'leadership', key:'management' },
    { id:'diplomas', key:'diplomas' },
  ];

  // ---- image placeholder (striped) for spots that want a real photo later
  function Placeholder({ label, h=300, radius=18, style }) {
    return (
      <div style={{ height:h, borderRadius:radius, position:'relative', overflow:'hidden',
        background:`repeating-linear-gradient(135deg, ${theme.creamDeep} 0 14px, ${theme.paperAlt} 14px 28px)`,
        border:`1px solid ${theme.line}`, display:'flex', alignItems:'center', justifyContent:'center', ...style }}>
        <span style={{ fontFamily:'monospace', fontSize:12, color:theme.muted, background:theme.paper, padding:'5px 12px', borderRadius:8, border:`1px solid ${theme.line}` }}>{label}</span>
      </div>
    );
  }

  function Header({ lang, setLang, page, setPage, onLogin }) {
    const t = L(lang);
    const [mobile, setMobile] = useState(false);
    return (
      <header style={{ position:'sticky', top:0, zIndex:50 }}>
        {/* top bar */}
        <div style={{ background:theme.charcoal, color:'#fff' }}>
          <div style={{ maxWidth:1200, margin:'0 auto', padding:'7px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:13 }}>
            <button onClick={onLogin} style={{ display:'flex', alignItems:'center', gap:7, background:'none', border:'none', color:'#fff', cursor:'pointer', fontFamily:'Cairo, sans-serif', opacity:.92 }}>
              <Icon name="user" size={15} /> <span>{t('login')}</span>
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <button onClick={()=>setLang(lang==='ar'?'en':'ar')} style={{ display:'flex', alignItems:'center', gap:7, background:'none', border:'none', color:'#fff', cursor:'pointer', fontFamily:'Cairo, sans-serif', opacity:.92 }}>
                <Icon name="globe" size={15} /> <span>{t('langLabel')}</span>
              </button>
            </div>
          </div>
        </div>
        {/* main bar */}
        <div style={{ background:theme.paper, borderBottom:`1px solid ${theme.line}`, boxShadow:'0 2px 14px -10px rgba(71,60,40,.4)' }}>
          <div style={{ maxWidth:1200, margin:'0 auto', padding:'14px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:20 }}>
            <button onClick={()=>setPage('home')} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
              <Logo size={50} showWordmark lang={lang} />
            </button>
            <nav className="tc-desktop-nav" style={{ display:'flex', alignItems:'center', gap:4 }}>
              {NAV.map(n => {
                const on = page===n.id;
                return (
                  <button key={n.id} onClick={()=>setPage(n.id)}
                    style={{ background: on?theme.creamDeep:'transparent', color: on?theme.ink:theme.brown,
                      border:'none', padding:'9px 16px', borderRadius:10, fontWeight:600, fontSize:14.5,
                      cursor:'pointer', fontFamily:'Cairo, sans-serif', transition:'all .15s ease' }}
                    onMouseEnter={(e)=>{ if(!on){ e.currentTarget.style.background=theme.lineSoft; } }}
                    onMouseLeave={(e)=>{ if(!on){ e.currentTarget.style.background='transparent'; } }}>
                    {t(n.key)}
                  </button>
                );
              })}
              <div style={{ marginInlineStart:8 }}>
                <Btn size="sm" variant="primary" icon="user" onClick={onLogin}>{t('login')}</Btn>
              </div>
            </nav>
            <button className="tc-mobile-btn" onClick={()=>setMobile(!mobile)} style={{ display:'none', background:'none', border:'none', cursor:'pointer', color:theme.brown }}>
              <Icon name={mobile?'x':'menu'} size={26} />
            </button>
          </div>
          {mobile && (
            <div className="tc-mobile-nav" style={{ borderTop:`1px solid ${theme.lineSoft}`, padding:'10px 16px 16px' }}>
              {NAV.map(n => (
                <button key={n.id} onClick={()=>{ setPage(n.id); setMobile(false); }}
                  style={{ display:'block', width:'100%', textAlign:lang==='ar'?'right':'left', background: page===n.id?theme.creamDeep:'transparent',
                    color:theme.brown, border:'none', padding:'12px 14px', borderRadius:10, fontWeight:600, fontSize:15, cursor:'pointer', fontFamily:'Cairo, sans-serif', marginBottom:2 }}>
                  {t(n.key)}
                </button>
              ))}
              <div style={{ marginTop:8 }}><Btn full icon="user" onClick={onLogin}>{t('login')}</Btn></div>
            </div>
          )}
        </div>
      </header>
    );
  }

  // ---- HERO slideshow
  function Hero({ lang, onRegister, onDiplomas }) {
    const t = L(lang);
    const slides = [
      { eyebrow:t('heroEyebrow'), title:t('heroTitle1'), body:t('heroBody1') },
      { eyebrow:t('heroEyebrow'), title:t('heroTitle2'), body:t('heroBody2') },
      { eyebrow:t('heroEyebrow'), title:t('heroTitle3'), body:t('heroBody3') },
    ];
    const [i, setI] = useState(0);
    useEffect(() => { const id = setInterval(()=>setI(p=>(p+1)%slides.length), 6000); return ()=>clearInterval(id); }, []);
    return (
      <section style={{ background:`linear-gradient(160deg, ${theme.cream} 0%, ${theme.paperAlt} 100%)`, borderBottom:`1px solid ${theme.line}`, overflow:'hidden' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'clamp(40px,6vw,80px) 22px', display:'grid', gridTemplateColumns:'1.05fr .95fr', gap:48, alignItems:'center' }} className="tc-hero-grid">
          <div>
            <Badge tone="gold" style={{ marginBottom:18, fontSize:12.5, padding:'5px 12px' }}>
              <Icon name="sparkles" size={13} /> {slides[i].eyebrow}
            </Badge>
            <h1 key={i} style={{ fontFamily:'Amiri, serif', fontWeight:700, fontSize:'clamp(30px,4.4vw,52px)', lineHeight:1.25, color:theme.ink, margin:'0 0 18px' }}>
              {slides[i].title}
            </h1>
            <p style={{ fontSize:'clamp(15px,1.5vw,18px)', lineHeight:1.85, color:theme.brown, maxWidth:520, margin:'0 0 30px' }}>
              {slides[i].body}
            </p>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <Btn size="lg" variant="primary" icon="user" onClick={onRegister}>{t('ctaRegister')}</Btn>
              <Btn size="lg" variant="ghost" iconRight={lang==='ar'?'arrowLeft':'arrowRight'} onClick={onDiplomas}>{t('ctaExplore')}</Btn>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:34 }}>
              {slides.map((_,k)=>(
                <button key={k} onClick={()=>setI(k)} style={{ width:k===i?28:9, height:9, borderRadius:999, border:'none', cursor:'pointer', background:k===i?theme.primary:theme.line, transition:'all .3s ease' }} />
              ))}
            </div>
          </div>
          <div style={{ position:'relative' }}>
            <div style={{ position:'relative', width:'100%', height:380, borderRadius:22, overflow:'hidden', border:`1px solid ${theme.line}`, boxShadow:'0 24px 50px -28px rgba(71,60,40,.5)' }}>
              {['img1','img2','img3'].map((im,k)=>(
                <img key={im} src={`assets/${im}.jpg`} alt="Tamkeen Center"
                  style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:i===k?1:0, transition:'opacity .9s ease' }} />
              ))}
            </div>
            <div style={{ position:'absolute', insetInlineStart:-18, bottom:-18, background:theme.paper, border:`1px solid ${theme.line}`, borderRadius:16, padding:'14px 18px', boxShadow:'0 18px 40px -22px rgba(71,60,40,.45)', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:theme.goldSoft, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="award" size={22} color={theme.primaryDeep} /></div>
              <div>
                <div style={{ fontWeight:800, fontSize:18, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{lang==='ar'?'٣ برامج معتمدة':'3 Programs'}</div>
                <div style={{ fontSize:12, color:theme.muted }}>{lang==='ar'?'دبلومات متخصصة':'Accredited diplomas'}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function Banner({ lang }) {
    const verses = (window.TC.bannerVerses[lang] || window.TC.bannerVerses.ar);
    const groupRef = React.useRef(null);
    const [dur, setDur] = React.useState(70);
    // Constant scroll rate (px/sec) so the bar moves at the SAME visual speed
    // regardless of language — English text is wider, so it gets a longer duration.
    const SPEED = 70;
    React.useLayoutEffect(() => {
      const measure = () => {
        const w = groupRef.current ? groupRef.current.scrollWidth : 0;
        if (w) setDur(Math.max(20, w / SPEED));
      };
      measure();
      const t = setTimeout(measure, 400);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
      window.addEventListener('resize', measure);
      return () => { clearTimeout(t); window.removeEventListener('resize', measure); };
    }, [lang]);
    // Build one group long enough to always exceed the viewport width (verses repeated),
    // then render it twice. Animating the track by exactly -50% lands copy B precisely
    // where copy A began — so the loop is perfectly seamless with no gaps, ever.
    const group = (gk) => {
      const out = [];
      for (let r = 0; r < 3; r++) {
        verses.forEach((v, i) => {
          out.push(
            <span key={`${gk}-${r}-${i}-v`} style={{ fontFamily: lang==='ar' ? 'Amiri, serif' : 'inherit', fontSize:16, fontWeight:600, whiteSpace:'nowrap' }}>{v}</span>
          );
          out.push(
            <span key={`${gk}-${r}-${i}-s`} aria-hidden="true" style={{ padding:'0 28px', color:theme.tan }}>۞</span>
          );
        });
      }
      return out;
    };
    return (
      <div style={{ background:theme.ink, color:theme.goldSoft, overflow:'hidden', padding:'13px 0', direction:'ltr' }}>
        {/* direction:ltr on the whole bar pins the track to the left edge so it overflows
            rightward and the leftward animation always pulls fresh content into view.
            The two identical groups + exact -50% travel make the loop perfectly seamless. */}
        <div style={{ display:'flex', flexWrap:'nowrap', width:'max-content', animation:`tcMarquee ${dur}s linear infinite`, willChange:'transform' }}>
          <div ref={groupRef} style={{ display:'flex', flexWrap:'nowrap', alignItems:'center', flexShrink:0 }}>{group('a')}</div>
          <div style={{ display:'flex', flexWrap:'nowrap', alignItems:'center', flexShrink:0 }} aria-hidden="true">{group('b')}</div>
        </div>
      </div>
    );
  }

  function ContentSection({ lang, onDiplomas }) {
    const t = L(lang);
    const stats = [
      { n:'+450', l:t('statStudents'), icon:'users' },
      { n:'35', l:t('statTeachers'), icon:'gradCap' },
      { n:'3', l:t('statPrograms'), icon:'scroll' },
      { n:'+12', l:t('statYears'), icon:'award' },
    ];
    const feats = [
      { icon:'shield', t:t('feat1T'), b:t('feat1B') },
      { icon:'layers', t:t('feat2T'), b:t('feat2B') },
      { icon:'users', t:t('feat3T'), b:t('feat3B') },
      { icon:'sparkles', t:t('feat4T'), b:t('feat4B') },
    ];
    return (
      <section style={{ maxWidth:1200, margin:'0 auto', padding:'clamp(50px,7vw,90px) 22px' }}>
        {/* stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:70 }} className="tc-stats-grid">
          {stats.map((s,k)=>(
            <Card key={k} pad={22} style={{ textAlign:'center' }}>
              <div style={{ width:46, height:46, borderRadius:13, background:theme.goldSoft, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                <Icon name={s.icon} size={22} color={theme.primaryDeep} />
              </div>
              <div style={{ fontSize:30, fontWeight:800, color:theme.ink, fontFamily:'Cairo, sans-serif', lineHeight:1 }}>{s.n}</div>
              <div style={{ fontSize:13, color:theme.muted, marginTop:6 }}>{s.l}</div>
            </Card>
          ))}
        </div>
        {/* why + intro video */}
        <div style={{ textAlign:'center', maxWidth:640, margin:'0 auto 44px' }}>
          <h2 style={{ fontFamily:'Amiri, serif', fontWeight:700, fontSize:'clamp(26px,3.4vw,40px)', color:theme.ink, margin:'0 0 12px' }}>{t('whyTitle')}</h2>
          <p style={{ fontSize:16, color:theme.brown, lineHeight:1.8 }}>{t('whySub')}</p>
        </div>
        {/* text first (=> right in AR, left in EN) ; video second (=> left in AR, right in EN) */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:36, alignItems:'center', marginBottom:84 }} className="tc-hero-grid">
          <div style={{ display:'grid', gap:14 }}>
            {feats.map((f,k)=>(
              <Card key={k} hover pad={20} style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(150deg, ${theme.primary}, ${theme.primaryDeep})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name={f.icon} size={22} color={theme.goldSoft} />
                </div>
                <div>
                  <h3 style={{ fontSize:17, fontWeight:700, color:theme.ink, margin:'3px 0 6px', fontFamily:'Cairo, sans-serif' }}>{f.t}</h3>
                  <p style={{ fontSize:14, color:theme.brown, lineHeight:1.7 }}>{f.b}</p>
                </div>
              </Card>
            ))}
          </div>
          <div style={{ position:'relative' }}>
            <video key={lang} controls playsInline poster="assets/img4.jpg"
              style={{ width:'100%', aspectRatio:'16 / 10', objectFit:'cover', borderRadius:20, border:`1px solid ${theme.line}`, boxShadow:'0 26px 56px -28px rgba(71,60,40,.55)', background:'#000', display:'block' }}>
              <source src={lang==='ar' ? 'assets/ar-video.mp4' : 'assets/en-video.mp4'} type="video/mp4" />
            </video>
            <div style={{ position:'absolute', insetInlineStart:16, top:16, background:'rgba(50,46,38,.72)', color:'#fff', borderRadius:999, padding:'6px 13px', fontSize:12.5, fontWeight:600, display:'flex', alignItems:'center', gap:7, backdropFilter:'blur(4px)' }}>
              <Icon name="sparkles" size={14} color={theme.goldSoft} /> {t('watchVideo')}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ---- page wrappers
  function PageHead({ lang, title, sub, icon }) {
    return (
      <div style={{ background:`linear-gradient(160deg, ${theme.cream}, ${theme.paperAlt})`, borderBottom:`1px solid ${theme.line}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'clamp(36px,5vw,64px) 22px', textAlign:'center' }}>
          <div style={{ width:60, height:60, borderRadius:17, background:theme.goldSoft, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
            <Icon name={icon} size={28} color={theme.primaryDeep} />
          </div>
          <h1 style={{ fontFamily:'Amiri, serif', fontWeight:700, fontSize:'clamp(28px,3.8vw,44px)', color:theme.ink, margin:'0 0 12px' }}>{title}</h1>
          <p style={{ fontSize:16.5, color:theme.brown, maxWidth:560, margin:'0 auto', lineHeight:1.8 }}>{sub}</p>
        </div>
      </div>
    );
  }

  function AboutPage({ lang }) {
    const t = L(lang);
    const vals = [
      { icon:'gem', l:t('val1') }, { icon:'shield', l:t('val2') }, { icon:'target', l:t('val3') }, { icon:'sparkles', l:t('val4') },
    ];
    return (
      <div>
        <PageHead lang={lang} title={t('aboutTitle')} sub={t('aboutLead')} icon="building" />
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'clamp(40px,6vw,72px) 22px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:36, alignItems:'center', marginBottom:60 }} className="tc-hero-grid">
            <img src="assets/img4.jpg" alt={lang==='ar'?'مركز تمكين':'Tamkeen Center'} style={{ width:'100%', height:320, objectFit:'cover', borderRadius:18, border:`1px solid ${theme.line}`, boxShadow:'0 20px 44px -26px rgba(71,60,40,.45)' }} />
            <div style={{ display:'grid', gap:18 }}>
              <Card pad={26} style={{ borderInlineStart:`4px solid ${theme.primary}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}><Icon name="compass" size={22} color={theme.primary} /><h3 style={{ fontSize:19, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{t('visionT')}</h3></div>
                <p style={{ fontSize:15, color:theme.brown, lineHeight:1.85 }}>{t('visionB')}</p>
              </Card>
              <Card pad={26} style={{ borderInlineStart:`4px solid ${theme.gold}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}><Icon name="target" size={22} color={theme.gold} /><h3 style={{ fontSize:19, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{t('missionT')}</h3></div>
                <p style={{ fontSize:15, color:theme.brown, lineHeight:1.85 }}>{t('missionB')}</p>
              </Card>
            </div>
          </div>
          <h2 style={{ fontFamily:'Amiri, serif', fontWeight:700, fontSize:32, color:theme.ink, textAlign:'center', margin:'0 0 30px' }}>{t('valuesT')}</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }} className="tc-stats-grid">
            {vals.map((v,k)=>(
              <Card key={k} pad={26} style={{ textAlign:'center' }} hover>
                <div style={{ width:54, height:54, borderRadius:16, background:theme.creamDeep, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}><Icon name={v.icon} size={26} color={theme.primary} /></div>
                <div style={{ fontSize:18, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{v.l}</div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function LeadershipPage({ lang }) {
    const t = L(lang);
    const groupAccent = { board: theme.primaryDeep, executive: theme.primary, academic: theme.gold };
    return (
      <div>
        <PageHead lang={lang} title={t('mgmtTitle')} sub={t('mgmtSub')} icon="users" />
        <div style={{ maxWidth:1080, margin:'0 auto', padding:'clamp(40px,6vw,72px) 22px', display:'grid', gap:54 }}>
          {leadership.map((sec)=>{
            const accent = groupAccent[sec.group] || theme.primary;
            return (
              <div key={sec.group}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:26 }}>
                  <span style={{ width:6, height:30, borderRadius:99, background:accent }}></span>
                  <h2 style={{ fontFamily:'Amiri, serif', fontWeight:700, fontSize:'clamp(24px,3vw,32px)', color:theme.ink }}>{pick(sec.title, lang)}</h2>
                  <span style={{ flex:1, height:1, background:theme.line }}></span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns: sec.members.length===1 ? 'minmax(0,420px)' : 'repeat(auto-fit, minmax(280px, 1fr))', gap:22, justifyContent:'center' }}>
                  {sec.members.map((m,k)=>(
                    <Card key={k} pad={26} hover style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center' }}>
                      <div style={{ width:108, height:108, borderRadius:'50%', marginBottom:16, overflow:'hidden', border:`3px solid ${theme.goldSoft}`, flexShrink:0 }}>
                        <img src={m.img} alt={pick(m.name, lang)} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      </div>
                      <h3 style={{ fontSize:18.5, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif', marginBottom:6 }}>{pick(m.name, lang)}</h3>
                      <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:theme.creamDeep, color:accent, fontWeight:700, fontSize:13.5, padding:'5px 14px', borderRadius:999, marginBottom:14 }}>
                        <Icon name="award" size={14} /> {pick(m.position, lang)}
                      </div>
                      <div style={{ width:'100%', display:'grid', gap:9, paddingTop:14, borderTop:`1px solid ${theme.lineSoft}` }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontSize:13, color:theme.brown }}>
                          <Icon name="briefcase" size={14} color={theme.muted} />
                          <span style={{ color:theme.muted }}>{t('specialization2')}:</span>
                          <span style={{ fontWeight:600, color:theme.ink }}>{pick(m.specialization, lang)}</span>
                        </div>
                        <a href={`mailto:${m.email}`} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontSize:12.5, color:theme.brown, textDecoration:'none' }} dir="ltr">
                          <Icon name="mail" size={14} color={theme.muted} /> <span style={{ fontWeight:600 }}>{m.email}</span>
                        </a>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontSize:12.5, color:theme.brown }} dir="ltr">
                          <Icon name="phone" size={14} color={theme.muted} /> <span style={{ fontWeight:600 }}>{m.phone}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function EServicesPage({ lang, onLogin, onRegister }) {
    const t = L(lang);
    const svcs = [
      { icon:'users', t:t('esStudent'), b:t('esStudentB'), act:onLogin, color:theme.primary },
      { icon:'gradCap', t:t('esTeacher'), b:t('esTeacherB'), act:onLogin, color:theme.tan },
      { icon:'userCheck', t:t('esAdmin'), b:t('esAdminB'), act:onLogin, color:theme.primaryDeep },
      { icon:'user', t:t('esRegister'), b:t('esRegisterB'), act:onRegister, color:theme.gold, cta:t('esRegister') },
    ];
    return (
      <div>
        <PageHead lang={lang} title={t('esTitle')} sub={t('esSub')} icon="grid" />
        <div style={{ maxWidth:1000, margin:'0 auto', padding:'clamp(40px,6vw,72px) 22px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:20 }} className="tc-feat-grid">
            {svcs.map((s,k)=>(
              <Card key={k} hover pad={28} onClick={s.act} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ width:54, height:54, borderRadius:15, background:s.color, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name={s.icon} size={26} color="#fff" /></div>
                  <Icon name={lang==='ar'?'arrowLeft':'arrowRight'} size={20} color={theme.mutedSoft} />
                </div>
                <h3 style={{ fontSize:20, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{s.t}</h3>
                <p style={{ fontSize:14.5, color:theme.brown, lineHeight:1.75 }}>{s.b}</p>
                <span style={{ fontSize:14, fontWeight:700, color:s.color }}>{s.cta || t('enter')} ←</span>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function DiplomasPage({ lang, onApply }) {
    const t = L(lang);
    return (
      <div>
        <PageHead lang={lang} title={t('dipTitle')} sub={t('dipSub')} icon="scroll" />
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'clamp(40px,6vw,72px) 22px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:22 }} className="tc-feat-grid">
            {diplomas.map((d)=>(
              <Card key={d.id} pad={0} hover style={{ overflow:'hidden', display:'flex', flexDirection:'column' }}>
                <div style={{ height:130, background:`linear-gradient(150deg, ${d.color}, ${theme.primaryDeep})`, position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name={d.icon} size={52} color="rgba(255,255,255,.92)" sw={1.4} />
                  <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 12px, transparent 12px 24px)' }} />
                </div>
                <div style={{ padding:24, display:'flex', flexDirection:'column', flex:1 }}>
                  <h3 style={{ fontFamily:'Amiri, serif', fontWeight:700, fontSize:23, color:theme.ink, marginBottom:10 }}>{pick(d.name, lang)}</h3>
                  <p style={{ fontSize:14, color:theme.brown, lineHeight:1.7, marginBottom:18, flex:1 }}>{pick(d.desc, lang)}</p>
                  <div style={{ display:'grid', gap:8, marginBottom:18 }}>
                    {[['clock',t('dipDuration'),pick(d.duration,lang)],['book',t('dipCredits'),pick(d.credits,lang)],['calendar',t('dipDays'),pick(d.days,lang)]].map(([ic,lab,val],i)=>(
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:9, fontSize:13.5 }}>
                        <Icon name={ic} size={16} color={theme.primary} />
                        <span style={{ color:theme.muted }}>{lab}:</span>
                        <span style={{ color:theme.ink, fontWeight:600 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                  <Btn full variant="primary" onClick={onApply} icon="send">{t('applyNow')}</Btn>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function Footer({ lang, setPage }) {
    const t = L(lang);
    return (
      <footer style={{ background:theme.charcoal, color:'rgba(255,255,255,.78)', marginTop:0 }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'52px 22px 26px', display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr', gap:40 }} className="tc-feat-grid">
          <div>
            <Logo size={48} showWordmark lang={lang} light />
            <p style={{ fontSize:14, lineHeight:1.8, marginTop:16, maxWidth:340 }}>{t('footerAbout')}</p>
          </div>
          <div>
            <h4 style={{ color:'#fff', fontSize:15, fontWeight:700, marginBottom:14, fontFamily:'Cairo, sans-serif' }}>{t('quickLinks')}</h4>
            <div style={{ display:'grid', gap:9 }}>
              {NAV.map(n=>(<button key={n.id} onClick={()=>setPage(n.id)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.72)', cursor:'pointer', textAlign:lang==='ar'?'right':'left', fontSize:14, fontFamily:'Cairo, sans-serif', padding:0 }}>{t(n.key)}</button>))}
            </div>
          </div>
          <div>
            <h4 style={{ color:'#fff', fontSize:15, fontWeight:700, marginBottom:14, fontFamily:'Cairo, sans-serif' }}>{t('contact')}</h4>
            <div style={{ display:'grid', gap:11, fontSize:14 }}>
              <span style={{ display:'flex', alignItems:'center', gap:9 }}><Icon name="mapPin" size={16} color={theme.goldSoft} /> {lang==='ar'?'الرياض، المملكة العربية السعودية':'Riyadh, Saudi Arabia'}</span>
              <span style={{ display:'flex', alignItems:'center', gap:9 }}><Icon name="phone" size={16} color={theme.goldSoft} /> <span dir="ltr">+966 50 000 0000</span></span>
              <span style={{ display:'flex', alignItems:'center', gap:9 }}><Icon name="mail" size={16} color={theme.goldSoft} /> <span dir="ltr">info@tamkeen.edu</span></span>
            </div>
          </div>
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,.1)', padding:'18px 22px', textAlign:'center', fontSize:13, opacity:.7 }}>
          © {new Date().getFullYear()} — {t('rights')}
        </div>
      </footer>
    );
  }

  function PublicSite({ lang, setLang, page, setPage, onLogin, onRegister }) {
    return (
      <div>
        <Header lang={lang} setLang={setLang} page={page} setPage={setPage} onLogin={onLogin} />
        <main>
          {page==='home' && <React.Fragment>
            <Hero lang={lang} onRegister={onRegister} onDiplomas={()=>setPage('diplomas')} />
            <Banner lang={lang} />
            <ContentSection lang={lang} onDiplomas={()=>setPage('diplomas')} />
          </React.Fragment>}
          {page==='about' && <AboutPage lang={lang} />}
          {page==='leadership' && <LeadershipPage lang={lang} />}
          {page==='diplomas' && <DiplomasPage lang={lang} onApply={onRegister} />}
        </main>
        <Footer lang={lang} setPage={setPage} />
      </div>
    );
  }

  window.Public = { PublicSite, Header, Placeholder };
})();
