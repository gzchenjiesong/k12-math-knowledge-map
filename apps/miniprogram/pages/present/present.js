const lectureData = require('../../data/lectures.js');
const knowledge = require('../../data/nodes.js');

// 投屏演示页（M1 系统屏幕镜像专用）
// 定位：手机当遥控器，电视显示。全屏深色高对比大字，一屏一个主题。
// 数据：只读 lectures.js（真源下游生成物），按内容块拆成幻灯片，不回写真源。
// 注意：本页以「投屏为主、手机体验次之」，竖屏可用但最佳效果为横屏。

const KIND_LABEL = {
  cover: '专题导入',
  essence: '知识本质',
  method: '方法要点',
  question: '例题 · 先看题',
  answer: '例题 · 解析',
  recap: '易错与自检',
  end: '专题小结'
};

Page({
  data: {
    groupId: '',
    groupTitle: '',
    slides: [],
    cur: 0,
    total: 0,
    slide: {},
    statusBarH: 0,
    safeBottom: 0,
    tocOpen: false,
    toc: [],
    // 每个知识点的首页下标，用于目录跳转
    pointStarts: []
  },

  onLoad: function (options) {
    const id = options.id || '';
    const g = lectureData.LECTURES.find(function (x) { return x.id === id; }) || lectureData.LECTURES[0];
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const built = this.buildSlides(g);
    this.setData({
      groupId: g.id,
      groupTitle: g.title,
      slides: built.slides,
      toc: built.toc,
      pointStarts: built.pointStarts,
      total: built.slides.length,
      cur: 0,
      slide: built.slides[0],
      statusBarH: info.statusBarHeight || 0,
      safeBottom: (info.screenHeight && info.windowHeight)
        ? Math.max(0, info.screenHeight - info.windowHeight) : 0
    });
  },

  // 把一个专题拆成幻灯片序列：封面 + 每点(本质/方法/题目/解析/易错自检) + 结束
  buildSlides: function (g) {
    const slides = [];
    const toc = [];
    const pointStarts = [];
    const points = g.points || [];

    slides.push({
      kind: 'cover',
      eyebrow: '数学阶梯 · 投屏演示',
      title: g.title,
      body: g.lead || '',
      bullets: g.goal ? ['本节目标：' + g.goal] : [],
      sub: g.subtitle || '',
      nodeId: ''
    });

    points.forEach(function (p, i) {
      const node = knowledge.ALL_NODES.find(function (n) { return n.id === p.nodeId; }) || {};
      const label = '第 ' + (i + 1) + ' / ' + points.length + ' 点';
      const title = p.title || node.n || p.nodeId;
      const start = slides.length;
      pointStarts.push(start);
      toc.push({ idx: i, start: start, label: label, title: title, nodeId: p.nodeId });

      if (p.essence) {
        slides.push({ kind: 'essence', eyebrow: label + ' · ' + KIND_LABEL.essence, title: title, body: p.essence, bullets: [], nodeId: p.nodeId });
      }
      if (p.method && p.method.length) {
        slides.push({ kind: 'method', eyebrow: label + ' · ' + KIND_LABEL.method, title: title, body: '', bullets: p.method, nodeId: p.nodeId });
      }
      if (p.example && p.example.q) {
        slides.push({ kind: 'question', eyebrow: label + ' · ' + KIND_LABEL.question, title: title, body: p.example.q, bullets: [], nodeId: p.nodeId });
        if (p.example.a) {
          slides.push({ kind: 'answer', eyebrow: label + ' · ' + KIND_LABEL.answer, title: title, body: p.example.a, bullets: [], nodeId: p.nodeId });
        }
      }
      const recapBullets = [];
      if (p.pitfalls && p.pitfalls.length) {
        p.pitfalls.forEach(function (x) { recapBullets.push('易错：' + x); });
      }
      if (p.check && p.check.length) {
        p.check.forEach(function (x) { recapBullets.push('自检：' + x); });
      }
      if (recapBullets.length) {
        slides.push({ kind: 'recap', eyebrow: label + ' · ' + KIND_LABEL.recap, title: title, body: '', bullets: recapBullets, nodeId: p.nodeId });
      }
    });

    const chainText = typeof g.chain === 'string' ? g.chain : (Array.isArray(g.chain) ? g.chain.join(' → ') : '');
    slides.push({
      kind: 'end',
      eyebrow: '数学阶梯 · 投屏演示',
      title: g.title + ' · 小结',
      body: g.goal || '',
      bullets: chainText ? ['知识链：' + chainText] : [],
      nodeId: ''
    });

    return { slides: slides, toc: toc, pointStarts: pointStarts };
  },

  goTo: function (idx) {
    if (idx < 0 || idx >= this.data.total) return;
    this.setData({ cur: idx, slide: this.data.slides[idx], tocOpen: false });
  },

  next: function () { this.goTo(this.data.cur + 1); },
  prev: function () { this.goTo(this.data.cur - 1); },

  // 触屏左右滑动翻页（手机当遥控器）
  touchStart: function (e) {
    this._tx = e.touches[0].clientX;
    this._ty = e.touches[0].clientY;
  },
  touchEnd: function (e) {
    if (this._tx === undefined) return;
    const dx = e.changedTouches[0].clientX - this._tx;
    const dy = e.changedTouches[0].clientY - this._ty;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) this.next(); else this.prev();
    }
    this._tx = undefined;
    this._ty = undefined;
  },

  noop: function () {},

  toggleToc: function () {
    this.setData({ tocOpen: !this.data.tocOpen });
  },
  jumpToc: function (e) {
    this.goTo(Number(e.currentTarget.dataset.start));
  },

  // 全屏/退出：投屏时点右上角退出回到讲解页
  quit: function () {
    wx.navigateBack({
      fail: function () { wx.switchTab({ url: '/pages/lecture/lecture' }); }
    });
  }
});
