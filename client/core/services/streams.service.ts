import { apiClient } from '../api/client';
import { API_ENDPOINTS, ENV } from '../config/env';

export interface Stream {
    id: string;
    key: string;
    title: string;
    status: string;
    userId: string;
    startedAt: string;
    endedAt?: string;
}

export interface Recording {
    id: string;
    streamId: string;
    url: string;
    duration: number;
    createdAt: string;
}

export const streamsService = {
    /**
     * Create stream
     */
    async createStream(title: string): Promise<{ stream: Stream; rtmpUrl: string; streamKey: string }> {
        return apiClient.post(API_ENDPOINTS.STREAMS.BASE, { title });
    },

    /**
     * Get master playlist URL
     */
    getMasterPlaylistUrl(key: string): string {
        return `${ENV.API_URL}/api/v1${API_ENDPOINTS.STREAMS.MASTER_PLAYLIST(key)}`;
    },

    /**
     * Get DVR playlist URL
     */
    getDvrPlaylistUrl(key: string): string {
        return `${ENV.API_URL}/api/v1${API_ENDPOINTS.STREAMS.DVR_PLAYLIST(key)}`;
    },

    /**
     * Get recording
     */
    async getRecording(id: string): Promise<Recording> {
        return apiClient.get(API_ENDPOINTS.RECORDINGS.BY_ID(id));
    },

    /**
     * Delete recording
     */
    async deleteRecording(id: string): Promise<void> {
        return apiClient.del(API_ENDPOINTS.RECORDINGS.BY_ID(id));
    }
};
