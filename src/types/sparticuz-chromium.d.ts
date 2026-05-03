declare module '@sparticuz/chromium' {
  interface SparticuzChromium {
    setGraphicsMode: boolean;
    args: string[];
    executablePath(input?: string | URL): Promise<string>;
    headless: boolean;
  }
  const chromium: SparticuzChromium;
  export default chromium;
}
