"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhone = normalizePhone;
/** Телефон → «+7 (XXX) XXX-XX-XX» или null, если формат неверный. */
function normalizePhone(raw) {
    let d = raw.replace(/\D+/g, '');
    if (d.length === 11 && (d[0] === '7' || d[0] === '8'))
        d = d.slice(1);
    if (d.length !== 10 || !['9', '3', '4', '8'].includes(d[0]))
        return null;
    return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`;
}
