const knowledge = require('../../data/nodes.js');
const themeData = require('../../data/themes.js');
const topicIdx = require('../../data/topic_index.js');
const cardsData = require('../../data/cards.js');
const store = require('../../utils/store.js');

Page({
  data: {
    node: null,
    card: null,
    status: 0,
    statusName: '未开始',
    preNodes: [],
    relNodes: [],
    note: '',
    editingNote: false,
    tab: 'concept',
    foldState: {},
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
      card: cardsData.CARDS[id] || null,
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
    if (!this.data.node) return;
    const id = this.data.node.id;
    this.setData({
      status: store.getStatus(id),
      note: store.getNote(id)
    });
    this.refreshStatusName(store.getStatus(id));
  },

  refreshStatusName: function (s) {
    this.setData({ statusName: ['未开始', '学习中', '已掌握'][s] || '未开始' });
  },

  switchTab: function (e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  cycleStatus: function () {
    const id = this.data.node.id;
    const next = (this.data.status + 1) % 3;
    store.setStatus(id, next);
    this.setData({ status: next });
    this.refreshStatusName(next);
    wx.showToast({ title: '已标记：' + ['未开始', '学习中', '已掌握'][next], icon: 'none' });
  },

  goNode: function (e) {
    wx.navigateTo({ url: '/pages/node/node?id=' + e.currentTarget.dataset.id });
  },

  goTheme: function () {
    if (!this.data.themeId) return;
    const app = getApp();
    app.globalData = app.globalData || {};
    app.globalData.focusTheme = this.data.themeId;
    wx.switchTab({ url: '/pages/graph/graph' });
  },

  goTopic: function (e) {
    const app = getApp();
    app.globalData = app.globalData || {};
    app.globalData.focusTopic = e.currentTarget.dataset.id;
    wx.switchTab({ url: '/pages/locator/locator' });
  },

  toggleFold: function (e) {
    const idx = e.currentTarget.dataset.idx;
    const key = 'foldState.' + idx;
    this.setData({ [key]: !this.data.foldState[idx] });
  },

  toggleNote: function () {
    this.setData({ editingNote: !this.data.editingNote });
  },

  onNoteInput: function (e) {
    this.setData({ note: e.detail.value });
  },

  saveNote: function () {
    store.setNote(this.data.node.id, this.data.note);
    this.setData({ editingNote: false });
    wx.showToast({ title: '笔记已保存', icon: 'success' });
  }
});
