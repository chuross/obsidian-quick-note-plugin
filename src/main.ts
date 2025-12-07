import { Plugin, WorkspaceLeaf } from 'obsidian';
import { QuickNoteSettings, DEFAULT_SETTINGS, QuickNoteSettingTab } from './settings';
import { DailyNoteService } from './daily-note-service';
import { QuickNoteModal } from './quick-note-modal';
import { TimelineView, TIMELINE_VIEW_TYPE } from './timeline-view';

export default class QuickNotePlugin extends Plugin {
    settings: QuickNoteSettings;
    dailyNoteService: DailyNoteService;

    async onload() {
        await this.loadSettings();

        this.dailyNoteService = new DailyNoteService(this.app, this.settings);

        // リボンアイコンを追加
        this.addRibbonIcon('pencil', 'Quick Note', (evt: MouseEvent) => {
            new QuickNoteModal(this.app, this.dailyNoteService).open();
        });

        // ステータスバーへの追加（必要であれば）
        // const statusBarItemEl = this.addStatusBarItem();
        // statusBarItemEl.setText('Quick Note Ready');

        // コマンドパレットへの追加
        this.addCommand({
            id: 'open-quick-note-modal',
            name: 'Open Quick Note',
            callback: () => {
                new QuickNoteModal(this.app, this.dailyNoteService).open();
            }
        });

        this.addCommand({
            id: 'open-timeline-view',
            name: 'Open Timeline',
            callback: () => {
                this.activateView();
            }
        });

        // 設定タブの追加
        this.addSettingTab(new QuickNoteSettingTab(this.app, this));

        // タイムラインビューの登録
        this.registerView(
            TIMELINE_VIEW_TYPE,
            (leaf) => new TimelineView(leaf, this.dailyNoteService)
        );

    }

    onunload() {

    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(TIMELINE_VIEW_TYPE);

        if (leaves.length > 0) {
            // 既に開いている場合はそれを使う
            leaf = leaves[0];
        } else {
            // 新しく開く（右側のサイドバーなど）
            leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({ type: TIMELINE_VIEW_TYPE, active: true });
            }
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
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
