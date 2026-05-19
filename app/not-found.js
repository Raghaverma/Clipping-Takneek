'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FCFCFC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '24px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <style>{`
        @keyframes ballBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          30%       { transform: translateY(-60px) rotate(120deg); }
          60%       { transform: translateY(-20px) rotate(220deg); }
          80%       { transform: translateY(-8px) rotate(300deg); }
        }
        @keyframes stumpShake {
          0%, 100% { transform: rotate(0deg); }
          20%       { transform: rotate(-18deg) translateX(-4px); }
          40%       { transform: rotate(12deg) translateX(2px); }
          60%       { transform: rotate(-6deg); }
          80%       { transform: rotate(4deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pitchPulse {
          0%, 100% { opacity: 0.04; }
          50%       { opacity: 0.08; }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249,83,32,0); }
          50%       { box-shadow: 0 0 32px 8px rgba(249,83,32,0.18); }
        }
        .nf-ball   { animation: ballBounce 2.4s cubic-bezier(.36,.07,.19,.97) infinite; }
        .nf-stump  { animation: stumpShake 2.4s ease-in-out infinite; transform-origin: bottom center; }
        .nf-card   { animation: fadeUp 0.6s ease both; }
        .nf-pitch  { animation: pitchPulse 3s ease-in-out infinite; }
        .nf-glow   { animation: glowPulse 2.4s ease-in-out infinite; }
        .nf-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          background: #F95320;
          color: #fff;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.15s ease, transform 0.15s ease;
        }
        .nf-btn:hover { background: #E04318; transform: translateY(-1px); }

        .nf-404-digit {
          font-size: clamp(72px, 14vw, 120px);
          font-weight: 900;
          line-height: 1;
          letter-spacing: -4px;
          color: transparent;
          -webkit-text-stroke: 2px #F95320;
          position: relative;
        }
        .nf-404-digit.filled {
          -webkit-text-stroke: 0;
          color: #F95320;
        }
      `}</style>

      {/* Background pitch lines */}
      <div className="nf-pitch" style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `repeating-linear-gradient(
          90deg,
          transparent,
          transparent 60px,
          #121212 60px,
          #121212 61px
        )`,
        pointerEvents: 'none',
      }} />

      <div className="nf-card" style={{
        textAlign: 'center',
        maxWidth: '480px',
        width: '100%',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Cricket scene */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '32px',
          marginBottom: '32px',
          height: '100px',
        }}>

          {/* 404 with cricket ball replacing the 0 */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <span className="nf-404-digit">4</span>

            {/* Cricket ball as the 0 */}
            <div className="nf-ball nf-glow" style={{
              width: 'clamp(64px, 10vw, 96px)',
              height: 'clamp(64px, 10vw, 96px)',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #c0392b, #7b241c)',
              position: 'relative',
              flexShrink: 0,
              marginBottom: '4px',
            }}>
              {/* seam lines */}
              <svg viewBox="0 0 96 96" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <path d="M 20 48 Q 30 20 48 18 Q 66 16 76 48 Q 66 80 48 78 Q 30 76 20 48Z"
                  fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
                <path d="M 22 38 Q 28 35 34 38 M 22 58 Q 28 61 34 58
                         M 62 38 Q 68 35 74 38 M 62 58 Q 68 61 74 58"
                  fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>

            <span className="nf-404-digit">4</span>
          </div>

          {/* Stumps */}
          <div className="nf-stump" style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <div style={{ width: '16px', height: '3px', background: '#121212', borderRadius: '2px' }} />
                <div style={{
                  width: '10px',
                  height: '56px',
                  background: 'linear-gradient(180deg, #D4A847 0%, #B8892E 100%)',
                  borderRadius: '3px 3px 1px 1px',
                  boxShadow: '1px 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* Text */}
        <div style={{
          background: '#fff',
          border: '1px solid #E1E5F2',
          borderRadius: '16px',
          padding: '32px 36px 36px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(249,83,32,0.08)',
            color: '#F95320',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            padding: '4px 12px',
            borderRadius: '20px',
            marginBottom: '16px',
          }}>
            Stumped!
          </div>

          <h1 style={{
            fontSize: '24px',
            fontWeight: '800',
            color: '#121212',
            margin: '0 0 10px',
            letterSpacing: '-0.5px',
          }}>
            You&apos;re out of bounds
          </h1>

          <p style={{
            fontSize: '14px',
            color: '#788095',
            lineHeight: '1.65',
            margin: '0 0 28px',
          }}>
            This page has been run out — it doesn&apos;t exist or has been moved to the pavilion.
          </p>

          <Link href="/overview" className="nf-btn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            Back to the crease
          </Link>
        </div>

        <p style={{ marginTop: '20px', fontSize: '12px', color: '#B0B8CC' }}>
          Error 404 &nbsp;·&nbsp; Takneek Dashboard
        </p>
      </div>
    </div>
  )
}
