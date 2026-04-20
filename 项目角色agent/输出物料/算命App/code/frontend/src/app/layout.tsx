import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '天机 AI 算命',
  description: '输入生辰八字，聆听天机启示。AI驱动的对话式算命体验，仅供娱乐参考。',
  keywords: '算命, 八字, AI, 运势, 天机',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#1C1917',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=LXGW+WenKai:wght@300;400;700&family=Noto+Serif+SC:wght@300;400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,700;1,9..144,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body">
        <div className="mx-auto w-full max-w-[480px] min-h-dvh relative">
          {children}
        </div>
      </body>
    </html>
  );
}
