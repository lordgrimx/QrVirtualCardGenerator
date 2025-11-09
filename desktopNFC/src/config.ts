export const backendBaseUrls: string[] = [
  (import.meta as any).env?.VITE_BACKEND_BASE_URL,
  'https://backend.anefuye.com.tr',
  'http://192.168.1.105:8000',
  'http://localhost:8000',
].filter(Boolean) as string[];

export const BRAND = {
  primary: '#7C2D12',
  danger: '#991B1B',
};


