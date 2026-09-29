'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function OrderPage({ params }) {
  // สำคัญ: params เป็น Promise ในเวอร์ชัน Next.js นี้ ต้อง unwrap ด้วย use() เสมอ
  const { tableNumber } = use(params);

  // --- session ---
  const [sessionLoading, setSessionLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [sessionError, setSessionError] = useState('');
  const [closed, setClosed] = useState(false);

  // --- menu ---
  const [menuLoading, setMenuLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [quantities, setQuantities] = useState({}); // { [itemId]: number }

  // --- cart ---
  const [cart, setCart] = useState([]); // [{ itemId, name, quantity }]
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  // --- call staff / check bill ---
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffConfirmLoading, setStaffConfirmLoading] = useState(false);
  const [staffError, setStaffError] = useState('');

  // โหลด session ของโต๊ะนี้
  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      setSessionLoading(true);
      const { data, error } = await supabase
        .from('sessions')
        .select('id, table_number, adult_count, child_count, status, created_at')
        .eq('table_number', tableNumber)
        .eq('status', 'open')
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        setSessionError('เกิดข้อผิดพลาด: ' + error.message);
      } else {
        setSession(data || null);
      }
      setSessionLoading(false);
    }

    loadSession();
    return () => {
      isMounted = false;
    };
  }, [tableNumber]);

  // โหลดเมนู (เฉพาะตอนมี session เปิดอยู่)
  useEffect(() => {
    if (!session) return;
    let isMounted = true;

    async function loadMenu() {
      setMenuLoading(true);

      const [{ data: cats, error: catError }, { data: menuItems, error: itemError }] =
        await Promise.all([
          supabase
            .from('menu_categories')
            .select('id, name, sort_order')
            .order('sort_order', { ascending: true }),
          supabase.from('menu_items').select('id, category_id, name'),
        ]);

      if (!isMounted) return;

      if (catError || itemError) {
        setSessionError(
          'โหลดเมนูไม่สำเร็จ: ' + (catError?.message || itemError?.message)
        );
      } else {
        setCategories(cats || []);
        setItems(menuItems || []);
        if (cats && cats.length > 0) {
          setActiveCategoryId(cats[0].id);
        }
      }
      setMenuLoading(false);
    }

    loadMenu();
    return () => {
      isMounted = false;
    };
  }, [session]);

  function getQuantity(itemId) {
    return quantities[itemId] ?? 1;
  }

  function changeQuantity(itemId, delta) {
    setQuantities((prev) => {
      const current = prev[itemId] ?? 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [itemId]: next };
    });
  }

  function addToCart(item) {
    const qty = getQuantity(item.id);
    setCart((prev) => {
      const existing = prev.find((c) => c.itemId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.itemId === item.id ? { ...c, quantity: c.quantity + qty } : c
        );
      }
      return [...prev, { itemId: item.id, name: item.name, quantity: qty }];
    });
    setQuantities((prev) => ({ ...prev, [item.id]: 1 }));
  }

  function changeCartQuantity(itemId, delta) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.itemId === itemId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  function removeFromCart(itemId) {
    setCart((prev) => prev.filter((c) => c.itemId !== itemId));
  }

  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  async function handleSubmitOrder() {
    if (!session || cart.length === 0) return;
    setSubmitting(true);

    const { error } = await supabase.from('orders').insert({
      session_id: session.id,
      table_number: tableNumber,
      items: cart.map((c) => ({ name: c.name, quantity: c.quantity })),
      status: 'received',
    });

    setSubmitting(false);

    if (error) {
      setToast('ส่งออเดอร์ไม่สำเร็จ: ' + error.message);
      return;
    }

    setCart([]);
    setCartOpen(false);
    setToast('ส่งออเดอร์เข้าครัวปีศาจแล้ว');
    setTimeout(() => setToast(''), 3000);
  }

  async function handleConfirmCloseTable() {
    if (!session) return;
    setStaffConfirmLoading(true);
    setStaffError('');

    const { data, error } = await supabase
      .from('sessions')
      .update({ status: 'closed' })
      .eq('id', session.id)
      .eq('status', 'open')
      .select();

    setStaffConfirmLoading(false);

    if (error) {
      setStaffError('ปิดโต๊ะไม่สำเร็จ: ' + error.message);
      return;
    }

    if (!data || data.length === 0) {
      setStaffError('โต๊ะนี้ถูกปิดไปแล้ว');
      return;
    }

    setStaffModalOpen(false);
    setClosed(true);
  }

  const itemsInActiveCategory = items.filter(
    (i) => i.category_id === activeCategoryId
  );

  // ---------- แสดงผล ----------

  if (closed) {
    return (
      <FullScreenMessage
        title="ขอบคุณที่ใช้บริการร้านอาหารปีศาจ"
        subtitle="แล้วพบกันใหม่ 🔥"
      />
    );
  }

  if (sessionLoading) {
    return (
      <FullScreenMessage title="กำลังโหลด..." subtitle={`โต๊ะ ${tableNumber}`} />
    );
  }

  if (!session) {
    return (
      <FullScreenMessage
        title="โต๊ะนี้ยังไม่เปิดใช้งาน"
        subtitle="กรุณาแจ้งพนักงาน"
        danger
      />
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#f5f5f5',
        paddingBottom: cartCount > 0 ? '96px' : '24px',
      }}
    >
      {/* header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'linear-gradient(180deg, #1a0000, #0a0a0a)',
          borderBottom: '1px solid #3a1010',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              color: '#ff3b3b',
              fontWeight: 800,
              fontSize: '1.3rem',
              textShadow: '0 0 10px rgba(255,26,26,0.6)',
            }}
          >
            ร้านอาหารปีศาจ
          </div>
          <div style={{ color: '#999', fontSize: '0.95rem' }}>
            โต๊ะ {tableNumber}
          </div>
        </div>
        <button
          onClick={() => setStaffModalOpen(true)}
          style={outlineButtonStyle}
        >
          เรียกพนักงาน / เช็คบิล
        </button>
      </header>

      {sessionError && (
        <p style={{ color: '#ff6b6b', textAlign: 'center', padding: '0 16px' }}>
          {sessionError}
        </p>
      )}

      {/* category tabs */}
      {!menuLoading && categories.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            padding: '14px 16px',
            position: 'sticky',
            top: '73px',
            zIndex: 9,
            background: '#0a0a0a',
            borderBottom: '1px solid #250808',
          }}
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              style={{
                ...tabButtonStyle,
                background:
                  activeCategoryId === cat.id ? '#c81c1c' : '#171010',
                color: activeCategoryId === cat.id ? '#fff' : '#ccc',
                border:
                  activeCategoryId === cat.id
                    ? '1px solid #ff3b3b'
                    : '1px solid #3a1010',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* menu items */}
      <div style={{ padding: '16px' }}>
        {menuLoading ? (
          <p style={{ color: '#888', textAlign: 'center' }}>กำลังโหลดเมนู...</p>
        ) : itemsInActiveCategory.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center' }}>
            ยังไม่มีเมนูในหมวดนี้
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {itemsInActiveCategory.map((item) => (
              <div
                key={item.id}
                style={{
                  background: '#171010',
                  border: '1px solid #3a1010',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  {item.name}
                </span>

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <button
                    onClick={() => changeQuantity(item.id, -1)}
                    style={stepperButtonStyle}
                  >
                    −
                  </button>
                  <span
                    style={{
                      minWidth: '22px',
                      textAlign: 'center',
                      fontSize: '1.1rem',
                    }}
                  >
                    {getQuantity(item.id)}
                  </span>
                  <button
                    onClick={() => changeQuantity(item.id, 1)}
                    style={stepperButtonStyle}
                  >
                    +
                  </button>
                  <button
                    onClick={() => addToCart(item)}
                    style={addButtonStyle}
                  >
                    เพิ่ม
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* floating cart bar */}
      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          style={{
            position: 'fixed',
            bottom: '16px',
            left: '16px',
            right: '16px',
            background: '#c81c1c',
            color: '#fff',
            border: 'none',
            borderRadius: '14px',
            padding: '18px',
            fontSize: '1.15rem',
            fontWeight: 800,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 0 20px rgba(255,26,26,0.5)',
            zIndex: 20,
          }}
        >
          <span>🛒 ตะกร้า ({cartCount} รายการ)</span>
          <span>ดูตะกร้า</span>
        </button>
      )}

      {/* cart modal */}
      {cartOpen && (
        <ModalOverlay onClose={() => setCartOpen(false)}>
          <h2 style={{ color: '#ff5252', marginTop: 0 }}>ตะกร้าของคุณ</h2>

          {cart.length === 0 ? (
            <p style={{ color: '#888' }}>ตะกร้าว่าง</p>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              {cart.map((c) => (
                <div
                  key={c.itemId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#0f0a0a',
                    borderRadius: '10px',
                    padding: '12px 14px',
                  }}
                >
                  <span style={{ fontSize: '1.05rem' }}>{c.name}</span>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <button
                      onClick={() => changeCartQuantity(c.itemId, -1)}
                      style={stepperButtonStyle}
                    >
                      −
                    </button>
                    <span style={{ minWidth: '20px', textAlign: 'center' }}>
                      {c.quantity}
                    </span>
                    <button
                      onClick={() => changeCartQuantity(c.itemId, 1)}
                      style={stepperButtonStyle}
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(c.itemId)}
                      style={{ ...stepperButtonStyle, color: '#ff6b6b' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSubmitOrder}
            disabled={cart.length === 0 || submitting}
            style={primaryButtonStyle}
          >
            {submitting ? 'กำลังส่ง...' : 'ส่งออเดอร์'}
          </button>
        </ModalOverlay>
      )}

      {/* staff / check bill modal */}
      {staffModalOpen && (
        <ModalOverlay onClose={() => setStaffModalOpen(false)}>
          <h2 style={{ color: '#ff5252', marginTop: 0 }}>
            เรียกพนักงาน / เช็คบิล
          </h2>
          <div style={{ color: '#ddd', fontSize: '1.05rem', lineHeight: 1.8 }}>
            <div>โต๊ะ {session.table_number}</div>
            <div>
              ผู้ใหญ่ {session.adult_count} · เด็ก {session.child_count}
            </div>
            <div>สถานะ: กำลังใช้บริการ</div>
          </div>

          {staffError && (
            <p style={{ color: '#ff6b6b' }}>{staffError}</p>
          )}

          <p style={{ color: '#999', fontSize: '0.95rem' }}>
            กดยืนยันเพื่อแจ้งพนักงานว่าต้องการปิดโต๊ะ / เช็คบิล
          </p>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setStaffModalOpen(false)}
              style={secondaryButtonStyle}
              disabled={staffConfirmLoading}
            >
              ยกเลิก
            </button>
            <button
              onClick={handleConfirmCloseTable}
              style={dangerButtonStyle}
              disabled={staffConfirmLoading}
            >
              {staffConfirmLoading ? 'กำลังปิด...' : 'ยืนยันปิดโต๊ะ'}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: cartCount > 0 ? '90px' : '20px',
            left: '16px',
            right: '16px',
            background: '#1a1a1a',
            border: '1px solid #ff3b3b',
            color: '#fff',
            borderRadius: '10px',
            padding: '14px 18px',
            textAlign: 'center',
            fontWeight: 700,
            zIndex: 30,
          }}
        >
          {toast}
        </div>
      )}
    </main>
  );
}

function FullScreenMessage({ title, subtitle, danger }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: danger
          ? 'radial-gradient(circle at 50% 30%, #3a0000 0%, #0a0a0a 70%)'
          : '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '24px',
      }}
    >
      <h1
        style={{
          color: danger ? '#ff3b3b' : '#ff5252',
          fontSize: '1.8rem',
          textShadow: danger ? '0 0 16px rgba(255,26,26,0.6)' : 'none',
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p style={{ color: '#aaa', fontSize: '1.1rem' }}>{subtitle}</p>
      )}
    </main>
  );
}

function ModalOverlay({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 40,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#171010',
          border: '1px solid #3a1010',
          borderTopLeftRadius: '18px',
          borderTopRightRadius: '18px',
          padding: '22px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}

const outlineButtonStyle = {
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #ff3b3b',
  background: 'transparent',
  color: '#ff8080',
  fontWeight: 700,
  fontSize: '0.9rem',
  cursor: 'pointer',
};

const tabButtonStyle = {
  padding: '10px 18px',
  borderRadius: '999px',
  fontWeight: 700,
  fontSize: '1rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const stepperButtonStyle = {
  width: '34px',
  height: '34px',
  borderRadius: '8px',
  border: '1px solid #4a1a1a',
  background: '#0f0a0a',
  color: '#f5f5f5',
  fontSize: '1.1rem',
  cursor: 'pointer',
};

const addButtonStyle = {
  padding: '10px 16px',
  borderRadius: '8px',
  border: 'none',
  background: '#c81c1c',
  color: '#fff',
  fontWeight: 700,
  fontSize: '0.95rem',
  cursor: 'pointer',
};

const primaryButtonStyle = {
  width: '100%',
  padding: '16px',
  borderRadius: '10px',
  border: 'none',
  background: '#c81c1c',
  color: '#fff',
  fontWeight: 800,
  fontSize: '1.15rem',
  cursor: 'pointer',
};

const secondaryButtonStyle = {
  flex: 1,
  padding: '14px',
  borderRadius: '10px',
  border: '1px solid #666',
  background: 'transparent',
  color: '#eee',
  fontWeight: 700,
  fontSize: '1rem',
  cursor: 'pointer',
};

const dangerButtonStyle = {
  flex: 1,
  padding: '14px',
  borderRadius: '10px',
  border: 'none',
  background: '#ff2d2d',
  color: '#fff',
  fontWeight: 800,
  fontSize: '1rem',
  cursor: 'pointer',
};
