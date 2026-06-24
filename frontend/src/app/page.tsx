'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Droplets, Shield, CreditCard, BarChart3,
  Bell, Headphones, ArrowRight, CheckCircle, Zap,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      router.push(user.role === 'RESIDENT' ? '/dashboard' : '/admin');
    }
  }, [isAuthenticated, user, router]);

  const features = [
    {
      icon: CreditCard,
      title: 'M-Pesa STK Push',
      desc: 'Pay your water bill directly from your phone. Instant confirmation, automatic receipt — zero manual steps.',
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.1)',
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      desc: 'Track consumption, billing history, and payment records as they happen. Visualize trends over any period.',
      color: '#38bdf8',
      bg: 'rgba(56,189,248,0.1)',
    },
    {
      icon: Bell,
      title: 'Smart Notifications',
      desc: 'Billing alerts, payment confirmations, and estate announcements delivered instantly to all residents.',
      color: '#f4c26a',
      bg: 'rgba(244,194,106,0.1)',
    },
    {
      icon: Headphones,
      title: 'AI Support',
      desc: 'Get instant answers 24/7 from an AI assistant — or raise a support ticket for human follow-up.',
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.1)',
    },
    {
      icon: Shield,
      title: 'Bank-grade Security',
      desc: 'JWT auth, encrypted data, full audit trails, and role-based access for admins and residents.',
      color: '#7eb3ff',
      bg: 'rgba(126,179,255,0.1)',
    },
    {
      icon: Droplets,
      title: 'Transparent Billing',
      desc: 'One flat rate. No service charges, no garbage fees, no reconnection penalties. Ever.',
      color: '#f472b6',
      bg: 'rgba(244,114,182,0.1)',
    },
  ];

  const stats = [
    { num: '250', unit: 'KES', label: 'Per unit consumed' },
    { num: '0',   unit: '',    label: 'Hidden charges' },
    { num: '24',  unit: '/7',  label: 'AI support & uptime' },
    { num: '~30', unit: 's',   label: 'M-Pesa confirmation' },
  ];

  const trustItems = [
    'No hidden charges',
    'M-Pesa payments',
    'Real-time updates',
    'Bank-grade security',
  ];

  const noneItems = [
    'No service charges',
    'No garbage fees',
    'No reconnection fees',
    'No hidden charges',
  ];

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      }
    }
  };

  const scaleOnHover = {
    whileHover: { scale: 1.05, transition: { duration: 0.2 } },
    whileTap: { scale: 0.95 }
  };

  const floatAnimation = {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const pulseGlow = {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.3, 0.5, 0.3],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <>
      <style>{`
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
          opacity: 0.35;
        }
        .lh-orb-1 { width: 600px; height: 600px; background: radial-gradient(circle,#1a56db,transparent); top: -100px; right: -100px; }
        .lh-orb-2 { width: 400px; height: 400px; background: radial-gradient(circle,#0ea5e9,transparent); bottom: 0; left: -80px; }
        .lh-orb-3 { width: 300px; height: 300px; background: radial-gradient(circle,#d4a84b,transparent); top: 50%; left: 40%; opacity: .12; }
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
          cursor: default;
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
        .lh-footer { 
          padding: 48px 40px 32px; 
          border-top: 1px solid rgba(255,255,255,.06);
        }
        .lh-footer-inner { 
          max-width: 960px; 
          margin: 0 auto; 
          display: flex; 
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .lh-footer-top {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .lh-footer-copy { 
          font-size: 13px; 
          color: rgba(255,255,255,.25);
        }
        .lh-footer-powered {
          width: 100%;
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,.06);
          font-size: 13px;
          color: rgba(255,255,255,.3);
          letter-spacing: 0.3px;
        }
        .lh-footer-powered .powered-link {
          color: #38bdf8;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s;
        }
        .lh-footer-powered .powered-link:hover {
          color: #7eb3ff;
          text-decoration: underline;
        }
        .lh-footer-powered .kish-text {
          background: linear-gradient(135deg,#38bdf8,#0ea5e9);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 700;
        }
        .lh-footer-powered .phone-link {
          color: rgba(255,255,255,.5);
          text-decoration: none;
          transition: all 0.2s;
          font-weight: 500;
        }
        .lh-footer-powered .phone-link:hover {
          color: #38bdf8;
        }
        .lh-footer-powered .zap-icon {
          display: inline-block;
          animation: lhZap 2s ease-in-out infinite;
        }
        @keyframes lhZap {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.2) rotate(10deg); }
        }

        @keyframes lhPulse { 
          0%,100% { transform: scale(1) translate(0,0); } 
          50% { transform: scale(1.08) translate(10px,-10px); } 
        }

        .lh-orb-1 { animation: lhPulse 8s ease-in-out infinite; }
        .lh-orb-2 { animation: lhPulse 8s ease-in-out infinite reverse; }
        .lh-orb-3 { animation: lhPulse 10s ease-in-out infinite; }
      `}</style>

      <div className="lh-root">

        {/* ── NAV ── */}
        <motion.nav 
          className="lh-nav"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Link href="/" className="lh-logo">
            <div className="lh-logo-icon">
              <Droplets className="w-4 h-4 text-white" />
            </div>
            <span className="lh-logo-text">Legacy Homes</span>
          </Link>
          <div className="lh-nav-links">
            <Link href="/login" className="lh-btn-ghost">Sign In</Link>
            <Link href="/register" className="lh-btn-primary">Get Started →</Link>
          </div>
        </motion.nav>

        {/* ── HERO ── */}
        <section className="lh-hero">
          {/* Background effects */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <motion.div 
              className="lh-orb lh-orb-1"
              animate={pulseGlow.animate}
            />
            <motion.div 
              className="lh-orb lh-orb-2"
              animate={pulseGlow.animate}
              transition={{ delay: 1 }}
            />
            <div className="lh-orb lh-orb-3" />
            <div className="lh-grid-overlay" />
          </div>

          <div className="lh-hero-content">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="lh-badge">
                <span className="lh-badge-dot" />
                Kenya&apos;s #1 Estate Water Platform
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
            >
              Smart Water.<br />
              <em>Smarter Billing.</em>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
            >
              Manage meters, generate bills, collect M-Pesa payments, and keep every
              resident in the loop — from one powerful dashboard.
            </motion.p>

            <motion.div 
              className="lh-hero-cta"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            >
              <motion.div {...scaleOnHover}>
                <Link href="/register" className="lh-btn-xl solid">
                  Create Your Account <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>
              <motion.div {...scaleOnHover}>
                <Link href="/login" className="lh-btn-xl outline">
                  Sign In to Dashboard
                </Link>
              </motion.div>
            </motion.div>

            <motion.div 
              className="lh-trust-row"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
            >
              {trustItems.map((item, index) => (
                <motion.div 
                  key={item} 
                  className="lh-trust-item"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
                >
                  <CheckCircle className="w-3.5 h-3.5" style={{ color: '#22c55e', flexShrink: 0 }} />
                  {item}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── STATS ── */}
        <motion.div 
          className="lh-stats-strip"
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <div className="lh-stats-inner">
            {stats.map(({ num, unit, label }, index) => (
              <motion.div 
                key={label} 
                className="lh-stat-block"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="lh-stat-num">
                  {num}<span>{unit}</span>
                </div>
                <div className="lh-stat-label">{label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── FEATURES ── */}
        <section className="lh-section">
          <div className="lh-section-inner">
            <motion.p 
              className="lh-eyebrow"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Platform Features
            </motion.p>
            <motion.h2 
              className="lh-section-title"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Everything in<br />one place.
            </motion.h2>
            <motion.p 
              className="lh-section-sub"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Purpose-built for Kenyan estates — designed for residents and admins alike.
            </motion.p>
            
            <motion.div 
              className="lh-features-grid"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {features.map(({ icon: Icon, title, desc, color, bg }) => (
                <motion.div 
                  key={title} 
                  className="lh-feature-card"
                  variants={fadeInUp}
                  whileHover={{ 
                    y: -8,
                    borderColor: color,
                    boxShadow: `0 8px 30px rgba(0,0,0,0.3)`
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div 
                    className="lh-feature-icon" 
                    style={{ background: bg }}
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Icon style={{ color, width: 22, height: 22, strokeWidth: 1.8 }} />
                  </motion.div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── BILLING ── */}
        <section className="lh-billing">
          <div className="lh-billing-inner">
            <motion.div 
              className="lh-billing-left"
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7 }}
            >
              <p className="lh-eyebrow">Pricing Model</p>
              <h2>Simple pricing.<br />Zero surprises.</h2>
              <p>
                We believe billing should be crystal clear. One rate, one formula —
                every resident knows exactly what they owe and why.
              </p>
              <ul className="lh-check-list">
                {noneItems.map((item, index) => (
                  <motion.li 
                    key={item}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <CheckCircle style={{ width: 16, height: 16, color: '#22c55e', flexShrink: 0 }} />
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div 
              className="lh-billing-card"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              whileHover={{ 
                scale: 1.02,
                boxShadow: "0 20px 60px rgba(26,86,219,0.2)",
                transition: { duration: 0.3 }
              }}
            >
              <div className="lh-billing-label">Current Flat Rate</div>
              <motion.div 
                className="lh-billing-rate"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                250<span>KES</span>
              </motion.div>
              <div className="lh-billing-unit">per unit consumed</div>
              <div className="lh-billing-formula">
                Bill = (<strong>Current</strong> − <strong>Previous</strong>) × <strong>KES 250</strong>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <motion.footer 
          className="lh-footer"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <div className="lh-footer-inner">
            <div className="lh-footer-top">
              <Link href="/" className="lh-logo">
                <div className="lh-logo-icon" style={{ width: 28, height: 28, borderRadius: 8 }}>
                  <Droplets className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="lh-logo-text" style={{ fontSize: 15 }}>Legacy Homes</span>
              </Link>
              <p className="lh-footer-copy">
                © {new Date().getFullYear()} · Nakuru, Kenya
              </p>
            </div>
            
            <motion.div 
              className="lh-footer-powered"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <span className="zap-icon">⚡</span> Powered by{' '}
              <span className="kish-text">Kish Tech</span>
              {' '}·{' '}
              <a href="tel:+254796307638" className="phone-link">0796 307 638</a>
            </motion.div>
          </div>
        </motion.footer>

      </div>
    </>
  );
}
