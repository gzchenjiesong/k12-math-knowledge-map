#!/usr/bin/env node
/**
 * 学习进度服务 —— 零依赖 Node 原生实现
 *
 * 职责边界：只保存进度（status/notes/disputed），不提供任何授课内容。
 * 内容全部内置在小程序包里，离线可用；本服务仅做跨设备同步。
 *
 * API：
 *   POST /api/login     { code }              -> { userId, token, expiresAt }
 *   GET  /api/progress  (Bearer token)        -> { state, updatedAt }
 *   PUT  /api/progress  { state, updatedAt }  -> { ok, updatedAt }
 *   GET  /api/health                          -> { ok: true }
 *
 * 安全：
 *   - 用户隔离：userId 来自 token，不接受客户端指定，任何人读写不到他人进度。
 *   - token 为 HMAC 签名，密钥只在服务端 config.json。
 *   - 前端不持有 AppSecret。
 *
 * 运行：node server.js   （前置：复制 config.example.json 为 config.json 并填真实值）
 */
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { makeStore } = require('./lib/store');

const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('缺少 config.json：请复制 config.example.json 并填写真实值（该文件不会入库）。');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const store = makeStore(path.resolve(__dirname, config.dataDir || './data'));

function sign(payload) {
  return crypto.createHmac('sha256', config.tokenSecret).update(payload).digest('base64url');
}
function makeToken(userId) {
  const exp = Date.now() + 30 * 24 * 3600 * 1000; // 30 天
  const body = Buffer.from(JSON.stringify({ uid: userId, exp: exp })).toString('base64url');
  return body + '.' + sign(body);
}
function verifyToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const expect = sign(parts[0]);
  // 定长比较，防时序侧信道
  const a = Buffer.from(parts[1]); const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const body = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (!body.uid || !body.exp || Date.now() > body.exp) return null;
    return body.uid;
  } catch (e) { return null; }
}

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store'
  });
  res.end(body);
}
function readBody(req, cb) {
  let buf = '';
  req.on('data', c => {
    buf += c;
    if (buf.length > 256 * 1024) { req.destroy(); }
  });
  req.on('end', () => {
    try { cb(buf ? JSON.parse(buf) : {}); } catch (e) { cb(null); }
  });
}

// code2session：用 AppID + Secret 把临时 code 换成 openid（凭证只在服务端）
function code2session(code, cb) {
  const url = 'https://api.weixin.qq.com/sns/jscode2session?appid=' +
    encodeURIComponent(config.wechat.appid) + '&secret=' + encodeURIComponent(config.wechat.secret) +
    '&js_code=' + encodeURIComponent(code) + '&grant_type=authorization_code';
  httpsGet(url, cb);
}
function httpsGet(url, cb) {
  const https = require('https');
  https.get(url, res => {
    let b = '';
    res.on('data', c => { b += c; });
    res.on('end', () => { try { cb(JSON.parse(b)); } catch (e) { cb(null); } });
  }).on('error', () => cb(null));
}

function sanitizeState(state) {
  // 只接受三个已知字段，拒绝超大或异常结构（进度仅几 KB）
  const out = { status: {}, notes: {}, disputed: {} };
  if (!state || typeof state !== 'object') return out;
  ['status', 'notes', 'disputed'].forEach(k => {
    const src = state[k];
    if (!src || typeof src !== 'object') return;
    Object.keys(src).slice(0, 500).forEach(id => {
      if (typeof id !== 'string' || id.length > 64) return;
      const v = src[id];
      if (k === 'status') { if ([0, 1, 2].indexOf(v) >= 0) out.status[id] = v; }
      else if (typeof v === 'string') out[k][id] = v.slice(0, 2000);
      else if (k === 'disputed' && v === 1) out.disputed[id] = 1;
    });
  });
  return out;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/api/health') {
    return send(res, 200, { ok: true, service: 'progress' });
  }

  if (req.method === 'POST' && pathname === '/api/login') {
    return readBody(req, body => {
      if (!body || !body.code) return send(res, 400, { error: 'missing code' });
      code2session(body.code, data => {
        if (!data || !data.openid) return send(res, 401, { error: 'code2session failed' });
        const userId = data.openid;
        return send(res, 200, {
          userId: userId,
          token: makeToken(userId),
          expiresAt: Date.now() + 30 * 24 * 3600 * 1000
        });
      });
    });
  }

  if (pathname === '/api/progress') {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const userId = verifyToken(token);
    if (!userId) return send(res, 401, { error: 'unauthorized' });

    if (req.method === 'GET') {
      const rec = store.read(userId);
      return send(res, 200, rec);
    }
    if (req.method === 'PUT') {
      return readBody(req, body => {
        if (!body || !body.state) return send(res, 400, { error: 'missing state' });
        const clean = sanitizeState(body.state);
        const updatedAt = store.write(userId, clean);
        return send(res, 200, { ok: true, updatedAt: updatedAt });
      });
    }
  }

  return send(res, 404, { error: 'not found' });
});

const port = Number(config.port || 3001);
const host = config.host || '127.0.0.1';
server.listen(port, host, () => {
  console.log('进度服务已启动 http://' + host + ':' + port);
});
