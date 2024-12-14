import axios, { type AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

const AxiosInstance: AxiosInstance = axios.create({
  baseURL: 'https://ws.audioscrobbler.com/2.0',
  // baseURL: `${process.env.LASTFM_API_URL}`,
  withCredentials: false,
});

AxiosInstance.interceptors.request.use(async (request: InternalAxiosRequestConfig) => {
  request.params = {
    ...request.params,
    api_key: LASTFM_API_KEY,
    format: 'json',
  };
  return request;
});

AxiosInstance.interceptors.response.use(
  async (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiLastfm = AxiosInstance;
