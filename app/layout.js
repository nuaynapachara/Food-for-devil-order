export const metadata = {
  title: 'ร้านอาหารปีศาจ',
  description: 'ระบบสั่งอาหารร้านอาหารปีศาจ',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          backgroundColor: '#0a0a0a',
          color: '#f5f5f5',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
