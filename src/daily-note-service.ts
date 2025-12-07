import { App, TFile, normalizePath } from 'obsidian';
import { QuickNoteSettings } from './settings';
import * as moment from 'moment';

export class DailyNoteService {
    constructor(private app: App, private settings: QuickNoteSettings) { }

    getSettings(): QuickNoteSettings {
        return this.settings;
    }

    async addNote(content: string): Promise<void> {
        const now = window.moment();
        const dateStr = now.format(this.settings.dateFormat);
        const timestampStr = now.format(this.settings.timestampFormat);

        // デイリーノートを取得または作成
        const dailyNote = await this.getOrCreateDailyNote(dateStr);

        // フォーマットされた行を作成
        const formattedLine = `- ${timestampStr} ${content}\n`;

        // コンテンツを読み込む
        const fileContent = await this.app.vault.read(dailyNote);
        let newContent = fileContent;

        if (this.settings.insertAtBottom) {
            // 末尾に追加
            // ファイルが空でない場合かつ末尾に改行がない場合は改行を追加
            if (newContent.length > 0 && !newContent.endsWith('\n')) {
                newContent += '\n';
            }
            newContent += formattedLine;
        } else {
            // 特定の見出しの下に追加するか、先頭に追加
            // 簡易的な実装として、見出しが見つかればその直後、なければ末尾に追加
            if (this.settings.headingToInsertAfter) {
                const headingLines = this.settings.headingToInsertAfter.replace(/\\n/g, '').trim();
                if (newContent.includes(headingLines)) {
                    // 見出しの次の行に追加するロジック（簡易版）
                    const lines = newContent.split('\n');
                    const headingIndex = lines.findIndex(line => line.trim() === headingLines);
                    if (headingIndex !== -1) {
                        lines.splice(headingIndex + 1, 0, formattedLine.trim());
                        newContent = lines.join('\n');
                    } else {
                        // 見出しが見つからない場合は末尾
                        if (newContent.length > 0 && !newContent.endsWith('\n')) {
                            newContent += '\n';
                        }
                        newContent += formattedLine;
                    }
                } else {
                    // 見出しが見つからない場合は末尾に追加
                    if (newContent.length > 0 && !newContent.endsWith('\n')) {
                        newContent += '\n';
                    }
                    newContent += formattedLine;
                }
            } else {
                // 先頭に追加
                newContent = formattedLine + newContent;
            }
        }

        // ファイルを更新
        await this.app.vault.modify(dailyNote, newContent);
    }

    async getDailyNotes(dateStr: string): Promise<{ timestamp: string; content: string }[]> {
        const dailyNote = await this.getOrCreateDailyNote(dateStr);
        if (!dailyNote) return [];

        const fileContent = await this.app.vault.read(dailyNote);
        const lines = fileContent.split('\n');
        const entries: { timestamp: string; content: string }[] = [];

        // 正規表現でパース: "- HH:mm Content"
        // ユーザーの設定したフォーマットに依存するが、ここでは簡易的にデフォルトの構造を想定
        // 実際には timestampFormat から正規表現を生成するのが望ましい
        const timeRegex = /^\s*-\s+(\d{2}:\d{2})\s+(.*)$/;

        for (const line of lines) {
            const match = line.match(timeRegex);
            if (match) {
                entries.push({
                    timestamp: match[1],
                    content: match[2].trim()
                });
            }
        }

        // 時間順（新しい順）にソートする場合はこちら
        // return entries.reverse();
        return entries;
    }

    private async getOrCreateDailyNote(dateStr: string): Promise<TFile> {
        // Daily Notesプラグインの設定からフォルダパスを取得するのが理想だが、
        // 一旦ルートディレクトリまたは設定を簡略化して検索する
        // 実際には getDailyNoteSettings() などを使うべきだが、
        // ここではファイル名検索で簡易実装する

        const allFiles = this.app.vault.getMarkdownFiles();
        const dailyNote = allFiles.find(file => file.basename === dateStr);

        if (dailyNote) {
            return dailyNote;
        }

        // ファイルが存在しない場合は作成
        // デフォルトではルートに作成
        const createdFile = await this.app.vault.create(`${dateStr}.md`, '');
        return createdFile;
    }
}
