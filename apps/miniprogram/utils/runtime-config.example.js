// 运行时配置样例 —— 复制为 runtime-config.js 后填真实值。
// runtime-config.js 已被 .gitignore 排除，不会入库。
// 注意：AppID/AppSecret 属于服务端凭证，绝不放在小程序前端；
//       这里只放「服务器地址 + 客户端标识」，敏感凭证只在 deploy/server/config.json。
module.exports = {
  // 进度同步服务的 HTTPS 地址，必须已在小程序后台配置为 request 合法域名。
  // 留空字符串表示关闭云同步，退化为纯离线（内容仍全部可用）。
  syncBaseUrl: '', // 例：'https://olympiad.example.com'

  // 同步开关：false 时完全不发起网络请求（离线 / 预览阶段推荐先关）
  syncEnabled: false,

  // 请求超时（毫秒）
  timeout: 8000
};
