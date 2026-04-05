import type { AppProps } from 'next/app';
import type { NextPage } from 'next';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import '../styles/global.scss';

type MyAppProps = AppProps & {
  Component: NextPage;
};

function MyApp({ Component, pageProps }: MyAppProps) {
  const year = new Date().getFullYear();
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.1';
  const versionLabel = /^v?\d+\.\d+/.test(version) && !version.startsWith('v') ? `v${version}` : version;

  return (
    <Theme appearance="dark" hasBackground={false}>
      <Component {...pageProps} />
      <footer className="appCopyright">
        <span>© All rights reserved {year}</span>
        <span className="appCopyrightSep" aria-hidden>
          ·
        </span>
        <span className="appCopyrightVersion" title={`Version ${versionLabel}`}>
          {versionLabel}
        </span>
      </footer>
    </Theme>
  );
}

export default MyApp;
