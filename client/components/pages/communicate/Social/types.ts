import { Post } from '@/core';

export interface CreatePostProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export interface FeedProps {
    onCreatePost: () => void;
    onPostPress?: (post: Post) => void;
}

export interface PostCardProps {
    post: Post;
    onLike: (post: Post) => void;
    onComment: (post: Post) => void;
    onPress?: (post: Post) => void;
}
