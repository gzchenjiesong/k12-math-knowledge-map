Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/lecture/lecture', text: '讲解' },
      { pagePath: '/pages/graph/graph', text: '图谱' },
      { pagePath: '/pages/locator/locator', text: '题型' },
      { pagePath: '/pages/gaps/gaps', text: '查漏' }
    ]
  },
  methods: {
    switchTab: function (e) {
      const { path, index } = e.currentTarget.dataset;
      if (index === this.data.selected) return;
      wx.switchTab({ url: path });
    }
  }
});
