import Head from 'next/head';
import { LegalPage } from '@/components/LegalPage';
import { SITE_DESCRIPTION, SITE_TITLE } from '@/constants/site';

export default function Legal() {
  return (
    <>
      <Head>
        <title>{SITE_TITLE}</title>
        <meta name="description" content={SITE_DESCRIPTION} />
        <meta name="robots" content="index, follow" />
      </Head>
      <LegalPage />
    </>
  );
}
