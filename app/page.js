import Link from 'next/link';

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at 50% 20%, #2a0000 0%, #0a0a0a 70%)',
        textAlign: 'center',
        padding: '24px',
      }}
    >
      <h1
        style={{
          fontSize: '3rem',
          margin: 0,
          color: '#ff1a1a',
          textShadow: '0 0 12px rgba(255,26,26,0.7), 0 0 30px rgba(255,0,0,0.4)',
          letterSpacing: '2px',
        }}
      >
        ร้านอาหารปีศาจ
      </h1>
      <p style={{ color: '#a33', marginTop: '8px', fontSize: '1.1rem' }}>
        ระบบสั่งอาหารสำหรับร้าน — ทดสอบการ deploy
      </p>

      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginTop: '40px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <Link
          href="/generate-qr"
          style={{
            padding: '14px 28px',
            borderRadius: '8px',
            border: '1px solid #ff1a1a',
            color: '#ff5252',
            textDecoration: 'none',
            background: 'rgba(255,26,26,0.08)',
            fontWeight: 600,
          }}
        >
          สร้าง QR โต๊ะ
        </Link>
        <Link
          href="/kitchen"
          style={{
            padding: '14px 28px',
            borderRadius: '8px',
            border: '1px solid #ff1a1a',
            color: '#ff5252',
            textDecoration: 'none',
            background: 'rgba(255,26,26,0.08)',
            fontWeight: 600,
          }}
        >
          หน้าครัว
        </Link>
      </div>
    </main>
  );
}
