import Link from 'next/link';
import type { LegalDocument } from '@/content/legal/types';
import styles from './styles.module.scss';

interface LegalDocumentViewProps {
  document: LegalDocument;
}

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

function renderParagraphText(text: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  LINK_PATTERN.lastIndex = 0;

  while ((match = LINK_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const [, label, href] = match;
    const isExternal = href.startsWith('http://') || href.startsWith('https://');

    parts.push(
      isExternal ? (
        <a
          key={key}
          href={href}
          className={styles.inlineLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          {label}
        </a>
      ) : (
        <Link key={key} href={href} className={styles.inlineLink}>
          {label}
        </Link>
      )
    );

    key += 1;
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export function LegalDocumentView({ document }: LegalDocumentViewProps) {
  return (
    <article className={styles.document}>
      <header className={styles.documentHeader}>
        <h1 className={styles.documentTitle}>{document.title}</h1>
        <p className={styles.effectiveDate}>Effective {document.effectiveDate}</p>
      </header>

      {document.sections.map((section) => (
        <section key={section.title} className={styles.section}>
          <h2 className={styles.sectionTitle}>{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className={styles.paragraph}>
              {renderParagraphText(paragraph)}
            </p>
          ))}
          {section.list && (
            <ul className={styles.list}>
              {section.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}
