const knowledge = require('../../data/nodes.js');
const themeData = require('../../data/themes.js');
const topicIdx = require('../../data/topic_index.js');
const cardsData = require('../../data/cards.js');
const store = require('../../utils/store.js');
const statusPicker = require('../../utils/status-picker.js');
const contentSummary = require('../../utils/content-summary.js');

function exampleIndex(page, event) {
  const raw = event && event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.idx;
  const idx = typeof raw === 'string' && /^(0|[1-9][0-9]*)$/.test(raw) ? Number(raw) : raw;
  const examples = page.data.card && page.data.card.examples;
  return Number.isInteger(idx) && idx >= 0 && Array.isArray(examples) && idx < examples.length ? idx : -1;
}

const readingContext = require('../../utils/reading-context.js');

Page(readingContext.attach('node', {
  data: {
    node: null,
    card: null,
    status: 0,
    disputed: 0,
    statusName: '未开始',
    preNodes: [],
    relNodes: [],
    note: '',
    editingNote: false,
    tab: 'concept',
    foldState: {},
    hintFoldState: {},
    sourceSummary: null,
    sourceExpanded: false,
    themeId: '',
    themeName: '',
    topicList: []
  },

  onLoad: function (options) {
    const id = options.id;
    const node = knowledge.ALL_NODES.find(function (n) { return n.id === id; });
    if (!node) {
      wx.showToast({ title: '知识点不存在', icon: 'none' });
      return;
    }
    const byId = {};
    knowledge.ALL_NODES.forEach(function (n) { byId[n.id] = n; });
    const pre = (node.pre || []).map(function (x) { return byId[x]; }).filter(Boolean)
      .map(function (n) { return { id: n.id, n: n.n }; });
    const rel = (node.rel || []).map(function (x) { return byId[x]; }).filter(Boolean)
      .map(function (n) { return { id: n.id, n: n.n }; });

    this.setData({
      node: node,
      card: contentSummary.decorateCard(cardsData.CARDS[id]),
      sourceSummary: contentSummary.build(id, node.domain, cardsData.CARDS[id], 'concept'),
      preNodes: pre,
      relNodes: rel,
      status: store.getStatus(id),
      note: store.getNote(id),
      themeId: themeData.THEME_OF[id] || '',
      themeName: themeData.THEME_NAME[themeData.THEME_OF[id]] || '',
      topicList: (topicIdx.TOPICS_BY_NODE[id] || []).map(function (tid) {
        const t = topicIdx.TOPIC_ITEMS.find(function (x) { return x.id === tid; });
        return t ? { id: t.id, name: t.name, themeName: t.themeName } : null;
      }).filter(Boolean)
    });
    this.refreshStatusName(store.getStatus(id));
    wx.setNavigationBarTitle({ title: node.n });
  },

  onShow: function () {
    statusPicker.onShow(this);
    this.refreshProgress();
    if (this._stopSyncRefresh) this._stopSyncRefresh();
    this._stopSyncRefresh = store.onChange((state, source) => {
      if (source === 'remote' && this._reading.active) this.refreshProgress();
    });
  },

  onHide: function () {
    statusPicker.onHide(this);
    if (this._stopSyncRefresh) this._stopSyncRefresh();
  },
  onUnload: function () { this.onHide(); },

  readingSavedNote: function () { return this.data.node ? store.getNote(this.data.node.id) : ''; },

  onReadingRestore: function () {
    this.refreshProgress();
    if (this.data.node) this.setData({
      sourceSummary: contentSummary.build(this.data.node.id, this.data.node.domain, this.data.card, this.data.tab)
    });
  },

  refreshProgress: function () {
    if (!this.data.node) return;
    const id = this.data.node.id;
    const patch = { status: store.getStatus(id), disputed: store.getDisputed(id) };
    // 云端拉取不得覆盖尚未保存的笔记草稿。
    if (!this.data.editingNote) patch.note = store.getNote(id);
    this.setData(patch);
    this.refreshStatusName(patch.status);
  },

  refreshStatusName: function (s) {
    this.setData({ statusName: ['未开始', '学习中', '已掌握'][s] || '未开始' });
  },

  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    if (!this.data.node || ['concept', 'explain', 'example'].indexOf(tab) < 0) return;
    this.setData({
      tab: tab,
      sourceSummary: contentSummary.build(this.data.node.id, this.data.node.domain, this.data.card, tab)
    });
  },

  toggleSource: function () {
    this.setData({ sourceExpanded: !this.data.sourceExpanded });
  },

  chooseStatus: function () {
    if (!this.data.node) return;
    statusPicker.choose(this, this.data.node.id, this.refreshProgress);
  },

  toggleDisputed: function () {
    if (!this.data.node) return;
    const id = this.data.node.id;
    const next = store.getDisputed(id) ? 0 : 1;
    if (!store.setDisputed(id, next)) {
      wx.showToast({ title: '本地保存失败，请重试', icon: 'none' });
      return;
    }
    this.setData({ disputed: next });
    wx.showToast({ title: next ? '已标记存疑' : '已取消存疑', icon: 'none' });
  },

  goNode: function (e) {
    readingContext.navigate(this, '/pages/node/node?id=' + encodeURIComponent(e.currentTarget.dataset.id));
  },

  goTheme: function () {
    if (!this.data.themeId) return;
    readingContext.navigate(this, '/pages/graph/graph', { focus: { theme: this.data.themeId } });
  },

  goTopic: function (e) {
    readingContext.navigate(this, '/pages/locator/locator', { focus: { topic: e.currentTarget.dataset.id } });
  },

  toggleFold: function (e) {
    const idx = exampleIndex(this, e);
    if (idx < 0) return;
    const key = 'foldState.' + idx;
    this.setData({ [key]: !this.data.foldState[idx] });
  },

  toggleHint: function (e) {
    const idx = exampleIndex(this, e);
    if (idx < 0 || !this.data.card.examples[idx].hasHint) return;
    this.setData({ ['hintFoldState.' + idx]: !this.data.hintFoldState[idx] });
  },

  toggleNote: function () {
    if (!this.data.node) return;
    readingContext.clearDraft(this);
    // 取消只丢弃草稿，恢复当前已存版本（编辑期间可能已合并远端笔记）。
    // 不调用 setter，避免取消被误记成一次本地编辑或同步操作。
    this.setData({
      editingNote: !this.data.editingNote,
      note: store.getNote(this.data.node.id)
    });
  },

  onNoteInput: function (e) {
    this.setData({ note: e.detail.value });
  },

  saveNote: function () {
    if (!store.setNote(this.data.node.id, this.data.note)) {
      wx.showToast({ title: '保存失败，草稿已保留', icon: 'none' });
      return;
    }
    readingContext.clearDraft(this);
    this.setData({ editingNote: false });
    wx.showToast({ title: '笔记已保存', icon: 'success' });
  }
}));
