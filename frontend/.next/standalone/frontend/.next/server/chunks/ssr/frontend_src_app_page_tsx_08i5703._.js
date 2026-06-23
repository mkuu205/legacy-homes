module.exports=[73123,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(50944),e=a.i(81581),f=a.i(38246),g=a.i(85424),h=a.i(14258),i=a.i(39157),j=a.i(83248),k=a.i(83900);let l=(0,a.i(64831).default)("headphones",[["path",{d:"M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3",key:"1xhozi"}]]);var m=a.i(18783),n=a.i(79362);a.s(["default",0,function(){let a=(0,d.useRouter)(),{isAuthenticated:o,user:p}=(0,e.useAuthStore)();(0,c.useEffect)(()=>{o&&p&&a.push("RESIDENT"===p.role?"/dashboard":"/admin")},[o,p,a]);let q=[{icon:i.CreditCard,title:"M-Pesa STK Push",desc:"Pay your water bill directly from your phone. Instant confirmation, automatic receipt — zero manual steps.",color:"#22c55e",bg:"rgba(34,197,94,0.1)"},{icon:j.BarChart3,title:"Real-time Analytics",desc:"Track consumption, billing history, and payment records as they happen. Visualize trends over any period.",color:"#38bdf8",bg:"rgba(56,189,248,0.1)"},{icon:k.Bell,title:"Smart Notifications",desc:"Billing alerts, payment confirmations, and estate announcements delivered instantly to all residents.",color:"#f4c26a",bg:"rgba(244,194,106,0.1)"},{icon:l,title:"AI Support",desc:"Get instant answers 24/7 from an AI assistant — or raise a support ticket for human follow-up.",color:"#a78bfa",bg:"rgba(167,139,250,0.1)"},{icon:h.Shield,title:"Bank-grade Security",desc:"JWT auth, encrypted data, full audit trails, and role-based access for admins and residents.",color:"#7eb3ff",bg:"rgba(126,179,255,0.1)"},{icon:g.Droplets,title:"Transparent Billing",desc:"One flat rate. No service charges, no garbage fees, no reconnection penalties. Ever.",color:"#f472b6",bg:"rgba(244,114,182,0.1)"}];return(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)("style",{children:`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

        .lh-root {
          font-family: 'DM Sans', sans-serif;
          background: #0a0f1e;
          color: #fff;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* NAV */
        .lh-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 40px;
          backdrop-filter: blur(20px);
          background: rgba(10,15,30,0.75);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .lh-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .lh-logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg,#1a56db,#0ea5e9);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .lh-logo-text { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 17px; color: #fff; letter-spacing: -0.3px; }
        .lh-nav-links { display: flex; align-items: center; gap: 8px; }
        .lh-btn-ghost {
          padding: 9px 20px; border-radius: 10px;
          background: transparent; border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 500;
          transition: all .2s; text-decoration: none; display: inline-block;
        }
        .lh-btn-ghost:hover { background: rgba(255,255,255,.08); color: #fff; border-color: rgba(255,255,255,.2); }
        .lh-btn-primary {
          padding: 9px 22px; border-radius: 10px;
          background: linear-gradient(135deg,#1a56db,#0ea5e9);
          color: #fff; font-size: 14px; font-weight: 500;
          transition: all .25s; text-decoration: none; display: inline-block;
          box-shadow: 0 4px 20px rgba(26,86,219,.4);
        }
        .lh-btn-primary:hover { opacity: .9; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(26,86,219,.5); }

        /* HERO */
        .lh-hero {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          position: relative; padding: 120px 40px 80px; overflow: hidden;
        }
        .lh-orb {
          position: absolute; border-radius: 50%; filter: blur(80px);
          opacity: 0.35; animation: lhPulse 8s ease-in-out infinite;
        }
        .lh-orb-1 { width: 600px; height: 600px; background: radial-gradient(circle,#1a56db,transparent); top: -100px; right: -100px; animation-delay: 0s; }
        .lh-orb-2 { width: 400px; height: 400px; background: radial-gradient(circle,#0ea5e9,transparent); bottom: 0; left: -80px; animation-delay: -4s; }
        .lh-orb-3 { width: 300px; height: 300px; background: radial-gradient(circle,#d4a84b,transparent); top: 50%; left: 40%; animation-delay: -2s; opacity: .12; }
        @keyframes lhPulse { 0%,100% { transform: scale(1) translate(0,0); } 50% { transform: scale(1.08) translate(10px,-10px); } }
        .lh-grid-overlay {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        .lh-hero-content { position: relative; z-index: 1; text-align: center; max-width: 820px; }
        .lh-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 7px 16px; border-radius: 50px;
          background: rgba(26,86,219,.15); border: 1px solid rgba(26,86,219,.3);
          color: #7eb3ff; font-size: 13px; font-weight: 500;
          margin-bottom: 32px; letter-spacing: .3px;
        }
        .lh-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #0ea5e9; animation: lhBlink 2s ease-in-out infinite; }
        @keyframes lhBlink { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
        .lh-hero h1 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(48px, 7vw, 84px);
          font-weight: 800; line-height: 1.0; letter-spacing: -2px;
          margin-bottom: 24px; color: #fff;
        }
        .lh-hero h1 em {
          font-style: normal;
          background: linear-gradient(135deg,#7eb3ff,#0ea5e9,#38bdf8);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lh-hero p { font-size: 18px; font-weight: 300; color: rgba(255,255,255,.55); line-height: 1.7; max-width: 520px; margin: 0 auto 40px; }
        .lh-hero-cta { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; }
        .lh-btn-xl {
          padding: 15px 32px; border-radius: 14px;
          font-size: 16px; font-weight: 500;
          transition: all .25s; text-decoration: none;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .lh-btn-xl.solid {
          background: linear-gradient(135deg,#1a56db,#0ea5e9); color: #fff;
          border: none; box-shadow: 0 8px 32px rgba(26,86,219,.4);
        }
        .lh-btn-xl.solid:hover { opacity: .9; transform: translateY(-2px); box-shadow: 0 14px 40px rgba(26,86,219,.5); }
        .lh-btn-xl.outline {
          background: rgba(255,255,255,.04); color: rgba(255,255,255,.75);
          border: 1px solid rgba(255,255,255,.12);
        }
        .lh-btn-xl.outline:hover { background: rgba(255,255,255,.08); color: #fff; border-color: rgba(255,255,255,.25); }
        .lh-trust-row { display: flex; align-items: center; justify-content: center; gap: 24px; margin-top: 48px; flex-wrap: wrap; }
        .lh-trust-item { display: flex; align-items: center; gap: 7px; font-size: 13px; color: rgba(255,255,255,.45); }

        /* STATS */
        .lh-stats-strip { padding: 48px 40px; position: relative; z-index: 1; }
        .lh-stats-inner {
          max-width: 960px; margin: 0 auto;
          display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1px; background: rgba(255,255,255,.07);
          border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,.07);
        }
        .lh-stat-block { background: rgba(255,255,255,.03); padding: 32px 24px; text-align: center; }
        .lh-stat-num { font-family: 'Syne', sans-serif; font-size: 42px; font-weight: 800; color: #fff; letter-spacing: -2px; line-height: 1; }
        .lh-stat-num span { font-size: 22px; font-weight: 600; color: #0ea5e9; }
        .lh-stat-label { font-size: 13px; color: rgba(255,255,255,.4); margin-top: 8px; }

        /* FEATURES */
        .lh-section { padding: 80px 40px; }
        .lh-section-inner { max-width: 1080px; margin: 0 auto; }
        .lh-eyebrow { font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #0ea5e9; margin-bottom: 14px; }
        .lh-section-title { font-family: 'Syne', sans-serif; font-size: clamp(30px,4vw,46px); font-weight: 800; letter-spacing: -1.5px; color: #fff; line-height: 1.1; margin-bottom: 16px; }
        .lh-section-sub { font-size: 17px; color: rgba(255,255,255,.45); font-weight: 300; max-width: 480px; }
        .lh-features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-top: 56px; }
        .lh-feature-card {
          background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07);
          border-radius: 20px; padding: 28px;
          transition: all .3s; position: relative; overflow: hidden;
        }
        .lh-feature-card:hover { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.12); transform: translateY(-3px); }
        .lh-feature-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }
        .lh-feature-card h3 { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 8px; letter-spacing: -.3px; }
        .lh-feature-card p { font-size: 14px; color: rgba(255,255,255,.45); line-height: 1.65; font-weight: 300; }

        /* BILLING */
        .lh-billing { padding: 80px 40px; }
        .lh-billing-inner { max-width: 960px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
        @media(max-width:700px){ .lh-billing-inner { grid-template-columns: 1fr; } }
        .lh-billing-left h2 { font-family: 'Syne', sans-serif; font-size: clamp(28px,3.5vw,40px); font-weight: 800; letter-spacing: -1.5px; color: #fff; line-height: 1.15; margin-bottom: 16px; }
        .lh-billing-left p { font-size: 16px; color: rgba(255,255,255,.45); line-height: 1.7; font-weight: 300; margin-bottom: 28px; }
        .lh-check-list { list-style: none; display: flex; flex-direction: column; gap: 12px; }
        .lh-check-list li { display: flex; align-items: center; gap: 10px; font-size: 14px; color: rgba(255,255,255,.65); }
        .lh-billing-card {
          background: linear-gradient(135deg,#0d1f42,#0a1530);
          border: 1px solid rgba(26,86,219,.25); border-radius: 24px; padding: 40px; text-align: center;
          position: relative; overflow: hidden;
        }
        .lh-billing-card::before { content: ''; position: absolute; top: -60px; right: -60px; width: 200px; height: 200px; background: radial-gradient(circle,rgba(14,165,233,.15),transparent); border-radius: 50%; }
        .lh-billing-card::after  { content: ''; position: absolute; bottom: -40px; left: -40px; width: 160px; height: 160px; background: radial-gradient(circle,rgba(26,86,219,.1),transparent); border-radius: 50%; }
        .lh-billing-label { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,.35); font-weight: 600; margin-bottom: 20px; }
        .lh-billing-rate { font-family: 'Syne', sans-serif; font-size: 72px; font-weight: 800; color: #fff; letter-spacing: -3px; line-height: 1; margin-bottom: 4px; }
        .lh-billing-rate span { font-size: 28px; font-weight: 600; color: rgba(255,255,255,.5); letter-spacing: -1px; }
        .lh-billing-unit { font-size: 15px; color: rgba(255,255,255,.4); margin-bottom: 28px; }
        .lh-billing-formula { background: rgba(255,255,255,.05); border-radius: 12px; padding: 14px 20px; font-size: 13px; color: rgba(255,255,255,.5); border: 1px solid rgba(255,255,255,.07); font-family: monospace; }
        .lh-billing-formula strong { color: #38bdf8; }

        /* FOOTER */
        .lh-footer { padding: 48px 40px; border-top: 1px solid rgba(255,255,255,.06); }
        .lh-footer-inner { max-width: 960px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .lh-footer-copy { font-size: 13px; color: rgba(255,255,255,.25); }

        /* Fade-up animation */
        @keyframes lhFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .lh-fade-1 { animation: lhFadeUp .7s ease both; }
        .lh-fade-2 { animation: lhFadeUp .7s .15s ease both; }
        .lh-fade-3 { animation: lhFadeUp .7s .3s ease both; }
        .lh-fade-4 { animation: lhFadeUp .7s .45s ease both; }
      `}),(0,b.jsxs)("div",{className:"lh-root",children:[(0,b.jsxs)("nav",{className:"lh-nav",children:[(0,b.jsxs)(f.default,{href:"/",className:"lh-logo",children:[(0,b.jsx)("div",{className:"lh-logo-icon",children:(0,b.jsx)(g.Droplets,{className:"w-4 h-4 text-white"})}),(0,b.jsx)("span",{className:"lh-logo-text",children:"Legacy Homes"})]}),(0,b.jsxs)("div",{className:"lh-nav-links",children:[(0,b.jsx)(f.default,{href:"/login",className:"lh-btn-ghost",children:"Sign In"}),(0,b.jsx)(f.default,{href:"/register",className:"lh-btn-primary",children:"Get Started →"})]})]}),(0,b.jsxs)("section",{className:"lh-hero",children:[(0,b.jsxs)("div",{style:{position:"absolute",inset:0,zIndex:0},children:[(0,b.jsx)("div",{className:"lh-orb lh-orb-1"}),(0,b.jsx)("div",{className:"lh-orb lh-orb-2"}),(0,b.jsx)("div",{className:"lh-orb lh-orb-3"}),(0,b.jsx)("div",{className:"lh-grid-overlay"})]}),(0,b.jsxs)("div",{className:"lh-hero-content",children:[(0,b.jsxs)("div",{className:"lh-badge lh-fade-1",children:[(0,b.jsx)("span",{className:"lh-badge-dot"}),"Kenya's #1 Estate Water Platform"]}),(0,b.jsxs)("h1",{className:"lh-fade-2",children:["Smart Water.",(0,b.jsx)("br",{}),(0,b.jsx)("em",{children:"Smarter Billing."})]}),(0,b.jsx)("p",{className:"lh-fade-3",children:"Manage meters, generate bills, collect M-Pesa payments, and keep every resident in the loop — from one powerful dashboard."}),(0,b.jsxs)("div",{className:"lh-hero-cta lh-fade-4",children:[(0,b.jsxs)(f.default,{href:"/register",className:"lh-btn-xl solid",children:["Create Your Account ",(0,b.jsx)(m.ArrowRight,{className:"w-5 h-5"})]}),(0,b.jsx)(f.default,{href:"/login",className:"lh-btn-xl outline",children:"Sign In to Dashboard"})]}),(0,b.jsx)("div",{className:"lh-trust-row lh-fade-4",children:["No hidden charges","M-Pesa payments","Real-time updates","Bank-grade security"].map(a=>(0,b.jsxs)("div",{className:"lh-trust-item",children:[(0,b.jsx)(n.CheckCircle,{className:"w-3.5 h-3.5",style:{color:"#22c55e",flexShrink:0}}),a]},a))})]})]}),(0,b.jsx)("div",{className:"lh-stats-strip",children:(0,b.jsx)("div",{className:"lh-stats-inner",children:[{num:"250",unit:"KES",label:"Per unit consumed"},{num:"0",unit:"",label:"Hidden charges"},{num:"24",unit:"/7",label:"AI support & uptime"},{num:"~30",unit:"s",label:"M-Pesa confirmation"}].map(({num:a,unit:c,label:d})=>(0,b.jsxs)("div",{className:"lh-stat-block",children:[(0,b.jsxs)("div",{className:"lh-stat-num",children:[a,(0,b.jsx)("span",{children:c})]}),(0,b.jsx)("div",{className:"lh-stat-label",children:d})]},d))})}),(0,b.jsx)("section",{className:"lh-section",children:(0,b.jsxs)("div",{className:"lh-section-inner",children:[(0,b.jsx)("p",{className:"lh-eyebrow",children:"Platform Features"}),(0,b.jsxs)("h2",{className:"lh-section-title",children:["Everything in",(0,b.jsx)("br",{}),"one place."]}),(0,b.jsx)("p",{className:"lh-section-sub",children:"Purpose-built for Kenyan estates — designed for residents and admins alike."}),(0,b.jsx)("div",{className:"lh-features-grid",children:q.map(({icon:a,title:c,desc:d,color:e,bg:f})=>(0,b.jsxs)("div",{className:"lh-feature-card",children:[(0,b.jsx)("div",{className:"lh-feature-icon",style:{background:f},children:(0,b.jsx)(a,{style:{color:e,width:22,height:22,strokeWidth:1.8}})}),(0,b.jsx)("h3",{children:c}),(0,b.jsx)("p",{children:d})]},c))})]})}),(0,b.jsx)("section",{className:"lh-billing",children:(0,b.jsxs)("div",{className:"lh-billing-inner",children:[(0,b.jsxs)("div",{className:"lh-billing-left",children:[(0,b.jsx)("p",{className:"lh-eyebrow",children:"Pricing Model"}),(0,b.jsxs)("h2",{children:["Simple pricing.",(0,b.jsx)("br",{}),"Zero surprises."]}),(0,b.jsx)("p",{children:"We believe billing should be crystal clear. One rate, one formula — every resident knows exactly what they owe and why."}),(0,b.jsx)("ul",{className:"lh-check-list",children:["No service charges","No garbage fees","No reconnection fees","No hidden charges"].map(a=>(0,b.jsxs)("li",{children:[(0,b.jsx)(n.CheckCircle,{style:{width:16,height:16,color:"#22c55e",flexShrink:0}}),a]},a))})]}),(0,b.jsxs)("div",{className:"lh-billing-card",children:[(0,b.jsx)("div",{className:"lh-billing-label",children:"Current Flat Rate"}),(0,b.jsxs)("div",{className:"lh-billing-rate",children:["250",(0,b.jsx)("span",{children:"KES"})]}),(0,b.jsx)("div",{className:"lh-billing-unit",children:"per unit consumed"}),(0,b.jsxs)("div",{className:"lh-billing-formula",children:["Bill = (",(0,b.jsx)("strong",{children:"Current"})," − ",(0,b.jsx)("strong",{children:"Previous"}),") × ",(0,b.jsx)("strong",{children:"KES 250"})]})]})]})}),(0,b.jsx)("footer",{className:"lh-footer",children:(0,b.jsxs)("div",{className:"lh-footer-inner",children:[(0,b.jsxs)(f.default,{href:"/",className:"lh-logo",children:[(0,b.jsx)("div",{className:"lh-logo-icon",style:{width:28,height:28,borderRadius:8},children:(0,b.jsx)(g.Droplets,{className:"w-3.5 h-3.5 text-white"})}),(0,b.jsx)("span",{className:"lh-logo-text",style:{fontSize:15},children:"Legacy Homes"})]}),(0,b.jsxs)("p",{className:"lh-footer-copy",children:["© ",new Date().getFullYear()," Legacy Homes Water Billing System · Nairobi, Kenya"]})]})})]})]})}],73123)}];

//# sourceMappingURL=frontend_src_app_page_tsx_08i5703._.js.map