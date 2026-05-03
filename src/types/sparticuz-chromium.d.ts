declare module '@sparticuz/chromium' {
  interface SparticuzChromium {
    setGraphicsMode: boolean;
    args: string[];
    executablePath(): Promise<string>;
    headless: boolean;
  }
  const chromium: SparticuzChromium;
  export default chromium;
}
