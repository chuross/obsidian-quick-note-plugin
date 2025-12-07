import { App, PluginSettingTab, Setting } from 'obsidian';
import type QuickNotePlugin from './main';

export interface QuickNoteSettings {
    dateFormat: string;
    timestampFormat: string;
    insertAtBottom: boolean;
    headingToInsertAfter: string;
}

export const DEFAULT_SETTINGS: QuickNoteSettings = {
    dateFormat: 'YYYY-MM-DD',
    timestampFormat: 'HH:mm',
    insertAtBottom: true,
    headingToInsertAfter: ''
};

export class QuickNoteSettingTab extends PluginSettingTab {
    plugin: QuickNotePlugin;

    constructor(app: App, plugin: QuickNotePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        // 既存のコンテンツをクリアして再描画
        containerEl.createEl('h2', { text: 'Quick Note Settings' });

        new Setting(containerEl)
            .setName('Daily Note Date Format')
            .setDesc('Format for daily note filename (e.g. YYYY-MM-DD). If you use the Daily Notes plugin, make sure this matches.')
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD')
                .setValue(this.plugin.settings.dateFormat)
                .onChange(async (value) => {
                    this.plugin.settings.dateFormat = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Timestamp Format')
            .setDesc('Format for the timestamp added to each note (e.g. HH:mm)')
            .addText(text => text
                .setPlaceholder('HH:mm')
                .setValue(this.plugin.settings.timestampFormat)
                .onChange(async (value) => {
                    this.plugin.settings.timestampFormat = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Insert at Bottom')
            .setDesc('If enabled, new notes will be appended to the end of the file. If disabled, they will be inserted after the specified heading.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.insertAtBottom)
                .onChange(async (value) => {
                    this.plugin.settings.insertAtBottom = value;
                    await this.plugin.saveSettings();
                    // 再描画して見出し設定の表示/非表示を切り替える
                    this.display();
                }));

        if (!this.plugin.settings.insertAtBottom) {
            new Setting(containerEl)
                .setName('Heading to Insert After')
                .setDesc('The heading after which new notes will be inserted (e.g. ## Notes). Leave empty to insert at the top.')
                .addText(text => text
                    .setPlaceholder('## Notes')
                    .setValue(this.plugin.settings.headingToInsertAfter)
                    .onChange(async (value) => {
                        this.plugin.settings.headingToInsertAfter = value;
                        await this.plugin.saveSettings();
                    }));
        }
    }
}
