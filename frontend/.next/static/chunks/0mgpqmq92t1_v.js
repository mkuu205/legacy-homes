(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,67280,e=>{"use strict";let t=(0,e.i(56420).default)("droplets",[["path",{d:"M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z",key:"1ptgy4"}],["path",{d:"M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97",key:"1sl1rz"}]]);e.s(["Droplets",0,t],67280)},24942,e=>{"use strict";let t,r,a,n;var i,l=e.i(71645);let o=e=>{let t,r=new Set,a=(e,a)=>{let n="function"==typeof e?e(t):e;if(!Object.is(n,t)){let e=t;t=(null!=a?a:"object"!=typeof n||null===n)?n:Object.assign({},t,n),r.forEach(r=>r(t,e))}},n=()=>t,i={setState:a,getState:n,getInitialState:()=>l,subscribe:e=>(r.add(e),()=>r.delete(e))},l=t=e(a,n,i);return i},s=e=>t=>{try{let r=e(t);if(r instanceof Promise)return r;return{then:e=>s(e)(r),catch(e){return this}}}catch(e){return{then(e){return this},catch:t=>s(t)(e)}}},c=(a=(i=(t=e=>({user:null,isAuthenticated:!1,hydrated:!1,setAuth:(t,r,a)=>{let n=crypto.randomUUID();sessionStorage.setItem("accessToken",r),sessionStorage.setItem("refreshToken",a),sessionStorage.setItem("sessionId",n),e({user:t,isAuthenticated:!0})},updateUser:t=>e(e=>({user:e.user?{...e.user,...t}:null})),logout:()=>{sessionStorage.removeItem("accessToken"),sessionStorage.removeItem("refreshToken"),sessionStorage.removeItem("sessionId"),e({user:null,isAuthenticated:!1})},clearSession:()=>{sessionStorage.removeItem("accessToken"),sessionStorage.removeItem("refreshToken"),sessionStorage.removeItem("sessionId"),e({user:null,isAuthenticated:!1})},setHydrated:t=>e({hydrated:t})}),r={name:"auth-storage",partialize:e=>({user:e.user,isAuthenticated:e.isAuthenticated}),onRehydrateStorage:()=>e=>{e&&e.setHydrated(!0)}},(e,a,n)=>{let i,l={storage:function(e){let t;try{t=e()}catch(e){return}return{getItem:e=>{var r;let a=e=>null===e?null:JSON.parse(e,void 0),n=null!=(r=t.getItem(e))?r:null;return n instanceof Promise?n.then(a):a(n)},setItem:(e,r)=>t.setItem(e,JSON.stringify(r,void 0)),removeItem:e=>t.removeItem(e)}}(()=>window.localStorage),partialize:e=>e,version:0,merge:(e,t)=>({...t,...e}),...r},o=!1,c=0,d=new Set,h=new Set,p=l.storage;if(!p)return t((...t)=>{console.warn(`[zustand persist middleware] Unable to update item '${l.name}', the given storage is currently unavailable.`),e(...t)},a,n);let u=()=>{let e=l.partialize({...a()});return p.setItem(l.name,{state:e,version:l.version})},f=n.setState;n.setState=(e,t)=>(f(e,t),u());let g=t((...t)=>(e(...t),u()),a,n);n.getInitialState=()=>g;let x=()=>{var t,r;if(!p)return;let n=++c;o=!1,d.forEach(e=>{var t;return e(null!=(t=a())?t:g)});let f=(null==(r=l.onRehydrateStorage)?void 0:r.call(l,null!=(t=a())?t:g))||void 0;return s(p.getItem.bind(p))(l.name).then(e=>{if(e)if("number"!=typeof e.version||e.version===l.version)return[!1,e.state];else{if(l.migrate){let t=l.migrate(e.state,e.version);return t instanceof Promise?t.then(e=>[!0,e]):[!0,t]}console.error("State loaded from storage couldn't be migrated since no migrate function was provided")}return[!1,void 0]}).then(t=>{var r;if(n!==c)return;let[o,s]=t;if(e(i=l.merge(s,null!=(r=a())?r:g),!0),o)return u()}).then(()=>{n===c&&(null==f||f(a(),void 0),i=a(),o=!0,h.forEach(e=>e(i)))}).catch(e=>{n===c&&(null==f||f(void 0,e))})};return n.persist={setOptions:e=>{l={...l,...e},e.storage&&(p=e.storage)},clearStorage:()=>{null==p||p.removeItem(l.name)},getOptions:()=>l,rehydrate:()=>x(),hasHydrated:()=>o,onHydrate:e=>(d.add(e),()=>{d.delete(e)}),onFinishHydration:e=>(h.add(e),()=>{h.delete(e)})},l.skipHydration||x(),i||g}))?o(i):o,Object.assign(n=e=>(function(e,t=e=>e){let r=l.default.useSyncExternalStore(e.subscribe,l.default.useCallback(()=>t(e.getState()),[e,t]),l.default.useCallback(()=>t(e.getInitialState()),[e,t]));return l.default.useDebugValue(r),r})(a,e),a),n);e.s(["useAuthStore",0,c],24942)},18566,(e,t,r)=>{t.exports=e.r(76562)},95057,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var a={formatUrl:function(){return o},formatWithValidation:function(){return c},urlObjectKeys:function(){return s}};for(var n in a)Object.defineProperty(r,n,{enumerable:!0,get:a[n]});let i=e.r(90809)._(e.r(98183)),l=/https?|ftp|gopher|file/;function o(e){let{auth:t,hostname:r}=e,a=e.protocol||"",n=e.pathname||"",o=e.hash||"",s=e.query||"",c=!1;t=t?encodeURIComponent(t).replace(/%3A/i,":")+"@":"",e.host?c=t+e.host:r&&(c=t+(~r.indexOf(":")?`[${r}]`:r),e.port&&(c+=":"+e.port)),s&&"object"==typeof s&&(s=String(i.urlQueryToSearchParams(s)));let d=e.search||s&&`?${s}`||"";return a&&!a.endsWith(":")&&(a+=":"),e.slashes||(!a||l.test(a))&&!1!==c?(c="//"+(c||""),n&&"/"!==n[0]&&(n="/"+n)):c||(c=""),o&&"#"!==o[0]&&(o="#"+o),d&&"?"!==d[0]&&(d="?"+d),n=n.replace(/[?#]/g,encodeURIComponent),d=d.replace("#","%23"),`${a}${c}${n}${d}${o}`}let s=["auth","hash","host","hostname","href","path","pathname","port","protocol","query","search","slashes"];function c(e){return o(e)}},18581,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"useMergedRef",{enumerable:!0,get:function(){return n}});let a=e.r(71645);function n(e,t){let r=(0,a.useRef)(null),n=(0,a.useRef)(null);return(0,a.useCallback)(a=>{if(null===a){let e=r.current;e&&(r.current=null,e());let t=n.current;t&&(n.current=null,t())}else e&&(r.current=i(e,a)),t&&(n.current=i(t,a))},[e,t])}function i(e,t){if("function"!=typeof e)return e.current=t,()=>{e.current=null};{let r=e(t);return"function"==typeof r?r:()=>e(null)}}("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},73668,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"isLocalURL",{enumerable:!0,get:function(){return i}});let a=e.r(18967),n=e.r(52817);function i(e){if(!(0,a.isAbsoluteUrl)(e))return!0;try{let t=(0,a.getLocationOrigin)(),r=new URL(e,t);return r.origin===t&&(0,n.hasBasePath)(r.pathname)}catch(e){return!1}}},84508,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"errorOnce",{enumerable:!0,get:function(){return a}});let a=e=>{}},22016,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var a={default:function(){return m},useLinkStatus:function(){return y}};for(var n in a)Object.defineProperty(r,n,{enumerable:!0,get:a[n]});let i=e.r(90809),l=e.r(43476),o=i._(e.r(71645)),s=e.r(95057),c=e.r(8372),d=e.r(18581),h=e.r(18967),p=e.r(5550);e.r(33525);let u=e.r(88540),f=e.r(91949),g=e.r(73668),x=e.r(9396);function m(t){var r,a;let n,i,m,[y,v]=(0,o.useOptimistic)(f.IDLE_LINK_STATUS),j=(0,o.useRef)(null),{href:w,as:k,children:S,prefetch:N=null,passHref:z,replace:I,shallow:P,scroll:C,onClick:O,onMouseEnter:T,onTouchStart:M,legacyBehavior:A=!1,onNavigate:E,transitionTypes:R,ref:_,unstable_dynamicOnHover:U,...B}=t;n=S,A&&("string"==typeof n||"number"==typeof n)&&(n=(0,l.jsx)("a",{children:n}));let L=o.default.useContext(c.AppRouterContext),D=!1!==N,F=!1!==N?null===(a=N)||"auto"===a?x.FetchStrategy.PPR:x.FetchStrategy.Full:x.FetchStrategy.PPR,K="string"==typeof(r=k||w)?r:(0,s.formatUrl)(r);if(A){if(n?.$$typeof===Symbol.for("react.lazy"))throw Object.defineProperty(Error("`<Link legacyBehavior>` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's `<a>` tag."),"__NEXT_ERROR_CODE",{value:"E863",enumerable:!1,configurable:!0});i=o.default.Children.only(n)}let H=A?i&&"object"==typeof i&&i.ref:_,$=o.default.useCallback(e=>(null!==L&&(j.current=(0,f.mountLinkInstance)(e,K,L,F,D,v)),()=>{j.current&&((0,f.unmountLinkForCurrentNavigation)(j.current),j.current=null),(0,f.unmountPrefetchableInstance)(e)}),[D,K,L,F,v]),W={ref:(0,d.useMergedRef)($,H),onClick(t){A||"function"!=typeof O||O(t),A&&i.props&&"function"==typeof i.props.onClick&&i.props.onClick(t),!L||t.defaultPrevented||function(t,r,a,n,i,l,s){if("u">typeof window){let c,{nodeName:d}=t.currentTarget;if("A"===d.toUpperCase()&&((c=t.currentTarget.getAttribute("target"))&&"_self"!==c||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||t.nativeEvent&&2===t.nativeEvent.which)||t.currentTarget.hasAttribute("download"))return;if(!(0,g.isLocalURL)(r)){n&&(t.preventDefault(),location.replace(r));return}if(t.preventDefault(),l){let e=!1;if(l({preventDefault:()=>{e=!0}}),e)return}let{dispatchNavigateAction:h}=e.r(99781);o.default.startTransition(()=>{h(r,n?"replace":"push",!1===i?u.ScrollBehavior.NoScroll:u.ScrollBehavior.Default,a.current,s)})}}(t,K,j,I,C,E,R)},onMouseEnter(e){A||"function"!=typeof T||T(e),A&&i.props&&"function"==typeof i.props.onMouseEnter&&i.props.onMouseEnter(e),L&&D&&(0,f.onNavigationIntent)(e.currentTarget,!0===U)},onTouchStart:function(e){A||"function"!=typeof M||M(e),A&&i.props&&"function"==typeof i.props.onTouchStart&&i.props.onTouchStart(e),L&&D&&(0,f.onNavigationIntent)(e.currentTarget,!0===U)}};return(0,h.isAbsoluteUrl)(K)?W.href=K:A&&!z&&("a"!==i.type||"href"in i.props)||(W.href=(0,p.addBasePath)(K)),m=A?o.default.cloneElement(i,W):(0,l.jsx)("a",{...B,...W,children:n}),(0,l.jsx)(b.Provider,{value:y,children:m})}e.r(84508);let b=(0,o.createContext)(f.IDLE_LINK_STATUS),y=()=>(0,o.useContext)(b);("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},68877,e=>{"use strict";let t=(0,e.i(56420).default)("arrow-right",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);e.s(["ArrowRight",0,t],68877)},70387,e=>{"use strict";let t=(0,e.i(56420).default)("credit-card",[["rect",{width:"20",height:"14",x:"2",y:"5",rx:"2",key:"ynyp8z"}],["line",{x1:"2",x2:"22",y1:"10",y2:"10",key:"1b3vmo"}]]);e.s(["CreditCard",0,t],70387)},70812,e=>{"use strict";let t=(0,e.i(56420).default)("bell",[["path",{d:"M10.268 21a2 2 0 0 0 3.464 0",key:"vwvbt9"}],["path",{d:"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",key:"11g9vi"}]]);e.s(["Bell",0,t],70812)},82954,e=>{"use strict";let t=(0,e.i(56420).default)("shield",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]]);e.s(["Shield",0,t],82954)},49803,e=>{"use strict";let t=(0,e.i(56420).default)("chart-column",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);e.s(["BarChart3",0,t],49803)},50912,e=>{"use strict";var t=e.i(43476),r=e.i(71645),a=e.i(18566),n=e.i(24942),i=e.i(22016),l=e.i(67280),o=e.i(82954),s=e.i(70387),c=e.i(49803),d=e.i(70812);let h=(0,e.i(56420).default)("headphones",[["path",{d:"M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3",key:"1xhozi"}]]);var p=e.i(68877),u=e.i(48161);e.s(["default",0,function(){let e=(0,a.useRouter)(),{isAuthenticated:f,user:g}=(0,n.useAuthStore)();(0,r.useEffect)(()=>{f&&g&&e.push("RESIDENT"===g.role?"/dashboard":"/admin")},[f,g,e]);let x=[{icon:s.CreditCard,title:"M-Pesa STK Push",desc:"Pay your water bill directly from your phone. Instant confirmation, automatic receipt — zero manual steps.",color:"#22c55e",bg:"rgba(34,197,94,0.1)"},{icon:c.BarChart3,title:"Real-time Analytics",desc:"Track consumption, billing history, and payment records as they happen. Visualize trends over any period.",color:"#38bdf8",bg:"rgba(56,189,248,0.1)"},{icon:d.Bell,title:"Smart Notifications",desc:"Billing alerts, payment confirmations, and estate announcements delivered instantly to all residents.",color:"#f4c26a",bg:"rgba(244,194,106,0.1)"},{icon:h,title:"AI Support",desc:"Get instant answers 24/7 from an AI assistant — or raise a support ticket for human follow-up.",color:"#a78bfa",bg:"rgba(167,139,250,0.1)"},{icon:o.Shield,title:"Bank-grade Security",desc:"JWT auth, encrypted data, full audit trails, and role-based access for admins and residents.",color:"#7eb3ff",bg:"rgba(126,179,255,0.1)"},{icon:l.Droplets,title:"Transparent Billing",desc:"One flat rate. No service charges, no garbage fees, no reconnection penalties. Ever.",color:"#f472b6",bg:"rgba(244,114,182,0.1)"}];return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("style",{children:`
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
      `}),(0,t.jsxs)("div",{className:"lh-root",children:[(0,t.jsxs)("nav",{className:"lh-nav",children:[(0,t.jsxs)(i.default,{href:"/",className:"lh-logo",children:[(0,t.jsx)("div",{className:"lh-logo-icon",children:(0,t.jsx)(l.Droplets,{className:"w-4 h-4 text-white"})}),(0,t.jsx)("span",{className:"lh-logo-text",children:"Legacy Homes"})]}),(0,t.jsxs)("div",{className:"lh-nav-links",children:[(0,t.jsx)(i.default,{href:"/login",className:"lh-btn-ghost",children:"Sign In"}),(0,t.jsx)(i.default,{href:"/register",className:"lh-btn-primary",children:"Get Started →"})]})]}),(0,t.jsxs)("section",{className:"lh-hero",children:[(0,t.jsxs)("div",{style:{position:"absolute",inset:0,zIndex:0},children:[(0,t.jsx)("div",{className:"lh-orb lh-orb-1"}),(0,t.jsx)("div",{className:"lh-orb lh-orb-2"}),(0,t.jsx)("div",{className:"lh-orb lh-orb-3"}),(0,t.jsx)("div",{className:"lh-grid-overlay"})]}),(0,t.jsxs)("div",{className:"lh-hero-content",children:[(0,t.jsxs)("div",{className:"lh-badge lh-fade-1",children:[(0,t.jsx)("span",{className:"lh-badge-dot"}),"Kenya's #1 Estate Water Platform"]}),(0,t.jsxs)("h1",{className:"lh-fade-2",children:["Smart Water.",(0,t.jsx)("br",{}),(0,t.jsx)("em",{children:"Smarter Billing."})]}),(0,t.jsx)("p",{className:"lh-fade-3",children:"Manage meters, generate bills, collect M-Pesa payments, and keep every resident in the loop — from one powerful dashboard."}),(0,t.jsxs)("div",{className:"lh-hero-cta lh-fade-4",children:[(0,t.jsxs)(i.default,{href:"/register",className:"lh-btn-xl solid",children:["Create Your Account ",(0,t.jsx)(p.ArrowRight,{className:"w-5 h-5"})]}),(0,t.jsx)(i.default,{href:"/login",className:"lh-btn-xl outline",children:"Sign In to Dashboard"})]}),(0,t.jsx)("div",{className:"lh-trust-row lh-fade-4",children:["No hidden charges","M-Pesa payments","Real-time updates","Bank-grade security"].map(e=>(0,t.jsxs)("div",{className:"lh-trust-item",children:[(0,t.jsx)(u.CheckCircle,{className:"w-3.5 h-3.5",style:{color:"#22c55e",flexShrink:0}}),e]},e))})]})]}),(0,t.jsx)("div",{className:"lh-stats-strip",children:(0,t.jsx)("div",{className:"lh-stats-inner",children:[{num:"250",unit:"KES",label:"Per unit consumed"},{num:"0",unit:"",label:"Hidden charges"},{num:"24",unit:"/7",label:"AI support & uptime"},{num:"~30",unit:"s",label:"M-Pesa confirmation"}].map(({num:e,unit:r,label:a})=>(0,t.jsxs)("div",{className:"lh-stat-block",children:[(0,t.jsxs)("div",{className:"lh-stat-num",children:[e,(0,t.jsx)("span",{children:r})]}),(0,t.jsx)("div",{className:"lh-stat-label",children:a})]},a))})}),(0,t.jsx)("section",{className:"lh-section",children:(0,t.jsxs)("div",{className:"lh-section-inner",children:[(0,t.jsx)("p",{className:"lh-eyebrow",children:"Platform Features"}),(0,t.jsxs)("h2",{className:"lh-section-title",children:["Everything in",(0,t.jsx)("br",{}),"one place."]}),(0,t.jsx)("p",{className:"lh-section-sub",children:"Purpose-built for Kenyan estates — designed for residents and admins alike."}),(0,t.jsx)("div",{className:"lh-features-grid",children:x.map(({icon:e,title:r,desc:a,color:n,bg:i})=>(0,t.jsxs)("div",{className:"lh-feature-card",children:[(0,t.jsx)("div",{className:"lh-feature-icon",style:{background:i},children:(0,t.jsx)(e,{style:{color:n,width:22,height:22,strokeWidth:1.8}})}),(0,t.jsx)("h3",{children:r}),(0,t.jsx)("p",{children:a})]},r))})]})}),(0,t.jsx)("section",{className:"lh-billing",children:(0,t.jsxs)("div",{className:"lh-billing-inner",children:[(0,t.jsxs)("div",{className:"lh-billing-left",children:[(0,t.jsx)("p",{className:"lh-eyebrow",children:"Pricing Model"}),(0,t.jsxs)("h2",{children:["Simple pricing.",(0,t.jsx)("br",{}),"Zero surprises."]}),(0,t.jsx)("p",{children:"We believe billing should be crystal clear. One rate, one formula — every resident knows exactly what they owe and why."}),(0,t.jsx)("ul",{className:"lh-check-list",children:["No service charges","No garbage fees","No reconnection fees","No hidden charges"].map(e=>(0,t.jsxs)("li",{children:[(0,t.jsx)(u.CheckCircle,{style:{width:16,height:16,color:"#22c55e",flexShrink:0}}),e]},e))})]}),(0,t.jsxs)("div",{className:"lh-billing-card",children:[(0,t.jsx)("div",{className:"lh-billing-label",children:"Current Flat Rate"}),(0,t.jsxs)("div",{className:"lh-billing-rate",children:["250",(0,t.jsx)("span",{children:"KES"})]}),(0,t.jsx)("div",{className:"lh-billing-unit",children:"per unit consumed"}),(0,t.jsxs)("div",{className:"lh-billing-formula",children:["Bill = (",(0,t.jsx)("strong",{children:"Current"})," − ",(0,t.jsx)("strong",{children:"Previous"}),") × ",(0,t.jsx)("strong",{children:"KES 250"})]})]})]})}),(0,t.jsx)("footer",{className:"lh-footer",children:(0,t.jsxs)("div",{className:"lh-footer-inner",children:[(0,t.jsxs)(i.default,{href:"/",className:"lh-logo",children:[(0,t.jsx)("div",{className:"lh-logo-icon",style:{width:28,height:28,borderRadius:8},children:(0,t.jsx)(l.Droplets,{className:"w-3.5 h-3.5 text-white"})}),(0,t.jsx)("span",{className:"lh-logo-text",style:{fontSize:15},children:"Legacy Homes"})]}),(0,t.jsxs)("p",{className:"lh-footer-copy",children:["© ",new Date().getFullYear()," Legacy Homes Water Billing System · Nairobi, Kenya"]})]})})]})]})}],50912)}]);