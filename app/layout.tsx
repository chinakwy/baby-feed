import type { Metadata, Viewport } from "next";
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import Image from 'next/image'
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { auth } from '@/lib/auth'
import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { getTheme, themeStyle } from '@/lib/themes'

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const baseViewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "西米露成长记 - 婴儿科学喂养与成长记录",
  description: "记录婴儿喂养、睡眠与成长数据，帮助家庭更科学地了解宝宝的日常状态",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/ximilu-pearl-v1-64.png", type: "image/png" },
    ],
    apple: "/icons/ximilu-pearl-v1-180.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "西米露成长记",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

async function getServerSession() {
  const headerStore = await headers()
  const protocol = headerStore.get('x-forwarded-proto') ?? 'http'
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host') ?? 'localhost:3000'

  return auth(new NextRequest(`${protocol}://${host}`, { headers: headerStore }))
}

const getLayoutData = cache(async () => {
  const session = await getServerSession()
  const user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { themeColor: true } }) : null
  return { session, theme: getTheme(user?.themeColor) }
})

export async function generateViewport(): Promise<Viewport> {
  const { theme } = await getLayoutData()
  return { ...baseViewport, themeColor: theme.color }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { session, theme } = await getLayoutData()

  return (
    <html lang="zh-CN" data-theme={theme.id} data-scroll-behavior="smooth" style={{ ...themeStyle(theme.id), colorScheme: 'light' }}>
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Browser splash; installed PWAs use the platform launch screen only. */}
        <div id="splash" className="splash-screen" suppressHydrationWarning>
          <div className="splash-brand">
            <Image className="splash-mark" src="/icons/ximilu-pearl-v1-192.png" alt="" width={76} height={76} priority />
            <p className="splash-name">西米露成长记</p>
          </div>
          <span className="splash-progress" aria-hidden="true" />
        </div>
        <Providers session={session} initialTheme={theme.id}>
          {children}
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  registrations.forEach(function(registration) { registration.unregister(); });
                });
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    names.forEach(function(name) { caches.delete(name); });
                  });
                }
              } else if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('SW registered: ', registration.scope);
                    },
                    function(err) {
                      console.log('SW registration failed: ', err);
                    }
                  );
                });
              }
              // Dismiss splash screen after hydration
              requestAnimationFrame(function() {
                setTimeout(function() {
                  var splash = document.getElementById('splash');
                  if (splash) splash.classList.add('hidden');
                }, 300);
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
