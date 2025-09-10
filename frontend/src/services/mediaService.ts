import mainApi, { handleApiResponse } from './api';
import { API_ENDPOINTS } from '../utils/config';

export interface MediaUploadResult {
  fileName: string;
  originalName: string;
  filePath: string; // public path e.g. /uploads/images/<file>
  thumbnailPath?: string | null;
  mimeType: string;
  size: number;
  originalSize?: number;
  type: 'image' | 'audio' | 'video';
  metadata?: Record<string, any>;
}

const postMultipart = async <T>(url: string, form: FormData, onProgress?: (p:number)=>void): Promise<T> => {
  const response = await mainApi.post(url, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    }
  });
  return handleApiResponse<MediaUploadResult>(response) as unknown as T;
};

export const mediaService = {
  async uploadImage(file: File, options?: { width?: number; height?: number; quality?: number; onProgress?: (p:number)=>void; }): Promise<MediaUploadResult> {
    const form = new FormData();
    form.append('image', file);
    if (options?.width) form.append('width', String(options.width));
    if (options?.height) form.append('height', String(options.height));
    if (options?.quality) form.append('quality', String(options.quality));
    return postMultipart<MediaUploadResult>(`${API_ENDPOINTS.MEDIA_UPLOAD}/image`, form, options?.onProgress);
  },
  async uploadAudio(file: File, onProgress?: (p:number)=>void): Promise<MediaUploadResult> {
    const form = new FormData();
    form.append('audio', file);
    return postMultipart<MediaUploadResult>(`${API_ENDPOINTS.MEDIA_UPLOAD}/audio`, form, onProgress);
  },
  async uploadVideo(file: File, options?: { quality?: string; maxWidth?: number; maxHeight?: number; onProgress?: (p:number)=>void; }): Promise<MediaUploadResult> {
    const form = new FormData();
    form.append('video', file);
    if (options?.quality) form.append('quality', options.quality);
    if (options?.maxWidth) form.append('maxWidth', String(options.maxWidth));
    if (options?.maxHeight) form.append('maxHeight', String(options.maxHeight));
    return postMultipart<MediaUploadResult>(`${API_ENDPOINTS.MEDIA_UPLOAD}/video`, form, options?.onProgress);
  }
};

export default mediaService;
