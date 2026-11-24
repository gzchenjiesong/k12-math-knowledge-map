var store = require('./utils/store');
var sync = require('./utils/sync');

App({
  globalData: {
    appName: '奥数知识卡片'
  },

  onLaunch: function () {
    // 进度同步是可选增强：未配置服务器时自动关闭，纯离线可用。
    if (sync.isEnabled()) {
      store.onChange(function () { sync.schedulePush(); });
      sync.init();
    }
  }
});
