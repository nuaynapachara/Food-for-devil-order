import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-red-600 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-950 border border-red-900 rounded-2xl p-8 shadow-2xl text-center">
        <h1 className="text-3xl font-bold mb-2">🔥 ร้านอาหารปีศาจ 🔥</h1>
        <p className="text-zinc-400 text-sm mb-8">ระบบสั่งอาหารและจัดการครัว Realtime</p>
        
        <div className="flex flex-col gap-4">
          <Link 
            href="/generate-qr" 
            className="bg-red-700 hover:bg-red-800 text-black font-semibold py-3 px-4 rounded-xl transition duration-200"
          >
            สร้าง QR Code (พนักงาน)
          </Link>
          <Link 
            href="/kitchen" 
            className="bg-zinc-900 hover:bg-zinc-800 text-red-500 border border-red-800 font-semibold py-3 px-4 rounded-xl transition duration-200"
          >
            จอแสดงผลในครัว (Kitchen)
          </Link>
        </div>
      </div>
    </main>
  );
}
