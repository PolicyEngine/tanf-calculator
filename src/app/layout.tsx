import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import PolicyEngineHeader from '@/components/PolicyEngineHeader';
import './globals.css';

const SITE_URL = 'https://tanf-calculator.vercel.app';
const TITLE =
  'TANF Calculator | Estimate Your TANF Benefits by State - PolicyEngine';
const DESCRIPTION =
  'Free TANF benefit calculator. Estimate your Temporary Assistance for Needy Families (TANF) cash benefits by state, household size, and income. Compare benefits across all 50 states.';
const OG_IMAGE = `${SITE_URL}/policyengine-logo.png`;
const GA_MEASUREMENT_ID = 'G-2YHG89FY0N';
const TOOL_NAME = 'tanf-calculator';
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const LOGO_PATH = `${BASE_PATH}/policyengine-logo.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'TANF calculator',
    'TANF benefits',
    'Temporary Assistance for Needy Families',
    'welfare calculator',
    'cash assistance',
    'state benefits',
    'poverty assistance',
    'PolicyEngine',
  ],
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true },
  icons: {
    icon: LOGO_PATH,
    apple: LOGO_PATH,
  },
  openGraph: {
    type: 'website',
    title: 'TANF Calculator | Estimate Your TANF Benefits by State',
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'PolicyEngine',
    images: [
      {
        url: OG_IMAGE,
        alt: 'PolicyEngine TANF Calculator',
      },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    title: 'TANF Calculator | Estimate Your TANF Benefits by State',
    description:
      'Free TANF benefit calculator. Estimate your TANF cash benefits by state, household size, and income. Compare benefits across all 50 states.',
    images: [
      {
        url: OG_IMAGE,
        alt: 'PolicyEngine TANF Calculator',
      },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  themeColor: '#319795',
};

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'TANF Calculator',
  description:
    'Estimate your Temporary Assistance for Needy Families (TANF) cash benefits by state, household size, and income.',
  url: SITE_URL,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'All',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: {
    '@type': 'Organization',
    name: 'PolicyEngine',
    url: 'https://policyengine.org',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
      </head>
      <body>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', { tool_name: '${TOOL_NAME}' });
          `}
        </Script>
        <Script id="ga-engagement" strategy="afterInteractive">
          {`
            (function() {
              var TOOL_NAME = '${TOOL_NAME}';
              if (typeof window === 'undefined' || !window.gtag) return;
              var scrollFired = {};
              window.addEventListener('scroll', function() {
                var docHeight = document.documentElement.scrollHeight - window.innerHeight;
                if (docHeight <= 0) return;
                var pct = Math.floor((window.scrollY / docHeight) * 100);
                [25, 50, 75, 100].forEach(function(m) {
                  if (pct >= m && !scrollFired[m]) {
                    scrollFired[m] = true;
                    window.gtag('event', 'scroll_depth', { percent: m, tool_name: TOOL_NAME });
                  }
                });
              }, { passive: true });
              [30, 60, 120, 300].forEach(function(sec) {
                setTimeout(function() {
                  if (document.visibilityState !== 'hidden') {
                    window.gtag('event', 'time_on_tool', { seconds: sec, tool_name: TOOL_NAME });
                  }
                }, sec * 1000);
              });
              document.addEventListener('click', function(e) {
                var link = e.target && e.target.closest ? e.target.closest('a') : null;
                if (!link || !link.href) return;
                try {
                  var url = new URL(link.href, window.location.origin);
                  if (url.hostname && url.hostname !== window.location.hostname) {
                    window.gtag('event', 'outbound_click', { url: link.href, target_hostname: url.hostname, tool_name: TOOL_NAME });
                  }
                } catch (err) {}
              });
            })();
          `}
        </Script>
        <PolicyEngineHeader />
        {children}
        <noscript>
          <h1>TANF Calculator</h1>
          <p>
            This TANF (Temporary Assistance for Needy Families) calculator
            helps you estimate your cash assistance benefits by state, household
            size, and income. Please enable JavaScript to use the interactive
            calculator.
          </p>
          <p>
            Visit <a href="https://policyengine.org">PolicyEngine.org</a> for
            more policy analysis tools.
          </p>
        </noscript>
      </body>
    </html>
  );
}
