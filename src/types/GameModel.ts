export interface GameModel {
    id: string;
    name: string;
    uri?: string; // Local file URI (optional, for cache)
    html_content?: string; // Source code from DB
    dateAdded: number;
    user_id?: string;
}
