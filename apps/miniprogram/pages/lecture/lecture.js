const lectureData = require('../../data/lectures.js');
const knowledge = require('../../data/nodes.js');
const store = require('../../utils/store.js');
const tabbar = require('../../utils/tabbar.js');

const readingContext = require('../../utils/reading-context.js');

Page(readingContext.attach('lecture', {
  data: {
    lectures: [],
    stat: {}
  },

  onShow: function () {
    tabbar.setSelected(this, 0);
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
    const lectures = lectureData.LECTURES.map(function (g, idx) {
      let done = 0;
      let learning = 0;
      g.points.forEach(function (p) {
        const s = store.getStatus(p.nodeId);
        if (s === 2) done++;
        else if (s === 1) learning++;
      });
      return {
        id: g.id,
        title: g.title,
        subtitle: g.subtitle,
        total: g.points.length,
        done: done,
        learning: learning,
        percent: g.points.length ? Math.round(done * 100 / g.points.length) : 0,
        tone: 'tone' + ((idx % 10) + 1)
      };
    });
    this.setData({
      lectures: lectures,
      stat: store.stats(knowledge.ALL_NODES)
    });
  },

  goCards: function () {
    readingContext.navigate(this, '/pages/cards/cards');
  },

  goLesson: function (e) {
    readingContext.navigate(this, '/pages/lesson/lesson?id=' + encodeURIComponent(e.currentTarget.dataset.id));
  }
}));
