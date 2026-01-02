export interface GameModel {
    id: string;
    name: string;
    uri?: string; // Local file URI (optional, for cache)
    url?: string; // External web URL (e.g. GameSnacks)
    html_content?: string; // Source code from DB
    dateAdded: number;
    user_id?: string;
    icon_asset_key?: string;
}
