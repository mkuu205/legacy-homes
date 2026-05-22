'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';
import {
  Droplets, Zap, CreditCard, BarChart3,
  Bell, Headphones, ArrowRight, CheckCircle, Shield,
  ChevronRight, Smartphone, Lock, TrendingUp,
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
      title: 'Smart Meter Tracking',
      desc: 'Real-time consumption monitoring with instant meter readings and historical data.',
      color: '#00C6A7',
    },
    {
      icon: Zap,
      title: 'Instant Payments',
      desc: 'M-Pesa STK push integration for seamless, secure payment processing.',
      color: '#14E6D4',
    },
    {
      icon: BarChart3,
      title: 'Invoice Downloads',
      desc: 'Professional PDF invoices with complete billing history and payment records.',
      color: '#00C6A7',
    },
    {
      icon: Bell,
      title: 'Real-Time Notifications',
      desc: 'Instant alerts for bills, payments, and estate announcements to all residents.',
      color: '#14E6D4',
    },
    {
      icon: Headphones,
      title: 'Support Ticket System',
      desc: 'AI-powered support with 24/7 availability and human escalation when needed.',
      color: '#00C6A7',
    },
    {
      icon: Shield,
      title: 'Admin Billing Management',
      desc: 'Comprehensive dashboard for billing, collections, and financial reporting.',
      color: '#14E6D4',
    },
  ];

  const faqItems = [
    {
      q: 'How does the billing calculation work?',
      a: 'We use a simple flat-rate model: (Current Reading - Previous Reading) × KES 250. No hidden charges, service fees, or reconnection penalties.',
    },
    {
      q: 'What payment methods do you support?',
      a: 'We support M-Pesa STK Push for instant payments. Residents receive a payment prompt directly on their phone.',
    },
    {
      q: 'Can I access my billing history?',
      a: 'Yes. Residents can view and download their complete billing and payment history from their dashboard anytime.',
    },
    {
      q: 'Is my data secure?',
      a: 'Absolutely. We use JWT authentication, encrypted data transmission, and role-based access control with full audit trails.',
    },
    {
      q: 'How do I get started as an admin?',
      a: 'Contact our team at 0796307638 or visit the admin login to set up your estate management account.',
    },
    {
      q: 'What if I have a billing dispute?',
      a: 'Submit a support ticket through the platform. Our team will review and respond within 24 hours.',
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&display=swap');

        .lh-root {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #0F172A;
          color: #F8FAFC;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ──────────────────────────────────────────────────────────────────
           NAVIGATION
           ────────────────────────────────────────────────────────────────── */
        .lh-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 40px;
          backdrop-filter: blur(24px);
          background: rgba(15, 23, 42, 0.7);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .lh-logo {
          display: flex; align-items: center; gap: 12px;
          text-decoration: none;
          font-weight: 700;
          font-size: 16px;
          color: #F8FAFC;
        }

        .lh-logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #00C6A7, #14E6D4);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .lh-nav-links {
          display: flex; align-items: center; gap: 12px;
        }

        .lh-nav-link {
          padding: 8px 16px; border-radius: 8px;
          background: transparent; border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94A3B8; font-size: 14px; font-weight: 500;
          transition: all 0.2s; text-decoration: none; display: inline-block;
          cursor: pointer;
        }

        .lh-nav-link:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #F8FAFC;
          border-color: rgba(255, 255, 255, 0.2);
        }

        .lh-btn-primary {
          padding: 8px 18px; border-radius: 8px;
          background: linear-gradient(135deg, #00C6A7, #14E6D4);
          color: #021a10; font-size: 14px; font-weight: 600;
          transition: all 0.2s; text-decoration: none; display: inline-block;
          border: none; cursor: pointer;
          box-shadow: 0 8px 24px rgba(0, 198, 167, 0.25);
        }

        .lh-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0, 198, 167, 0.35);
        }

        /* ──────────────────────────────────────────────────────────────────
           HERO SECTION
           ────────────────────────────────────────────────────────────────── */
        .lh-hero {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          position: relative; padding: 120px 40px 80px; overflow: hidden;
        }

        .lh-hero::before {
          content: '';
          position: absolute; top: -40%; right: -20%;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(0, 198, 167, 0.15), transparent);
          border-radius: 50%; filter: blur(80px);
          animation: lhFloat 20s ease-in-out infinite;
        }

        .lh-hero::after {
          content: '';
          position: absolute; bottom: -30%; left: -10%;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(20, 230, 212, 0.1), transparent);
          border-radius: 50%; filter: blur(80px);
          animation: lhFloat 25s ease-in-out infinite reverse;
        }

        @keyframes lhFloat {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }

        .lh-grid-bg {
          position: absolute; inset: 0;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }

        .lh-hero-content {
          position: relative; z-index: 1;
          text-align: center; max-width: 900px;
          animation: lhFadeUp 0.8s ease-out;
        }

        @keyframes lhFadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .lh-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 16px; border-radius: 50px;
          background: rgba(0, 198, 167, 0.1);
          border: 1px solid rgba(0, 198, 167, 0.2);
          color: #14E6D4; font-size: 13px; font-weight: 600;
          margin-bottom: 32px; letter-spacing: 0.3px;
        }

        .lh-badge-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #14E6D4;
          animation: lhPulse 2s ease-in-out infinite;
        }

        @keyframes lhPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .lh-hero h1 {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(48px, 8vw, 80px);
          font-weight: 800; line-height: 1.1; letter-spacing: -1.5px;
          margin-bottom: 24px; color: #F8FAFC;
        }

        .lh-hero h1 em {
          font-style: normal;
          background: linear-gradient(135deg, #00C6A7, #14E6D4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .lh-hero p {
          font-size: 18px; font-weight: 400; color: #94A3B8;
          line-height: 1.7; max-width: 600px; margin: 0 auto 40px;
        }

        .lh-hero-cta {
          display: flex; align-items: center; justify-content: center;
          gap: 16px; flex-wrap: wrap; margin-bottom: 48px;
        }

        .lh-btn-xl {
          padding: 14px 32px; border-radius: 10px;
          font-size: 15px; font-weight: 600;
          transition: all 0.3s; text-decoration: none;
          display: inline-flex; align-items: center; gap: 8px;
          border: none; cursor: pointer;
        }

        .lh-btn-xl.solid {
          background: linear-gradient(135deg, #00C6A7, #14E6D4);
          color: #021a10;
          box-shadow: 0 12px 32px rgba(0, 198, 167, 0.3);
        }

        .lh-btn-xl.solid:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 40px rgba(0, 198, 167, 0.4);
        }

        .lh-btn-xl.outline {
          background: rgba(255, 255, 255, 0.06);
          color: #F8FAFC;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .lh-btn-xl.outline:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-3px);
        }

        .lh-trust-items {
          display: flex; align-items: center; justify-content: center;
          gap: 32px; flex-wrap: wrap; font-size: 14px; color: #94A3B8;
        }

        .lh-trust-item {
          display: flex; align-items: center; gap: 8px;
        }

        /* ──────────────────────────────────────────────────────────────────
           FEATURES SECTION
           ────────────────────────────────────────────────────────────────── */
        .lh-section {
          padding: 100px 40px; position: relative;
        }

        .lh-section-inner {
          max-width: 1200px; margin: 0 auto;
        }

        .lh-eyebrow {
          font-size: 12px; font-weight: 700;
          letter-spacing: 2px; text-transform: uppercase;
          color: #00C6A7; margin-bottom: 16px;
        }

        .lh-section-title {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(32px, 5vw, 48px);
          font-weight: 800; letter-spacing: -1px;
          color: #F8FAFC; line-height: 1.2; margin-bottom: 16px;
        }

        .lh-section-sub {
          font-size: 16px; color: #94A3B8;
          font-weight: 400; max-width: 500px; margin-bottom: 56px;
        }

        .lh-features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 24px;
        }

        .lh-feature-card {
          background: linear-gradient(135deg, rgba(31, 41, 55, 0.5), rgba(17, 24, 39, 0.5));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px; padding: 32px;
          transition: all 0.3s; position: relative; overflow: hidden;
          backdrop-filter: blur(8px);
        }

        .lh-feature-card::before {
          content: '';
          position: absolute; top: 0; right: 0;
          width: 1px; height: 100%;
          background: linear-gradient(180deg, rgba(0, 198, 167, 0.2), transparent);
        }

        .lh-feature-card:hover {
          background: linear-gradient(135deg, rgba(31, 41, 55, 0.7), rgba(17, 24, 39, 0.7));
          border-color: rgba(0, 198, 167, 0.3);
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0, 198, 167, 0.1);
        }

        .lh-feature-icon {
          width: 52px; height: 52px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 20px;
          background: rgba(0, 198, 167, 0.1);
          border: 1px solid rgba(0, 198, 167, 0.2);
        }

        .lh-feature-card h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 18px; font-weight: 700;
          color: #F8FAFC; margin-bottom: 12px; letter-spacing: -0.3px;
        }

        .lh-feature-card p {
          font-size: 14px; color: #94A3B8;
          line-height: 1.6; font-weight: 400;
        }

        /* ──────────────────────────────────────────────────────────────────
           FAQ SECTION
           ────────────────────────────────────────────────────────────────── */
        .lh-faq {
          padding: 100px 40px; background: rgba(0, 198, 167, 0.02);
        }

        .lh-faq-inner {
          max-width: 900px; margin: 0 auto;
        }

        .lh-faq-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
          gap: 24px;
          margin-top: 48px;
        }

        .lh-faq-item {
          background: rgba(31, 41, 55, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px; padding: 24px;
          transition: all 0.3s;
        }

        .lh-faq-item:hover {
          background: rgba(31, 41, 55, 0.6);
          border-color: rgba(0, 198, 167, 0.2);
        }

        .lh-faq-q {
          font-size: 15px; font-weight: 700;
          color: #F8FAFC; margin-bottom: 12px;
          font-family: 'Outfit', sans-serif;
        }

        .lh-faq-a {
          font-size: 14px; color: #94A3B8;
          line-height: 1.6; font-weight: 400;
        }

        /* ──────────────────────────────────────────────────────────────────
           FOOTER
           ────────────────────────────────────────────────────────────────── */
        .lh-footer {
          padding: 60px 40px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, transparent, rgba(0, 198, 167, 0.03));
        }

        .lh-footer-inner {
          max-width: 1200px; margin: 0 auto;
          display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 48px;
        }

        .lh-footer-col h4 {
          font-size: 14px; font-weight: 700;
          color: #F8FAFC; margin-bottom: 16px;
          font-family: 'Outfit', sans-serif;
        }

        .lh-footer-links {
          display: flex; flex-direction: column; gap: 10px;
        }

        .lh-footer-link {
          font-size: 14px; color: #94A3B8;
          text-decoration: none; transition: color 0.2s;
        }

        .lh-footer-link:hover {
          color: #00C6A7;
        }

        .lh-footer-bottom {
          grid-column: 1 / -1;
          display: flex; align-items: center; justify-content: space-between;
          padding-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.08);
          flex-wrap: wrap; gap: 16px;
        }

        .lh-footer-copy {
          font-size: 13px; color: #64748B;
        }

        .lh-footer-contact {
          font-size: 14px; color: #94A3B8;
        }

        .lh-footer-contact strong {
          color: #00C6A7; font-weight: 600;
        }

        /* ──────────────────────────────────────────────────────────────────
           RESPONSIVE
           ────────────────────────────────────────────────────────────────── */
        @media (max-width: 768px) {
          .lh-nav {
            padding: 12px 20px;
          }

          .lh-hero {
            padding: 100px 20px 60px;
          }

          .lh-hero h1 {
            font-size: 36px;
          }

          .lh-hero p {
            font-size: 16px;
          }

          .lh-hero-cta {
            flex-direction: column;
          }

          .lh-btn-xl {
            width: 100%;
          }

          .lh-trust-items {
            gap: 16px;
            flex-direction: column;
            align-items: flex-start;
          }

          .lh-section {
            padding: 60px 20px;
          }

          .lh-section-title {
            font-size: 28px;
          }

          .lh-features-grid {
            grid-template-columns: 1fr;
          }

          .lh-faq-grid {
            grid-template-columns: 1fr;
          }

          .lh-footer-inner {
            grid-template-columns: 1fr;
          }

          .lh-footer-bottom {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="lh-root">

        {/* ── NAVIGATION ── */}
        <nav className="lh-nav">
          <Link href="/" className="lh-logo">
            <div className="lh-logo-icon">
              <Droplets className="w-4 h-4 text-white" />
            </div>
            <span>Legacy Homes</span>
          </Link>
          <div className="lh-nav-links">
            <Link href="/login" className="lh-nav-link">Sign In</Link>
            <Link href="/admin/login" className="lh-nav-link">Admin Login</Link>
            <Link href="/register" className="lh-btn-primary">Get Started</Link>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="lh-hero">
          <div className="lh-grid-bg" />

          <div className="lh-hero-content">
            <div className="lh-badge">
              <span className="lh-badge-dot" />
              Kenya's Premier Estate Water Platform
            </div>

            <h1>
              Smart Utility Billing<br />
              for <em>Modern Communities</em>
            </h1>

            <p>
              Track water usage, receive invoices, pay instantly, and manage support from one modern platform. Built for Kenyan estates, designed for simplicity.
            </p>

            <div className="lh-hero-cta">
              <Link href="/register" className="lh-btn-xl solid">
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className="lh-btn-xl outline">
                Resident Login
              </Link>
            </div>

            <div className="lh-trust-items">
              <div className="lh-trust-item">
                <CheckCircle className="w-4 h-4" style={{ color: '#10B981', flexShrink: 0 }} />
                No hidden charges
              </div>
              <div className="lh-trust-item">
                <CheckCircle className="w-4 h-4" style={{ color: '#10B981', flexShrink: 0 }} />
                M-Pesa payments
              </div>
              <div className="lh-trust-item">
                <CheckCircle className="w-4 h-4" style={{ color: '#10B981', flexShrink: 0 }} />
                Real-time updates
              </div>
              <div className="lh-trust-item">
                <CheckCircle className="w-4 h-4" style={{ color: '#10B981', flexShrink: 0 }} />
                Bank-grade security
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="lh-section">
          <div className="lh-section-inner">
            <p className="lh-eyebrow">Platform Features</p>
            <h2 className="lh-section-title">Everything you need<br />in one place</h2>
            <p className="lh-section-sub">
              Comprehensive tools for residents and administrators. Transparent billing, instant payments, and 24/7 support.
            </p>

            <div className="lh-features-grid">
              {features.map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="lh-feature-card">
                  <div className="lh-feature-icon">
                    <Icon className="w-6 h-6" style={{ color }} />
                  </div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="lh-faq">
          <div className="lh-faq-inner">
            <p className="lh-eyebrow">Questions?</p>
            <h2 className="lh-section-title">Frequently Asked</h2>

            <div className="lh-faq-grid">
              {faqItems.map(({ q, a }) => (
                <div key={q} className="lh-faq-item">
                  <div className="lh-faq-q">{q}</div>
                  <div className="lh-faq-a">{a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="lh-footer">
          <div className="lh-footer-inner">
            <div className="lh-footer-col">
              <Link href="/" className="lh-logo" style={{ marginBottom: 16 }}>
                <div className="lh-logo-icon" style={{ width: 32, height: 32 }}>
                  <Droplets className="w-4 h-4 text-white" />
                </div>
                <span style={{ fontSize: 14 }}>Legacy Homes</span>
              </Link>
              <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>
                Smart utility billing for modern Kenyan communities. Transparent, instant, secure.
              </p>
            </div>

            <div className="lh-footer-col">
              <h4>Product</h4>
              <div className="lh-footer-links">
                <Link href="/" className="lh-footer-link">Features</Link>
                <Link href="/" className="lh-footer-link">Pricing</Link>
                <Link href="/" className="lh-footer-link">Security</Link>
              </div>
            </div>

            <div className="lh-footer-col">
              <h4>Company</h4>
              <div className="lh-footer-links">
                <a href="tel:0796307638" className="lh-footer-link">Contact: 0796307638</a>
                <Link href="/" className="lh-footer-link">Support</Link>
                <Link href="/" className="lh-footer-link">Documentation</Link>
              </div>
            </div>

            <div className="lh-footer-bottom">
              <p className="lh-footer-copy">
                © {new Date().getFullYear()} Legacy Homes. All rights reserved.
              </p>
              <p className="lh-footer-contact">
                Made by <strong>Kish Tech</strong> · <strong>0796307638</strong>
              </p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
