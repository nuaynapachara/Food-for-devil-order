import Link from 'next/link';

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#ff3b3b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '420px',
          width: '100%',
          background: '#171010',
          border: '1px solid #3a1010',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          boxShadow: '0 0 30px rgba(255,26,26,0.2)',
        }}
      >
        <h1 style={{ fontSize: '2.2rem', marginBottom: '8px', fontWeight: 800 }}>
          🔥 ร้านอาหารปีศาจ 🔥
        </h1>
        <p style={{ color: '#999', fontSize: '1rem', marginBottom: '32px' }}>
          ระบบสั่งอาหารและจัดการครัว Realtime
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Link
            href="/generate-qr"
            style={{
              background: '#c81c1c',
              color: '#fff',
              fontWeight: 800,
              padding: '16px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: '1.1rem',
              boxShadow: '0 4px 14px rgba(200,28,28,0.4)',
            }}
          >
            สร้าง QR Code (พนักงาน)
          </Link>
          <Link
            href="/kitchen"
            style={{
              background: 'transparent',
              color: '#ff6b6b',
              border: '2px solid #c81c1c',
              fontWeight: 800,
              padding: '16px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: '1.1rem',
            }}
          >
            จอแสดงผลในครัว (Kitchen)
          </Link>
        </div>
      </div>
    </main>
  );
}
