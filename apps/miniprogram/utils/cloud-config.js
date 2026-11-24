// 微信云开发配置 —— 环境 ID 不属于凭证（官方文档即写在小程序前端），可入库。
// 环境 ID 来源：微信开发者工具 → 云开发控制台；已用 cloud_env_list 核实有效。
module.exports = {
  // 云开发环境 ID
  env: 'k12-math-knowledge-map-dfac0f85a',

  // 进度集合名（权限须设为「仅创建者可读写」，由微信云开发自动按 _openid 隔离）
  collection: 'progress'
};
