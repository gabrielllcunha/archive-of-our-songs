import styles from "./styles.module.scss";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarIcon, ListBulletIcon, UpdateIcon } from "@radix-ui/react-icons";
import { Album, Singer, Song } from "@/models";
import { Button, MonthItem, Progress, SegmentedControl, Select, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components';
import { fetchDataFromEndpoint } from "@/utils/fetchDataFromEndpoint";
import { yearlyDataStorage } from '@/services/yearlyDataStorage';
import { ModalExtraContent } from "../ModalExtraContent";
import { ModalInitialConfig } from "../ModalInitialConfig";

export function HomePage() {
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<string>("albums");
  const [viewType, setViewType] = useState<string>("month");
  const [year, setYear] = useState<number>(currentYear - 1);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Singer[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [authenticatedWithLastfm, setAuthenticatedWithLastfm] = useState<boolean>(false);
  const months = useMemo(() => [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ], []);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isRefreshingRef = useRef(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleYearChange = (value: string) => {
    setYear(Number(value));
  };

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
      setLoading(true);
      const username = localStorage.getItem('lastfm_username');
      if (!username) {
        setAuthenticatedWithLastfm(false);
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
      const storedData = await yearlyDataStorage.getYearlyData(
        username,
        year,
        endpoint === "fetch-albums-by-month" ? "albums" :
          endpoint === "fetch-artists-by-month" ? "artists" : "songs"
      );
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const futureMonths = [];
      if (year === currentYear) {
        for (let month = currentMonth; month <= 12; month++) {
          futureMonths.push(months[month - 1]);
        }
      } else if (year > currentYear) {
        for (let month = 1; month <= 12; month++) {
          futureMonths.push(months[month - 1]);
        }
      }
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
      const payload = {
        username: process.env.NEXT_PUBLIC_ACCOUNT_LOGIN,
        password: process.env.NEXT_PUBLIC_ACCOUNT_PASSWORD,
        target_account: username,
        year,
        ...(monthsPayload && { months: monthsPayload }),
        ...(forceRefresh && { forceRefresh: true }),
      };
      const data = await fetchDataFromEndpoint(endpoint, payload, signal);
      if (storedData) {
        let monthsToDisplay = months;
        if (year === currentYear) {
          const currentMonthNameIndex = new Date().getMonth();
          monthsToDisplay = months.slice(0, currentMonthNameIndex + 1);
        }
        const mergedData = monthsToDisplay.map(monthName => {
          return (
            data.find((item: Album | Singer | Song) => item.month === monthName) ||
            storedData.find((item: Album | Singer | Song) => item.month === monthName) ||
            { month: monthName, name: '', artist: '', imageUrl: '', scrobbles: 0 }
          );
        });
        setter(mergedData);
        await yearlyDataStorage.storeYearlyData(
          username,
          year,
          endpoint === "fetch-albums-by-month" ? "albums" :
            endpoint === "fetch-artists-by-month" ? "artists" : "songs",
          mergedData
        );
      } else {
        let monthsToDisplay = months;
        if (year === currentYear) {
          const currentMonthNameIndex = new Date().getMonth();
          monthsToDisplay = months.slice(0, currentMonthNameIndex + 1);
        }
        const fullData = monthsToDisplay.map(monthName => {
          return (
            data.find((item: Album | Singer | Song) => item.month === monthName) ||
            { month: monthName, name: '', artist: '', imageUrl: '', scrobbles: 0 }
          );
        });
        setter(fullData);
        await yearlyDataStorage.storeYearlyData(
          username,
          year,
          endpoint === "fetch-albums-by-month" ? "albums" :
            endpoint === "fetch-artists-by-month" ? "artists" : "songs",
          fullData
        );
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
      setLoading(false);
    }
  }, [year, months, currentYear]);

  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    const debounceTime = setTimeout(() => {
      switch (activeTab) {
        case "albums":
          fetchData("fetch-albums-by-month", setAlbums, signal);
          break;
        case "artists":
          fetchData("fetch-artists-by-month", setArtists, signal);
          break;
        case "songs":
          fetchData("fetch-songs-by-month", setSongs, signal);
          break;
        default:
          break;
      }
    }, 500);
    return () => {
      clearTimeout(debounceTime);
      abortControllerRef.current?.abort();
    };
  }, [activeTab, year, fetchData]);

  const renderProgressBar = (name: string) => {
    return (
      <div className={styles.loadingWrapper}>
        <div className={styles.loading}>
          <Progress value={null} />
        </div>
        <div className={styles.loadingText}>
          <span>Loading {name}...</span>
          <span className={styles.loadingSubtitle}>(This process can take around 5 minutes)</span>
        </div>
      </div>
    );
  };

  const renderTabsContent = (name: string, items: any[]) => {
    return (
      <TabsContent value={name}>
        {loading ? (
          renderProgressBar(name)
        ) : (
          <div className={styles.monthsGrid}>
            {months.map((month) => {
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
              <Tabs defaultValue={activeTab} onValueChange={handleTabChange}>
                <TabsList sideIcons>
                  <TabsTrigger value="albums">Albums</TabsTrigger>
                  <TabsTrigger value="artists">Artists</TabsTrigger>
                  <TabsTrigger value="songs">Songs</TabsTrigger>
                  <Button variant="secondary" size="small" className={styles.refreshButton} onClick={handleRefreshData} disabled={loading}>
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
            <ModalExtraContent />
          </div>
        )}
        <ModalInitialConfig authenticatedWithLastfm={authenticatedWithLastfm} setAuthenticatedWithLastfm={setAuthenticatedWithLastfm} />
      </div>
    </>
  );
}
