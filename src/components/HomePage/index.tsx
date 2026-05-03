import styles from "./styles.module.scss";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarIcon, DotsVerticalIcon, ListBulletIcon, UpdateIcon } from "@radix-ui/react-icons";
import { Album, Singer, Song } from "@/models";
import { Button, MonthItem, Popover, Progress, SegmentedControl, Select, Spinner, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components';
import { fetchDataFromEndpoint } from "@/utils/fetchDataFromEndpoint";
import { yearlyDataStorage, type MonthlyEntry } from '@/services/yearlyDataStorage';
import { supabase } from "@/utils/supabase";
import { ModalExtraContent } from "../ModalExtraContent";
import { ModalInitialConfig } from "../ModalInitialConfig";

type DataLoadState = 'idle' | 'checking' | 'downloading';

export function HomePage() {
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<string>("albums");
  const [viewType, setViewType] = useState<string>("month");
  const [year, setYear] = useState<number>(currentYear - 1);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Singer[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [dataLoadState, setDataLoadState] = useState<DataLoadState>('idle');
  const [fetchProgressPercent, setFetchProgressPercent] = useState(0);
  const [authenticatedWithLastfm, setAuthenticatedWithLastfm] = useState<boolean>(false);
  const [lastfmUsername, setLastfmUsername] = useState<string | null>(null);
  const months = useMemo(() => [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ], []);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isRefreshingRef = useRef(false);
  const earliestSelectableYear = 2021;
  const latestSelectableYear = currentYear - 1;

  const [sessionStarted, setSessionStarted] = useState(false);
  const [extraModalOpen, setExtraModalOpen] = useState(false);
  const [extraModalPendingMonth, setExtraModalPendingMonth] = useState<number | null>(null);
  const [yearSelectRevision, setYearSelectRevision] = useState(0);

  const handleTabChange = (value: string) => {
    setDataLoadState('checking');
    setActiveTab(value);
  };

  const handleYearChange = (value: string) => {
    setDataLoadState('checking');
    setYear(Number(value));
    setYearSelectRevision((r) => r + 1);
  };

  const handleSessionStarted = useCallback(() => {
    setSessionStarted(true);
  }, []);

  const handleExtraModalOpenChange = useCallback((nextOpen: boolean) => {
    setExtraModalOpen(nextOpen);
    if (!nextOpen) {
      setExtraModalPendingMonth(null);
    }
  }, []);

  const handlePendingMonthConsumed = useCallback(() => {
    setExtraModalPendingMonth(null);
  }, []);

  const handleModalYearChange = useCallback((nextYear: number) => {
    setDataLoadState('checking');
    setYear(nextYear);
  }, []);

  const openExtraModalForAlbumMonth = useCallback((monthIndex: number) => {
    setExtraModalPendingMonth(monthIndex);
    setExtraModalOpen(true);
  }, []);

  const handleViewTypeChange = (value: string) => {
    setViewType(value);
  };

  const handleRefreshData = () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    const onFinally = () => { isRefreshingRef.current = false; };
    let fetchPromise;
    switch (activeTab) {
      case "albums":
        fetchPromise = fetchData("fetch-albums-by-month", setAlbums, signal, true);
        break;
      case "artists":
        fetchPromise = fetchData("fetch-artists-by-month", setArtists, signal, true);
        break;
      case "songs":
        fetchPromise = fetchData("fetch-songs-by-month", setSongs, signal, true);
        break;
      default:
        fetchPromise = Promise.resolve();
        break;
    }
    if (fetchPromise && typeof fetchPromise.finally === 'function') {
      fetchPromise.finally(onFinally);
    } else {
      onFinally();
    }
  };

  const generateYearOptions = () => {
    const startYear = 2021;
    const years = [];
    const latestSelectableYear = currentYear - 1;
    for (let i = startYear; i <= latestSelectableYear; i++) {
      years.push({ value: String(i), label: String(i) });
    }
    return years;
  };

  const fetchData = useCallback(async (endpoint: string, setter: React.Dispatch<React.SetStateAction<any[]>>, signal: AbortSignal, forceRefresh = false) => {
    try {
      const username = localStorage.getItem('lastfm_username');
      if (!username) {
        return;
      }
      if (!forceRefresh) {
        const storedData = await yearlyDataStorage.getYearlyData(
          username,
          year,
          endpoint === "fetch-albums-by-month" ? "albums" :
            endpoint === "fetch-artists-by-month" ? "artists" : "songs"
        );

        if (storedData && storedData.length > 0) {
          setter(storedData);
          return;
        }
      }

      setDataLoadState('checking');
      const storedData = await yearlyDataStorage.getYearlyData(
        username,
        year,
        endpoint === "fetch-albums-by-month" ? "albums" :
          endpoint === "fetch-artists-by-month" ? "artists" : "songs"
      );
      const incorrectCacheData = storedData?.filter(entry =>
        !entry.name ||
        (endpoint !== "fetch-artists-by-month" && !entry.artist) ||
        entry.scrobbles === 0 ||
        !entry.imageUrl
      ).map(entry => entry.month) || [];
      let monthsPayload = undefined;
      if (forceRefresh) {
        monthsPayload = months;
      } else if (year === currentYear) {
        const currentMonthNameIndex = new Date().getMonth();
        monthsPayload = months.slice(0, currentMonthNameIndex + 1);
      } else if (storedData) {
        monthsPayload = incorrectCacheData;
        if (storedData) {
          const allMonths = months;
          const missingMonths = allMonths.filter(month => !storedData.some(data => data.month === month));
          monthsPayload = Array.from(new Set([...(monthsPayload || []), ...missingMonths]));
        }
      }
      if (storedData && (!monthsPayload || monthsPayload.length === 0)) {
        setter(storedData);
        return;
      }

      const effectiveMonths =
        monthsPayload && monthsPayload.length > 0 ? monthsPayload : months;
      const monthOrder = new Map(months.map((m, i) => [m, i]));
      const orderedPayload = [...effectiveMonths].sort(
        (a, b) => (monthOrder.get(a) ?? 0) - (monthOrder.get(b) ?? 0)
      );

      let monthsToDisplay = months;
      if (year === currentYear) {
        const currentMonthNameIndex = new Date().getMonth();
        monthsToDisplay = months.slice(0, currentMonthNameIndex + 1);
      }

      const mapServerYearToDisplay = (yearRows: Album[] | Singer[] | Song[]) =>
        monthsToDisplay.map((monthName) => {
          return (
            yearRows.find((item: Album | Singer | Song) => item.month === monthName) ||
            { month: monthName, name: '', artist: '', imageUrl: '', scrobbles: 0 }
          );
        });

      const totalFetches = orderedPayload.length;
      if (totalFetches === 0) {
        return;
      }

      setDataLoadState('downloading');
      setFetchProgressPercent(0);

      for (let i = 0; i < orderedPayload.length; i++) {
        if (signal.aborted) break;
        const monthName = orderedPayload[i];
        const payload: Record<string, unknown> = {
          target_account: username,
          year,
          months: [monthName],
          ...(forceRefresh && { forceRefresh: true }),
        };
        const yearRows = (await fetchDataFromEndpoint(
          endpoint,
          payload,
          signal
        )) as Album[] | Singer[] | Song[];
        const displayData = mapServerYearToDisplay(yearRows);
        setter(displayData);
        const forStorage: MonthlyEntry[] = displayData.map((item) => ({
          month: item.month,
          name: item.name,
          artist: 'artist' in item && typeof item.artist === 'string' ? item.artist : '',
          imageUrl: item.imageUrl,
          scrobbles: item.scrobbles,
        }));
        await yearlyDataStorage.storeYearlyData(
          username,
          year,
          endpoint === "fetch-albums-by-month" ? "albums" :
            endpoint === "fetch-artists-by-month" ? "artists" : "songs",
          forStorage
        );
        const done = i + 1;
        const pct =
          totalFetches === 0 ? 100 : Math.min(100, (done / totalFetches) * 100);
        setFetchProgressPercent(pct);
      }
    } catch (error) {
      console.error(`Error fetching from ${endpoint}:`, error);
      switch (endpoint) {
        case "fetch-albums-by-month":
          setAlbums([]);
          break;
        case "fetch-artists-by-month":
          setArtists([]);
          break;
        case "fetch-songs-by-month":
          setSongs([]);
          break;
        default:
          break;
      }
    } finally {
      setFetchProgressPercent(0);
      setDataLoadState('idle');
    }
  }, [year, months, currentYear]);

  useEffect(() => {
    if (!authenticatedWithLastfm) return;
    setDataLoadState('checking');
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    void (async () => {
      switch (activeTab) {
        case "albums":
          await fetchData("fetch-albums-by-month", setAlbums, signal);
          break;
        case "artists":
          await fetchData("fetch-artists-by-month", setArtists, signal);
          break;
        case "songs":
          await fetchData("fetch-songs-by-month", setSongs, signal);
          break;
        default:
          break;
      }
    })();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [activeTab, year, fetchData, authenticatedWithLastfm]);

  useEffect(() => {
    if (!authenticatedWithLastfm) {
      setLastfmUsername(null);
      return;
    }
    setLastfmUsername(localStorage.getItem("lastfm_username"));
  }, [authenticatedWithLastfm]);

  const handleLogout = async () => {
    setSessionStarted(false);
    await supabase?.auth.signOut();
    localStorage.removeItem("lastfm_username");
    localStorage.removeItem("lastfm_token");
    localStorage.removeItem("lastfm_auth_started");
    setAuthenticatedWithLastfm(false);
    setAlbums([]);
    setArtists([]);
    setSongs([]);
  };

  const renderProgressBar = (name: string) => {
    return (
      <div className={styles.loadingWrapper}>
        <div className={styles.loading}>
          <Progress value={fetchProgressPercent} />
        </div>
        <div className={styles.loadingText}>
          <span>Loading {name}...</span>
          <span className={styles.loadingSubtitle}>
            {Math.round(fetchProgressPercent)}%
          </span>
        </div>
      </div>
    );
  };

  const renderSpinnerLoading = () => {
    return (
      <div className={styles.loadingWrapper}>
        <Spinner size="large" />
      </div>
    );
  };

  const renderTabsContent = (name: string, items: any[]) => {
    const showLoading = activeTab === name && dataLoadState !== 'idle';
    return (
      <TabsContent value={name}>
        {showLoading && dataLoadState === 'downloading' ? (
          renderProgressBar(name)
        ) : showLoading && dataLoadState === 'checking' ? (
          renderSpinnerLoading()
        ) : (
          <div className={styles.monthsGrid}>
            {months.map((month, monthIndex) => {
              const item = items?.find(item => item.month === month) || null;
              return (
                <MonthItem
                  key={month}
                  month={month}
                  imageUrl={item?.imageUrl || undefined}
                  name={item?.name || ""}
                  artist={item?.artist || ""}
                  scrobbles={item?.scrobbles || null}
                  rounded={name === "artists"}
                  onClick={
                    name === "albums" && activeTab === "albums"
                      ? () => openExtraModalForAlbumMonth(monthIndex)
                      : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </TabsContent>
    );
  };

  return (
    <>
      <div className={styles.background}>
        <div
          className={`${styles.gradientWrapper} ${activeTab === "albums"
            ? styles.albumsColors
            : activeTab === "artists"
              ? styles.artistsColors
              : styles.songsColors
            }`}
        >
          <div className={styles.gradient1}></div>
          <div className={styles.gradient2}></div>
        </div>
        {authenticatedWithLastfm && (
          <div className={styles.mainWrapper}>
            <div className={styles.headerWrapper}>
              <h1>Archive of Our Songs</h1>
              <Select
                value={String(year)}
                onChange={handleYearChange}
                items={generateYearOptions()}
              />
            </div>
            <div className={styles.contentWrapper}>
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList sideIcons>
                  <TabsTrigger value="albums">Albums</TabsTrigger>
                  <TabsTrigger value="artists">Artists</TabsTrigger>
                  <TabsTrigger value="songs">Songs</TabsTrigger>
                  <Button variant="secondary" size="small" className={styles.refreshButton} onClick={handleRefreshData} disabled={dataLoadState !== 'idle'}>
                    <UpdateIcon style={{ marginRight: '8px', width: '14px', height: '14px' }} />
                    Refresh Data
                  </Button>
                  <div className={styles.sideIcons}>
                    <SegmentedControl.Root
                      defaultValue="month"
                      size="1"
                      onValueChange={handleViewTypeChange}
                    >
                      <SegmentedControl.Item value="month">
                        <CalendarIcon />
                      </SegmentedControl.Item>
                      <SegmentedControl.Item value="list">
                        <ListBulletIcon />
                      </SegmentedControl.Item>
                    </SegmentedControl.Root>
                  </div>
                </TabsList>
                {renderTabsContent("albums", albums)}
                {renderTabsContent("artists", artists)}
                {renderTabsContent("songs", songs)}
              </Tabs>
            </div>
            <ModalExtraContent
              year={year}
              albums={albums}
              open={extraModalOpen}
              onOpenChange={handleExtraModalOpenChange}
              yearSelectRevision={yearSelectRevision}
              onYearChange={handleModalYearChange}
              minYear={earliestSelectableYear}
              maxYear={latestSelectableYear}
              pendingMonthIndex={extraModalPendingMonth}
              onPendingMonthConsumed={handlePendingMonthConsumed}
            />
          </div>
        )}
        {!sessionStarted && (
          <div className={styles.authBootstrapOverlay} aria-busy="true" aria-label="Checking session">
            <Spinner size="large" />
          </div>
        )}
        {authenticatedWithLastfm && lastfmUsername && (
          <div className={styles.loggedAs}>
            <span>logged as {lastfmUsername}</span>
            <Popover
              side="top"
              align="start"
              trigger={
                <button type="button" className={styles.dotsButton} aria-label="User options">
                  <DotsVerticalIcon />
                </button>
              }
            >
              <button type="button" className={styles.popoverItem} onClick={handleLogout}>
                Logout
              </button>
            </Popover>
          </div>
        )}
        <ModalInitialConfig
          authenticatedWithLastfm={authenticatedWithLastfm}
          setAuthenticatedWithLastfm={setAuthenticatedWithLastfm}
          onSessionStarted={handleSessionStarted}
        />
      </div>
    </>
  );
}
