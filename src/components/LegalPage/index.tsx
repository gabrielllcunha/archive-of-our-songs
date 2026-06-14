import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components';
import { privacyPolicy } from '@/content/legal/privacyPolicy';
import { termsOfService } from '@/content/legal/termsOfService';
import { LegalDocumentView } from './LegalDocumentView';
import styles from './styles.module.scss';

type LegalTab = 'privacy' | 'terms';

function isLegalTab(value: unknown): value is LegalTab {
  return value === 'privacy' || value === 'terms';
}

export function LegalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LegalTab>('privacy');

  useEffect(() => {
    if (!router.isReady) return;
    const tab = router.query.tab;
    if (isLegalTab(tab)) {
      setActiveTab(tab);
    }
  }, [router.isReady, router.query.tab]);

  const handleTabChange = (value: string) => {
    if (!isLegalTab(value)) return;
    setActiveTab(value);
    void router.replace({ pathname: '/legal', query: { tab: value } }, undefined, {
      shallow: true,
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.noiseOverlay} aria-hidden />
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeftIcon aria-hidden />
          Back to Archive
        </Link>

        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Legal</h1>
          <p className={styles.pageSubtitle}>
            Privacy Policy and Terms of Service for Archive of Our Songs.
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="privacy" ariaLabel="Privacy Policy">
              Privacy Policy
            </TabsTrigger>
            <TabsTrigger value="terms" ariaLabel="Terms of Service">
              Terms of Service
            </TabsTrigger>
          </TabsList>

          <div className={styles.tabPanel}>
            <TabsContent value="privacy">
              <LegalDocumentView document={privacyPolicy} />
            </TabsContent>
            <TabsContent value="terms">
              <LegalDocumentView document={termsOfService} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
