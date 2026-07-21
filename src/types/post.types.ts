export type FeedFilter = "circles" | "following" | "local" | "all";

export interface PostAuthor {
  id: string;
  full_name: string;
  profile_picture: string | null;
  city: string | null;
  interests: string[];
  conversation_style: string | null;
}

export interface PostResponse {
  id: string;
  user: PostAuthor;
  content: string;
  media_url: string | null;
  media_type: string;
  circle_id: string | null;
  circle_name: string | null;
  city: string | null;
  country: string | null;
  like_count: number;
  comment_count: number;
  is_liked_by_me: boolean;
  created_at: Date;
}

export interface PostCommentResponse {
  id: string;
  post_id: string;
  user: PostAuthor;
  content: string;
  parent_id: string | null;
  like_count: number;
  is_liked_by_me: boolean;
  created_at: Date;
}

export interface CreatePostDto {
  content?: string;
  circle_id?: string;
}

export interface CreateCommentDto {
  content: string;
  parent_id?: string;
}
