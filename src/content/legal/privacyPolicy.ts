import type { LegalDocument } from './types';
import { GITHUB_REPOSITORY_URL } from './constants';

export const privacyPolicy: LegalDocument = {
  title: 'Privacy Policy',
  effectiveDate: 'August 8, 2026',
  sections: [
    {
      title: 'Introduction',
      paragraphs: [
        'Archive of Our Songs ("we", "us", or "the Service") respects your privacy. This Privacy Policy explains what information we collect, how we use it, who we share it with, and the choices you have regarding your data.',
        'By using the Service, you agree to the collection and use of information as described in this policy.',
      ],
    },
    {
      title: 'Information we collect',
      paragraphs: ['We collect and store the following categories of data when you use the Service:'],
      list: [
        'Your Last.fm username and account connection details used to sign you in.',
        'Your listening archive data (top albums, artists, and tracks by month), including titles, artist names, scrobble counts, and image URLs sourced from Last.fm.',
        'Secret page notes you write in the app. This text is encrypted on your device before it is sent to our servers.',
        'Audio files you choose to upload to secret pages, along with related metadata such as filenames and album cover URLs.',
        'Technical data needed to operate the Service, such as session tokens and optional bot-protection signals when signing in.',
        'A local copy of some data in your browser (IndexedDB and local storage) to improve performance and enable encryption of secret page content.',
      ],
    },
    {
      title: 'How we use your information',
      paragraphs: [
        'We use your information only to provide and maintain the Service, including displaying your music archive, saving your secret pages, and keeping you signed in.',
        'We do not sell your personal data. We do not use your data for advertising.',
      ],
    },
    {
      title: 'Encryption of secret page text',
      paragraphs: [
        'Text you write in secret pages is encrypted on your device using AES-GCM before it reaches our servers. We store ciphertext in the database and do not read your private notes in the admin dashboard.',
        'After you sign in, your browser receives key material derived for your account so the same notes can be decrypted on any of your signed-in devices. If encryption is misconfigured or an older device-only key is required, the app will show an empty note and will not overwrite the cloud copy with blank text.',
        'If you clear all browser data for this site, or if notes were written only with an older device-local key that is no longer available, some historical notes may not be recoverable.',
      ],
    },
    {
      title: 'Third-party services',
      paragraphs: ['We rely on trusted third parties to operate the Service:'],
      list: [
        'Last.fm — to authenticate your account and source your public listening statistics.',
        'Supabase — to host authentication, database storage, and uploaded audio files.',
        'Cloudflare Turnstile — when enabled, to help protect sign-in from automated abuse.',
      ],
    },
    {
      title: 'Data retention',
      paragraphs: [
        'We keep your data for as long as your account is active and you continue to use the Service.',
        'You may permanently delete all data linked to your account at any time from the About dialog in the app. Deletion removes your archive, secret pages, uploaded audio, and account from our servers.',
      ],
    },
    {
      title: 'Your rights and choices',
      paragraphs: ['Depending on where you live, you may have rights to:'],
      list: [
        'Access the personal data we hold about you.',
        'Request correction or deletion of your data.',
        'Withdraw consent by signing out or deleting your account data.',
        'Lodge a complaint with your local data protection authority.',
      ],
    },
    {
      title: 'International transfers',
      paragraphs: [
        'Our service providers may process data in countries other than your own. When data is transferred internationally, we rely on appropriate safeguards provided by those services.',
      ],
    },
    {
      title: 'Changes to this policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time. When we do, we will revise the effective date at the top of this page. Continued use of the Service after changes take effect constitutes acceptance of the updated policy.',
      ],
    },
    {
      title: 'Contact',
      paragraphs: [
        `If you have questions about this Privacy Policy or wish to exercise your data rights, reach out through our public [GitHub repository](${GITHUB_REPOSITORY_URL}).`,
      ],
    },
  ],
};
