import axios from 'axios';
import type { AutoDetectResponse } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:5000/api';


const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const uploadDataset = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const getPreview = async (sessionId: string, page = 1, pageSize = 50) => {
  const res = await api.get(`/preview/${sessionId}`, { params: { page, page_size: pageSize } });
  return res.data;
};

export const getInfo = async (sessionId: string) => {
  const res = await api.get(`/info/${sessionId}`);
  return res.data;
};

export const getAutoDetect = async (sessionId: string): Promise<AutoDetectResponse> => {
  const res = await api.get(`/auto-detect/${sessionId}`);
  return res.data;
};

export const getDescribe = async (sessionId: string) => {
  const res = await api.get(`/describe/${sessionId}`);
  return res.data;
};

export const cleanMissing = async (sessionId: string, config: unknown) => {
  const res = await api.post(`/clean/missing/${sessionId}`, config);
  return res.data;
};

export const cleanDuplicates = async (sessionId: string, config: unknown) => {
  const res = await api.post(`/clean/duplicates/${sessionId}`, config);
  return res.data;
};

export const cleanOutliers = async (sessionId: string, config: unknown) => {
  const res = await api.post(`/clean/outliers/${sessionId}`, config);
  return res.data;
};

export const mapValues = async (sessionId: string, config: unknown) => {
  const res = await api.post(`/transform/map-values/${sessionId}`, config);
  return res.data;
};

export const convertType = async (sessionId: string, config: unknown) => {
  const res = await api.post(`/transform/convert-type/${sessionId}`, config);
  return res.data;
};

export const renameColumn = async (sessionId: string, config: unknown) => {
  const res = await api.post(`/transform/rename/${sessionId}`, config);
  return res.data;
};

export const dropColumn = async (sessionId: string, config: unknown) => {
  const res = await api.post(`/transform/drop-column/${sessionId}`, config);
  return res.data;
};

export const duplicateColumn = async (sessionId: string, config: unknown) => {
  const res = await api.post(`/transform/duplicate-column/${sessionId}`, config);
  return res.data;
};

export const filterRows = async (sessionId: string, config: unknown) => {
  const res = await api.post(`/transform/filter-rows/${sessionId}`, config);
  return res.data;
};

export const sortRows = async (sessionId: string, config: unknown) => {
  const res = await api.post(`/transform/sort/${sessionId}`, config);
  return res.data;
};

export const stringClean = async (sessionId: string, config: unknown) => {
  const res = await api.post(`/transform/string/${sessionId}`, config);
  return res.data;
};

export const dateTransform = async (sessionId: string, config: unknown) => {
  const res = await api.post(`/transform/date/${sessionId}`, config);
  return res.data;
};

export const encode = async (sessionId: string, config: unknown) => {
  const res = await api.post(`/transform/encode/${sessionId}`, config);
  return res.data;
};

export const scale = async (sessionId: string, config: unknown) => {
  const res = await api.post(`/transform/scale/${sessionId}`, config);
  return res.data;
};

export const featureEngineer = async (sessionId: string, config: unknown) => {
  const res = await api.post(`/transform/feature/${sessionId}`, config);
  return res.data;
};

export const getStatistics = async (sessionId: string) => {
  const res = await api.get(`/statistics/${sessionId}`);
  return res.data;
};

export const generateCode = async (sessionId: string, operations: unknown[]) => {
  const res = await api.post(`/generate-code/${sessionId}`, { operations });
  return res.data;
};

export const undo = async (sessionId: string) => {
  const res = await api.post(`/history/undo/${sessionId}`);
  return res.data;
};

export const redo = async (sessionId: string) => {
  const res = await api.post(`/history/redo/${sessionId}`);
  return res.data;
};

export const getHistory = async (sessionId: string) => {
  const res = await api.get(`/history/${sessionId}`);
  return res.data;
};

export const exportDataset = async (sessionId: string, format: string) => {
  const res = await api.post(`/export/${sessionId}`, { format }, { responseType: 'blob' });
  return res.data;
};

export const getSampleData = async () => {
  const res = await api.get('/sample-data');
  return res.data;
};

export default api;
