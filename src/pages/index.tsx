import Head from "next/head";
import { HomePage } from "../components/HomePage";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://archive-of-our-songs.vercel.app";
const OG_IMAGE = `${SITE_URL}/images/og-image.png`;
const SITE_TITLE = "Archive of Our Songs";
const SITE_DESCRIPTION = "Showcase your most listened albums, artists, and songs";

export default function Home() {
  return (
    <>
      <Head>
        <title>{SITE_TITLE}</title>
        <meta name="description" content={SITE_DESCRIPTION} />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:title" content={SITE_TITLE} />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={SITE_TITLE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SITE_TITLE} />
        <meta name="twitter:description" content={SITE_DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />
      </Head>
      <HomePage />
    </>
  );
}
