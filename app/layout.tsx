import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Quản Lý TikTok Shop - Phân tích & Theo dõi tăng trưởng',
  description: 'Ứng dụng web chuyên nghiệp để thu thập và phân tích dữ liệu TikTok Shop với tính năng crawl tự động và theo dõi tăng trưởng.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}