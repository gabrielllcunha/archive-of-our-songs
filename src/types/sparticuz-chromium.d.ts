declare module '@sparticuz/chromium' {
  interface SparticuzChromium {
    setGraphicsMode(value: boolean): void;
    args: string[];
    executablePath(): Promise<string>;
    headless: boolean;
  }
  const chromium: SparticuzChromium;
  export default chromium;
}
