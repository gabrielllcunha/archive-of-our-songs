import { useCallback, useEffect, useState } from "react";
import { Select } from "../Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../Tabs";
import styles from "./styles.module.scss";
import { MonthItem } from "../MonthItem";
import { ArchiveIcon, CalendarIcon, ListBulletIcon } from "@radix-ui/react-icons";
import { Dialog } from "../Dialog";
import { SegmentedControl } from "../SegmentedControl";
import { lastfmService } from "@/services";
import { Album } from "@/models/album";
import { fetchYearAlbums } from "@/utils/fetchYearAlbums";
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
  const [singers, setSingers] = useState<Singers[]>([]);
  const [songs, setSongs] = useState<Songs[]>([]);
  const [loading, setLoading] = useState(true);

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


  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

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
              <TabsContent value="albums">
                <div className={styles.monthsGrid}>
                  {months.map((month, index) => {
                    const album = albums[index];
                    return (
                      <MonthItem
                        key={month}
                        month={month}
                        imageUrl={album?.imageUrl || undefined}
                        albumName={album?.albumName || "No album"}
                        artist={album?.artist || "Unknown artist"}
                      // scrobbles={album?.scrobbles || 0}
                      />
                    );
                  })}
                </div>
              </TabsContent>
              <TabsContent value="singers">
                <span>Singers content.</span>
              </TabsContent>
              <TabsContent value="songs">
                <span>Songs content.</span>
              </TabsContent>
            </Tabs>
          </div>
          <Dialog trigger={
            <div className={styles.secretIcon}>
              <ArchiveIcon height={24} width={24} />
            </div>
          }>
            <h2>Dialog Content</h2>
            <p>Lorem Ipsum Dolor Sit Amet.</p>
          </Dialog>
        </div>
      </div>
    </>
  );
}
