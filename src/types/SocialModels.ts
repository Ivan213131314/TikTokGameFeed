export interface CommentModel {
    id: string;
    game_id: string;
    user_id: string;
    content: string;
    created_at: number;
    user?: {
        username: string;
        avatar_url: string | null;
    };
}

export interface ProfileModel {
    id: string;
    username: string;
    avatar_url: string | null;
    created_at: number;
}

export interface GameStats {
    likesCount: number;
    commentsCount: number;
    isLiked: boolean;
}
