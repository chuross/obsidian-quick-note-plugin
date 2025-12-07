import { Plugin, WorkspaceLeaf, Platform } from 'obsidian';
import { QuickNoteSettings, DEFAULT_SETTINGS, QuickNoteSettingTab } from './settings';
import { DailyNoteService } from './daily-note-service';
import { QuickNoteView, QUICK_NOTE_VIEW_TYPE } from './timeline-view'; // ファイル名はtimeline-view.tsのまま

export default class QuickNotePlugin extends Plugin {
    settings: QuickNoteSettings;
    dailyNoteService: DailyNoteService;

    async onload() {
        await this.loadSettings();

        this.dailyNoteService = new DailyNoteService(this.app, this.settings);

        // タイムラインビュー(統合ビュー)の登録
        this.registerView(
            QUICK_NOTE_VIEW_TYPE,
            (leaf) => new QuickNoteView(leaf, this.dailyNoteService)
        );

        // リボンアイコンを追加 - ここでビューを開く
        this.addRibbonIcon('pencil', 'Quick Note', (evt: MouseEvent) => {
            this.activateView();
        });

        // 設定タブの追加
        this.addSettingTab(new QuickNoteSettingTab(this.app, this));
    }

    onunload() {

    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(QUICK_NOTE_VIEW_TYPE);

        if (leaves.length > 0) {
            // 既に開いている場合はそれを使う
            leaf = leaves[0];
            workspace.revealLeaf(leaf);
        } else {
            // モバイルの場合は通常のタブとして開く（全画面扱い）
            // デスクトップの場合は右サイドバーに開く
            if (Platform.isMobile) {
                leaf = workspace.getLeaf('tab');
            } else {
                leaf = workspace.getRightLeaf(false);
            }

            if (leaf) {
                await leaf.setViewState({ type: QUICK_NOTE_VIEW_TYPE, active: true });
                workspace.revealLeaf(leaf);
            }
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // 設定更新時にサービスも更新（必要であれば）
        this.dailyNoteService = new DailyNoteService(this.app, this.settings);
    }
}
