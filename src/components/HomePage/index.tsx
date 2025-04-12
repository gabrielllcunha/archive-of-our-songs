import styles from "./styles.module.scss";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArchiveIcon, CalendarIcon, ListBulletIcon } from "@radix-ui/react-icons";
import { Album, Singer, Song } from "@/models";
import { Dialog, MonthItem, Progress, SegmentedControl, Select, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components';
import { fetchDataFromEndpoint } from "@/utils/fetchDataFromEndpoint";
import { db } from "@/utils/indexedDB";

type DataEntry = {
  name?: string;
  artist?: string;
  scrobbles?: number;
  imageUrl?: string;
  month?: number;
}
export function HomePage() {
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<string>("albums");
  const [viewType, setViewType] = useState<string>("month");
  const [year, setYear] = useState<number>(currentYear - 1);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Singer[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const months = useMemo(() => [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ], []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleYearChange = (value: string) => {
    setYear(Number(value));
  };

  const handleViewTypeChange = (value: string) => {
    setViewType(value);
  };

  const generateYearOptions = () => {
    const startYear = 2021;
    const years = [];
    for (let i = startYear; i <= currentYear; i++) {
      years.push({ value: String(i), label: String(i) });
    }
    return years;
  };

  const fetchData = useCallback(async (endpoint: string, setter: React.Dispatch<React.SetStateAction<any[]>>, signal: AbortSignal) => {
    try {
      setLoading(true);
      const storeName =
        endpoint === "fetch-albums-by-month" ? "albums" :
          endpoint === "fetch-artists-by-month" ? "artists" :
            endpoint === "fetch-songs-by-month" ? "songs" :
              '';

      const cachedData: DataEntry[] = await db.getData(storeName, year);
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const futureMonths = [];
      if (year === currentYear) {
        for (let month = currentMonth; month <= 12; month++) {
          futureMonths.push(month);
        }
      } else if (year > currentYear) {
        for (let month = 1; month <= 12; month++) {
          futureMonths.push(month);
        }
      }
      const futureMonthsList = futureMonths.map(month => months[month - 1]);
      const incorrectCacheData = cachedData && cachedData
        .filter(entry =>
          !entry.name ||
          (endpoint !== "fetch-artists-by-month" && !entry.artist) ||
          entry.scrobbles === 0 ||
          !entry.imageUrl
        )
        .map(entry => entry.month);
      const missingMonths = Array.from(new Set([...futureMonthsList, ...(incorrectCacheData || [])]));
      if (cachedData && missingMonths.length === 0) {
        setter(cachedData);
        return;
      }
      const payload = {
        username: process.env.NEXT_PUBLIC_ACCOUNT_LOGIN,
        password: process.env.NEXT_PUBLIC_ACCOUNT_PASSWORD,
        target_account: process.env.NEXT_PUBLIC_TARGET_ACCOUNT_USER,
        year,
        ...(cachedData && { months: missingMonths }),
      };
      const data: DataEntry[] = await fetchDataFromEndpoint(endpoint, payload, signal);
      const updatedData = cachedData ? cachedData.map(entry => {
        const newEntry = data.find(d => d.month === entry.month);
        return newEntry ? newEntry : entry;
      }) : data;
      await db.storeData(storeName, year, updatedData);
      setter(updatedData);
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
  }, [year, currentYear, months]);

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;
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
      abortController.abort();
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
            {months.map((month, index) => {
              const item = items ? items[index] : null;
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
          <Dialog trigger={
            <div className={styles.secretIcon}>
              <ArchiveIcon height={24} width={24} />
            </div>
          }>
            <div className={styles.dialogContent}>
              <span>Coming soon...</span>
            </div>
          </Dialog>
        </div>
      </div>
    </>
  );
}
