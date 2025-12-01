export interface CreateStreamProps {
    onSuccess: (streamKey: string, rtmpUrl: string) => void;
    onCancel: () => void;
}

export interface StreamListProps {
    onStreamPress: (streamKey: string) => void;
    onCreateStream: () => void;
}

export interface StreamPlayerProps {
    streamKey: string;
}
