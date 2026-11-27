const knowledge = require('../../data/nodes.js');
const store = require('../../utils/store.js');
const tabbar = require('../../utils/tabbar.js');
const readingContext = require('../../utils/reading-context.js');
const STATUS_NAMES = ['未开始', '学习中', '已掌握'];

Page(readingContext.attach('gaps', {
  data: {
    stat: {}, groups: [], filter: 'all', view: 'progress', noteQuery: '',
    noteCount: 0, disputedCount: 0, resultCount: 0
  },

  onLoad: function () { this.build(); },

  onShow: function () {
    tabbar.setSelected(this, 3);
    this.build();
    if (this._stopSyncRefresh) this._stopSyncRefresh();
    this._stopSyncRefresh = store.onChange((state, source) => {
      if (source === 'remote' && this._reading.active) this.build();
    });
  },

  onHide: function () { if (this._stopSyncRefresh) this._stopSyncRefresh(); },
  onUnload: function () { if (this._stopSyncRefresh) this._stopSyncRefresh(); },
  onReadingRestore: function () { this.build(); },

  build: function () {
    const filter = this.data.filter;
    const view = this.data.view;
    const query = this.data.noteQuery.trim().toLowerCase();
    const groups = [];
    // 单次当前快照，不把每个字段读取放大成反复解析同步日志。
    const state = store.load();
    let noteCount = 0, disputedCount = 0, resultCount = 0;
    knowledge.DOMAINS.forEach(function (domain) {
      const items = [];
      domain.modules.forEach(function (module) {
        module.topics.forEach(function (node) {
          const status = state.status[node.id] || 0;
          const note = state.notes[node.id] || '';
          const hasNote = note.trim().length > 0;
          const disputed = !!state.disputed[node.id];
          if (hasNote) noteCount++;
          if (disputed) disputedCount++;
          if (view === 'notes') {
            if (!hasNote || (query && note.toLowerCase().indexOf(query) < 0)) return;
          } else if (view === 'disputed') {
            if (!disputed) return;
          } else {
            if (filter === 'todo' && status !== 0) return;
            if (filter === 'learning' && status !== 1) return;
          }
          // 摘要按 Unicode 字符截取；只用于展示，不回写或截断笔记正文。
          const text = Array.from(note.trim().replace(/\s+/g, ' '));
          const summary = text.length > 100 ? text.slice(0, 99).join('') + '…' : text.join('');
          items.push({ id: node.id, n: node.n, d: node.d, status: status,
            statusName: STATUS_NAMES[status] || STATUS_NAMES[0], module: module.name,
            summary: summary, disputed: disputed });
        });
      });
      if (items.length) {
        groups.push({ id: domain.id, name: domain.name, items: items, count: items.length });
        resultCount += items.length;
      }
    });
    this.setData({ stat: store.stats(knowledge.ALL_NODES), groups: groups,
      noteCount: noteCount, disputedCount: disputedCount, resultCount: resultCount });
  },

  setView: function (e) {
    const view = e.currentTarget.dataset.view;
    if (['progress', 'notes', 'disputed'].indexOf(view) < 0) return;
    this.setData({ view: view }, this.build);
  },
  setFilter: function (e) {
    const filter = e.currentTarget.dataset.filter;
    if (['all', 'learning', 'todo'].indexOf(filter) < 0) return;
    this.setData({ filter: filter }, this.build);
  },
  onNoteQuery: function (e) {
    this.setData({ noteQuery: e.detail.value }, this.build);
  },
  clearNoteQuery: function () { this.setData({ noteQuery: '' }, this.build); },

  goNode: function (e) {
    const id = e.currentTarget.dataset.id;
    if (!knowledge.ALL_NODES.some(function (node) { return node.id === id; })) return;
    readingContext.navigate(this, '/pages/node/node?id=' + encodeURIComponent(id) +
      (this.data.view === 'notes' ? '&anchor=note' : ''));
  }
}));
