// 纯协议层：不可变操作 + 字段级寄存器。新协议用 Lamport 时钟，不用设备时间判先后。
// 离线并发的同字段编辑没有客观先后；按 clock/device/seq 确定胜者，而非取状态最大值。
const FIELDS = ['status', 'notes', 'disputed'];
const MAX_CLOCK = 1000000000000;
const MAX_TIME = 8640000000000000;
const MAX_ENTRIES = 1024;
const MAX_TEXT = 16384;
const MAX_PAYLOAD = 200000;
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
function keys(value, allowed) {
  return object(value) && Object.keys(value).every(k => allowed.indexOf(k) !== -1);
}
function integer(value, max) {
  return Number.isSafeInteger(value) && value >= 0 && value <= max;
}
function nodeId(id) {
  return typeof id === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(id) &&
    id !== '__proto__' && id !== 'constructor' && id !== 'prototype';
}
function deviceId(id) { return typeof id === 'string' && /^[a-f0-9]{32}$/.test(id); }
function documentId(id) { return typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id); }
function valueValid(field, value, tombstones) {
  if (tombstones && value === null) return true;
  if (field === 'notes') return typeof value === 'string' && value.length <= MAX_TEXT;
  return Number.isInteger(value) && value >= 0 && value <= (field === 'status' ? 2 : 1);
}
function empty() { return { status: {}, notes: {}, disputed: {} }; }
function values(input, tombstones) {
  if (!keys(input, FIELDS)) throw new Error('无效状态结构');
  const result = empty();
  let count = 0;
  FIELDS.forEach(field => {
    if (!own(input, field)) return;
    const map = input[field];
    if (!object(map)) throw new Error('无效字段映射');
    Object.keys(map).forEach(id => {
      if (++count > MAX_ENTRIES || !nodeId(id) || !valueValid(field, map[id], tombstones)) {
        throw new Error('无效字段值');
      }
      result[field][id] = map[id];
    });
  });
  if (JSON.stringify(result).length > MAX_PAYLOAD) throw new Error('状态过大');
  return result;
}
function hasValues(state) { return FIELDS.some(field => Object.keys(state[field]).length); }
function opId(op) { return 'p2_' + op.device + '_' + op.seq; }
function operation(input) {
  if (!keys(input, ['protocol', 'device', 'seq', 'clock', 'kind', 'fields', '_id', '_openid']) ||
      input.protocol !== 2 || !deviceId(input.device) || !integer(input.seq, MAX_CLOCK) || input.seq < 1 ||
      (input.kind !== 'edit' && input.kind !== 'legacy') ||
      !integer(input.clock, input.kind === 'edit' ? MAX_CLOCK : MAX_TIME) ||
      (input.kind === 'edit' && input.clock < 1) ||
      (own(input, '_id') && input._id !== opId(input)) ||
      (own(input, '_openid') && (typeof input._openid !== 'string' || input._openid.length > 128))) {
    throw new Error('无效同步操作');
  }
  const fields = values(input.fields, true);
  if (!hasValues(fields)) throw new Error('空同步操作');
  return { protocol: 2, device: input.device, seq: input.seq, clock: input.clock, kind: input.kind, fields: fields };
}
function versionValid(v) {
  if (!Array.isArray(v) || v.length !== 4 || (v[0] !== 0 && v[0] !== 1) ||
      !integer(v[1], v[0] ? MAX_CLOCK : MAX_TIME) || !integer(v[3], MAX_CLOCK) ||
      typeof v[2] !== 'string') return false;
  if (v[0] === 1) return v[1] > 0 && v[3] > 0 && /^d:[a-f0-9]{32}$/.test(v[2]);
  return /^(?:[bd]:[a-f0-9]{32}|c:[A-Za-z0-9_-]{1,128})$/.test(v[2]);
}
function registers(input) {
  if (!keys(input, FIELDS)) throw new Error('无效寄存器');
  const result = empty();
  let count = 0;
  FIELDS.forEach(field => {
    if (!object(input[field])) throw new Error('缺少寄存器字段');
    Object.keys(input[field]).forEach(id => {
      const r = input[field][id];
      if (++count > MAX_ENTRIES || !nodeId(id) || !keys(r, ['value', 'v']) ||
          !valueValid(field, r.value, true) || !versionValid(r.v)) throw new Error('无效版本');
      result[field][id] = { value: r.value, v: r.v.slice() };
    });
  });
  return result;
}
function fromValues(state, version) {
  const result = empty();
  FIELDS.forEach(field => Object.keys(state[field]).forEach(id => {
    result[field][id] = { value: state[field][id], v: version.slice() };
  }));
  return result;
}
function fromOperation(input) {
  const op = operation(input);
  // 无 dirty 的旧本地基线在同为 clock=0 时也低于旧云快照（b: < c:）。
  const actor = op.kind === 'legacy' && op.clock === 0 ? 'b:' : 'd:';
  return fromValues(op.fields, [op.kind === 'edit' ? 1 : 0, op.clock, actor + op.device, op.seq]);
}
function fromDocument(doc) {
  if (!object(doc) || !documentId(doc._id)) throw new Error('无效云文档');
  if (own(doc, 'protocol')) return fromOperation(doc);
  if (!keys(doc, ['_id', '_openid', 'status', 'notes', 'disputed', 'updatedAt']) ||
      (own(doc, 'updatedAt') && !integer(doc.updatedAt, MAX_TIME)) ||
      (own(doc, '_openid') && (typeof doc._openid !== 'string' || doc._openid.length > 128)) ||
      !FIELDS.some(field => own(doc, field))) throw new Error('无效旧云文档');
  const state = {};
  FIELDS.forEach(field => { if (own(doc, field)) state[field] = doc[field]; });
  // 旧版只有文档时间，没有字段时间；只能确定性保守迁移，不能重建真实编辑先后。
  return fromValues(values(state, false), [0, doc.updatedAt || 0, 'c:' + doc._id, 0]);
}
function compare(a, b) {
  for (let i = 0; i < 4; i++) {
    if (a.v[i] !== b.v[i]) return a.v[i] > b.v[i] ? 1 : -1;
  }
  // 对相同版本却不同内容也有固定排序；正常客户端同一操作的内容永不改变。
  const av = JSON.stringify(a.value), bv = JSON.stringify(b.value);
  return av === bv ? 0 : (av > bv ? 1 : -1);
}
function merge(left, right) {
  const result = registers(left), incoming = registers(right);
  FIELDS.forEach(field => Object.keys(incoming[field]).forEach(id => {
    if (!own(result[field], id) || compare(incoming[field][id], result[field][id]) > 0) {
      result[field][id] = incoming[field][id];
    }
  }));
  return registers(result);
}
function project(regs) {
  const result = empty();
  FIELDS.forEach(field => Object.keys(regs[field]).forEach(id => {
    if (regs[field][id].value !== null) result[field][id] = regs[field][id].value;
  }));
  return result;
}
function maxClock(regs) {
  let clock = 0;
  FIELDS.forEach(field => Object.keys(regs[field]).forEach(id => {
    const v = regs[field][id].v;
    if (v[0] === 1) clock = Math.max(clock, v[1]);
  }));
  return clock;
}
module.exports = {
  FIELDS, MAX_CLOCK, MAX_TIME, own, keys, integer, nodeId, deviceId, documentId,
  empty, values, hasValues, opId, operation, registers, fromValues, fromOperation,
  fromDocument, merge, project, maxClock
};
