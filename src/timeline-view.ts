import { ItemView, WorkspaceLeaf, setIcon, TFile, Notice } from 'obsidian';
import { DailyNoteService } from './daily-note-service';
// Obsidianプラグインではグローバルのmomentを使用するのが一般的だが、型定義のためにimportも可能
// ここではエラー回避のため require か window.moment を使用する形に修正、あるいは * as moment を試す
import * as moment from 'moment';

export const QUICK_NOTE_VIEW_TYPE = 'quick-note-view';

export class QuickNoteView extends ItemView {
    private service: DailyNoteService;
    private content: string = '';
    private attachmentPaths: string[] = [];

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

        // --- スクロール可能なタイムラインコンテナを作成 ---
        const timeline = container.createEl('div', { cls: 'quick-note-timeline' });

        // --- 投稿エリア (Compose Area) をタイムライン内に配置 ---
        const composeContainer = timeline.createEl('div', { cls: 'quick-note-compose' });

        const textArea = composeContainer.createEl('textarea', {
            cls: 'quick-note-textarea',
            attr: { placeholder: "いま何を考えている？", rows: "2" }
        });

        textArea.value = this.content;
        textArea.addEventListener('input', (e) => {
            this.content = (e.target as HTMLTextAreaElement).value;
        });

        textArea.addEventListener('keydown', async (e) => {
            // Command+Enter or Ctrl+Enter to submit
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                await this.submit();
            }
        });

        // 添付ファイルプレビューエリア
        const previewGrid = composeContainer.createEl('div', { cls: 'quick-note-attachments-preview' });
        this.renderAttachmentPreviews(previewGrid);

        // アクションフッター
        const actionsFooter = composeContainer.createEl('div', { cls: 'quick-note-actions' });
        const leftActions = actionsFooter.createEl('div', { cls: 'quick-note-actions-left' });

        // 添付ファイルボタン (Clip icon)
        const attachBtn = leftActions.createEl('button', {
            cls: 'quick-note-action-btn',
            attr: { 'aria-label': 'Attach file' }
        });
        setIcon(attachBtn, 'paperclip');

        attachBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true; // Allow multiple files
            input.onchange = async (e: any) => {
                const files = Array.from(e.target.files) as File[];
                if (files.length > 0) {
                    await this.handleFiles(files);
                    // プレビュー再描画
                    previewGrid.empty();
                    this.renderAttachmentPreviews(previewGrid);
                }
            };
            input.click();
        });

        // 投稿ボタン
        const submitBtn = actionsFooter.createEl('button', {
            cls: 'quick-note-submit-btn',
            text: '投稿'
        });

        submitBtn.addEventListener('click', async () => {
            await this.submit();
        });

        // --- タイムライン記事エリア（同じタイムライン内に配置） ---

        // 直近7日分を取得
        for (let i = 0; i < 7; i++) {
            const date = window.moment().subtract(i, 'days');
            const dateStr = date.format(this.service.getSettings().dateFormat);
            const notes = await this.service.getDailyNotes(dateStr);

            if (notes.length > 0) {
                // デイリーノートが追記型(末尾追加)なら、配列の下の方が新しい。
                // タイムライン設定として新しいものを上に表示したいので reverse する。
                const reversedNotes = [...notes].reverse();

                for (const note of reversedNotes) {
                    const article = timeline.createEl('article', { cls: 'quick-note-article' });

                    // 本文
                    if (note.content) {
                        article.createEl('p', { cls: 'quick-note-article-content', text: note.content });
                    }

                    // 添付ファイルグリッド
                    if (note.attachments && note.attachments.length > 0) {
                        const gridClass = note.attachments.length === 1 ? 'quick-note-grid-1' : 'quick-note-grid-multi';
                        const grid = article.createEl('div', { cls: `quick-note-grid ${gridClass}` });

                        for (const attachment of note.attachments) {
                            const file = this.app.vault.getAbstractFileByPath(attachment);
                            const gridItem = grid.createEl('div', { cls: 'quick-note-grid-item' });

                            // 画像判定
                            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
                            const ext = attachment.split('.').pop()?.toLowerCase();

                            if (ext && imageExtensions.includes(ext) && file) {
                                const img = gridItem.createEl('img', {
                                    cls: 'quick-note-img',
                                    attr: {
                                        src: this.app.vault.getResourcePath(file as any),
                                        alt: attachment
                                    }
                                });
                                // クリックで拡大表示（Obsidianの標準機能で開く）
                                img.addEventListener('click', () => {
                                    this.app.workspace.openLinkText(attachment, '', false);
                                });
                            } else {
                                // 非画像ファイル
                                const link = gridItem.createEl('a', {
                                    cls: 'quick-note-file-link',
                                    text: `📎 ${attachment}`,
                                    attr: { href: '#' }
                                });
                                link.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    this.app.workspace.openLinkText(attachment, '', false);
                                });
                            }
                        }
                    }

                    // タイムスタンプ
                    // 簡易的に "HH:mm" を表示。日付が今日以外なら日付も入れるなどのロジックも可だが
                    // ここではtimestamp (HH:mm) + dateStr を組み合わせて表示、あるいは単に HH:mm
                    // デザイン要望では "2時間前" などの相対時間だが、データとしては HH:mm しかない場合も多い
                    // 可能な限り相対時間に変換してみる
                    const timeStr = note.timestamp; // HH:mm
                    const noteDateTime = window.moment(`${dateStr} ${timeStr}`, `${this.service.getSettings().dateFormat} ${this.service.getSettings().timestampFormat}`);

                    const timeDisplay = noteDateTime.isValid() ? noteDateTime.fromNow() : `${dateStr} ${timeStr}`;

                    article.createEl('time', {
                        cls: 'quick-note-meta',
                        text: timeDisplay
                    });
                }
            }
        }
    }

    renderAttachmentPreviews(container: HTMLElement) {
        if (this.attachmentPaths.length === 0) return;

        for (let i = 0; i < this.attachmentPaths.length; i++) {
            const path = this.attachmentPaths[i];
            const file = this.app.vault.getAbstractFileByPath(path);
            const item = container.createEl('div', { cls: 'quick-note-preview-item' });

            // 画像判定
            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
            const ext = path.split('.').pop()?.toLowerCase();

            if (ext && imageExtensions.includes(ext) && file) {
                item.createEl('img', {
                    cls: 'quick-note-preview-img',
                    attr: {
                        src: this.app.vault.getResourcePath(file as any)
                    }
                });
            } else {
                item.createEl('div', {
                    cls: 'quick-note-preview-file',
                    text: '📄' // Placeholder for non-image
                });
            }

            // 削除ボタン
            const removeBtn = item.createEl('button', { cls: 'quick-note-remove-attachment' });
            setIcon(removeBtn, 'x'); // 'close' icon

            removeBtn.addEventListener('click', () => {
                this.attachmentPaths.splice(i, 1);
                container.empty();
                this.renderAttachmentPreviews(container);
            });
        }
    }

    async handleFiles(files: File[]) {
        for (const file of files) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const fileName = file.name;
                const normalizedPath = `attachments/${fileName}`;

                // フォルダ作成
                const folder = this.app.vault.getAbstractFileByPath('attachments');
                if (!folder) {
                    await this.app.vault.createFolder('attachments');
                }

                // ファイル保存
                let targetFile = this.app.vault.getAbstractFileByPath(normalizedPath);
                if (!targetFile) {
                    await this.app.vault.createBinary(normalizedPath, arrayBuffer);
                } else {
                    // 同名ファイル存在時はそのまま使う（またはリネームロジックを入れる）
                    new Notice(`Using existing file: ${fileName}`);
                }

                if (!this.attachmentPaths.includes(normalizedPath)) {
                    this.attachmentPaths.push(normalizedPath);
                }
            } catch (err) {
                console.error(err);
                new Notice(`Failed to attach ${file.name}`);
            }
        }
    }

    async submit() {
        if (!this.content.trim() && this.attachmentPaths.length === 0) return;

        try {
            await this.service.addNote(this.content, this.attachmentPaths);

            // リセット
            this.content = '';
            this.attachmentPaths = [];

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
