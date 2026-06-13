import { useState } from "react";
import { DotsVerticalIcon } from "@radix-ui/react-icons";
import { Popover } from "../Popover";
import { ModalUserAbout } from "../ModalUserAbout";
import styles from "./styles.module.scss";

interface AppFooterProps {
  username?: string | null;
  onLogout?: () => void;
}

function getVersionLabel() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.1";
  return /^v?\d+\.\d+/.test(version) && !version.startsWith("v") ? `v${version}` : version;
}

export function AppFooter({ username, onLogout }: AppFooterProps) {
  const year = new Date().getFullYear();
  const versionLabel = getVersionLabel();
  const showUser = Boolean(username);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const handleAboutClick = () => {
    setUserMenuOpen(false);
    setAboutOpen(true);
  };

  const handleLogoutClick = () => {
    setUserMenuOpen(false);
    onLogout?.();
  };

  return (
    <footer className={styles.footer}>
      {showUser && (
        <div className={styles.footerUser}>
          <span className={styles.footerUsername}>logged as {username}</span>
          <Popover
            side="top"
            align="start"
            open={userMenuOpen}
            onOpenChange={setUserMenuOpen}
            trigger={
              <button type="button" className={styles.dotsButton} aria-label="User options">
                <DotsVerticalIcon />
              </button>
            }
          >
            <button type="button" className={styles.popoverItem} onClick={handleAboutClick}>
              About
            </button>
            <button type="button" className={styles.popoverItem} onClick={handleLogoutClick}>
              Logout
            </button>
          </Popover>
          <ModalUserAbout
            username={username!}
            open={aboutOpen}
            onOpenChange={setAboutOpen}
          />
        </div>
      )}
      <div className={styles.footerMeta}>
        <span>© All rights reserved {year}</span>
        <span className={styles.footerSep} aria-hidden>
          ·
        </span>
        <span className={styles.footerVersion} title={`Version ${versionLabel}`}>
          {versionLabel}
        </span>
      </div>
    </footer>
  );
}
