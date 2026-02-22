export const app_title_i18n_data: Record<string, string> = {
    "Settings": "settings:title",
    "General Settings": "settings:general.title",
    "Chat Settings": "settings:chat.title",
    "Personalization Settings": "settings:personalization.title",
    "Provider Settings": "settings:provider.title",
    "Model Settings": "settings:model.title",
    "Cache Settings": "settings:cache.title",
    "Data Management Settings": "settings:data_management.title",
    "Page Not Found": "common:page_not_found.title",
    "Data Import and Export": "interop:data_import_export.title",
    "About": "about:title",
};

export function GetTitleI18nKeyByText(text: string): string {
    if (!text) return text;
    return app_title_i18n_data[text] ?? text;
}
