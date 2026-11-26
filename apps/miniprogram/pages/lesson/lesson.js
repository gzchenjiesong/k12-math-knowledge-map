const lectureData = require('../../data/lectures.js');
const knowledge = require('../../data/nodes.js');
const themeData = require('../../data/themes.js');
const topicIndex = require('../../data/topic_index.js');
const contentMeta = require('../../data/content_meta.js');
const store = require('../../utils/store.js');

const STATUS_NAME = ['未开始', '学习中', '已掌握'];

Page({
  data: {
    id: '',
    group: {},
    points: [],
    openIds: {},
    exampleFold: {},
    checkFold: {},
    percent: 0,
    done: 0,
    total: 0,
    wide: false,   // 宽屏（iPad 横屏 / 手机横屏 / PC 大屏）
    demo: false,   // 演示模式：一屏一个知识点，放大聚焦，适合投影
    focusIdx: 0
  },

  onLoad: function (options) {
    const id = options.id || '';
    const g = lectureData.LECTURES.find(function (x) { return x.id === id; }) || lectureData.LECTURES[0];
    wx.setNavigationBarTitle({ title: g.title });
    this.groupId = g.id;
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({
      id: g.id,
      group: { title: g.title, subtitle: g.subtitle, lead: g.lead, goal: g.goal, chain: g.chain },
      wide: info.windowWidth >= 768
    });
    this.build();
  },

  onShow: function () {
    if (this.groupId) this.build();
  },

  onResize: function (res) {
    const wide = res.size.windowWidth >= 768;
    // 缩回窄屏时自动退出演示模式，避免小屏上被隐藏的知识点不可见
    if (!wide && this.data.demo) this.setData({ wide: false, demo: false });
    else if (wide !== this.data.wide) this.setData({ wide: wide });
  },

  build: function () {
    const self = this;
    const gid = this.groupId;
    const points = lectureData.LECTURES.find(function (x) { return x.id === gid; }).points.map(function (p, i) {
      const node = knowledge.ALL_NODES.find(function (n) { return n.id === p.nodeId; }) || {};
      const status = store.getStatus(p.nodeId);
      const topics = (topicIndex.TOPICS_BY_NODE[p.nodeId] || []).map(function (tid) {
        const ti = topicIndex.TOPIC_ITEMS.find(function (x) { return x.id === tid; });
        return { id: tid, title: ti ? ti.name : tid };
      });
      const meta = contentMeta.metaFor(p.nodeId, node.domain || 'junior');
      const disputed = store.getDisputed(p.nodeId);
      return {
        idx: i + 1,
        nodeId: p.nodeId,
        title: p.title || node.n || p.nodeId,
        domain: node.domain || '',
        domainName: node.domainName || '',
        essence: p.essence,
        method: p.method || [],
        example: p.example || null,
        pitfalls: p.pitfalls || [],
        links: p.links || '',
        check: p.check || [],
        topics: topics,
        status: status,
        statusName: STATUS_NAME[status],
        evidence: meta.evidence,
        evidenceLabel: contentMeta.EVIDENCE_LABEL[meta.evidence] || '',
        review: meta.review,
        reviewLabel: disputed ? contentMeta.REVIEW_LABEL.disputed : (contentMeta.REVIEW_LABEL[meta.review] || ''),
        sourceName: meta.source,
        sourceNote: meta.note,
        wordingNote: meta.wordingNote,
        disputed: disputed
      };
    });
    const done = points.filter(function (p) { return p.status === 2; }).length;
    const total = points.length;
    this.setData({
      points: points,
      done: done,
      total: total,
      percent: total ? Math.round(done * 100 / total) : 0
    });
  },

  togglePoint: function (e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ ['openIds.' + id]: !this.data.openIds[id] });
  },

  expandAll: function () {
    const open = {};
    this.data.points.forEach(function (p) { open[p.nodeId] = true; });
    this.setData({ openIds: open });
  },

  collapseAll: function () {
    this.setData({ openIds: {} });
  },

  // 演示模式：优先聚焦第一个未掌握的知识点；导航一次只展开一个，投影时一屏一个点
  toggleDemo: function () {
    if (this.data.demo) {
      this.setData({ demo: false });
      return;
    }
    const points = this.data.points;
    if (!points.length) return;
    let idx = -1;
    for (let i = 0; i < points.length; i++) {
      if (points[i].status !== 2) { idx = i; break; }
    }
    if (idx < 0) idx = 0;
    const open = {};
    open[points[idx].nodeId] = true;
    this.setData({ demo: true, focusIdx: idx, openIds: open });
  },

  demoPrev: function () { this.demoMove(-1); },

  demoNext: function () { this.demoMove(1); },

  demoMove: function (delta) {
    const points = this.data.points;
    if (!points.length) return;
    let idx = this.data.focusIdx + delta;
    if (idx < 0) idx = 0;
    if (idx >= points.length) idx = points.length - 1;
    const open = {};
    open[points[idx].nodeId] = true;
    this.setData({ focusIdx: idx, openIds: open });
  },

  toggleExample: function (e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ ['exampleFold.' + id]: !this.data.exampleFold[id] });
  },

  toggleCheck: function (e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ ['checkFold.' + id]: !this.data.checkFold[id] });
  },

  cycleStatus: function (e) {
    const id = e.currentTarget.dataset.id;
    const cur = store.getStatus(id);
    const next = (cur + 1) % 3;
    store.setStatus(id, next);
    wx.vibrateShort({ type: 'light' });
    const key = this.data.points.findIndex(function (p) { return p.nodeId === id; });
    if (key >= 0) {
      this.setData({
        ['points[' + key + '].status']: next,
        ['points[' + key + '].statusName']: STATUS_NAME[next]
      });
    }
    this.build();
  },

  // 标记内容存疑（RUL-008）：用户发现讲解可疑时标记，记录在本地并提示反馈路径
  toggleDisputed: function (e) {
    const id = e.currentTarget.dataset.id;
    const next = this.data.points.find(function (p) { return p.nodeId === id; }).disputed ? 0 : 1;
    store.setDisputed(id, next);
    const key = this.data.points.findIndex(function (p) { return p.nodeId === id; });
    if (key >= 0) {
      this.setData({
        ['points[' + key + '].disputed']: next,
        ['points[' + key + '].reviewLabel']: next ? '存疑待修' : (contentMeta.REVIEW_LABEL[this.data.points[key].review] || '')
      });
    }
    wx.showToast({ title: next ? '已标记存疑' : '已取消存疑', icon: 'none' });
  },

  // 投屏演示：跳转到全屏幻灯片页，手机当遥控器（M1 系统镜像专用）
  goPresent: function () {
    wx.navigateTo({ url: '/pages/present/present?id=' + this.data.id });
  },

  goNode: function (e) {
    wx.navigateTo({ url: '/pages/node/node?id=' + e.currentTarget.dataset.id });
  },

  goTopic: function (e) {
    const app = getApp();
    app.globalData = app.globalData || {};
    app.globalData.focusTopic = e.currentTarget.dataset.id;
    wx.switchTab({ url: '/pages/locator/locator' });
  },

  markWholeDone: function () {
    const self = this;
    wx.showModal({
      title: '标记专题完成',
      content: '把这 ' + this.data.total + ' 个知识点全部标记为"已掌握"？',
      success: function (res) {
        if (!res.confirm) return;
        self.data.points.forEach(function (p) {
          if (store.getStatus(p.nodeId) !== 2) store.setStatus(p.nodeId, 2);
        });
        self.build();
        wx.showToast({ title: '已全部掌握', icon: 'success' });
      }
    });
  }
});
