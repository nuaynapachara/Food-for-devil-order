'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function GenerateQrPage() {
  const [tableNumber, setTableNumber] = useState('');
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [existingSession, setExistingSession] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [closingLoading, setClosingLoading] = useState(false);

  const [openedTable, setOpenedTable] = useState(null);
  const [copied, setCopied] = useState(false);

  function resetForm() {
    setTableNumber('');
    setAdultCount(1);
    setChildCount(0);
  }

  async function handleOpenTable(e) {
    e.preventDefault();
    setError('');

    if (!tableNumber) {
      setError('กรุณากรอกเลขโต๊ะ');
      return;
    }

    setLoading(true);

    const { data: existing, error: checkError } = await supabase
      .from('sessions')
      .select('id, table_number, adult_count, child_count, created_at, status')
      .eq('table_number', tableNumber)
      .eq('status', 'open')
      .maybeSingle();

    if (checkError) {
      setLoading(false);
      setError('ตรวจสอบโต๊ะไม่สำเร็จ: ' + checkError.message);
      return;
    }

    if (existing) {
      setLoading(false);
      setExistingSession(existing);
      return;
    }

    const { data: created, error: insertError } = await supabase
      .from('sessions')
      .insert({
        table_number: tableNumber,
        adult_count: Number(adultCount) || 0,
        child_count: Number(childCount) || 0,
        status: 'open',
      })
      .select()
      .single();

    setLoading(false);

    if (insertError) {
      setError('เปิดโต๊ะไม่สำเร็จ: ' + insertError.message);
      return;
    }

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    setOpenedTable({
      tableNumber: created.table_number,
      adultCount: created.adult_count,
      childCount: created.child_count,
      orderUrl: `${baseUrl}/order/${created.table_number}`,
    });
  }

  function handleAskCloseOldSession() {
    setShowConfirm(true);
  }

  function handleCancelConfirm() {
    setShowConfirm(false);
  }

  async function handleConfirmCloseOldSession() {
    if (!existingSession) return;
    setClosingLoading(true);
    setError('');

    const { data: updated, error: updateError } = await supabase
      .from('sessions')
      .update({ status: 'closed' })
      .eq('id', existingSession.id)
      .eq('status', 'open')
      .select();

    setClosingLoading(false);

    if (updateError) {
      setError('ปิดโต๊ะเดิมไม่สำเร็จ: ' + updateError.message);
      return;
    }

    if (!updated || updated.length === 0) {
      setError('โต๊ะนี้ถูกปิดไปแล้วโดยผู้อื่น กรุณากด "เปิดโต๊ะ" อีกครั้ง');
      setShowConfirm(false);
      setExistingSession(null);
      return;
    }

    setShowConfirm(false);
    setExistingSession(null);
  }

  function handleCopyLink() {
    if (!openedTable) return;
    navigator.clipboard.writeText(openedTable.orderUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleOpenNewTable() {
    setOpenedTable(null);
    setCopied(false);
    resetForm();
  }

  function minutesSince(dateString) {
    if (!dateString) return null;
    const diffMs = Date.now() - new Date(dateString).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  }

  const qrImageUrl = openedTable
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        openedTable.orderUrl
      )}`
    : '';

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        padding: '32px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <h1
        style={{
          color: '#ff3b3b',
          fontSize: '2.4rem',
          marginBottom: 4,
          textShadow: '0 0 14px rgba(255,26,26,0.6)',
        }}
      >
        เปิดโต๊ะ
      </h1>
      <p style={{ color: '#999', marginTop: 0, fontSize: '1.1rem' }}>
        ร้านอาหารปีศาจ — สำหรับพนักงานหน้าร้าน
      </p>

      {existingSession && !showConfirm && (
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            marginTop: '24px',
            background: 'linear-gradient(135deg, #4a1010, #7a2a00)',
            border: '2px solid #ff5a1f',
            borderRadius: '14px',
            padding: '22px',
            boxShadow: '0 0 24px rgba(255,90,31,0.35)',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '1.3rem',
              fontWeight: 800,
              color: '#ffcf9e',
            }}
          >
            ⚠️ โต๊ะนี้มีลูกค้าอยู่ระหว่างทานอาหาร
          </p>
          <p style={{ color: '#ffe1c2', fontSize: '1.05rem' }}>
            กรุณาปิดออเดอร์เดิมก่อน
          </p>
          <button onClick={handleAskCloseOldSession} style={dangerButtonStyle}>
            ปิดออเดอร์เดิม
          </button>
        </div>
      )}

      {existingSession && showConfirm && (
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            marginTop: '24px',
            background: '#2a0a0a',
            border: '2px solid #ff2d2d',
            borderRadius: '14px',
            padding: '22px',
            boxShadow: '0 0 30px rgba(255,45,45,0.4)',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#ff8080',
            }}
          >
            ยืนยันปิดโต๊ะเดิม?
          </p>
          <div
            style={{
              marginTop: '12px',
              fontSize: '1.1rem',
              color: '#f5d5d5',
              lineHeight: 1.7,
            }}
          >
            <div>โต๊ะ {existingSession.table_number}</div>
            <div>
              ผู้ใหญ่ {existingSession.adult_count} · เด็ก{' '}
              {existingSession.child_count}
            </div>
            <div>เปิดมาแล้ว {minutesSince(existingSession.created_at)} นาที</div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '18px' }}>
            <button
              onClick={handleCancelConfirm}
              style={secondaryButtonStyle}
              disabled={closingLoading}
            >
              ยกเลิก
            </button>
            <button
              onClick={handleConfirmCloseOldSession}
              style={dangerButtonStyle}
              disabled={closingLoading}
            >
              {closingLoading ? 'กำลังปิด...' : 'ยืนยันปิดโต๊ะเดิม'}
            </button>
          </div>
        </div>
      )}

      {!openedTable && (
        <form
          onSubmit={handleOpenTable}
          style={{
            background: '#171010',
            border: '1px solid #3a1010',
            borderRadius: '14px',
            padding: '28px',
            width: '100%',
            maxWidth: '420px',
            marginTop: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <label style={labelStyle}>
            เลขโต๊ะ
            <input
              type="number"
              inputMode="numeric"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="เช่น 7"
              style={inputStyle}
              autoFocus
            />
          </label>

          <label style={labelStyle}>
            จำนวนผู้ใหญ่
            <input
              type="number"
              min="0"
              value={adultCount}
              onChange={(e) => setAdultCount(e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            จำนวนเด็ก
            <input
              type="number"
              min="0"
              value={childCount}
              onChange={(e) => setChildCount(e.target.value)}
              style={inputStyle}
            />
          </label>

          {error && (
            <p style={{ color: '#ff6b6b', margin: 0, fontSize: '1.05rem' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} style={primaryButtonStyle}>
            {loading ? 'กำลังตรวจสอบ...' : 'เปิดโต๊ะ'}
          </button>
        </form>
      )}

      {openedTable && (
        <div
          style={{
            marginTop: '24px',
            background: '#171010',
            border: '1px solid #3a1010',
            borderRadius: '14px',
            padding: '28px',
            textAlign: 'center',
            width: '100%',
            maxWidth: '420px',
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '16px',
              borderRadius: '10px',
              display: 'inline-block',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrImageUrl} alt="QR โต๊ะ" width={300} height={300} />
          </div>

          <p
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#ff8080',
              marginTop: '18px',
              marginBottom: '6px',
            }}
          >
            โต๊ะ {openedTable.tableNumber} · ผู้ใหญ่ {openedTable.adultCount} ·
            เด็ก {openedTable.childCount}
          </p>

          <p
            style={{
              color: '#ccc',
              wordBreak: 'break-all',
              fontSize: '1rem',
              margin: '10px 0',
            }}
          >
            {openedTable.orderUrl}
          </p>

          <button onClick={handleCopyLink} style={secondaryButtonStyle}>
            {copied ? 'คัดลอกแล้ว ✓' : 'คัดลอกลิงก์'}
          </button>

          <div style={{ marginTop: '20px' }}>
            <button onClick={handleOpenNewTable} style={primaryButtonStyle}>
              เปิดโต๊ะใหม่
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  fontSize: '1.15rem',
  color: '#ddd',
  fontWeight: 600,
};

const inputStyle = {
  background: '#0f0a0a',
  border: '1px solid #4a1a1a',
  borderRadius: '8px',
  padding: '14px 16px',
  color: '#f5f5f5',
  fontSize: '1.4rem',
};

const primaryButtonStyle = {
  padding: '16px 20px',
  borderRadius: '10px',
  border: 'none',
  background: '#c81c1c',
  color: '#fff',
  fontWeight: 800,
  fontSize: '1.2rem',
  cursor: 'pointer',
  width: '100%',
};

const secondaryButtonStyle = {
  padding: '14px 18px',
  borderRadius: '10px',
  border: '1px solid #666',
  background: 'transparent',
  color: '#eee',
  fontWeight: 700,
  fontSize: '1.05rem',
  cursor: 'pointer',
  flex: 1,
};

const dangerButtonStyle = {
  marginTop: '14px',
  padding: '14px 18px',
  borderRadius: '10px',
  border: 'none',
  background: '#ff2d2d',
  color: '#fff',
  fontWeight: 800,
  fontSize: '1.1rem',
  cursor: 'pointer',
  flex: 1,
  width: '100%',
};
