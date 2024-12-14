import Head from "next/head";
import { HomePage } from "../components/HomePage";

export default function Home() {
  return (
    <>
      <Head>
        <title>Archive of Our Songs</title>
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <HomePage />
    </>
  );
}
