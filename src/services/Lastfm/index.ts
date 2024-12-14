import { apiLastfm } from "@/utils/apiLastfm";

class LastfmService {
  private path = '/';

  getTopAlbums(artist: string) {
    return apiLastfm.get(this.path, {
      params: {
        method: 'artist.gettopalbums',
        artist,
      },
    });
  }

  getTopAlbumsByYear(user: string, year: number) {
    const monthNames = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december"
    ];
  
    return Promise.all(
      monthNames.map((month, index) =>
        apiLastfm.get(this.path, {
          params: {
            method: "user.gettopalbums",
            user,
            period: "1month",
            year,
            month,
            limit: 1,
          },
        })
      )
    );
  }
    

  searchTracks(track: string) {
    return apiLastfm.get(this.path, {
      params: {
        method: 'track.search',
        track,
      },
    });
  }

  getAlbumInfo(artist: string, album: string) {
    return apiLastfm.get(this.path, {
      params: {
        method: 'album.getinfo',
        artist,
        album,
      },
    });
  }
}

export const lastfmService = new LastfmService();
