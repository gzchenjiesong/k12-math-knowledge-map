const lectureData = require('../../data/lectures.js');
const knowledge = require('../../data/nodes.js');

// 投屏演示页（M1 系统屏幕镜像专用 / 16:9 PPT 画布）
// 定位：电视显示标准 16:9 幻灯片，手机横屏或 iPad 横屏作为遥控器翻页。
// 关键：画布用固定 1280×720 内部坐标系 + transform scale 等比适配，
//       无论源设备是 16:9（手机横屏）还是 4:3（iPad 横屏），画布始终 16:9 居中，
//       镜像到电视后正好铺满，多余空间留黑边（letterbox）。
// 数据：只读 lectures.js（真源下游生成物），按内容块拆页，不回写真源。
// 分页：例题保持「先思后答」两页（题干页 + 解析页）。

const BASE_W = 1280;
const BASE_H = 720;
const AUTO_HIDE_MS = 3500;

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
    // 16:9 画布（px）与内部坐标系缩放系数
    canvasW: 0,
    canvasH: 0,
    deckScale: 1,
    // 遥控器自动淡出，让电视画面接近纯 PPT
    controlsHidden: false,
    tocOpen: false,
    toc: [],
    // 每个知识点的首页下标，用于目录跳转
    pointStarts: []
  },

  onLoad: function (options) {
    const id = options.id || '';
    const g = lectureData.LECTURES.find(function (x) { return x.id === id; }) || lectureData.LECTURES[0];
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const statusBarH = info.statusBarHeight || 0;
    const safeBottom = (info.screenHeight && info.windowHeight)
      ? Math.max(0, info.screenHeight - info.windowHeight) : 0;

    // 在可用区域内取最大的 16:9 矩形，居中显示
    const availW = info.windowWidth || 375;
    const availH = Math.max(240, (info.windowHeight || 667) - statusBarH);
    const ratio = BASE_W / BASE_H;
    let cw;
    let ch;
    if (availW / availH >= ratio) {
      ch = availH;
      cw = ch * ratio;
    } else {
      cw = availW;
      ch = cw / ratio;
    }
    const deckScale = cw / BASE_W;

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
      statusBarH: statusBarH,
      safeBottom: safeBottom,
      canvasW: Math.round(cw),
      canvasH: Math.round(ch),
      deckScale: deckScale
    }, this._armAutoHide.bind(this));
  },

  onUnload: function () {
    if (this._hideTimer) clearTimeout(this._hideTimer);
  },

  // 翻页后 3.5 秒淡出控制条，触摸任意处唤醒；电视上大部分时间只看到干净 PPT
  _armAutoHide: function () {
    if (this._hideTimer) clearTimeout(this._hideTimer);
    this.setData({ controlsHidden: false });
    const self = this;
    this._hideTimer = setTimeout(function () {
      self.setData({ controlsHidden: true });
    }, AUTO_HIDE_MS);
  },

  wake: function () {
    this._armAutoHide();
  },

  // 把一个专题拆成幻灯片序列：封面 + 每点(本质/方法/题目/解析/易错自检) + 结束
  buildSlides: function (g) {
    const slides = [];
    const toc = [];
    const pointStarts = [];
    const points = g.points || [];

    slides.push({
      kind: 'cover',
      eyebrow: '数海扶摇 · 投屏演示',
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
        slides.push({
          kind: 'essence',
          eyebrow: label + ' · ' + KIND_LABEL.essence,
          title: title,
          body: p.essence,
          bullets: [],
          nodeId: p.nodeId
        });
      }
      if (p.method && p.method.length) {
        slides.push({
          kind: 'method',
          eyebrow: label + ' · ' + KIND_LABEL.method,
          title: title,
          body: '',
          bullets: p.method,
          nodeId: p.nodeId
        });
      }
      if (p.example && p.example.q) {
        slides.push({
          kind: 'question',
          eyebrow: label + ' · ' + KIND_LABEL.question,
          title: title,
          body: p.example.q,
          bullets: [],
          nodeId: p.nodeId
        });
        if (p.example.a) {
          slides.push({
            kind: 'answer',
            eyebrow: label + ' · ' + KIND_LABEL.answer,
            title: title,
            body: p.example.a,
            qtext: p.example.q,
            bullets: [],
            nodeId: p.nodeId
          });
        }
      }
      const pitfalls = (p.pitfalls || []).slice();
      const checks = (p.check || []).slice();
      if (pitfalls.length || checks.length) {
        slides.push({
          kind: 'recap',
          eyebrow: label + ' · ' + KIND_LABEL.recap,
          title: title,
          body: '',
          pitfalls: pitfalls,
          checks: checks,
          bullets: [],
          nodeId: p.nodeId
        });
      }
    });

    const chainText = typeof g.chain === 'string' ? g.chain : (Array.isArray(g.chain) ? g.chain.join(' → ') : '');
    slides.push({
      kind: 'end',
      eyebrow: '数海扶摇 · 投屏演示',
      title: g.title + ' · 小结',
      body: g.goal || '',
      bullets: chainText ? ['知识链：' + chainText] : [],
      nodeId: ''
    });

    return { slides: slides, toc: toc, pointStarts: pointStarts };
  },

  goTo: function (idx) {
    if (idx < 0 || idx >= this.data.total) return;
    this.setData({ cur: idx, slide: this.data.slides[idx], tocOpen: false }, this._armAutoHide.bind(this));
  },

  next: function () { this.goTo(this.data.cur + 1); },
  prev: function () { this.goTo(this.data.cur - 1); },

  // 触屏左右滑动翻页（手机/iPad 当遥控器）；任意触摸唤醒控制条
  touchStart: function (e) {
    this.wake();
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
    this.wake();
    this.setData({ tocOpen: !this.data.tocOpen });
  },
  jumpToc: function (e) {
    this.goTo(Number(e.currentTarget.dataset.start));
  },

  // 全屏/退出：投屏时点退出回到讲解页
  quit: function () {
    if (this._hideTimer) clearTimeout(this._hideTimer);
    wx.navigateBack({
      fail: function () { wx.switchTab({ url: '/pages/lecture/lecture' }); }
    });
  }
});
