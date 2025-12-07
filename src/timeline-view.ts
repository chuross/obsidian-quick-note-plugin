import { ItemView, WorkspaceLeaf, setIcon, TFile, Notice } from 'obsidian';
import { DailyNoteService } from './daily-note-service';
// Obsidianプラグインではグローバルのmomentを使用するのが一般的だが、型定義のためにimportも可能
// ここではエラー回避のため require か window.moment を使用する形に修正、あるいは * as moment を試す
import * as moment from 'moment';

export const QUICK_NOTE_VIEW_TYPE = 'quick-note-view';

export class QuickNoteView extends ItemView {
    private service: DailyNoteService;
    private content: string = '';
    private attachmentPath: string | null = null;

    constructor(leaf: WorkspaceLeaf, service: DailyNoteService) {
        super(leaf);
        this.service = service;
    }

    getViewType() {
        return QUICK_NOTE_VIEW_TYPE;
    }

    getDisplayText() {
        return 'Quick Note';
    }

    getIcon() {
        return 'pencil';
    }

    async onOpen() {
        await this.render();
    }

    async render() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('quick-note-view');

        // --- 投稿エリア ---
        const inputContainer = container.createEl('div', { cls: 'quick-note-input-container' });

        const textArea = inputContainer.createEl('textarea', {
            cls: 'quick-note-textarea',
            attr: { placeholder: "What's happening?" }
        });

        // 状態復元（もしあれば）
        textArea.value = this.content;

        textArea.addEventListener('input', (e) => {
            this.content = (e.target as HTMLTextAreaElement).value;
        });

        textArea.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                await this.submit();
            }
        });

        const actionsFooter = inputContainer.createEl('div', { cls: 'quick-note-actions' });
        const leftActions = actionsFooter.createEl('div', { cls: 'quick-note-actions-left' });

        // 添付ファイルボタン
        const attachBtn = leftActions.createEl('button', { cls: 'quick-note-action-btn', attr: { 'aria-label': 'Attach file' } });
        setIcon(attachBtn, 'paperclip');

        const attachStatus = leftActions.createEl('span', { cls: 'quick-note-attach-status' });

        attachBtn.addEventListener('click', () => {
            // ファイル選択ダイアログを作成して開く
            const input = document.createElement('input');
            input.type = 'file';
            input.onchange = async (e: any) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const fileName = file.name;

                        // attachmentsフォルダがあるか確認、なければ作成
                        // 設定などでパスが変えられるのが理想だが、一旦ルートのattachmentsなどを想定
                        // または、ユーザーの現在開いているファイルのフォルダなど。
                        // ここではルート直下に配置する簡易実装、またはユーザー設定の添付ファイルフォルダを取得すべきだが
                        // Obsidian APIで推奨される方法を使用
                        const normalizedPath = `attachments/${fileName}`;

                        // フォルダ作成
                        const folder = this.app.vault.getAbstractFileByPath('attachments');
                        if (!folder) {
                            await this.app.vault.createFolder('attachments');
                        }

                        // ファイル作成（同名ファイルがある場合は別名にする処理が必要だが、簡易的に上書き禁止としてエラーハンドリング）
                        let targetFile = this.app.vault.getAbstractFileByPath(normalizedPath);
                        if (!targetFile) {
                            targetFile = await this.app.vault.createBinary(normalizedPath, arrayBuffer);
                        } else {
                            // 既に存在する場合は簡易的にそのまま使う（あるいは名前を変える）
                            new Notice(`File ${fileName} already exists. Using existing file.`);
                        }

                        this.attachmentPath = normalizedPath;
                        attachStatus.setText(fileName);
                        attachStatus.addClass('has-attachment');

                    } catch (err) {
                        console.error(err);
                        new Notice('Failed to attach file.');
                    }
                }
            };
            input.click();
        });


        // 投稿ボタン
        const submitBtn = actionsFooter.createEl('button', {
            cls: 'quick-note-submit-btn',
            text: 'Note it'
        });

        submitBtn.addEventListener('click', async () => {
            await this.submit();
        });

        // --- タイムラインエリア ---
        container.createEl('h4', { text: 'Timeline', cls: 'quick-note-timeline-title' });
        const list = container.createEl('div', { cls: 'quick-note-timeline-list' });

        // 直近7日分を取得
        for (let i = 0; i < 7; i++) {
            // 新しい日付順にループする
            const date = window.moment().subtract(i, 'days');
            const dateStr = date.format(this.service.getSettings().dateFormat);
            const notes = await this.service.getDailyNotes(dateStr);

            if (notes.length > 0) {
                // 日付ヘッダー
                list.createEl('h5', { text: dateStr, cls: 'quick-note-date-header' });

                // getDailyNotesは「上から順」= 文書内順序（古い順）で返すと仮定していたが
                // デイリーノートが追記型なら下が新しい。timelineとしては新しい順（下から上）に表示したい
                // なので reverse() する
                const reversedNotes = [...notes].reverse();

                for (const note of reversedNotes) {
                    const entry = list.createEl('div', { cls: 'quick-note-entry' });
                    entry.createEl('div', { cls: 'quick-note-entry-header', text: note.timestamp });
                    entry.createEl('div', { cls: 'quick-note-entry-content', text: note.content });
                }
            }
        }
    }

    async submit() {
        if (!this.content.trim() && !this.attachmentPath) return;

        try {
            await this.service.addNote(this.content, this.attachmentPath || undefined);

            // リセット
            this.content = '';
            this.attachmentPath = null;

            // 再描画
            await this.render();

            new Notice('Note added!');
        } catch (error) {
            console.error('Failed to add note:', error);
            new Notice('Failed to add note.');
        }
    }

    async onClose() {
        // Cleanup
    }
}
