const lectureData = require('../../data/lectures.js');
const knowledge = require('../../data/nodes.js');
const themeData = require('../../data/themes.js');
const topicIndex = require('../../data/topic_index.js');
const contentMeta = require('../../data/content_meta.js');
const store = require('../../utils/store.js');
const statusPicker = require('../../utils/status-picker.js');

const STATUS_NAME = ['未开始', '学习中', '已掌握'];

const readingContext = require('../../utils/reading-context.js');

Page(readingContext.attach('lesson', {
  data: {
    id: '',
    group: {},
    points: [],
    openIds: {},
    exampleFold: {},
    checkFold: {},
    sourceOpenIds: {},
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
    statusPicker.onShow(this);
    if (this.groupId) this.build();
    if (this._stopSyncRefresh) this._stopSyncRefresh();
    this._stopSyncRefresh = store.onChange((state, source) => {
      if (source === 'remote' && this._reading.active && this.groupId) this.build();
    });
  },

  onHide: function () {
    statusPicker.onHide(this);
    this._batchStatus = null;
    if (this._stopSyncRefresh) this._stopSyncRefresh();
  },
  onUnload: function () { this.onHide(); },

  onResize: function (res) {
    const wide = res.size.windowWidth >= 768;
    // 缩回窄屏时自动退出演示模式，避免小屏上被隐藏的知识点不可见
    if (!wide && this.data.demo) this.setData({ wide: false, demo: false });
    else if (wide !== this.data.wide) this.setData({ wide: wide });
  },

  onReadingRestore: function () {
    if (!this.data.wide && this.data.demo) this.setData({ demo: false });
    this.build();
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
        reviewLabel: contentMeta.REVIEW_LABEL[meta.review] || '',
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

  togglePointSource: function (e) {
    const id = e.currentTarget.dataset.id;
    if (!this.data.points.some(function (point) { return point.nodeId === id; })) return;
    this.setData({ ['sourceOpenIds.' + id]: !this.data.sourceOpenIds[id] });
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

  chooseStatus: function (e) {
    const id = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!this.data.points.some(function (p) { return p.nodeId === id; })) return;
    if (this._batchStatus) return;
    statusPicker.choose(this, id, this.build);
  },

  // 标记内容存疑（RUL-008）：用户发现讲解可疑时标记，记录在本地并提示反馈路径
  toggleDisputed: function (e) {
    const id = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    const key = this.data.points.findIndex(function (p) { return p.nodeId === id; });
    if (key < 0) return;
    const next = store.getDisputed(id) ? 0 : 1;
    if (!store.setDisputed(id, next)) {
      wx.showToast({ title: '本地保存失败，请重试', icon: 'none' });
      return;
    }
    this.setData({
      ['points[' + key + '].disputed']: next
    });
    wx.showToast({ title: next ? '已标记存疑' : '已取消存疑', icon: 'none' });
  },

  // 投屏演示：跳转到全屏幻灯片页，手机当遥控器（M1 系统镜像专用）
  goPresent: function () {
    readingContext.navigate(this, '/pages/present/present?id=' + encodeURIComponent(this.data.id));
  },

  goNode: function (e) {
    readingContext.navigate(this, '/pages/node/node?id=' + encodeURIComponent(e.currentTarget.dataset.id));
  },

  goTopic: function (e) {
    readingContext.navigate(this, '/pages/locator/locator', { focus: { topic: e.currentTarget.dataset.id } });
  },

  markWholeDone: function () {
    if (!this._statusPageActive || this._batchStatus || this._statusMenu || !this.data.points.length) return;
    const self = this;
    const token = {};
    this._batchStatus = token;
    const release = function () { if (self._batchStatus === token) self._batchStatus = null; };
    wx.showModal({
      title: '全部标为已掌握？',
      content: '将修改这 ' + this.data.total + ' 个知识点的记录。',
      success: function (res) {
        if (!self._statusPageActive || self._batchStatus !== token) return;
        release();
        if (!res || res.confirm !== true) return;
        const state = store.load();
        self.data.points.forEach(function (p) { state.status[p.nodeId] = 2; });
        // 批量标记只落盘一次，失败不留下部分成功或虚假的成功提示。
        if (!store.save(state)) {
          wx.showToast({ title: '本地保存失败，请重试', icon: 'none' });
          return;
        }
        self.build();
        wx.showToast({ title: '已标记：全部已掌握', icon: 'none' });
      },
      fail: release,
      complete: release
    });
  }
}));
