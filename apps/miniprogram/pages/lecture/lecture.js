const lectureData = require('../../data/lectures.js');
const knowledge = require('../../data/nodes.js');
const store = require('../../utils/store.js');

Page({
  data: {
    lectures: [],
    stat: {}
  },

  onShow: function () {
    this.build();
  },

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
        lead: g.lead,
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

  goLesson: function (e) {
    wx.navigateTo({ url: '/pages/lesson/lesson?id=' + e.currentTarget.dataset.id });
  }
});
