import { ItemView, WorkspaceLeaf } from 'obsidian';
import { DailyNoteService } from './daily-note-service';
// Obsidianプラグインではグローバルのmomentを使用するのが一般的だが、型定義のためにimportも可能
// ここではエラー回避のため require か window.moment を使用する形に修正、あるいは * as moment を試す
import * as moment from 'moment';

export const TIMELINE_VIEW_TYPE = 'quick-note-timeline';

export class TimelineView extends ItemView {
    private service: DailyNoteService;

    constructor(leaf: WorkspaceLeaf, service: DailyNoteService) {
        super(leaf);
        this.service = service;
    }

    getViewType() {
        return TIMELINE_VIEW_TYPE;
    }

    getDisplayText() {
        return 'Quick Note Timeline';
    }

    getIcon() {
        return 'clock';
    }

    async onOpen() {
        await this.render();
        // データ変更時に自動更新するためのイベントリスナーなどを追加可能
    }

    async render() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('quick-note-timeline-view');

        container.createEl('h4', { text: 'Timeline (Last 7 Days)' });

        const list = container.createEl('div', { cls: 'quick-note-timeline-list' });

        // 直近7日分を取得
        // window.momentを使用する方がObsidianプラグインとしては安全
        const now = window.moment();
        for (let i = 0; i < 7; i++) {
            const date = window.moment().subtract(i, 'days');
            const dateStr = date.format(this.service.getSettings().dateFormat);
            const notes = await this.service.getDailyNotes(dateStr);

            if (notes.length > 0) {
                // 日付ヘッダー
                list.createEl('h5', { text: dateStr, cls: 'quick-note-date-header' });

                // 新しい順（下の行ほど新しいと仮定した場合、逆順にするかどうかは要検討）
                // DailyNoteServiceの実装では上から順(古い順)で返ってくるリストを、新しい順に表示したい場合
                const reversedNotes = [...notes].reverse();

                for (const note of reversedNotes) {
                    const entry = list.createEl('div', { cls: 'quick-note-entry' });
                    entry.createEl('div', { cls: 'quick-note-entry-header', text: note.timestamp });
                    entry.createEl('div', { cls: 'quick-note-entry-content', text: note.content });
                }
            }
        }
    }

    async onClose() {
        // Cleanup
    }
}
