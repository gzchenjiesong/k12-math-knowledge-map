const knowledge = require('../../data/nodes.js');
const themeData = require('../../data/themes.js');
const cardsData = require('../../data/cards.js');
const bridgeData = require('../../data/bridges.js');
const store = require('../../utils/store.js');
const tabbar = require('../../utils/tabbar.js');

Page({
  data: {
    view: 'source', // source=按来源看进度  theme=按主题看专题
    domains: [],
    themes: [],
    stat: {},
    expandedDomains: {},
    expandedModules: {},
    expandedThemes: {},
    bridgeOpen: false,
    bridgeGroups: [],
    bridgeStats: bridgeData.BRIDGE_STATS
  },

  onLoad: function () {
    this.buildTree();
  },

  onShow: function () {
    tabbar.setSelected(this, 1);
    // 从详情页点主题标签跳回时，自动切到主题视图并展开该主题
    const app = getApp();
    if (app.globalData && app.globalData.focusTheme) {
      const tid = app.globalData.focusTheme;
      app.globalData.focusTheme = null;
      const key = 'expandedThemes.' + tid;
      this.setData({ view: 'theme', [key]: true });
    }
    this.buildTree();
  },

  buildTree: function () {
    const domains = knowledge.DOMAINS.map(function (d) {
      return {
        id: d.id,
        name: d.name,
        sub: d.sub,
        modules: d.modules.map(function (m) {
          return {
            id: m.id,
            name: m.name,
            topics: m.topics.map(function (t) {
              return {
                id: t.id,
                n: t.n,
                d: t.d,
                status: store.getStatus(t.id),
                cardCount: cardsData.cardCount(t.id)
              };
            })
          };
        })
      };
    });

    // 主题视图：保持 ALL_NODES 的原有顺序，主题内自然呈现 初中→高中→奥赛 的深化链
    const themes = themeData.THEMES.map(function (t) {
      let done = 0;
      const topics = knowledge.ALL_NODES.filter(function (n) { return themeData.THEME_OF[n.id] === t.id; })
        .map(function (n) {
          const status = store.getStatus(n.id);
          if (status === 2) done++;
          const links = bridgeData.BRIDGES_BY_NODE[n.id];
          return {
            id: n.id,
            n: n.n,
            d: n.d,
            status: status,
            cardCount: cardsData.cardCount(n.id),
            domainKey: n.domain,
            domainShort: themeData.DOMAIN_SHORT[n.domain] || '',
            bridgeCount: links ? links.out.length + links.in.length : 0
          };
        });
      return {
        id: t.id,
        name: t.name,
        sub: t.sub,
        tone: t.tone,
        topics: topics,
        done: done,
        percent: topics.length ? Math.round(done * 100 / topics.length) : 0
      };
    });

    // 衔接链按 kind 分组，顺序固定：课标 → 竞赛衔接 → 奥赛
    const KIND_ORDER = ['铺垫→课标', '铺垫→竞赛衔接', '铺垫→奥赛'];
    const bridgeGroups = KIND_ORDER.map(function (kind) {
      const rows = bridgeData.BRIDGES.map(function (b, i) {
        return {
          idx: i,
          from: b.from, to: b.to, kind: b.kind,
          fromName: b.fromName, toName: b.toName,
          fromDomain: b.fromDomain, toDomain: b.toDomain,
          fromTheme: b.fromTheme, toTheme: b.toTheme
        };
      }).filter(function (b) { return b.kind === kind; });
      return { kind: kind, count: rows.length, rows: rows };
    }).filter(function (g) { return g.count > 0; });
    const patch = { domains: domains, themes: themes, bridgeGroups: bridgeGroups, stat: store.stats(knowledge.ALL_NODES) };
    // 主题视图首次进入默认展开第一个专题，打开即有内容
    if (!this.data.expandedThemes[themes[0].id] && !this._themeTouched) {
      patch['expandedThemes.' + themes[0].id] = true;
    }
    this.setData(patch);
  },

  switchView: function (e) {
    this.setData({ view: e.currentTarget.dataset.view });
  },

  toggleBridge: function () {
    this.setData({ bridgeOpen: !this.data.bridgeOpen });
  },

  toggleDomain: function (e) {
    const id = e.currentTarget.dataset.id;
    const key = 'expandedDomains.' + id;
    const next = !this.data.expandedDomains[id];
    this.setData({ [key]: next });
  },

  toggleModule: function (e) {
    const id = e.currentTarget.dataset.id;
    const key = 'expandedModules.' + id;
    const next = !this.data.expandedModules[id];
    this.setData({ [key]: next });
  },

  toggleTheme: function (e) {
    this._themeTouched = true;
    const id = e.currentTarget.dataset.id;
    const key = 'expandedThemes.' + id;
    const next = !this.data.expandedThemes[id];
    this.setData({ [key]: next });
  },

  goNode: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/node/node?id=' + id });
  },

  cycleStatus: function (e) {
    const id = e.currentTarget.dataset.id;
    const cur = store.getStatus(id);
    const next = (cur + 1) % 3;
    store.setStatus(id, next);
    wx.vibrateShort && wx.vibrateShort({ type: 'light' });
    this.buildTree();
    const names = ['未开始', '学习中', '已掌握'];
    wx.showToast({ title: '已标记：' + names[next], icon: 'none', duration: 1000 });
  }
});
