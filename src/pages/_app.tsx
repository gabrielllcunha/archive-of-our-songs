import type { AppProps } from 'next/app';
import type { NextPage } from 'next';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { ToastProvider } from '@/components/Toast';
import '../styles/global.scss';

type MyAppProps = AppProps & {
  Component: NextPage;
};

function MyApp({ Component, pageProps }: MyAppProps) {
  return (
    <Theme appearance="dark" hasBackground={false}>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </Theme>
  );
}

export default MyApp;
