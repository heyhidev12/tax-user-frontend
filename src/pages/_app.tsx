import '@/styles/global.scss';
import Script from "next/script";

// Component styles (Next.js requires global CSS imports in _app)
import '@/components/Menu/styles.scss';
import '@/components/Login/styles.scss';
import '@/components/Signup/styles.scss';
import '@/components/FindUsername/styles.scss';
import '@/components/FindPassword/styles.scss';
import '@/components/ResetPassword/styles.scss';
// Design System Component styles
import '@/components/common/Button/styles.scss';
import '@/components/common/TextField/styles.scss';
import '@/components/common/Checkbox/styles.scss';
import '@/components/common/Select/styles.scss';
import '@/components/common/StepIndicator/styles.scss';
import '@/components/common/Tab/styles.scss';
import '@/components/common/PageHeader/styles.scss';
import '@/components/common/Card/styles.scss';
import type { AppProps } from 'next/app';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head><Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
      />

      <Script id="ga-init" strategy="afterInteractive">
        {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
      page_path: window.location.pathname,
      debug_mode: true,
    });
  `}
      </Script>

      <Component {...pageProps} />
    </>
  );
}
