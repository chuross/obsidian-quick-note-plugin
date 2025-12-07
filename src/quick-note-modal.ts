import { App, Modal, Setting } from 'obsidian';
import { DailyNoteService } from './daily-note-service';

export class QuickNoteModal extends Modal {
    private service: DailyNoteService;
    private content: string = '';

    constructor(app: App, service: DailyNoteService) {
        super(app);
        this.service = service;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('quick-note-modal');

        // モーダルのタイトルを非表示にするか、カスタムUIにする
        // ここではシンプルにコンテナを作成

        const textAreaEl = contentEl.createEl('textarea', {
            cls: 'quick-note-textarea',
            attr: { placeholder: "What's happening?" }
        });

        textAreaEl.focus();

        const footerEl = contentEl.createEl('div', { cls: 'quick-note-footer' });

        // 文字数カウンター
        const charCountEl = footerEl.createEl('span', {
            cls: 'quick-note-char-count',
            text: '0'
        });

        // 投稿ボタン
        const submitBtn = footerEl.createEl('button', {
            cls: 'quick-note-submit-btn',
            text: 'Note it'
        });

        // イベントリスナー
        textAreaEl.addEventListener('input', (e) => {
            this.content = (e.target as HTMLTextAreaElement).value;
            charCountEl.innerText = `${this.content.length}`;
            if (this.content.length > 280) {
                charCountEl.addClass('warning');
            } else {
                charCountEl.removeClass('warning');
            }
        });

        // Enterで送信 (Shift+Enterは改行)
        textAreaEl.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                await this.submit();
            }
        });

        submitBtn.addEventListener('click', async () => {
            await this.submit();
        });
    }

    async submit() {
        if (!this.content.trim()) return;

        try {
            await this.service.addNote(this.content);
            this.close();
            // 成功通知（オプション）
            // new Notice('Note added!');
        } catch (error) {
            console.error('Failed to add note:', error);
            // エラー通知
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
