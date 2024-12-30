import styles from "./styles.module.scss";
import { useCallback, useEffect, useState } from "react";
import { ArchiveIcon, CalendarIcon, ListBulletIcon } from "@radix-ui/react-icons";
import { Album, Singer, Song } from "@/models";
import { Dialog, MonthItem, Progress, SegmentedControl, Select, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components';
import { fetchDataFromEndpoint } from "@/utils/fetchDataFromEndpoint";
// export async function getServerSideProps() {
//   const albums = await fetchYearAlbums(2024);
//   return { props: { serverAlbums: albums } };
// }

export function HomePage() {
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<string>("albums");
  const [viewType, setViewType] = useState<string>("month");
  const [year, setYear] = useState<number>(currentYear);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [singers, setSingers] = useState<Singer[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

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

  const fetchData = useCallback(async (endpoint: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
    try {
      setLoading(true);
      const payload = {
        username: process.env.NEXT_PUBLIC_ACCOUNT_LOGIN,
        password: process.env.NEXT_PUBLIC_ACCOUNT_PASSWORD,
        target_account: process.env.NEXT_PUBLIC_TARGET_ACCOUNT_USER,
        year,
      };

      const data = await fetchDataFromEndpoint(endpoint, payload);
      setter(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    switch (activeTab) {
      case "albums":
        fetchData("fetch-albums-by-month", setAlbums);
        break;
      case "singers":
        fetchData("fetch-singers-by-month", setSingers);
        break;
      case "songs":
        fetchData("fetch-songs-by-month", setSongs);
        break;
      default:
        break;
    }
  }, [activeTab, year, fetchData]);

  const renderProgressBar = (name: string) => {
    return (
      <div className={styles.loadingWrapper}>
        <div className={styles.loading}>
          <Progress value={loadingProgress} />
        </div>
        <span>Loading {name}...</span>
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
                  scrobbles={item?.scrobbles || 0}
                  rounded={name === "singers"}
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
            : activeTab === "singers"
              ? styles.singersColors
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
                <TabsTrigger value="singers">Singers</TabsTrigger>
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
              {renderTabsContent("singers", singers)}
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
