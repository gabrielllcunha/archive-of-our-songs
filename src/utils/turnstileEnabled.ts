export function isTurnstileRequired(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isTurnstileConfiguredOnClient(): boolean {
  return (
    isTurnstileRequired() &&
    Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim())
  );
}
