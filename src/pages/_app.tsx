import type { AppProps } from 'next/app';
import type { NextPage } from 'next';
import '../styles/global.scss';

type MyAppProps = AppProps & {
  Component: NextPage;
};

function MyApp({ Component, pageProps }: MyAppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
