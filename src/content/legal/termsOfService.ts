import type { LegalDocument } from './types';
import { GITHUB_REPOSITORY_URL } from './constants';

export const termsOfService: LegalDocument = {
  title: 'Terms of Service',
  effectiveDate: 'June 13, 2026',
  sections: [
    {
      title: 'Agreement',
      paragraphs: [
        'These Terms of Service ("Terms") govern your use of Archive of Our Songs ("the Service"). By accessing or using the Service, you agree to these Terms and to our Privacy Policy.',
        'If you do not agree, do not use the Service.',
      ],
    },
    {
      title: 'The Service',
      paragraphs: [
        'Archive of Our Songs lets you explore and save a personal archive of your most listened albums, artists, and songs from Last.fm, including optional secret pages where you can add private notes and audio.',
      ],
    },
    {
      title: 'Eligibility',
      paragraphs: [
        'You must have a valid Last.fm account and be authorized to use the Service. You are responsible for ensuring your use of Last.fm and this Service complies with Last.fm\'s own terms and policies.',
      ],
    },
    {
      title: 'Your account and content',
      paragraphs: [
        'You are responsible for activity under your account and for the content you add to the Service, including secret page notes and uploaded audio.',
        'You must have the rights to any audio or other material you upload. Do not upload content that infringes copyright or violates applicable law.',
        'Text you add to secret pages is encrypted on your device before storage. Other data, such as your listening archive and uploaded audio, is stored so the Service can display and play it back for you.',
      ],
    },
    {
      title: 'Acceptable use',
      paragraphs: ['You agree not to:'],
      list: [
        'Use the Service for unlawful, harmful, or abusive purposes.',
        'Attempt to access data belonging to other users.',
        'Interfere with or disrupt the Service, its servers, or connected systems.',
        'Circumvent access controls, including whitelist or authentication requirements.',
      ],
    },
    {
      title: 'Third-party services',
      paragraphs: [
        'The Service integrates with Last.fm and other third-party providers. Your use of those services is subject to their respective terms. We are not responsible for third-party services or changes they make.',
      ],
    },
    {
      title: 'Availability and changes',
      paragraphs: [
        'We may modify, suspend, or discontinue any part of the Service at any time, with or without notice.',
        'We may update these Terms from time to time. The effective date at the top of this page will reflect the latest version. Continued use after changes take effect means you accept the updated Terms.',
      ],
    },
    {
      title: 'Termination and data deletion',
      paragraphs: [
        'You may stop using the Service at any time by signing out. You may permanently delete all data linked to your account from the About dialog in the app.',
        'We may suspend or terminate access if you violate these Terms or if continued operation is no longer feasible.',
      ],
    },
    {
      title: 'Disclaimer',
      paragraphs: [
        'The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied, including fitness for a particular purpose, accuracy, or uninterrupted availability.',
        'Listening statistics and other data sourced from Last.fm depend on third-party availability and may be incomplete or delayed.',
      ],
    },
    {
      title: 'Limitation of liability',
      paragraphs: [
        'To the fullest extent permitted by law, the operator of Archive of Our Songs will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of data, profits, or goodwill arising from your use of the Service.',
      ],
    },
    {
      title: 'Contact',
      paragraphs: [
        `Questions about these Terms may be directed through our public [GitHub repository](${GITHUB_REPOSITORY_URL}).`,
      ],
    },
  ],
};
