'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const ACTIVE_STATUSES = ['received', 'cooking'];

const STATUS_STYLE = {
  received: {
    border: '#ff2d2d',
    glow: 'rgba(255,45,45,0.35)',
    badgeBg: '#3a0000',
    badgeText: '#ff6b6b',
    label: 'ออเดอร์ใหม่',
  },
  cooking: {
    border: '#ff9500',
    glow: 'rgba(255,149,0,0.35)',
    badgeBg: '#3a2200',
    badgeText: '#ffb347',
    label: 'กำลังทำ',
  },
};

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const audioCtxRef = useRef(null);

  // เตรียม AudioContext ไว้เล่นเสียงกระดิ่งเมื่อมีออเดอร์ใหม่
  function playBell() {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      // เสียงกระดิ่งสั้นๆ 2 โน้ต
      [880, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const start = now + i * 0.15;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch (e) {
      // เล่นเสียงไม่ได้ (เช่น browser block autoplay) ไม่ต้องทำอะไรต่อ
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .in('status', ACTIVE_STATUSES)
        .order('created_at', { ascending: true });

      if (!isMounted) return;

      if (fetchError) {
        setError('โหลดออเดอร์ไม่สำเร็จ: ' + fetchError.message);
      } else {
        setOrders(data || []);
      }
      setLoading(false);
    }

    loadOrders();

    // Supabase Realtime: ฟังการเปลี่ยนแปลงของตาราง orders แบบสด
    const channel = supabase
      .channel('kitchen-display-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new;
          if (!ACTIVE_STATUSES.includes(newOrder.status)) return;
          setOrders((prev) => [...prev, newOrder]);
          playBell();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updated = payload.new;
          setOrders((prev) => {
            if (!ACTIVE_STATUSES.includes(updated.status)) {
              // เสิร์ฟแล้ว (หรือสถานะอื่นที่ไม่ต้องแสดง) -> เอาการ์ดออก
              return prev.filter((o) => o.id !== updated.id);
            }
            const exists = prev.some((o) => o.id === updated.id);
            if (!exists) return [...prev, updated];
            return prev.map((o) => (o.id === updated.id ? updated : o));
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleStartCooking(order) {
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'cooking' })
      .eq('id', order.id);

    if (updateError) {
      setError('อัปเดตสถานะไม่สำเร็จ: ' + updateError.message);
    }
    // การ์ดจะเปลี่ยนสีเองผ่าน Realtime subscription ด้านบน
  }

  async function handleServed(order) {
    // เอาการ์ดออกจากจอทันที (optimistic) ก่อนรอ Realtime ยืนยัน
    setOrders((prev) => prev.filter((o) => o.id !== order.id));

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'served' })
      .eq('id', order.id);

    if (updateError) {
      setError('อัปเดตสถานะไม่สำเร็จ: ' + updateError.message);
      // ถ้า update ไม่สำเร็จ ให้เอาการ์ดกลับมา
      setOrders((prev) => [...prev, order]);
    }
  }

  function formatTime(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#080808',
        padding: '24px',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <h1
          style={{
            color: '#ff2d2d',
            fontSize: '2.2rem',
            margin: 0,
            textShadow: '0 0 16px rgba(255,26,26,0.7)',
            letterSpacing: '1px',
          }}
        >
          🔥 ครัวปีศาจ — จอแสดงออเดอร์
        </h1>
        <span style={{ color: '#888', fontSize: '1.1rem' }}>
          {orders.length} ออเดอร์ค้างอยู่
        </span>
      </header>

      {error && (
        <p style={{ color: '#ff6b6b', fontSize: '1.1rem' }}>{error}</p>
      )}

      {loading ? (
        <p style={{ color: '#888', fontSize: '1.2rem', textAlign: 'center' }}>
          กำลังโหลด...
        </p>
      ) : orders.length === 0 ? (
        <p
          style={{
            color: '#555',
            fontSize: '1.6rem',
            textAlign: 'center',
            marginTop: '80px',
          }}
        >
          ยังไม่มีออเดอร์เข้าครัว
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          {orders.map((order) => {
            const style = STATUS_STYLE[order.status] || STATUS_STYLE.received;
            return (
              <div
                key={order.id}
                style={{
                  background: '#151010',
                  border: `3px solid ${style.border}`,
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: `0 0 22px ${style.glow}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      fontSize: '2.4rem',
                      fontWeight: 900,
                      color: '#fff',
                      lineHeight: 1,
                    }}
                  >
                    โต๊ะ {order.table_number}
                  </div>
                  <span
                    style={{
                      background: style.badgeBg,
                      color: style.badgeText,
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {style.label}
                  </span>
                </div>

                <div style={{ color: '#888', fontSize: '1rem' }}>
                  🕐 สั่งเมื่อ {formatTime(order.created_at)}
                </div>

                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {Array.isArray(order.items) &&
                    order.items.map((item, idx) => (
                      <li
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '1.25rem',
                          color: '#eee',
                          borderBottom: '1px dashed #2a1a1a',
                          paddingBottom: '6px',
                        }}
                      >
                        <span>{item.name}</span>
                        <span style={{ fontWeight: 800, color: '#ff8080' }}>
                          x{item.quantity}
                        </span>
                      </li>
                    ))}
                </ul>

                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                  {order.status === 'received' && (
                    <button
                      onClick={() => handleStartCooking(order)}
                      style={startButtonStyle}
                    >
                      🔥 เริ่มทำ
                    </button>
                  )}
                  <button
                    onClick={() => handleServed(order)}
                    style={servedButtonStyle}
                  >
                    🛎️ จัดเสิร์ฟแล้ว
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

const startButtonStyle = {
  flex: 1,
  padding: '16px',
  borderRadius: '10px',
  border: 'none',
  background: '#ff9500',
  color: '#1a0f00',
  fontWeight: 900,
  fontSize: '1.15rem',
  cursor: 'pointer',
};

const servedButtonStyle = {
  flex: 1,
  padding: '16px',
  borderRadius: '10px',
  border: 'none',
  background: '#2e7d32',
  color: '#fff',
  fontWeight: 900,
  fontSize: '1.15rem',
  cursor: 'pointer',
};
