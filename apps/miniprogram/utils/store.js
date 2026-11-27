// 唯一业务状态入口；保留原 KEY 与页面接口。业务值、版本和待发送操作一次原子落盘。
const KEY = 'olympiad_cards_state_v1';
const LEGACY_QUEUE_KEY = 'olympiad_sync_queue_v1';
const protocol = require('./sync-state');
const listeners = [];
const snapshots = new WeakMap();

function copy(value) { return JSON.parse(JSON.stringify(value)); }
function business(raw) {
  if (!protocol.keys(raw, ['status', 'notes', 'disputed', '_sync'])) throw new Error('无效本地状态');
  const state = {};
  protocol.FIELDS.forEach(field => { if (protocol.own(raw, field)) state[field] = raw[field]; });
  return protocol.values(state, false);
}
function newDevice() {
  // 仅作持久唯一命名，不是账号、授权凭证或秘密；清除 storage 后视为新安装。
  let id = '';
  for (let i = 0; i < 32; i++) id += Math.floor(Math.random() * 16).toString(16);
  return id;
}
function persist(envelope) {
  wx.setStorageSync(KEY, envelope);
}
function envelopeFor(meta) {
  // 多份合法云文档的并集也可能超限，必须在落盘前验证，避免写出随后无法读取的状态。
  const state = protocol.values(protocol.project(meta.registers), false);
  state._sync = meta;
  return state;
}
function validateMeta(meta) {
  if (!protocol.keys(meta, ['schema', 'device', 'seq', 'clock', 'registers', 'outbox', 'legacy']) ||
      meta.schema !== 2 || !protocol.deviceId(meta.device) ||
      !protocol.integer(meta.seq, protocol.MAX_CLOCK) || !protocol.integer(meta.clock, protocol.MAX_CLOCK) ||
      !Array.isArray(meta.outbox) || meta.outbox.length > 10000) throw new Error('无效本地同步元数据');
  const regs = protocol.registers(meta.registers);
  if (meta.clock < protocol.maxClock(regs)) throw new Error('逻辑时钟回退');
  const seen = {};
  meta.outbox = meta.outbox.map(input => {
    const op = protocol.operation(input);
    if (op.device !== meta.device || op.seq > meta.seq || seen[op.seq] ||
        (op.kind === 'edit' && op.clock > meta.clock)) throw new Error('无效待发送操作');
    seen[op.seq] = true;
    return op;
  });
  if (protocol.own(meta, 'legacy')) {
    if (!protocol.keys(meta.legacy, ['state', 'queue']) || !protocol.integer(meta.legacy.queue, protocol.MAX_TIME)) {
      throw new Error('无效迁移备份');
    }
    meta.legacy = { state: protocol.values(meta.legacy.state, false), queue: meta.legacy.queue };
  }
  meta.registers = regs;
  return meta;
}
function readEnvelope() {
  let raw = wx.getStorageSync(KEY);
  if (raw === '' || raw === undefined || raw === null) raw = protocol.empty();
  const state = business(raw);
  if (protocol.own(raw, '_sync')) {
    // 坏元数据不能被当成新安装，否则会丢待同步操作并复用错误版本。
    const meta = validateMeta(copy(raw._sync));
    const projected = protocol.project(meta.registers);
    protocol.FIELDS.forEach(field => {
      const ids = Object.keys(state[field]);
      if (ids.length !== Object.keys(projected[field]).length ||
          ids.some(id => state[field][id] !== projected[field][id])) throw new Error('业务值与版本不一致');
    });
    return envelopeFor(meta);
  }
  let queue = wx.getStorageSync(LEGACY_QUEUE_KEY);
  if (queue === '' || queue === undefined || queue === null) queue = 0;
  if (!protocol.integer(queue, protocol.MAX_TIME)) throw new Error('无效旧同步队列');
  const device = newDevice();
  const meta = {
    schema: 2, device: device, seq: 0, clock: 0,
    registers: protocol.fromValues(state, [0, 0, 'b:' + device, 0]), outbox: []
  };
  if (protocol.hasValues(state) || queue) meta.legacy = { state: copy(state), queue: queue };
  if (protocol.hasValues(state)) {
    // 即使未启用过同步/没有 dirty 标记，也要把旧本地记录迁移到同账号其他设备。
    // queue=0 的基线低于任何旧云字段；有 dirty 也不能推断实际编辑字段或已消失的删除。
    // 作为低于所有新协议编辑的历史基线保存/发送；原队列和备份不删除，不伪装成新编辑。
    const op = protocol.operation({ protocol: 2, device: device, seq: 1, clock: queue, kind: 'legacy', fields: state });
    meta.seq = 1;
    meta.outbox.push(op);
    meta.registers = protocol.fromOperation(op);
  }
  const envelope = envelopeFor(meta);
  persist(envelope); // 身份与待发送内容持久化失败时，禁止发送或接受新编辑。
  return envelope;
}
function load() {
  let state;
  try { state = business(readEnvelope()); }
  catch (e) {
    // 只读降级，绝不覆盖原数据。所有写入仍会重新检查并返回 false。
    try { state = business(wx.getStorageSync(KEY)); } catch (ignored) { state = protocol.empty(); }
  }
  snapshots.set(state, copy(state));
  return state;
}
function emit(source) {
  listeners.slice().forEach(fn => { try { fn(load(), source); } catch (e) {} });
}
function onChange(fn) {
  if (typeof fn !== 'function') return function () {};
  listeners.push(fn);
  return function () {
    const index = listeners.indexOf(fn);
    if (index !== -1) listeners.splice(index, 1);
  };
}
function editFields(envelope, fields) {
  const meta = envelope._sync;
  if (!protocol.hasValues(fields)) return true;
  if (meta.seq >= protocol.MAX_CLOCK || meta.clock >= protocol.MAX_CLOCK || meta.outbox.length >= 10000) return false;
  const op = protocol.operation({
    protocol: 2, device: meta.device, seq: meta.seq + 1, clock: meta.clock + 1, kind: 'edit', fields: fields
  });
  meta.seq = op.seq;
  meta.clock = op.clock;
  meta.registers = protocol.merge(meta.registers, protocol.fromOperation(op));
  meta.outbox.push(op);
  persist(envelopeFor(meta));
  emit('local');
  return true;
}
function save(state) {
  try {
    const desired = protocol.values(state, false);
    const envelope = readEnvelope();
    // load() 得到的旧快照只提交相对该快照的改动，不覆盖期间刚拉取的其他字段。
    const baseline = snapshots.get(state) || business(envelope);
    const fields = protocol.empty();
    protocol.FIELDS.forEach(field => {
      Object.keys(baseline[field]).concat(Object.keys(desired[field])).forEach(id => {
        const before = protocol.own(baseline[field], id), after = protocol.own(desired[field], id);
        if (before !== after || (after && baseline[field][id] !== desired[field][id])) {
          fields[field][id] = after ? desired[field][id] : null;
        }
      });
    });
    const ok = editFields(envelope, fields);
    if (ok) snapshots.set(state, copy(desired));
    return ok;
  } catch (e) { return false; }
}
function setField(field, id, value) {
  try {
    if (!protocol.nodeId(id)) return false;
    const fields = protocol.empty();
    fields[field][id] = value;
    protocol.values(fields, false);
    // 包括显式默认零值：用户按下保存就有版本，无记录不等于 0/空串。
    return editFields(readEnvelope(), fields);
  } catch (e) { return false; }
}
function getStatus(id) { return protocol.nodeId(id) ? (load().status[id] || 0) : 0; }
function getNote(id) { return protocol.nodeId(id) ? (load().notes[id] || '') : ''; }
function getDisputed(id) { return protocol.nodeId(id) ? (load().disputed[id] || 0) : 0; }
function stats(allNodes) {
  const state = load();
  let done = 0, learning = 0;
  allNodes.forEach(n => {
    if (state.status[n.id] === 2) done++;
    else if (state.status[n.id] === 1) learning++;
  });
  return { total: allNodes.length, done: done, learning: learning, todo: allNodes.length - done - learning,
    percent: allNodes.length ? Math.round(done * 100 / allNodes.length) : 0 };
}
function mergeRemote(regs) {
  try {
    const envelope = readEnvelope(), meta = envelope._sync;
    const merged = protocol.merge(meta.registers, regs);
    if (JSON.stringify(merged) === JSON.stringify(meta.registers)) return true;
    meta.registers = merged;
    meta.clock = Math.max(meta.clock, protocol.maxClock(merged));
    persist(envelopeFor(meta));
    emit('remote'); // 不生成编辑、不改变 outbox、不自动回推。
    return true;
  } catch (e) { return false; }
}
function pending() {
  try { return copy(readEnvelope()._sync.outbox); } catch (e) { return null; }
}
function acknowledge(sent) {
  try {
    const op = protocol.operation(sent);
    const envelope = readEnvelope(), meta = envelope._sync;
    const index = meta.outbox.findIndex(item => protocol.opId(item) === protocol.opId(op));
    if (index === -1) return true;
    if (JSON.stringify(meta.outbox[index]) !== JSON.stringify(op)) return false;
    meta.outbox.splice(index, 1); // 只确认发送快照；后续新编辑即使同字段也不会被清理。
    persist(envelopeFor(meta));
    return true;
  } catch (e) { return false; }
}
module.exports = {
  load, save, onChange, getStatus, getNote, getDisputed, stats, mergeRemote, pending, acknowledge,
  setStatus: (id, value) => setField('status', id, value),
  setNote: (id, text) => setField('notes', id, text),
  setDisputed: (id, value) => setField('disputed', id, value)
};
