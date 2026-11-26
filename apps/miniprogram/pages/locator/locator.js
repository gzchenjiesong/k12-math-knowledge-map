const knowledge = require('../../data/nodes.js');
const topicIdx = require('../../data/topic_index.js');
const store = require('../../utils/store.js');
const tabbar = require('../../utils/tabbar.js');

const QUICK = ['证明三点共线', '整数解整除', '证明不等式最值', '至少存在染色', '求通项递推', '四点共圆切线'];

Page({
  data: {
    mode: 'index', // index=按题型浏览  search=输入定位
    groups: [],
    openGroups: {},
    expandedIds: {},
    input: '',
    quick: QUICK,
    results: [],
    topicHits: [],
    searched: false
  },

  onLoad: function () {
    this.buildGroups();
  },

  onShow: function () {
    tabbar.setSelected(this, 2);
    // 从知识点详情页跳来时，展开指定题型
    const app = getApp();
    if (app.globalData && app.globalData.focusTopic) {
      const tid = app.globalData.focusTopic;
      app.globalData.focusTopic = null;
      this.setData({ mode: 'index', ['expandedIds.' + tid]: true });
      wx.showToast({ title: '已展开该题型', icon: 'none' });
    }
  },

  buildGroups: function () {
    const byId = {};
    knowledge.ALL_NODES.forEach(function (n) { byId[n.id] = n; });
    const groups = topicIdx.TOPIC_GROUPS.map(function (g) {
      return {
        id: g.theme,
        name: g.name,
        items: g.items.map(function (it) {
          return Object.assign({}, it, {
            nodeNames: it.nodes.map(function (id) { return byId[id]; }).filter(Boolean)
              .map(function (n) { return { id: n.id, n: n.n }; })
          });
        })
      };
    });
    const patch = { groups: groups };
    if (!this._groupTouched && !this.data.openGroups[groups[0].id]) {
      patch['openGroups.' + groups[0].id] = true;
    }
    this.setData(patch);
  },

  switchMode: function (e) {
    this.setData({ mode: e.currentTarget.dataset.mode });
  },

  toggleGroup: function (e) {
    this._groupTouched = true;
    const id = e.currentTarget.dataset.id;
    this.setData({ ['openGroups.' + id]: !this.data.openGroups[id] });
  },

  toggleItem: function (e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ ['expandedIds.' + id]: !this.data.expandedIds[id] });
  },

  onInput: function (e) {
    this.setData({ input: e.detail.value });
  },

  onQuick: function (e) {
    const text = e.currentTarget.dataset.text;
    this.setData({ input: text }, this.locate);
  },

  clear: function () {
    this.setData({ input: '', results: [], topicHits: [], searched: false });
  },

  locate: function () {
    const text = (this.data.input || '').trim();
    if (!text) {
      wx.showToast({ title: '请输入题目特征', icon: 'none' });
      return;
    }
    const self = this;
    const byId = {};
    knowledge.ALL_NODES.forEach(function (n) { byId[n.id] = n; });
    const scores = {};

    // 1) 关键词规则命中
    knowledge.SIGNAL_RULES.forEach(function (rule) {
      rule.k.forEach(function (kw) {
        if (text.indexOf(kw) !== -1) {
          rule.ids.forEach(function (id) {
            scores[id] = (scores[id] || 0) + 10;
          });
        }
      });
    });

    // 2) 直接匹配节点名称、子点、信号
    knowledge.ALL_NODES.forEach(function (n) {
      let hit = 0;
      if (text.indexOf(n.n) !== -1) hit += 6;
      (n.sig || []).forEach(function (s) { if (text.indexOf(s) !== -1) hit += 5; });
      (n.p || []).forEach(function (p) { if (p.length > 1 && text.indexOf(p) !== -1) hit += 2; });
      if (hit > 0) scores[n.id] = (scores[n.id] || 0) + hit;
    });

    const top = Object.keys(scores)
      .filter(function (id) { return scores[id] > 0; })
      .sort(function (a, b) { return scores[b] - scores[a]; })
      .slice(0, 6)
      .map(function (id) {
        const n = byId[id];
        return {
          id: id,
          n: n.n,
          d: n.d,
          domainName: n.domainName,
          score: scores[id],
          ap: (n.ap || []).slice(0, 2),
          status: store.getStatus(id)
        };
      });

    // 3) 匹配题型：把题目特征直接对应到「题型卡」，看到讲解入口
    const topicHits = topicIdx.TOPIC_ITEMS.filter(function (it) {
      if (text.indexOf(it.name) !== -1) return true;
      if (text.indexOf(it.themeName) !== -1) return true;
      return (it.signals || []).some(function (s) { return text.indexOf(s) !== -1; });
    }).slice(0, 4).map(function (it) {
      return Object.assign({}, it, {
        nodeNames: it.nodes.map(function (id) { return byId[id]; }).filter(Boolean)
          .map(function (n) { return { id: n.id, n: n.n }; })
      });
    });

    self.setData({ results: top, topicHits: topicHits, searched: true });
  },

  goNode: function (e) {
    wx.navigateTo({ url: '/pages/node/node?id=' + e.currentTarget.dataset.id });
  }
});
