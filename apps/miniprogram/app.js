var store = require('./utils/store');
var sync = require('./utils/sync');
var config = require('./utils/cloud-config');

App({
  globalData: {
    appName: '数海扶摇'
  },

  onLaunch: function () {
    // 初始化微信云开发（环境 ID 非凭证，见 utils/cloud-config.js）。
    // 初始化失败也不影响小程序离线使用，故静默处理。
    try {
      if (config.env && wx.cloud) {
        wx.cloud.init({ env: config.env, traceUser: true });
      }
    } catch (e) {}

    // 进度同步是可选增强：本地优先，云端不可用自动退化为纯离线。
    if (sync.isEnabled()) {
      store.onChange(function () { sync.schedulePush(); });
      sync.init();
    }
  }
});
