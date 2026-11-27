const knowledge = require('../../data/nodes.js');
const cardsData = require('../../data/cards.js');
const store = require('../../utils/store.js');

const readingContext = require('../../utils/reading-context.js');

Page(readingContext.attach('cards', {
  data: {
    list: [],
    keyword: '',
    filter: 'all',
    totalCardCount: 0,
    resultCount: 0
  },

  onLoad: function () {
    this.buildList();
  },

  onShow: function () {
    this.buildList();
    if (this._stopSyncRefresh) this._stopSyncRefresh();
    this._stopSyncRefresh = store.onChange((state, source) => {
      if (source === 'remote' && this._reading.active) this.buildList();
    });
  },

  onHide: function () { if (this._stopSyncRefresh) this._stopSyncRefresh(); },
  onUnload: function () { if (this._stopSyncRefresh) this._stopSyncRefresh(); },

  onReadingRestore: function () { this.buildList(); },

  buildList: function () {
    const kw = (this.data.keyword || '').trim().toLowerCase();
    const byId = {};
    knowledge.ALL_NODES.forEach(function (n) { byId[n.id] = n; });
    const self = this;
    let list = Object.keys(cardsData.CARDS).map(function (id) {
      const n = byId[id];
      const c = cardsData.CARDS[id];
      return {
        id: id,
        n: n ? n.n : id,
        domainName: n ? n.domainName : '',
        module: n ? n.module : '',
        conceptTitle: c.concept ? c.concept.title : '',
        explainCount: c.explain ? c.explain.length : 0,
        exampleCount: c.examples ? c.examples.length : 0,
        status: store.getStatus(id),
        searchText: ((n ? n.n : '') + ' ' + (c.concept ? c.concept.title + c.concept.body : '') + ' ' + (n ? n.p.join(' ') : '')).toLowerCase()
      };
    });

    const totalCardCount = list.length;
    if (self.data.filter === 'unmastered') {
      list = list.filter(function (x) { return x.status !== 2; });
    }
    if (kw) {
      list = list.filter(function (x) { return x.searchText.indexOf(kw) !== -1; });
    }

    // 按来源排序：小学 → 初中 → 高中 → 奥赛
    const order = { primary: 0, junior: 1, senior: 2, olympiad: 3 };
    list.sort(function (a, b) {
      const da = byId[a.id] ? order[byId[a.id].domain] : 9;
      const db = byId[b.id] ? order[byId[b.id].domain] : 9;
      return da - db;
    });

    self.setData({ list: list, totalCardCount: totalCardCount, resultCount: list.length });
  },

  onSearch: function (e) {
    this.setData({ keyword: e.detail.value }, this.buildList);
  },

  setFilter: function (e) {
    this.setData({ filter: e.currentTarget.dataset.filter }, this.buildList);
  },

  goNode: function (e) {
    readingContext.navigate(this, '/pages/node/node?id=' + encodeURIComponent(e.currentTarget.dataset.id));
  }
}));
