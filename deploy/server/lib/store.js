// 进度存储：每个用户一个 JSON 文件，仅几 KB。
// 零依赖、易备份、易迁移；用户量大后再换数据库，接口不变。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function makeStore(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });

  // userId 来自服务端签发的令牌，不直接信任客户端传来的任意文件名
  function fileFor(userId) {
    const safe = crypto.createHash('sha256').update(String(userId)).digest('hex');
    return path.join(dataDir, safe + '.json');
  }

  function read(userId) {
    const f = fileFor(userId);
    try {
      const o = JSON.parse(fs.readFileSync(f, 'utf8'));
      return { state: o.state || { status: {}, notes: {}, disputed: {} }, updatedAt: o.updatedAt || 0 };
    } catch (e) {
      return { state: { status: {}, notes: {}, disputed: {} }, updatedAt: 0 };
    }
  }

  function write(userId, state) {
    const f = fileFor(userId);
    const updatedAt = Date.now();
    const payload = JSON.stringify({ userId: userId, state: state, updatedAt: updatedAt });
    // 原子写：先写临时文件再改名，避免中途崩溃损坏进度
    const tmp = f + '.tmp';
    fs.writeFileSync(tmp, payload, 'utf8');
    fs.renameSync(tmp, f);
    return updatedAt;
  }

  return { read, write };
}

module.exports = { makeStore };
