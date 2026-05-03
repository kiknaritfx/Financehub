import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, TrendingUp, TrendingDown, List, Building2,
  FileText, Users, Menu, X, Eye, EyeOff, Upload, Plus, Search,
  FileEdit, FilePlus, Send, Receipt, ClipboardList, Stamp,
  MoreVertical, AlertCircle, Image as ImageIcon, History,
  Check, Settings, LogOut, ChevronDown, Calendar, Wallet,
  Download, Printer, Trash2, Smile, ImagePlus, UploadCloud, Edit2, Power,
  ChevronRight, ArrowUp, ArrowDown, Banknote, Landmark,
  CreditCard, CornerDownRight, FolderTree, Tags, BarChart2,
  Phone, Shield, Lightbulb, CheckSquare, Lock, User, CalendarDays,
  Loader2, RotateCw
} from 'lucide-react';
import { businessAPI, transactionAPI, userAPI, reportAPI, auditAPI, imageAPI, documentAPI, pvAPI, rvAPI } from './api.js';

// ─── SHARED UTILITY: แปลงตัวเลขเป็นตัวอักษรภาษาไทย ───────────────────
const bahtText = (n) => {
  const units = ['','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า'];
  const pos = ['','สิบ','ร้อย','พัน','หมื่น','แสน','ล้าน'];
  const num = Math.round(Number(n) || 0);
  if (num === 0) return 'ศูนย์บาทถ้วน';
  let s = ''; const str = String(num);
  for (let i = 0; i < str.length; i++) {
    const d = parseInt(str[i]); const p = str.length - i - 1;
    if (d === 0) continue;
    if (p === 1 && d === 2) s += 'ยี่';
    else if (p === 1 && d === 1) s += '';
    else s += units[d];
    s += pos[p];
  }
  return s + 'บาทถ้วน';
};

// ─── GENERATE RECEIPT VOUCHER PDF ───────────────────────────────────────
const generateRVPDF = (rv, biz, settings = {}) => {
  const fmt = (n) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
  const gross = Number(rv.amount) || 0;
  const whtRate = Number(rv.wht_rate) || 0;
  const whtAmt = Math.round(gross * whtRate / 100 * 100) / 100;
  const net = gross - whtAmt;
  const bizName = biz?.tax_name || biz?.name || '';
  const bizAddr = biz?.tax_address || '';
  const receiverSig = settings.receiver_sig || '';
  const payerName = settings.payer_name || '';
  const payerSig = settings.payer_sig || '';
  const rvItems = Array.isArray(rv.items) && rv.items.length > 0
    ? rv.items
    : [{ description: rv.description || '', amount: rv.amount || 0 }];
  const idStr = (rv.id_number || '').replace(/\D/g, '').padEnd(13, ' ');
  const idBoxes = idStr.split('').map(c => `<span class="id-box">${c.trim() || '&nbsp;'}</span>`).join('');
  const issueDate = rv.issue_date ? new Date(rv.issue_date).toLocaleDateString('th-TH', {day:'2-digit',month:'2-digit',year:'numeric'}) : '—';

  const html = `<!DOCTYPE html><html lang="th"><head>
<meta charset="UTF-8"/>
<title>${rv.rv_no} - ใบสำคัญรับเงิน</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Sarabun',sans-serif;font-size:13px;color:#1e293b;background:#fff;padding:14mm 18mm;}
.top-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;}
.biz-name{font-size:17px;font-weight:800;color:#0f172a;line-height:1.2;}
.biz-addr{font-size:11.5px;color:#475569;margin-top:3px;max-width:300px;line-height:1.5;}
.doc-badge{text-align:right;}
.doc-title{font-size:22px;font-weight:800;color:#0f172a;letter-spacing:1.5px;}
.doc-sub{font-size:12px;color:#64748b;font-weight:600;margin-top:2px;}
.doc-meta{display:flex;gap:20px;margin-top:6px;justify-content:flex-end;}
.doc-meta-item{font-size:12px;color:#334155;}
.doc-meta-item b{font-weight:700;color:#0f172a;}
.divider{border:none;border-top:2px solid #1e293b;margin:10px 0 14px;}
.receiver-block{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:14px;}
.r-row{display:flex;align-items:baseline;gap:8px;margin-bottom:8px;}
.r-row:last-child{margin-bottom:0;}
.lbl{font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;min-width:130px;}
.val{font-size:13px;color:#0f172a;font-weight:700;flex:1;border-bottom:1px solid #cbd5e1;padding-bottom:2px;line-height:1.6;}
.id-boxes{display:flex;gap:3px;flex-wrap:wrap;}
.id-box{width:22px;height:22px;border:1px solid #94a3b8;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border-radius:3px;background:#fff;}
table.items{width:100%;border-collapse:collapse;margin:0;border:1px solid #cbd5e1;}
table.items thead tr{background:#1e293b;}
table.items thead th{color:#fff;padding:9px 14px;font-size:12px;font-weight:700;text-align:left;border-right:1px solid #cbd5e1;}
table.items thead th:last-child{text-align:right;border-right:none;}
table.items tbody td{padding:8px 14px;font-size:12px;border:1px solid #cbd5e1;background:#fff;}
table.items tbody td.num{text-align:right;font-weight:600;}
tr.sub-row td{background:#f8fafc!important;font-weight:700;}
tr.wht-row td{color:#dc2626;background:#fff5f5!important;}
tr.wht-row td.num{color:#dc2626;}
tr.net-row td{background:#1e293b!important;color:#fff;font-weight:800;font-size:14px;border-color:#334155;}
tr.net-row td.num{color:#f0fdf4;}
.baht-wrap{display:flex;align-items:center;gap:10px;margin:12px 0 10px;padding:9px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;}
.baht-lbl{font-size:12px;font-weight:700;color:#92400e;white-space:nowrap;}
.baht-text{font-size:13px;font-weight:700;color:#78350f;text-align:center;flex:1;}
.ack{margin:8px 0 18px;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:11.5px;color:#166534;line-height:1.7;}
.sig-row{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:20px;padding-top:16px;border-top:2px solid #e2e8f0;}
.sig-box{text-align:center;}
.sig-img{max-height:56px;max-width:130px;margin:0 auto 4px;display:block;}
.sig-space{height:56px;}
.sig-line{border-bottom:1px dashed #94a3b8;margin:0 16px 6px;}
.sig-subname{font-size:11.5px;color:#94a3b8;border-bottom:1px solid #cbd5e1;display:inline-block;min-width:170px;padding-bottom:2px;margin-bottom:4px;}
.sig-label{font-size:12px;font-weight:700;color:#475569;}
@media print{body{padding:0;}@page{margin:14mm;size:A4 portrait;}}
</style></head><body>

<div class="top-header">
  <div>
    <div class="biz-name">${bizName}</div>
    <div class="biz-addr">${bizAddr}</div>
  </div>
  <div class="doc-badge">
    <div class="doc-title">ใบสำคัญรับเงิน</div>
    <div class="doc-sub">RECEIPT VOUCHER</div>
    <div class="doc-meta">
      <div class="doc-meta-item">เลขที่&nbsp;<b>${rv.rv_no}</b></div>
      <div class="doc-meta-item">วันที่&nbsp;<b>${issueDate}</b></div>
    </div>
  </div>
</div>
<hr class="divider"/>

<div class="receiver-block">
  <div class="r-row">
    <span class="lbl">ข้าพเจ้า</span>
    <span class="val">${rv.receiver_name || '—'}</span>
  </div>
  <div class="r-row">
    <span class="lbl">เลขประจำตัวประชาชน</span>
    <div class="id-boxes">${idBoxes}</div>
  </div>
  <div class="r-row">
    <span class="lbl">ที่อยู่ตามบัตรประชาชน</span>
    <span class="val">${rv.receiver_address || '—'}</span>
  </div>
  <div class="r-row">
    <span class="lbl">ได้รับเงินจาก</span>
    <span class="val">${bizName}</span>
  </div>
</div>

<table class="items">
  <thead><tr>
    <th style="width:44px;text-align:center">ลำดับ</th>
    <th>รายการ</th>
    <th style="width:150px">จำนวนเงิน (บาท)</th>
  </tr></thead>
  <tbody>
    ${rvItems.map((it, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${it.description || ''}</td>
      <td class="num">${fmt(Number(it.amount) || 0)}</td>
    </tr>`).join('')}
    ${whtRate > 0 ? `
    <tr class="sub-row">
      <td></td><td style="text-align:right;padding-right:20px">รวมเป็นเงิน</td>
      <td class="num">${fmt(gross)}</td>
    </tr>
    <tr class="wht-row">
      <td></td><td style="text-align:right;padding-right:20px">ภาษีหัก ณ ที่จ่าย ${whtRate}%</td>
      <td class="num">(${fmt(whtAmt)})</td>
    </tr>` : ''}
    <tr class="net-row">
      <td></td>
      <td style="padding-left:16px">รวมเงินสุทธิที่ได้รับ (ตัวเลข)</td>
      <td class="num">฿${fmt(net)}</td>
    </tr>
  </tbody>
</table>

<div class="baht-wrap">
  <span class="baht-lbl">จำนวนเงิน (ตัวอักษร)</span>
  <span class="baht-text">(--- ${bahtText(net)} ---)</span>
</div>

<div class="ack">
  การรับเงินนี้เป็นการรับเงินถูกต้องครบถ้วนตามรายการข้างต้นแล้ว จึงลงลายมือชื่อไว้เป็นหลักฐาน
</div>

<div class="sig-row">
  <div class="sig-box">
    ${receiverSig ? `<img class="sig-img" src="${receiverSig}" alt="sig"/>` : '<div class="sig-space"></div>'}
    <div class="sig-line"></div>
    <div class="sig-subname">&nbsp;</div>
    <div class="sig-label">ผู้รับเงิน</div>
  </div>
  <div class="sig-box">
    ${payerSig ? `<img class="sig-img" src="${payerSig}" alt="sig"/>` : '<div class="sig-space"></div>'}
    <div class="sig-line"></div>
    <div class="sig-subname">${payerName || '&nbsp;'}</div>
    <div class="sig-label">ผู้จ่ายเงิน (${bizName})</div>
  </div>
</div>

</body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.focus(); win.print(); }, 600); }
};

// ─── GENERATE PAYMENT VOUCHER PDF ─────────────────────────────────────
const generatePVPDF = (pv, biz, settings) => {
  const fmt = (n) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(Number(n) || 0);
  // ใช้ global bahtText()
  const approverSig = settings?.approver_sig || '';
  const payerSig   = settings?.payer_sig   || '';

  // normalize field names — รองรับทั้ง field เก่าและใหม่จาก DB
  const pvNorm = {
    ...pv,
    pay_method: pv.pay_method || pv.payment_method || '',
    issue_date: pv.issue_date || pv.created_at?.slice(0, 10) || '',
    doc_ref: pv.doc_ref || pv.txn_id || '',
    note: pv.note || pv.remarks || '',
    branch_no: pv.branch_no || '0',
    wht_rate: Number(pv.wht_rate) || 0,
    net_amount: Number(pv.net_amount) || Number(pv.amount) || 0,
  };
  // ใช้ pvNorm แทน pv
  const pvRef = pvNorm;

  // ── ข้อมูลบริษัท: ใช้ข้อมูลบริษัทและภาษีที่กรอกในตั้งค่า ──
  const bizLines = [];
  // ชื่อนิติบุคคล/จดทะเบียน (tax_name) หรือชื่อร้าน (name)
  const displayName = biz?.tax_name || biz?.name || '';
  if (displayName) bizLines.push(`<div class="biz-name">${displayName}</div>`);
  // ที่อยู่จดทะเบียน (tax_address) หรือที่อยู่ร้าน (address)
  const displayAddr = biz?.tax_address || biz?.address || '';
  if (displayAddr) bizLines.push(`<div class="biz-line">${displayAddr}</div>`);
  // เลขภาษี
  if (biz?.tax_id)  bizLines.push(`<div class="biz-line">เลขประจำตัวผู้เสียภาษี <strong>${biz.tax_id}</strong></div>`);
  // ข้อมูลติดต่อ
  if (biz?.phone)   bizLines.push(`<div class="biz-line">โทร ${biz.phone}</div>`);
  if (biz?.email)   bizLines.push(`<div class="biz-line">${biz.email}</div>`);

  // ── ช่องทางจ่าย row ──
  const payMethodRow = `
    <div class="pay-grid">
      <div class="pay-cell"><span class="pay-lbl">เงินสด</span><span class="pay-check">${pvRef.pay_method==='เงินสด'?'☑':'☐'}</span></div>
      <div class="pay-cell"><span class="pay-lbl">โอน</span><span class="pay-check">${pvRef.pay_method==='โอน'?'☑':'☐'}</span></div>
      <div class="pay-cell"><span class="pay-lbl">เช็คธนาคาร</span><span class="pay-check">${pvRef.pay_method==='เช็คธนาคาร'?'☑':'☐'}</span></div>
      <div class="pay-cell"><span class="pay-lbl">สาขา</span><span class="pay-uline">${pvRef.branch_no||'0'}</span></div>
      <div class="pay-cell"><span class="pay-lbl">เลขที่เช็ค</span><span class="pay-uline">${pvRef.pay_method==='เช็คธนาคาร'?(pvRef.cheque_no||'—'):'—'}</span></div>
    </div>`;

  // ── WHT calculation ──
  const pvWhtRate = pvRef.wht_rate;
  const pvWhtAmt = Math.round(Number(pvRef.amount) * pvWhtRate / 100 * 100) / 100;
  const pvNet = pvRef.net_amount || (Number(pvRef.amount) - pvWhtAmt);

  // ── 8 แถวว่าง ──
  const emptyRows = Array(8).fill('')
    .map(()=>`<tr class="empty-row"><td></td><td></td><td></td><td></td></tr>`).join('');

  // ── WHT row (แสดงเฉพาะถ้ามีการหัก) ──
  const whtRow = pvWhtRate > 0 ? `
    <tr style="background:#fff5f5">
      <td colspan="2"></td>
      <td style="text-align:right;font-weight:700;color:#dc2626;padding:6px 12px;">หัก ณ ที่จ่าย ${pvWhtRate}%</td>
      <td style="text-align:right;font-weight:800;color:#dc2626;padding:6px 12px;">-${fmt(pvWhtAmt)}</td>
    </tr>` : '';

  const netRow = `
    <tr style="background:#1e293b">
      <td colspan="2"></td>
      <td style="text-align:right;font-weight:700;color:#fff;padding:7px 12px;">ยอดสุทธิที่จ่าย</td>
      <td style="text-align:right;font-weight:800;color:#f0fdf4;padding:7px 12px;">${fmt(pvNet)}</td>
    </tr>`;

  const html = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">
<title>${pvRef.pv_no} - ใบสำคัญจ่าย</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Sarabun',sans-serif;font-size:13px;color:#1e293b;background:#fff;padding:16mm 20mm;}
/* ── บริษัท ── */
.biz-block{margin-bottom:4px;}
.biz-name{font-size:16px;font-weight:800;color:#0f172a;}
.biz-sub{font-size:12px;font-weight:600;color:#475569;margin-top:1px;}
.biz-line{font-size:12px;color:#475569;margin-top:2px;}
/* ── header ── */
.doc-header{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start;margin:14px 0 16px;border-top:2px solid #1e293b;border-bottom:1px solid #e2e8f0;padding:12px 0;}
.doc-title{font-size:24px;font-weight:800;color:#1e293b;letter-spacing:2px;}
.doc-sub-en{font-size:13px;color:#64748b;font-weight:600;text-decoration:underline;margin-top:3px;}
.doc-meta{border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;min-width:170px;}
.doc-meta-row{display:flex;border-bottom:1px solid #e2e8f0;}
.doc-meta-row:last-child{border-bottom:none;}
.doc-meta-label{background:#f8fafc;color:#64748b;font-weight:700;font-size:11px;padding:5px 10px;min-width:55px;border-right:1px solid #e2e8f0;}
.doc-meta-val{font-weight:700;font-size:12px;padding:5px 10px;flex:1;}
/* ── จ่ายให้แก่ ── */
.payto-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #e2e8f0;margin-bottom:8px;}
.payto-lbl{font-weight:700;color:#475569;font-size:13px;min-width:80px;flex-shrink:0;}
.payto-val{font-weight:700;font-size:14px;color:#0f172a;flex:1;border-bottom:1px solid #1e293b;padding-bottom:2px;}
/* ── ช่องทางจ่าย ── */
.pay-grid{display:flex;gap:16px;align-items:center;padding:7px 0;border-bottom:1px solid #e2e8f0;margin-bottom:12px;flex-wrap:wrap;}
.pay-cell{display:flex;align-items:center;gap:5px;}
.pay-lbl{font-weight:600;color:#475569;font-size:12px;white-space:nowrap;}
.pay-check{font-size:16px;min-width:20px;}
.pay-uline{border-bottom:1px solid #64748b;min-width:70px;display:inline-block;padding:0 4px;font-weight:600;}
/* ── ตาราง ── */
table.items{width:100%;border-collapse:collapse;margin-bottom:0;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;}
table.items thead tr{background:#1e293b;}
table.items thead th{color:#fff;padding:8px 12px;font-size:12px;font-weight:700;text-align:left;}
table.items thead th:last-child{text-align:right;}
table.items tbody td{padding:7px 12px;font-size:12px;border-bottom:1px solid #f1f5f9;vertical-align:middle;min-height:28px;}
table.items tbody tr.empty-row td{height:24px;border-bottom:1px solid #f1f5f9;}
table.items tbody tr:last-child td{border-bottom:none;}
/* ── sum row ── */
.sum-wrap{display:flex;justify-content:space-between;align-items:stretch;border:1px solid #cbd5e1;border-top:2px solid #1e293b;margin-top:-1px;}
.sum-note{flex:1;padding:8px 12px;font-size:11px;color:#64748b;border-right:1px solid #e2e8f0;}
.sum-total{display:flex;align-items:center;gap:16px;padding:8px 12px;background:#f8fafc;}
.sum-label{font-size:13px;font-weight:700;color:#334155;white-space:nowrap;}
.sum-amount{font-size:16px;font-weight:800;color:#0f172a;min-width:90px;text-align:right;}
/* ── จำนวนเงิน (ตัวอักษร) ── */
.baht-wrap{display:flex;align-items:center;gap:10px;margin:10px 0 20px;padding:9px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;}
.baht-lbl{font-size:12px;font-weight:700;color:#92400e;white-space:nowrap;}
.baht-text{font-size:13px;font-weight:700;color:#78350f;flex:1;text-align:center;}
/* ── ลายเซ็น ── */
.sig-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:24px;padding-top:16px;border-top:2px solid #e2e8f0;}
.sig-box{text-align:center;}
.sig-img{max-height:60px;max-width:140px;margin:0 auto 4px;display:block;}
.sig-line{border-bottom:1px dashed #94a3b8;margin:40px 8px 6px;}
.sig-name{font-size:12px;font-weight:700;color:#334155;}
.sig-label{font-size:11px;color:#94a3b8;margin-top:3px;}
@media print{body{padding:0}@page{margin:15mm;size:A4 portrait;}}
</style></head><body>

<div class="biz-block">${bizLines.join('')}</div>

<div class="doc-header">
  <div>
    <div class="doc-title">ใบสำคัญจ่าย</div>
    <div class="doc-sub-en">PAYMENT VOUCHER</div>
  </div>
  <div class="doc-meta">
    <div class="doc-meta-row"><div class="doc-meta-label">เลขที่</div><div class="doc-meta-val">${pvRef.pv_no}</div></div>
    <div class="doc-meta-row"><div class="doc-meta-label">วันที่</div><div class="doc-meta-val">${pvRef.issue_date||''}</div></div>
  </div>
</div>

<div class="payto-row">
  <span class="payto-lbl">จ่ายให้แก่</span>
  <span class="payto-val">${pvRef.pay_to||''}</span>
</div>

${payMethodRow}

<table class="items">
  <thead><tr>
    <th style="width:105px">วันที่เอกสาร</th>
    <th style="width:165px">เลขที่เอกสาร</th>
    <th>รายการ / Description</th>
    <th style="width:115px;text-align:right">จำนวนเงิน</th>
  </tr></thead>
  <tbody>
    <tr>
      <td>${pvRef.issue_date||''}</td>
      <td>${pvRef.doc_ref||''}</td>
      <td>${pvRef.description||''}</td>
      <td style="text-align:right;font-weight:700">${fmt(pvRef.amount)}</td>
    </tr>
    ${emptyRows}
    <tr style="border-top:2px solid #1e293b;background:#f8fafc">
      <td colspan="2" style="padding:6px 12px;font-size:11px;color:#64748b;">หมายเหตุ: ${pvRef.note||'—'}</td>
      <td style="text-align:right;font-weight:700;padding:6px 12px;">รวมเงิน</td>
      <td style="text-align:right;font-weight:800;padding:6px 12px;">${fmt(pv.amount)}</td>
    </tr>
    ${whtRow}
    ${netRow}
  </tbody>
</table>

<div class="baht-wrap">
  <span class="baht-lbl">ยอดสุทธิ (ตัวอักษร)</span>
  <span class="baht-text">${bahtText(pvNet)}</span>
</div>

<div class="sig-row">
  <div class="sig-box">
    ${approverSig?`<img class="sig-img" src="${approverSig}" alt="sig"/>`:'<div class="sig-line"></div>'}
    <div class="sig-name">${settings?.approver_name||'...............................'}</div>
    <div class="sig-label">ผู้อนุมัติ</div>
  </div>
  <div class="sig-box">
    ${payerSig?`<img class="sig-img" src="${payerSig}" alt="sig"/>`:'<div class="sig-line"></div>'}
    <div class="sig-name">${settings?.payer_name||'...............................'}</div>
    <div class="sig-label">ผู้จ่ายเงิน</div>
  </div>
  <div class="sig-box">
    <div class="sig-line"></div>
    <div class="sig-name">.................................</div>
    <div class="sig-label">ผู้รับเงิน</div>
  </div>
</div>

</body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.focus(); win.print(); }, 600); }
};

// ─── INVITE API ───
const inviteAPI = {
  sendInvite: (id) => fetch(`/api/users/${id}/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d; }),
  verifyToken: (token) => fetch(`/api/invite/${token}`).then(r => r.json()),
  setPassword: (token, password) => fetch('/api/set-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) }).then(r => r.json()),
};

// ─── MOCK FALLBACK (ใช้ตอน dev ก่อนที่ DB จะพร้อม) ───
const MOCK_BUSINESSES = [
  { id: 1, name: 'กาแฟ A', type: 'Cafe', income: 150000, expense: 80000, profit: 70000, growth: 12.5, petty_cash: 15000, petty_cash_max: 20000, status: 'Active', logo_type: 'emoji', icon: '☕' },
  { id: 2, name: 'อาหาร B', type: 'Restaurant', income: 320000, expense: 210000, profit: 110000, growth: -5.2, petty_cash: 5000, petty_cash_max: 30000, status: 'Active', logo_type: 'emoji', icon: '🍱' },
  { id: 3, name: 'เบเกอรี่ C', type: 'Bakery', income: 95000, expense: 45000, profit: 50000, growth: 8.4, petty_cash: 8000, petty_cash_max: 10000, status: 'Active', logo_type: 'emoji', icon: '🥐' },
];
const MOCK_TRANSACTIONS = [
  { id: 1, txn_id: 'TRX-001', created_at: '2026-02-20T09:30:00', type: 'Income', category: 'หน้าร้าน', amount: 4500, created_by_name: 'สมชาย', is_edited: false, business_name: 'กาแฟ A' },
  { id: 2, txn_id: 'TRX-002', created_at: '2026-02-20T10:15:00', type: 'Expense', category: 'วัตถุดิบ', amount: 1200, created_by_name: 'สมหญิง', is_edited: true, business_name: 'อาหาร B' },
  { id: 3, txn_id: 'TRX-003', created_at: '2026-02-19T14:00:00', type: 'Expense', category: 'ค่าไฟ', amount: 3500, created_by_name: 'แอดมิน', is_edited: false, business_name: 'เบเกอรี่ C' },
];

const STANDARD_CATEGORIES = {
  income: ['รายได้จากการขาย (Sales)', 'รายได้จากการบริการ (Services)', 'รายได้ดอกเบี้ย (Interest)', 'รายได้อื่นๆ (Other Income)'],
  expense: ['ต้นทุนขาย/วัตถุดิบ (COGS)', 'เงินเดือนและสวัสดิการพนักงาน', 'ค่าเช่าสถานที่', 'ค่าสาธารณูปโภค (น้ำ/ไฟ/เน็ต)', 'ค่าวัสดุสิ้นเปลือง', 'ค่าโฆษณาและส่งเสริมการขาย', 'ค่าซ่อมบำรุง']
};
const EMOJIS = ['☕', '🍜', '🥐', '🍕', '🍔', '🍰', '🍱', '🍛', '🏪', '🏬', '🛒', '📦', '💼', '🏢', '🏭', '🏦', '💇', '💅', '🏥', '🔧', '🎨', '📚'];

// ── Timezone helper: คืน datetime string แบบ +07:00 (ไทย) ──
const nowTH = () => {
  // ใช้ local datetime ของเครื่องตรงๆ เพื่อให้เวลาตรงกับที่ผู้ใช้เห็น
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};
const todayTH = () => nowTH().split('T')[0];

const FEATURE_LIST = [
  { id: 'Dashboard',    label: 'ภาพรวม',        menuIcon: 'LayoutDashboard' },
  { id: 'Income',       label: 'รับเงิน',         menuIcon: 'TrendingUp' },
  { id: 'Expense',      label: 'จ่ายเงิน',        menuIcon: 'TrendingDown' },
  { id: 'Transactions', label: 'รายการธุรกรรม',   menuIcon: 'List' },
  { id: 'Vouchers',       label: 'ใบสำคัญจ่าย',    menuIcon: 'FileEdit' },
  { id: 'ReceiptVouchers', label: 'ใบสำคัญรับเงิน', menuIcon: 'Receipt' },
  { id: 'Documents',    label: 'เอกสาร',          menuIcon: 'FilePlus' },
  { id: 'Reports',      label: 'รายงาน P&L',      menuIcon: 'FileText' },
  { id: 'Businesses',   label: 'จัดการธุรกิจ',    menuIcon: 'Building2' },
  { id: 'Users',        label: 'จัดการสิทธิ์',    menuIcon: 'Users' },
];

// ─── SHARED COMPONENTS ───
const Tooltip = ({ label, children }) => (
  <div className="relative group/tip inline-flex">
    {children}
    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
      opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150">
      <div className="bg-slate-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
        {label}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
      </div>
    </div>
  </div>
);

const Badge = ({ children, type = 'default', className = '', onClick }) => {
  const colors = { income: 'bg-emerald-100 text-emerald-700', expense: 'bg-rose-100 text-rose-700', primary: 'bg-blue-100 text-blue-700', warning: 'bg-amber-100 text-amber-700', audit: 'bg-purple-100 text-purple-700', manager: 'bg-purple-100 text-purple-700', staff: 'bg-blue-100 text-blue-700', owner: 'bg-amber-100 text-amber-800', default: 'bg-slate-100 text-slate-700' };
  return <span onClick={onClick} className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${colors[type]} ${className} ${onClick ? 'cursor-pointer' : ''}`}>{children}</span>;
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 shrink-0">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-500"><X size={20} /></button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const Drawer = ({ isOpen, onClose, title, children, description }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-xl h-full shadow-2xl relative z-10 flex flex-col">
        <div className="flex justify-between items-start p-6 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
            {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-500"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">{children}</div>
      </div>
    </div>
  );
};

const Spinner = () => <Loader2 size={20} className="animate-spin text-blue-500" />;

// BizIcon: แสดง icon ธุรกิจ รองรับทั้ง emoji และ base64 image
const BizIcon = ({ biz, size = 'md' }) => {
  const sz = size === 'sm' ? 'w-6 h-6 text-base' : size === 'lg' ? 'w-12 h-12 text-2xl' : 'w-8 h-8 text-xl';
  if (biz?.logo_type === 'image' && biz?.icon && biz.icon.startsWith('data:')) {
    return <img src={biz.icon} alt={biz.name} className={`${sz} rounded-lg object-cover shrink-0`} />;
  }
  return <span className={`${sz} flex items-center justify-center shrink-0`}>{biz?.icon || '🏪'}</span>;
};



const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white font-bold text-sm ${type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
      {type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
      {message}
    </div>
  );
};

// ─── LOGIN PAGE ───
// ─── SET PASSWORD PAGE (พนักงานตั้งรหัสผ่านจากลิงค์) ───
const SetPasswordPage = ({ token }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    inviteAPI.verifyToken(token)
      .then(data => { if (data.valid) setUserInfo(data); else setError(data.error || 'ลิงค์ไม่ถูกต้อง'); })
      .catch(() => setError('ไม่สามารถตรวจสอบลิงค์ได้'))
      .finally(() => setVerifying(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setError('รหัสผ่านไม่ตรงกัน');
    if (password.length < 6) return setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    setLoading(true); setError('');
    try {
      const res = await inviteAPI.setPassword(token, password);
      if (res.success) setSuccess(true);
      else setError(res.error || 'เกิดข้อผิดพลาด');
    } catch { setError('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง'); }
    finally { setLoading(false); }
  };

  if (verifying) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <Loader2 size={40} className="text-white animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800">ตั้งรหัสผ่าน</h1>
          <p className="text-slate-500 text-sm mt-1">P'KEEP</p>
        </div>

        {error && !userInfo && (
          <div className="text-center">
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl mb-6 flex items-center gap-2 justify-center">
              <AlertCircle size={18} />{error}
            </div>
            <a href="/" className="text-blue-600 font-bold text-sm hover:underline">กลับหน้าเข้าสู่ระบบ</a>
          </div>
        )}

        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">ตั้งรหัสผ่านสำเร็จ!</h3>
            <p className="text-slate-500 text-sm mb-6">คุณสามารถเข้าสู่ระบบได้แล้ว</p>
            <a href="/" className="block w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-center hover:bg-blue-700">
              เข้าสู่ระบบ →
            </a>
          </div>
        ) : userInfo && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500">ยินดีต้อนรับ</p>
              <p className="font-black text-slate-800">{userInfo.name}</p>
              <p className="text-sm text-slate-500">{userInfo.email}</p>
            </div>
            {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">รหัสผ่าน</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none pr-12" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3.5 text-slate-400">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">ยืนยันรหัสผ่าน</label>
              <input type={show ? 'text' : 'password'} required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="พิมพ์รหัสผ่านอีกครั้ง" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Lock size={20} />}
              {loading ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่าน'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const LoginPage = ({ onLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onLogin(data.user);
      } else {
        // Fallback สำหรับ demo
        if (email === 'admin@pkeep.com' && password === 'admin1234') {
          onLogin({ name: "Admin P'KEEP", role: 'เจ้าของธุรกิจ', email });
        } else {
          setError(data.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        }
      }
    } catch {
      // ถ้า API ไม่ตอบ ใช้ fallback
      if (email === 'admin@pkeep.com' && password === 'admin1234') {
        onLogin({ name: "Admin P'KEEP", role: 'เจ้าของธุรกิจ', email });
      } else {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4">
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center mx-auto mb-5">
            <Wallet size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">P'KEEP</h1>
          <p className="text-zinc-500 mt-1 text-sm">จัดการการเงินหลายสาขาอย่างมืออาชีพ</p>
        </div>
        {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-medium flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">ชื่อผู้ใช้ (Username)</label>
            <input type="text" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-zinc-800 bg-white text-sm" placeholder="กรอก Username" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">รหัสผ่าน</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-zinc-800 bg-white text-sm pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
            {loading ? <><Spinner /> กำลังเข้าสู่ระบบ...</> : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── DASHBOARD ───
const Dashboard = ({ setCurrentView, businesses = [] }) => {
  const [bizData, setBizData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('เดือนนี้');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedBiz, setSelectedBiz] = useState(null);
  const [pettyCashModal, setPettyCashModal] = useState(null); // biz object
  const [pcMax, setPcMax] = useState('');
  const [pcCurrent, setPcCurrent] = useState('');
  const [pcSaving, setPcSaving] = useState(false);
  const fmt = (n) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

  const openPettyCash = (biz, e) => {
    e.stopPropagation();
    setPcMax(String(biz.petty_cash_max || 0));
    setPcCurrent(String(biz.petty_cash || 0));
    setPettyCashModal(biz);
  };

  const savePettyCash = async () => {
    const max = Number(pcMax);
    const current = Number(pcCurrent);
    if (isNaN(max) || max < 0) return alert('วงเงินสูงสุดต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0');
    if (isNaN(current) || current < 0) return alert('ยอดคงเหลือต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0');
    if (current > max) return alert('ยอดคงเหลือต้องไม่เกินวงเงินสูงสุด');
    setPcSaving(true);
    try {
      await businessAPI.update(pettyCashModal.id, {
        ...pettyCashModal,
        petty_cash_max: max,
        petty_cash: current,
      });
      setBizData(prev => prev.map(b => b.id === pettyCashModal.id
        ? { ...b, petty_cash_max: max, petty_cash: current } : b));
      setPettyCashModal(null);
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
    finally { setPcSaving(false); }
  };

  const getDateRange = (p) => {
    const now = new Date(new Date().getTime() + 7*60*60*1000);
    if (p === 'วันนี้') {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
      return { start: s, end: s };
    }
    if (p === 'สัปดาห์นี้') {
      const day = now.getDay();
      const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      return { start: mon.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
    }
    if (p === 'เดือนที่แล้ว') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: first.toISOString().split('T')[0], end: last.toISOString().split('T')[0] };
    }
    if (p === 'กำหนดเอง') {
      return { start: customStart || now.toISOString().split('T')[0], end: customEnd || now.toISOString().split('T')[0] };
    }
    // เดือนนี้
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    };
  };

  const loadData = async (p, bizList) => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(p);
      // ใช้ businesses prop ที่โหลดไว้แล้ว — ไม่ต้อง fetch ซ้ำ
      const activeBiz = (Array.isArray(bizList) && bizList.length > 0 ? bizList : [])
        .filter(b => b.status === 'Active');

      if (activeBiz.length === 0) { setBizData([]); setLoading(false); return; }

      // โหลด P&L ทุกสาขาพร้อมกัน (parallel)
      const results = await Promise.all(activeBiz.map(async (biz) => {
        try {
          const pl = await reportAPI.getPL({ business_id: biz.id, start, end });
          // คง petty_cash จาก biz เสมอ ไม่ว่าจะมีข้อมูล P&L หรือไม่
          return { ...biz, income: Number(pl.income)||0, expense: Number(pl.expense)||0, profit: Number(pl.profit)||0,
            petty_cash: biz.petty_cash, petty_cash_max: biz.petty_cash_max };
        } catch {
          return { ...biz, income: 0, expense: 0, profit: 0,
            petty_cash: biz.petty_cash, petty_cash_max: biz.petty_cash_max };
        }
      }));

      // แสดงทุก biz เสมอ (ไม่ซ่อนถ้าไม่มีข้อมูลเดือนนี้)
      setBizData(results);
    } catch {
      setBizData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(period, businesses); }, [period, customStart, customEnd, businesses]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Spinner />
      <p className="text-sm text-zinc-400">กำลังโหลดข้อมูล...</p>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Petty Cash Edit Modal ── */}
      {pettyCashModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPettyCashModal(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                <Wallet size={22} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">แก้ไขเงินสดย่อย</h3>
                <p className="text-slate-500 text-sm">{pettyCashModal.name}</p>
              </div>
              <button onClick={() => setPettyCashModal(null)} className="ml-auto p-2 rounded-full hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              {/* วงเงินสูงสุด */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  💰 วงเงินสูงสุด
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-amber-600">฿</span>
                  <input type="number" min="0" step="0.01" value={pcMax} onChange={e => setPcMax(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-amber-200 focus:ring-2 focus:ring-amber-400 outline-none text-lg font-bold bg-amber-50" />
                </div>
                <p className="text-xs text-slate-400 mt-1">วงเงินสดย่อยสูงสุดที่สามารถเก็บได้</p>
              </div>

              {/* ยอดคงเหลือ */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  💵 ยอดคงเหลือปัจจุบัน
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-emerald-600">฿</span>
                  <input type="number" min="0" step="0.01" value={pcCurrent} onChange={e => setPcCurrent(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-400 outline-none text-lg font-bold bg-emerald-50" />
                </div>
                <p className="text-xs text-slate-400 mt-1">จำนวนเงินสดย่อยที่มีอยู่ตอนนี้</p>
              </div>

              {/* Preview bar */}
              {Number(pcMax) > 0 && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>ยอดคงเหลือ</span>
                    <span className="font-bold">{Math.min(100, Math.round((Number(pcCurrent) / Number(pcMax)) * 100))}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className={`h-full rounded-full transition-all ${(Number(pcCurrent) / Number(pcMax)) < 0.3 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, (Number(pcCurrent) / Number(pcMax)) * 100)}%` }} />
                  </div>
                </div>
              )}

              {Number(pcCurrent) > Number(pcMax) && Number(pcMax) > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700 font-medium">
                  ⚠️ ยอดคงเหลือเกินวงเงินสูงสุด
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setPettyCashModal(null)}
                className="flex-1 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50">
                ยกเลิก
              </button>
              <button onClick={savePettyCash} disabled={pcSaving}
                className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {pcSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">ภาพรวมธุรกิจ</h2>
          <p className="text-zinc-500 text-sm mt-0.5">สรุปข้อมูลการเงินทุกสาขา</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex bg-white rounded-lg p-1 border border-zinc-200 flex-wrap gap-0.5">
            {['วันนี้', 'สัปดาห์นี้', 'เดือนนี้', 'เดือนที่แล้ว', 'กำหนดเอง'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors font-medium ${period === p ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>{p}</button>
            ))}
          </div>
          {period === 'กำหนดเอง' && (
            <div className="flex items-center gap-2 bg-white rounded-lg border border-zinc-200 px-3 py-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="text-xs border-0 outline-none text-zinc-700" />
              <span className="text-zinc-400 text-xs">—</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="text-xs border-0 outline-none text-zinc-700" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bizData.map((biz) => (
          <div key={biz.id} className="bg-white rounded-xl border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center border border-zinc-200 shrink-0 text-xl overflow-hidden">
                {biz.logo_type === 'image' && biz.icon ? <img src={biz.icon} className="w-full h-full object-cover rounded-lg" alt={biz.name} /> : (biz.icon || '🏪')}
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 text-sm">{biz.name}</h3>
                <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md mt-0.5 inline-block">{biz.type}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <p className="text-[11px] text-zinc-500 mb-1">รายรับ</p>
                <p className="font-semibold text-emerald-600 text-sm">{fmt(biz.income)}</p>
              </div>
              <div className="bg-rose-50 p-3 rounded-lg border border-rose-100">
                <p className="text-[11px] text-zinc-500 mb-1">รายจ่าย</p>
                <p className="font-semibold text-rose-600 text-sm">{fmt(biz.expense)}</p>
              </div>
            </div>
            <div className="mb-4 flex justify-between items-end">
              <div>
                <p className="text-[11px] text-zinc-500 mb-1">กำไรสุทธิ</p>
                <p className="text-xl font-bold text-zinc-900">{fmt(biz.profit)}</p>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${(biz.growth || 0) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {(biz.growth || 0) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Number(Math.abs(biz.growth || 0)).toFixed(2)}%
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-zinc-100">
              <div className="flex justify-between items-center text-xs text-zinc-600 mb-1.5">
                <span className="font-medium text-zinc-700">เงินสดย่อย</span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">{fmt(biz.petty_cash)} / {fmt(biz.petty_cash_max)}</span>
                  <button onClick={(e) => openPettyCash(biz, e)}
                    className="w-5 h-5 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded transition-colors">
                    <Edit2 size={10} />
                  </button>
                </div>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-1.5 mb-4">
                <div className={`h-full rounded-full ${(biz.petty_cash / biz.petty_cash_max) < 0.3 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (biz.petty_cash / biz.petty_cash_max) * 100)}%` }}></div>
              </div>
              <button onClick={() => setSelectedBiz(biz)} className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-700 bg-zinc-50 hover:bg-zinc-900 hover:text-white border border-zinc-200 px-4 py-2.5 rounded-lg transition-all">
                ดูรายละเอียด <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>


      {selectedBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-zinc-200">
            <div className="bg-zinc-900 p-5 relative shrink-0">
              <button onClick={() => setSelectedBiz(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800"><X size={18} /></button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700"><BizIcon biz={selectedBiz} size="lg" /></div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{selectedBiz.name}</h2>
                  <p className="text-zinc-400 text-xs">{selectedBiz.type}</p>
                </div>
              </div>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
                  <p className="text-emerald-700 text-[11px] mb-1">รายรับ</p>
                  <p className="font-semibold text-emerald-600 text-xs">{fmt(selectedBiz.income)}</p>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-center">
                  <p className="text-rose-700 text-[11px] mb-1">รายจ่าย</p>
                  <p className="font-semibold text-rose-600 text-xs">{fmt(selectedBiz.expense)}</p>
                </div>
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-center">
                  <p className="text-zinc-600 text-[11px] mb-1">กำไร</p>
                  <p className="font-semibold text-zinc-900 text-xs">{fmt(selectedBiz.profit)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setCurrentView('income'); setSelectedBiz(null); }} className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg p-3.5 flex flex-col items-center gap-1.5 transition-colors">
                  <span className="text-xl">💰</span><span className="text-zinc-700 font-medium text-xs">บันทึกรายรับ</span>
                </button>
                <button onClick={() => { setCurrentView('expense'); setSelectedBiz(null); }} className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg p-3.5 flex flex-col items-center gap-1.5 transition-colors">
                  <span className="text-xl">💸</span><span className="text-zinc-700 font-medium text-xs">บันทึกรายจ่าย</span>
                </button>
                <button onClick={() => { setCurrentView('transactions'); setSelectedBiz(null); }} className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg p-3.5 flex flex-col items-center gap-1.5 transition-colors">
                  <span className="text-xl">📋</span><span className="text-zinc-700 font-medium text-xs">ดูรายการ</span>
                </button>
                <button onClick={() => { setCurrentView('reports'); setSelectedBiz(null); }} className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg p-3.5 flex flex-col items-center gap-1.5 transition-colors">
                  <span className="text-xl">📊</span><span className="text-zinc-700 font-medium text-xs">รายงาน</span>
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-zinc-100">
              <button onClick={() => setSelectedBiz(null)} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── INCOME ENTRY ───
const IncomeEntry = ({ businesses, onSuccess }) => {
  const [selectedBizId, setSelectedBizId] = useState('');
  const [date, setDate] = useState(todayTH());
  const [category, setCategory] = useState('');
  const [cash, setCash] = useState('');
  const [transfer, setTransfer] = useState('');
  const [card, setCard] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const total = (Number(cash) || 0) + (Number(transfer) || 0) + (Number(card) || 0);
  const fmt = (n) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const selectedBiz = businesses.find(b => String(b.id) === String(selectedBizId));
  const incomeCats = (Array.isArray(selectedBiz?.income_categories) && selectedBiz.income_categories.length > 0)
    ? selectedBiz.income_categories
    : STANDARD_CATEGORIES.income;

  // reset category เมื่อเปลี่ยน biz
  const handleSelectBiz = (id) => {
    setSelectedBizId(id);
    const biz = businesses.find(b => String(b.id) === String(id));
    const cats = (Array.isArray(biz?.income_categories) && biz.income_categories.length > 0)
      ? biz.income_categories : STANDARD_CATEGORIES.income;
    setCategory(cats[0] || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBizId) return alert('กรุณาเลือกสาขาก่อน');
    if (total === 0) return alert('กรุณากรอกจำนวนเงิน');
    setLoading(true);
    try {
      await transactionAPI.create({
        business_id: selectedBizId, type: 'Income', category, amount: total,
        date, payment_cash: cash || 0, payment_transfer: transfer || 0,
        payment_card: card || 0, note
      });
      onSuccess('บันทึกรายรับสำเร็จ ✅');
      setCash(''); setTransfer(''); setCard(''); setNote('');
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">บันทึกรายรับ (Income)</h2>
        <p className="text-slate-500 text-sm mt-1">บันทึกรายรับให้กับธุรกิจของคุณ</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">1. เลือกร้านค้า</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {businesses.filter(b=>b.status==='Active').map(biz => (
              <div key={biz.id} onClick={() => handleSelectBiz(biz.id)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedBizId == biz.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BizIcon biz={biz} size="sm" />
                    <span className="font-bold text-slate-700">{biz.name}</span>
                  </div>
                  {selectedBizId == biz.id && <Check size={18} className="text-emerald-600" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
          <h3 className="font-semibold text-slate-800">2. รายละเอียดรายรับ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">วันที่</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-base" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">หมวดหมู่</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none">
                {incomeCats.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-500" /> แยกตามช่องทาง</h4>
            {[['เงินสด', cash, setCash], ['เงินโอน', transfer, setTransfer], ['บัตรเครดิต', card, setCard]].map(([label, val, setter]) => (
              <div key={label} className="flex items-center gap-4">
                <label className="w-24 text-sm font-medium text-slate-600">{label}</label>
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">฿</span>
                  <input type="number" min="0" step="0.01" value={val} onChange={e => setter(e.target.value)} className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-base" placeholder="0.00" />
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-800">ยอดรวม</span>
              <span className="text-2xl font-black text-emerald-600">฿ {fmt(total)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">หมายเหตุ</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" rows="2" placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="submit" disabled={loading || total === 0} className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-lg flex items-center gap-2">
              {loading ? <><Spinner /> กำลังบันทึก...</> : 'บันทึกรายรับ'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// ─── EXPENSE ENTRY ───
const ExpenseEntry = ({ businesses, user, onSuccess }) => {
  const [selectedBizId, setSelectedBizId] = useState('');
  const [datepart, setDatepart] = useState(() => nowTH().slice(0, 10));
  const [timepart, setTimepart] = useState(() => nowTH().slice(11, 16));
  const datetime = `${datepart}T${timepart}`;
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('petty_cash'); // 'petty_cash' | 'transfer'
  const [receiptType, setReceiptType] = useState('cash_bill'); // 'cash_bill' | 'tax_short' | 'tax_full'
  const [images, setImages] = useState([]); // { name, data, type, preview }
  const [loading, setLoading] = useState(false);
  const [department, setDepartment] = useState('');

  const selectedBiz = businesses.find(b => String(b.id) === String(selectedBizId));
  const expenseCats = (Array.isArray(selectedBiz?.expense_categories) && selectedBiz.expense_categories.length > 0)
    ? selectedBiz.expense_categories
    : STANDARD_CATEGORIES.expense;

  // reset category เมื่อเปลี่ยน biz
  const handleSelectBiz = (id) => {
    setSelectedBizId(id);
    const biz = businesses.find(b => String(b.id) === String(id));
    const cats = (Array.isArray(biz?.expense_categories) && biz.expense_categories.length > 0)
      ? biz.expense_categories : STANDARD_CATEGORIES.expense;
    setCategory(cats[0] || '');
  };

  const fmt = (n) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

  const handleImagePick = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (images.length >= 5) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result;
        setImages(prev => [...prev, {
          name: file.name,
          data: base64,
          type: file.type,
          preview: base64
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBizId) return alert('กรุณาเลือกสาขาก่อน');
    if (!amount || Number(amount) <= 0) return alert('กรุณากรอกจำนวนเงิน');
    setLoading(true);
    try {
      await transactionAPI.create({
        business_id: selectedBizId, type: 'Expense', category,
        department: department || null,
        amount: Number(amount), date: datetime,
        petty_cash: paymentMethod === 'petty_cash',
        note: note + (receiptType !== 'cash_bill' ? ` [${receiptType === 'tax_short' ? 'ใบกำกับภาษีอย่างย่อ' : 'ใบกำกับภาษีฉบับเต็ม'}]` : ''),
        images: images.map(img => ({ name: img.name, data: img.data, type: img.type })),
        created_by_name: user?.name || 'Admin'
      });
      onSuccess('บันทึกรายจ่ายสำเร็จ ✅');
      setAmount(''); setNote(''); setSelectedBizId(''); setDepartment('');
      setImages([]);
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">บันทึกรายจ่าย (Expense)</h2>
        <p className="text-slate-500 text-sm mt-1">บันทึกรายจ่ายและเบิกเงินสดย่อย</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* เลือกสาขา */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">เลือกสาขา</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {businesses.filter(b => b.status === 'Active').map(biz => (
              <div key={biz.id} onClick={() => handleSelectBiz(biz.id)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedBizId == biz.id ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:border-rose-300'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><BizIcon biz={biz} size="sm" /><span className="font-bold text-slate-700">{biz.name}</span></div>
                  {selectedBizId == biz.id && <Check size={18} className="text-rose-600" />}
                </div>
              </div>
            ))}
          </div>

          {/* Petty Cash Status */}
          {selectedBiz && (
            <div className="mt-4 bg-slate-900 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 text-sm text-slate-300 mb-2">
                <Wallet size={14} /> สถานะเงินสดย่อย {selectedBiz.name}
              </div>
              <div className="flex items-end gap-2 mb-2">
                <span className={`text-3xl font-black ${(selectedBiz.petty_cash / selectedBiz.petty_cash_max) < 0.3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ฿ {fmt(selectedBiz.petty_cash)}
                </span>
                <span className="text-slate-400 text-sm mb-1">/ {fmt(selectedBiz.petty_cash_max)}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                <div className={`h-2 rounded-full transition-all ${(selectedBiz.petty_cash / selectedBiz.petty_cash_max) < 0.3 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (selectedBiz.petty_cash / selectedBiz.petty_cash_max) * 100)}%` }} />
              </div>
              {(selectedBiz.petty_cash / selectedBiz.petty_cash_max) < 0.3 && (
                <p className="text-amber-400 text-xs font-bold">⚠️ ยอดเงินสดย่อยต่ำกว่า 30% กรุณาเบิกเพิ่ม</p>
              )}
            </div>
          )}
        </div>

        {/* รายละเอียด */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">วันที่/เวลา</label>
              <div className="flex gap-2">
                <input type="date" value={datepart} onChange={e => setDatepart(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none text-sm" />
                <input type="time" value={timepart} onChange={e => setTimepart(e.target.value)}
                  className="w-28 px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none text-sm text-center" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">หมวดหมู่รายจ่าย</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none appearance-none">
                {expenseCats.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อค่าใช้จ่าย</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none" rows="2"
              placeholder="เช่น ชื่อวัตถุดิบด่วน เนื่องจากของขาด..." />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">จำนวนเงิน</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
              <input type="number" required min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none text-rose-600 text-xl font-black" placeholder="0.00" />
            </div>
          </div>

          {/* แผนก */}
          {selectedBiz && Array.isArray(selectedBiz.departments) && selectedBiz.departments.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">แผนก <span className="text-slate-400 font-normal">(ระบุแผนกที่รับผิดชอบค่าใช้จ่ายนี้)</span></label>
              <div className="flex flex-wrap gap-2">
                {selectedBiz.departments.map(d => (
                  <button key={d} type="button" onClick={() => setDepartment(prev => prev === d ? '' : d)}
                    className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${department === d ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-600 hover:border-rose-300'}`}>
                    {department === d && <span className="mr-1">✓</span>}{d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ช่องทางการจ่ายเงิน */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">ช่องทางการจ่ายเงิน</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setPaymentMethod('petty_cash')}
                className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 transition-all text-left ${paymentMethod === 'petty_cash' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white hover:border-amber-300'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">💵</span>
                  <span className={`font-bold text-sm ${paymentMethod === 'petty_cash' ? 'text-amber-800' : 'text-slate-700'}`}>เงินสดย่อย</span>
                  {paymentMethod === 'petty_cash' && <Check size={15} className="text-amber-600 ml-auto" />}
                </div>
                <p className={`text-xs leading-tight ${paymentMethod === 'petty_cash' ? 'text-amber-700' : 'text-slate-400'}`}>หักจากวงเงินสดย่อยของสาขา</p>
              </button>
              <button type="button" onClick={() => setPaymentMethod('transfer')}
                className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 transition-all text-left ${paymentMethod === 'transfer' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏦</span>
                  <span className={`font-bold text-sm ${paymentMethod === 'transfer' ? 'text-blue-800' : 'text-slate-700'}`}>โอนเงิน/อื่นๆ</span>
                  {paymentMethod === 'transfer' && <Check size={15} className="text-blue-600 ml-auto" />}
                </div>
                <p className={`text-xs leading-tight ${paymentMethod === 'transfer' ? 'text-blue-700' : 'text-slate-400'}`}>ไม่หักจากเงินสดย่อย</p>
              </button>
            </div>
            {paymentMethod === 'petty_cash' && selectedBiz && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-700">
                <Wallet size={13} />
                <span>คงเหลือ: <strong>฿{fmt(selectedBiz.petty_cash)}</strong> / {fmt(selectedBiz.petty_cash_max)}</span>
                {(selectedBiz.petty_cash / selectedBiz.petty_cash_max) < 0.3 && <span className="text-rose-600 font-bold">⚠️ ต่ำกว่า 30%</span>}
              </div>
            )}
          </div>

          {/* ประเภทใบเสร็จที่ได้รับ */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">ใบเสร็จที่ได้รับ</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash_bill', label: 'บิลเงินสด', icon: '🧾', desc: 'ใบเสร็จทั่วไป' },
                { id: 'tax_short', label: 'ใบกำกับภาษีอย่างย่อ', icon: '📋', desc: 'ย่อ / ม้วน' },
                { id: 'tax_full', label: 'ใบกำกับภาษีเต็มรูป', icon: '📄', desc: 'ฉบับเต็ม' },
              ].map(rt => (
                <button key={rt.id} type="button" onClick={() => setReceiptType(rt.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${receiptType === rt.id ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}>
                  <span className="text-xl">{rt.icon}</span>
                  <span className="text-xs font-bold leading-tight text-center">{rt.label}</span>
                  <span className={`text-xs leading-tight ${receiptType === rt.id ? 'text-slate-300' : 'text-slate-400'}`}>{rt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* แนบรูปภาพหลักฐาน */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">
              📎 แนบรูปภาพหลักฐาน <span className="text-slate-400 font-normal">(ใบเสร็จ / ใบกำกับภาษี) สูงสุด 5 รูป</span>
            </label>

            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square">
                    <img src={img.preview} alt={img.name} className="w-full h-full object-cover rounded-xl border border-slate-200" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-xl transition-all flex items-center justify-center">
                      <button type="button" onClick={() => removeImage(idx)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 bg-rose-600 text-white rounded-full flex items-center justify-center transition-opacity">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full">{idx + 1}</div>
                  </div>
                ))}
                {images.length < 5 && (
                  <label className="aspect-square border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-rose-400 hover:bg-rose-50 transition-all">
                    <Plus size={20} className="text-slate-400" />
                    <span className="text-xs text-slate-400 mt-1">เพิ่มรูป</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImagePick} />
                  </label>
                )}
              </div>
            )}

            {images.length === 0 && (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-rose-400 hover:bg-rose-50 transition-all">
                <UploadCloud size={28} className="text-slate-400 mb-1" />
                <span className="text-sm font-medium text-slate-500">คลิกเพื่ออัพโหลดรูปภาพ</span>
                <span className="text-xs text-slate-400">JPG, PNG, HEIC ขนาดสูงสุด 5MB ต่อรูป</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImagePick} />
              </label>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button type="submit" disabled={loading} className="px-8 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-50 shadow-lg flex items-center gap-2">
              {loading ? <><Spinner /> กำลังบันทึก...</> : <>บันทึกรายจ่าย {images.length > 0 && `(${images.length} รูป)`}</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};


// ─── PAYMENT VOUCHER FORM ───────────────────────────────────────────
const PaymentVoucherForm = ({ tx, businesses, user, onClose, onSaved }) => {
  const biz = businesses.find(b => String(b.id) === String(tx.business_id));
  const fmt = (n) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(Number(n) || 0);
  const bahtText = (n) => {
    const units = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const pos = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
    const num = Math.round(Number(n) || 0);
    if (num === 0) return 'ศูนย์บาทถ้วน';
    let s = ''; let str = String(num);
    for (let i = 0; i < str.length; i++) {
      const d = parseInt(str[i]); const p = str.length - i - 1;
      if (d === 0) continue;
      if (p === 1 && d === 2) s += 'ยี่';
      else if (p === 1 && d === 1) s += '';
      else s += units[d];
      s += pos[p];
    }
    return s + 'บาทถ้วน';
  };

  const txDate = (tx.date || tx.created_at || '').slice(0, 10);
  const [pvNoPreview, setPvNoPreview] = useState('กำลังโหลด...');

  useEffect(() => {
    pvAPI.getSettings().then(s => {
      const prefix = (s && s.prefix) || 'PV';
      const now = new Date();
      const yy = String(now.getFullYear() + 543).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const running = ((s && s.running) || 0) + 1;
      setPvNoPreview(`${prefix}-${yy}${mm}-${String(running).padStart(3, '0')} (ระบบจะออกให้อัตโนมัติ)`);
    }).catch(() => setPvNoPreview('ระบบจะออกให้อัตโนมัติ'));
  }, []);
  const [payTo, setPayTo] = useState('');
  const [docRef, setDocRef] = useState('');
  const [description, setDescription] = useState(tx.category || '');
  const [amount] = useState(tx.amount || 0);
  const [whtRate, setWhtRate] = useState(0);
  const [payMethod, setPayMethod] = useState('โอน');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [branchNo, setBranchNo] = useState('0');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const whtAmt = Math.round(amount * Number(whtRate) / 100 * 100) / 100;
  const netAmount = amount - whtAmt;

  const handleSave = async () => {
    if (!payTo.trim()) return alert('กรุณาระบุชื่อร้านค้า/ผู้รับเงิน');
    setSaving(true);
    try {
      // ไม่ส่ง pv_no — server จะ generate และ increment running เอง
      const pv = await pvAPI.create({
        tx_id: tx.id,
        txn_id: tx.txn_id,
        business_id: tx.business_id,
        business_name: biz?.name || tx.business_name,
        pay_to: payTo,
        doc_ref: docRef,
        description,
        amount,
        wht_rate: Number(whtRate),
        net_amount: netAmount,
        pay_method: payMethod,
        cheque_no: chequeNo,
        cheque_date: chequeDate,
        branch_no: branchNo,
        note,
        issue_date: txDate,
        created_by: user?.name || 'Admin',
      });
      onSaved('บันทึกใบสำคัญจ่ายสำเร็จ ✅');
      const freshSettings = await pvAPI.getSettings().catch(() => ({}));
      // merge ข้อมูลที่ส่งไปกับที่ได้กลับ — ป้องกันกรณี DB ยังไม่มี column
      const pvForPdf = {
        issue_date: txDate,
        doc_ref: docRef,
        pay_method: payMethod,
        cheque_no: chequeNo,
        cheque_date: chequeDate,
        branch_no: branchNo,
        note,
        wht_rate: Number(whtRate),
        net_amount: netAmount,
        ...pv,
      };
      generatePVPDF(pvForPdf, biz, freshSettings);
    } catch(e) { alert('เกิดข้อผิดพลาด: ' + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-amber-50 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-black text-amber-900">ออกใบสำคัญจ่าย</h2>
            <p className="text-xs text-amber-700 mt-0.5">Payment Voucher — อ้างอิงธุรกรรม: {tx.txn_id}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-amber-100 text-amber-700"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* เลขที่ + วันที่ */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">เลขที่ใบสำคัญจ่าย</div>
              <div className="font-black text-slate-800 font-mono text-sm">{pvNoPreview}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">วันที่</div>
              <div className="font-semibold text-slate-700">{txDate}</div>
            </div>
          </div>

          {/* จ่ายให้แก่ */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">จ่ายให้แก่ (ชื่อร้านค้า/ผู้รับเงิน) <span className="text-rose-500">*</span></label>
            <input value={payTo} onChange={e => setPayTo(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
              placeholder="เช่น Google Play, ร้านวัตถุดิบ ABC..." />
          </div>

          {/* ช่องทางจ่าย */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">ช่องทางการจ่าย</label>
            <div className="flex gap-2 flex-wrap">
              {['โอน','เงินสด','เช็คธนาคาร'].map(m => (
                <button key={m} type="button" onClick={() => setPayMethod(m)}
                  className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${payMethod === m ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-600 hover:border-amber-300'}`}>
                  {m}
                </button>
              ))}
            </div>
            {payMethod === 'เช็คธนาคาร' && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">เลขที่เช็ค</label>
                  <input value={chequeNo} onChange={e => setChequeNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-amber-400" placeholder="เลขที่เช็ค" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">เช็คลงวันที่</label>
                  <input type="date" value={chequeDate} onChange={e => setChequeDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-amber-400" />
                </div>
              </div>
            )}
          </div>

          {/* ตารางรายการ */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">รายละเอียดในตาราง</label>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="px-3 py-2 text-left text-xs font-semibold w-28">วันที่เอกสาร</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">เลขที่เอกสาร</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">รายการ / Description</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold w-28">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="px-3 py-2 text-slate-600">{txDate}</td>
                    <td className="px-2 py-1">
                      <input value={docRef} onChange={e => setDocRef(e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 outline-none text-xs focus:ring-1 focus:ring-amber-400"
                        placeholder="เลขที่เอกสาร..." />
                    </td>
                    <td className="px-2 py-1">
                      <input value={description} onChange={e => setDescription(e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 outline-none text-xs focus:ring-1 focus:ring-amber-400"
                        placeholder="รายการ..." />
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-800">{fmt(amount)}</td>
                  </tr>
                  {[...Array(4)].map((_, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-300 text-xs">—</td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-300 bg-slate-50">
                    <td colSpan={2} className="px-3 py-2 text-xs font-bold text-slate-500">หมายเหตุ:</td>
                    <td className="px-3 py-2 text-sm font-bold text-right text-slate-600">รวมเงิน</td>
                    <td className="px-3 py-2 text-right font-black text-slate-800">{fmt(amount)}</td>
                  </tr>
                  {Number(whtRate) > 0 && (
                    <tr className="bg-rose-50">
                      <td colSpan={2}></td>
                      <td className="px-3 py-2 text-sm font-bold text-right text-rose-600">หัก ณ ที่จ่าย {whtRate}%</td>
                      <td className="px-3 py-2 text-right font-black text-rose-600">-{fmt(whtAmt)}</td>
                    </tr>
                  )}
                  <tr className="bg-slate-800">
                    <td colSpan={2}></td>
                    <td className="px-3 py-2 text-sm font-bold text-right text-white">ยอดสุทธิที่จ่าย</td>
                    <td className="px-3 py-2 text-right font-black text-white">{fmt(netAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* หัก ณ ที่จ่าย */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">หัก ณ ที่จ่าย (WHT)</label>
            <select value={whtRate} onChange={e => setWhtRate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-400 outline-none text-sm">
              <option value={0}>ไม่หักภาษี</option>
              <option value={1}>1% (ค่าเช่า)</option>
              <option value={1.5}>1.5% (ค่าขนส่ง)</option>
              <option value={3}>3% (ค่าบริการ/รับจ้าง)</option>
              <option value={5}>5% (ค่านายหน้า)</option>
              <option value={10}>10% (ค่าวิชาชีพ)</option>
              <option value={15}>15% (รางวัล/โบนัส)</option>
            </select>
          </div>

          {/* ยอดเงิน (ตัวอักษร) */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800">
            <span className="font-semibold">ยอดสุทธิ: </span>
            <span className="font-black">{bahtText(netAmount)}</span>
          </div>

          {/* หมายเหตุ */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">หมายเหตุเพิ่มเติม</label>
            <input value={note} onChange={e => setNote(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
              placeholder="หมายเหตุ (ถ้ามี)" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-sm hover:bg-slate-50">ยกเลิก</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-2 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 disabled:opacity-50 shadow-md">
            {saving ? <><Loader2 size={15} className="animate-spin" /> กำลังบันทึก...</> : <><Check size={15} /> บันทึก & พิมพ์</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── SHARED CATEGORY DEFAULTS ───
const DEFAULT_INCOME_CATS = [
  'ยอดขายสินค้า (Sales)', 'รายได้จากการบริการ (Services)',
  'รายได้ค่าเช่า (Rental Income)', 'ดอกเบี้ยรับ (Interest Income)',
  'รายได้อื่นๆ (Other Income)',
];
const DEFAULT_EXPENSE_CATS = [
  'ต้นทุนขาย/วัตถุดิบ (COGS)', 'เงินเดือนและค่าจ้าง (Salary)',
  'ค่าเช่าสถานที่ (Rent)', 'ค่าสาธารณูปโภค (Utilities)',
  'ค่าวัสดุสิ้นเปลือง (Supplies)', 'ค่าโฆษณาและการตลาด (Marketing)',
  'ค่าซ่อมบำรุง (Maintenance)', 'ค่าขนส่ง (Transportation)',
  'ค่าประกันภัย (Insurance)', 'ค่าเสื่อมราคา (Depreciation)',
];

// ─── TRANSACTIONS ───
const Transactions = ({ businesses, user }) => {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBiz, setFilterBiz] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterCustomStart, setFilterCustomStart] = useState('');
  const [filterCustomEnd, setFilterCustomEnd] = useState('');
  const [pvModal, setPvModal] = useState(null); // transaction to make PV from
  const [deleteModal, setDeleteModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editCategory, setEditCategory] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editType, setEditType] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editPayment, setEditPayment] = useState('petty_cash');
  const [editDepartment, setEditDepartment] = useState('');
  const [saving, setSaving] = useState(false);
  // Image viewer
  const [imageModal, setImageModal] = useState(null); // transaction object
  const [images, setImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  // Audit log per transaction
  const [auditModal, setAuditModal] = useState(null); // transaction object
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const fmt = (n) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
  const activeBiz = businesses.filter(b => b.status === 'Active');

  const load = useCallback(() => {
    setLoading(true);
    transactionAPI.getAll()
      .then(data => setTxns(Array.isArray(data) ? data : []))
      .catch(() => setTxns([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openImages = async (tx) => {
    setImageModal(tx);
    setActiveImgIdx(0);
    setImagesLoading(true);
    try {
      const data = await imageAPI.getAll(tx.id);
      setImages(Array.isArray(data) ? data : []);
    } catch { setImages([]); }
    finally { setImagesLoading(false); }
  };

  const openAudit = async (tx) => {
    setAuditModal(tx);
    setAuditLoading(true);
    try {
      const data = await auditAPI.getByTransaction(tx.id);
      setAuditLogs(Array.isArray(data) ? data : []);
    } catch { setAuditLogs([]); }
    finally { setAuditLoading(false); }
  };

  const handleDelete = async (id) => {
    try {
      await transactionAPI.delete(id);
      setTxns(prev => prev.filter(t => t.id !== id));
      setDeleteModal(null);
    } catch (err) { alert('ลบไม่สำเร็จ: ' + err.message); }
  };

  const openEdit = (tx) => {
    setEditModal(tx);
    setEditCategory(tx.category || '');
    setEditAmount(String(tx.amount || ''));
    setEditNote(tx.note || '');
    setEditType(tx.type || 'Expense');
    const d = tx.date ? new Date(tx.date) : new Date();
    const pad = n => String(n).padStart(2,'0');
    setEditDate(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);
    setEditTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setEditPayment(tx.petty_cash ? 'petty_cash' : 'transfer');
    setEditDepartment(tx.department || '');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await transactionAPI.update(editModal.id, {
        category: editCategory, amount: Number(editAmount), note: editNote,
        type: editType, date: `${editDate}T${editTime}`,
        petty_cash: editPayment === 'petty_cash',
        department: editDepartment || null,
        user_name: user?.name || 'Admin'
      });
      setTxns(prev => prev.map(t => t.id === editModal.id
        ? { ...t, category: editCategory, amount: Number(editAmount), note: editNote,
            type: editType, date: `${editDate}T${editTime}`,
            petty_cash: editPayment === 'petty_cash',
            department: editDepartment || null, is_edited: true } : t));
      setEditModal(null);
    } catch (err) { alert('แก้ไขไม่สำเร็จ: ' + err.message); }
    finally { setSaving(false); }
  };

  const downloadImage = (img) => {
    const a = document.createElement('a');
    a.href = img.file_data;
    a.download = img.file_name || 'receipt.jpg';
    a.click();
  };

  const [issuedPvTxIds, setIssuedPvTxIds] = useState(new Set());

  useEffect(() => {
    pvAPI.getAll().then(list => {
      setIssuedPvTxIds(new Set(Array.isArray(list) ? list.map(p => String(p.tx_id)) : []));
    }).catch(() => {});
  }, []);

  const getTxnDateRange = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (filterPeriod === 'วันนี้') return { start: today, end: today };
    if (filterPeriod === 'สัปดาห์นี้') {
      const day = now.getDay();
      const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      return { start: mon.toISOString().split('T')[0], end: today };
    }
    if (filterPeriod === 'เดือนนี้') {
      return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], end: today };
    }
    if (filterPeriod === 'กำหนดเอง') return { start: filterCustomStart, end: filterCustomEnd };
    return null;
  };

  const filtered = txns.filter(t => {
    const s = search.toLowerCase();
    const matchSearch = !s || (t.category || '').toLowerCase().includes(s) || (t.created_by_name || '').includes(s) || (t.txn_id || '').toLowerCase().includes(s);
    const matchBiz = !filterBiz || String(t.business_id) === filterBiz;
    const matchType = !filterType || t.type === filterType;
    const dateRange = getTxnDateRange();
    let matchDate = true;
    if (dateRange && (dateRange.start || dateRange.end)) {
      const txDate = (t.date || t.created_at || '').slice(0, 10);
      if (dateRange.start && txDate < dateRange.start) matchDate = false;
      if (dateRange.end && txDate > dateRange.end) matchDate = false;
    }
    return matchSearch && matchBiz && matchType && matchDate;
  // เรียงจากวันที่-เวลาที่เลือกตอนลงข้อมูล ล่าสุดก่อน
  }).sort((a, b) => {
    const da = (a.date || a.created_at || '');
    const db = (b.date || b.created_at || '');
    return db.localeCompare(da);
  });

  const auditIcon = (a) => a === 'EDIT' ? '✏️' : a === 'DELETE' ? '🗑' : '➕';
  const auditColor = (a) => a === 'EDIT' ? 'bg-blue-100 text-blue-700' : a === 'DELETE' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">รายการธุรกรรม (Transactions)</h2>
          <p className="text-slate-500 text-sm mt-1">ประวัติการรับ-จ่ายทั้งหมด</p>
        </div>
        <button onClick={load} className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center gap-2">
          <RotateCw size={16} /> โหลดใหม่
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3">
        {/* แถบช่วงเวลา */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {['', 'วันนี้', 'สัปดาห์นี้', 'เดือนนี้', 'กำหนดเอง'].map(p => (
            <button key={p} onClick={() => setFilterPeriod(p)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${filterPeriod === p ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'}`}>
              {p || 'ทั้งหมด'}
            </button>
          ))}
        </div>
        {filterPeriod === 'กำหนดเอง' && (
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-3 py-2">
            <CalendarDays size={15} className="text-slate-400 flex-shrink-0" />
            <input type="date" value={filterCustomStart} onChange={e => setFilterCustomStart(e.target.value)}
              className="bg-transparent outline-none text-sm text-slate-700 font-medium flex-1" />
            <span className="text-slate-400 font-bold">—</span>
            <input type="date" value={filterCustomEnd} onChange={e => setFilterCustomEnd(e.target.value)}
              className="bg-transparent outline-none text-sm text-slate-700 font-medium flex-1" />
          </div>
        )}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="ค้นหาหมวดหมู่, ผู้บันทึก, เลขที่..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-base bg-slate-50" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={filterBiz} onChange={e => setFilterBiz(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50">
            <option value="">ทุกสาขา</option>
            {activeBiz.map(b => <option key={b.id} value={b.id}>ร้าน{b.name}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50">
            <option value="">ทุกประเภท</option>
            <option value="Income">รายรับ</option>
            <option value="Expense">รายจ่าย</option>
          </select>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner /></div> : (
        <>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <List size={48} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium">ไม่พบข้อมูล</p>
            </div>
          ) : (
            <>
              {/* ── Desktop Table ── */}
              <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">วันที่/เวลา</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">เลขที่</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">สาขา</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">ประเภท / หมวดหมู่</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">ผู้บันทึก</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">จำนวนเงิน</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(tx => {
                      const pvIssued = issuedPvTxIds.has(String(tx.id));
                      return (
                        <tr key={tx.id} className="hover:bg-blue-50/30 transition-colors group">
                          {/* วันที่ */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-medium text-slate-800">{(tx.date || tx.created_at || '').split('T')[0]}</div>
                            <div className="text-xs text-slate-400">{(tx.date || tx.created_at || '').split('T')[1]?.slice(0,5)}</div>
                          </td>
                          {/* เลขที่ */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-mono text-xs text-slate-500">{tx.txn_id || '—'}</span>
                            {tx.is_edited && <span className="ml-1.5 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-md font-bold">✏️</span>}
                          </td>
                          {/* สาขา */}
                          <td className="px-4 py-3">
                            <span className="text-slate-700 font-medium">{tx.business_name || '—'}</span>
                          </td>
                          {/* ประเภท + หมวดหมู่ */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge type={tx.type === 'Income' ? 'income' : 'expense'}>{tx.type === 'Income' ? 'รายรับ' : 'รายจ่าย'}</Badge>
                              <span className="text-slate-700">{tx.category}</span>
                            </div>
                            {tx.note && <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{tx.note}</div>}
                          </td>
                          {/* ผู้บันทึก */}
                          <td className="px-4 py-3 text-slate-500 text-xs">{tx.created_by_name || '—'}</td>
                          {/* จำนวนเงิน */}
                          <td className={`px-4 py-3 text-right font-black text-base whitespace-nowrap ${tx.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.type === 'Income' ? '+' : '-'}฿{fmt(tx.amount)}
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <Tooltip label={tx.image_count > 0 ? `รูปหลักฐาน (${tx.image_count} รูป)` : 'รูปหลักฐาน'}>
                                <button onClick={() => openImages(tx)}
                                  className={`p-1.5 rounded-lg transition-all ${tx.image_count > 0 ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`}>
                                  <ImageIcon size={15} />
                                </button>
                              </Tooltip>
                              <Tooltip label="ประวัติการแก้ไข">
                                <button onClick={() => openAudit(tx)}
                                  className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-50 transition-all">
                                  <History size={15} />
                                </button>
                              </Tooltip>
                              <Tooltip label="แก้ไขรายการ">
                                <button onClick={() => openEdit(tx)}
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-all">
                                  <Edit2 size={15} />
                                </button>
                              </Tooltip>
                              <Tooltip label="ลบรายการ">
                                <button onClick={() => setDeleteModal(tx)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-all">
                                  <Trash2 size={15} />
                                </button>
                              </Tooltip>
                              {tx.type === 'Expense' && !(tx.note || '').includes('[ใบกำกับภาษีฉบับเต็ม]') && (
                                pvIssued ? (
                                  <Tooltip label="ออกใบสำคัญจ่ายแล้ว">
                                    <span className="p-1.5 text-slate-300 cursor-not-allowed">
                                      <Check size={15} />
                                    </span>
                                  </Tooltip>
                                ) : (
                                  <Tooltip label="ออกใบสำคัญจ่าย">
                                    <button onClick={() => setPvModal(tx)}
                                      className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-all">
                                      <FileEdit size={15} />
                                    </button>
                                  </Tooltip>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400 bg-slate-50 flex items-center justify-between">
                  <span>แสดง {filtered.length} จาก {txns.length} รายการ</span>
                  <div className="flex gap-4 font-semibold">
                    <span className="text-emerald-600">+฿{fmt(filtered.filter(t=>t.type==='Income').reduce((s,t)=>s+Number(t.amount),0))} รายรับ</span>
                    <span className="text-rose-600">-฿{fmt(filtered.filter(t=>t.type==='Expense').reduce((s,t)=>s+Number(t.amount),0))} รายจ่าย</span>
                  </div>
                </div>
              </div>

              {/* ── Mobile Cards ── */}
              <div className="md:hidden space-y-3">
                {filtered.map(tx => {
                  const pvIssued = issuedPvTxIds.has(String(tx.id));
                  const isIncome = tx.type === 'Income';
                  return (
                    <div key={tx.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      {/* Card Top: สี accent strip + ข้อมูลหลัก */}
                      <div className={`px-4 pt-3.5 pb-3 flex items-start justify-between gap-3 border-b-2 ${isIncome ? 'border-b-emerald-100' : 'border-b-rose-100'}`}>
                        <div className="flex-1 min-w-0">
                          {/* Badge + Edited */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${isIncome ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {isIncome ? '▲ รายรับ' : '▼ รายจ่าย'}
                            </span>
                            {tx.is_edited && <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full font-bold">✏️</span>}
                            {tx.image_count > 0 && (
                              <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium flex items-center gap-0.5">
                                <ImageIcon size={10} /> {tx.image_count}
                              </span>
                            )}
                          </div>
                          {/* Category */}
                          <div className="font-semibold text-slate-800 text-sm leading-snug truncate">{tx.category}</div>
                          {/* Meta */}
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400 flex-wrap">
                            <span>{(tx.date || tx.created_at || '').split('T')[0]}</span>
                            <span>·</span>
                            <span>{(tx.date || tx.created_at || '').split('T')[1]?.slice(0,5)}</span>
                            <span>·</span>
                            <span className="text-slate-500 font-medium">{tx.business_name}</span>
                            {tx.created_by_name && <><span>·</span><span>{tx.created_by_name}</span></>}
                          </div>
                          {tx.note && <div className="mt-0.5 text-xs text-slate-400 truncate">{tx.note}</div>}
                        </div>
                        {/* Amount */}
                        <div className={`text-xl font-black shrink-0 tabular-nums ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isIncome ? '+' : '-'}฿{fmt(tx.amount)}
                        </div>
                      </div>

                      {/* Card Bottom: Actions */}
                      <div className="flex items-center gap-1 px-3 py-2.5">
                        {/* Image */}
                        <button onClick={() => openImages(tx)} title="รูปหลักฐาน"
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${tx.image_count > 0 ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                          <ImageIcon size={13} />
                          <span>{tx.image_count > 0 ? tx.image_count : ''} รูป</span>
                        </button>
                        {/* History */}
                        <button onClick={() => openAudit(tx)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 text-xs font-bold transition-all">
                          <History size={13} />
                          <span className="hidden xs:inline">ประวัติ</span>
                        </button>
                        {/* Edit */}
                        <button onClick={() => openEdit(tx)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold transition-all">
                          <Edit2 size={13} />
                          <span>แก้ไข</span>
                        </button>
                        {/* Delete */}
                        <button onClick={() => setDeleteModal(tx)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold transition-all">
                          <Trash2 size={13} />
                        </button>
                        {/* PV button - spacer then push right */}
                        {tx.type === 'Expense' && !(tx.note || '').includes('[ใบกำกับภาษีฉบับเต็ม]') && (
                          <div className="ml-auto">
                            {pvIssued ? (
                              <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-400 text-xs font-bold border border-slate-200">
                                <Check size={12} /> ออกแล้ว
                              </span>
                            ) : (
                              <button onClick={() => setPvModal(tx)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold border border-amber-200 transition-all">
                                <FileEdit size={12} /> ใบสำคัญจ่าย
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="text-center text-xs text-slate-400 py-2">
                  แสดง {filtered.length} จาก {txns.length} รายการ
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ─── PAYMENT VOUCHER FORM MODAL ─── */}
      {pvModal && (
        <PaymentVoucherForm
          tx={pvModal}
          businesses={businesses}
          user={user}
          onClose={() => setPvModal(null)}
          onSaved={(msg) => { setPvModal(null); }}
        />
      )}

      {/* ─── IMAGE VIEWER MODAL ─── */}
      <Modal isOpen={!!imageModal} onClose={() => setImageModal(null)} title={`รูปหลักฐาน: ${imageModal?.txn_id || ''}`}>
        <div className="space-y-4">
          {imagesLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : (
            <>
              {/* viewer */}
              {images.length > 0 ? (
                <>
                  <div className="bg-slate-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center relative">
                    <img src={images[activeImgIdx]?.file_data} alt={images[activeImgIdx]?.file_name}
                      className="max-w-full max-h-full object-contain" />
                    {images.length > 1 && (
                      <>
                        <button onClick={() => setActiveImgIdx(p => Math.max(0, p - 1))} disabled={activeImgIdx === 0}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 disabled:opacity-30">‹</button>
                        <button onClick={() => setActiveImgIdx(p => Math.min(images.length - 1, p + 1))} disabled={activeImgIdx === images.length - 1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 disabled:opacity-30">›</button>
                        <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                          {activeImgIdx + 1} / {images.length}
                        </span>
                      </>
                    )}
                  </div>

                  {/* thumbnail strip */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((img, idx) => (
                      <div key={img.id} className="relative shrink-0 group">
                        <button onClick={() => setActiveImgIdx(idx)}
                          className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all block ${activeImgIdx === idx ? 'border-blue-500' : 'border-slate-200 hover:border-blue-300'}`}>
                          <img src={img.file_data} alt="" className="w-full h-full object-cover" />
                        </button>
                        {/* ปุ่มลบรูป */}
                        <button
                          onClick={async () => {
                            if (!window.confirm('ลบรูปนี้?')) return;
                            await imageAPI.delete(img.id);
                            const updated = images.filter(i => i.id !== img.id);
                            setImages(updated);
                            setActiveImgIdx(prev => Math.min(prev, Math.max(0, updated.length - 1)));
                          }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex shadow">
                          ✕
                        </button>
                      </div>
                    ))}
                    {/* ปุ่มเพิ่มรูป */}
                    {images.length < 5 && (
                      <label className="shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                        <Plus size={18} className="text-slate-400" />
                        <span className="text-xs text-slate-400 mt-0.5">เพิ่ม</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          const remaining = 5 - images.length;
                          const toUpload = files.slice(0, remaining);
                          for (const file of toUpload) {
                            const base64 = await new Promise((res) => {
                              const reader = new FileReader();
                              reader.onload = () => res(reader.result);
                              reader.readAsDataURL(file);
                            });
                            const uploaded = await imageAPI.upload(imageModal.id, {
                              file_name: file.name,
                              file_data: base64,
                              file_type: file.type,
                              uploaded_by_name: 'Admin'
                            });
                            if (uploaded?.id) {
                              // reload images
                              const data = await imageAPI.getAll(imageModal.id);
                              setImages(Array.isArray(data) ? data : []);
                              setActiveImgIdx((Array.isArray(data) ? data : []).length - 1);
                            }
                          }
                          e.target.value = '';
                        }} />
                      </label>
                    )}
                  </div>
                </>
              ) : (
                /* ยังไม่มีรูป */
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                  <UploadCloud size={32} className="text-slate-400 mb-2" />
                  <span className="text-sm font-medium text-slate-500">คลิกเพื่ออัพโหลดรูปภาพ</span>
                  <span className="text-xs text-slate-400">JPG, PNG, HEIC สูงสุด 5MB ต่อรูป (สูงสุด 5 รูป)</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                    const files = Array.from(e.target.files || []).slice(0, 5);
                    for (const file of files) {
                      const base64 = await new Promise((res) => {
                        const reader = new FileReader();
                        reader.onload = () => res(reader.result);
                        reader.readAsDataURL(file);
                      });
                      await imageAPI.upload(imageModal.id, {
                        file_name: file.name, file_data: base64,
                        file_type: file.type, uploaded_by_name: 'Admin'
                      });
                    }
                    const data = await imageAPI.getAll(imageModal.id);
                    setImages(Array.isArray(data) ? data : []);
                    e.target.value = '';
                  }} />
                </label>
              )}

              {/* info + download */}
              {images.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-slate-500">
                    <span className="font-medium">อัพโหลดโดย:</span> {images[activeImgIdx]?.uploaded_by_name || '—'}
                    <span className="ml-2 text-slate-400">{images[activeImgIdx]?.created_at ? new Date(images[activeImgIdx].created_at).toLocaleString('th-TH') : ''}</span>
                  </div>
                  <button onClick={() => downloadImage(images[activeImgIdx])}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700">
                    <Download size={14} /> ดาวน์โหลด
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* ─── AUDIT LOG MODAL ─── */}
      <Modal isOpen={!!auditModal} onClose={() => setAuditModal(null)} title={`ประวัติการแก้ไข: ${auditModal?.txn_id || ''}`}>
        <div className="space-y-1 py-1 max-h-[55vh] overflow-y-auto">
          {auditLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : auditLogs.length === 0 ? (
            <p className="text-center text-slate-400 py-8">ยังไม่มีประวัติ</p>
          ) : (
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200"></div>
              {auditLogs.map((log, idx) => (
                <div key={log.id} className="flex gap-4 pb-5 relative">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-lg z-10 border-2 border-white ${auditColor(log.action)}`}>
                    {auditIcon(log.action)}
                  </div>
                  <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="font-bold text-slate-800">{log.user_name || 'Admin'}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-bold ${auditColor(log.action)}`}>
                          {log.action === 'EDIT' ? 'แก้ไข' : log.action === 'DELETE' ? 'ลบ' : 'สร้าง'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{new Date(log.created_at).toLocaleString('th-TH')}</span>
                    </div>

                    {log.action === 'CREATE' && (
                      <p className="text-sm text-slate-600">{log.new_value || 'บันทึกรายการครั้งแรก'}</p>
                    )}

                    {log.action === 'EDIT' && log.field_changed && (
                      <div className="text-sm space-y-1">
                        <p className="text-slate-500">เปลี่ยน <strong className="text-slate-700">{log.field_changed}</strong></p>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-rose-50 text-rose-700 rounded-lg font-mono text-xs line-through">{log.old_value}</span>
                          <span className="text-slate-400">→</span>
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-mono text-xs font-bold">{log.new_value}</span>
                        </div>
                      </div>
                    )}

                    {log.action === 'DELETE' && (
                      <p className="text-sm text-rose-600">{log.old_value || 'ลบรายการออกจากระบบ'}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title="แก้ไขรายการ">
        <form onSubmit={handleEdit} className="space-y-4 py-2">
          {/* ประเภท */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">ประเภท</label>
            <div className="grid grid-cols-2 gap-2">
              {[{v:'Income',label:'รายรับ',color:'emerald'},{v:'Expense',label:'รายจ่าย',color:'rose'}].map(({v,label,color}) => (
                <button key={v} type="button" onClick={() => { setEditType(v); setEditCategory(''); }}
                  className={`py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${editType===v ? (color==='emerald' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-rose-500 bg-rose-50 text-rose-700') : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {/* วันที่/เวลา */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">วันที่</label>
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-base" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">เวลา</label>
              <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-base" />
            </div>
          </div>
          {/* หมวดหมู่ */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">หมวดหมู่</label>
            {(() => {
              const biz = businesses.find(b => String(b.id) === String(editModal?.business_id));
              const isIncome = editType === 'Income';
              const defaultCats = isIncome ? DEFAULT_INCOME_CATS : DEFAULT_EXPENSE_CATS;
              const bizCats = isIncome
                ? (Array.isArray(biz?.income_categories) && biz.income_categories.length > 0 ? biz.income_categories : defaultCats)
                : (Array.isArray(biz?.expense_categories) && biz.expense_categories.length > 0 ? biz.expense_categories : defaultCats);
              const allCats = bizCats.includes(editCategory) ? bizCats : [...bizCats, editCategory].filter(Boolean);
              return (
                <select value={editCategory} onChange={e => setEditCategory(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none text-base appearance-none ${isIncome ? 'border-emerald-200 focus:ring-emerald-400 bg-emerald-50/30' : 'border-rose-200 focus:ring-rose-400 bg-rose-50/30'}`}>
                  {allCats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              );
            })()}
          </div>
          {/* จำนวนเงิน */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">จำนวนเงิน (฿)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
              <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} min="0" step="0.01"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-base font-bold" />
            </div>
          </div>
          {/* ชื่อค่าใช้จ่าย/หมายเหตุ */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">ชื่อค่าใช้จ่าย / หมายเหตุ</label>
            <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="(ถ้ามี)"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-base" />
          </div>
          {/* ช่องทางการจ่าย (เฉพาะ Expense) */}
          {editType === 'Expense' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">ช่องทางการจ่ายเงิน</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setEditPayment('petty_cash')}
                  className={`py-2.5 px-3 rounded-xl border-2 text-sm font-semibold transition-all text-left ${editPayment==='petty_cash' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-amber-300'}`}>
                  💵 เงินสดย่อย
                </button>
                <button type="button" onClick={() => setEditPayment('transfer')}
                  className={`py-2.5 px-3 rounded-xl border-2 text-sm font-semibold transition-all text-left ${editPayment==='transfer' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-blue-300'}`}>
                  🏦 โอนเงิน/อื่นๆ
                </button>
              </div>
            </div>
          )}
          {/* แผนก */}
          {(() => {
            const biz = businesses.find(b => String(b.id) === String(editModal?.business_id));
            return biz && Array.isArray(biz.departments) && biz.departments.length > 0 ? (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">แผนก</label>
                <div className="flex flex-wrap gap-2">
                  {biz.departments.map(d => (
                    <button key={d} type="button" onClick={() => setEditDepartment(prev => prev === d ? '' : d)}
                      className={`px-3 py-1.5 rounded-xl border-2 text-sm font-semibold transition-all ${editDepartment===d ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-blue-300'}`}>
                      {editDepartment===d && '✓ '}{d}
                    </button>
                  ))}
                </div>
              </div>
            ) : null;
          })()}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditModal(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100">ยกเลิก</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} บันทึก
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="ยืนยันการลบข้อมูล">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
          <h4 className="text-lg font-bold text-slate-800 mb-2">คุณแน่ใจหรือไม่?</h4>
          <p className="text-slate-600 text-sm mb-6">รายการ <strong>{deleteModal?.category}</strong> จะถูกลบถาวร</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setDeleteModal(null)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100">ยกเลิก</button>
            <button onClick={() => handleDelete(deleteModal.id)} className="px-6 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700">ยืนยันลบ</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─── BUSINESS MANAGEMENT ───
const BusinessManagement = ({ businesses, setBusinesses, onSuccess }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [pettyCashMax, setPettyCashMax] = useState('20000');
  const [logoMode, setLogoMode] = useState('emoji');
  const [selectedEmoji, setSelectedEmoji] = useState('🏪');
  const [logoImage, setLogoImage] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [taxName, setTaxName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [taxAddress, setTaxAddress] = useState('');
  const [departments, setDepartments] = useState([]);
  const [deptInput, setDeptInput] = useState('');
  const [incomeCategories, setIncomeCategories] = useState([...DEFAULT_INCOME_CATS]);
  const [expenseCategories, setExpenseCategories] = useState([...DEFAULT_EXPENSE_CATS]);
  const [customIncomeCatInput, setCustomIncomeCatInput] = useState('');
  const [customExpenseCatInput, setCustomExpenseCatInput] = useState('');

  const resetForm = () => {
    setName(''); setType(''); setPettyCashMax('20000');
    setLogoMode('emoji'); setSelectedEmoji('🏪'); setLogoImage(null); setLogoPreview(null);
    setTaxName(''); setTaxId(''); setTaxAddress('');
    setDepartments([]); setDeptInput('');
    setIncomeCategories([...DEFAULT_INCOME_CATS]);
    setExpenseCategories([...DEFAULT_EXPENSE_CATS]);
    setCustomIncomeCatInput(''); setCustomExpenseCatInput('');
  };

  const openAdd = () => { setEditingId(null); resetForm(); setIsDrawerOpen(true); };

  const openEdit = (biz) => {
    setEditingId(biz.id);
    setName(biz.name || '');
    setType(biz.type || '');
    setPettyCashMax(String(biz.petty_cash_max || 20000));
    setLogoMode(biz.logo_type === 'image' ? 'image' : 'emoji');
    setSelectedEmoji(biz.logo_type !== 'image' ? (biz.icon || '🏪') : '🏪');
    setLogoImage(biz.logo_type === 'image' ? biz.icon : null);
    setLogoPreview(biz.logo_type === 'image' ? biz.icon : null);
    setTaxName(biz.tax_name || '');
    setTaxId(biz.tax_id || '');
    setTaxAddress(biz.tax_address || '');
    setDepartments(Array.isArray(biz.departments) ? biz.departments : []);
    setIncomeCategories(Array.isArray(biz.income_categories) && biz.income_categories.length > 0 ? biz.income_categories : [...DEFAULT_INCOME_CATS]);
    setExpenseCategories(Array.isArray(biz.expense_categories) && biz.expense_categories.length > 0 ? biz.expense_categories : [...DEFAULT_EXPENSE_CATS]);
    setIsDrawerOpen(true);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('ขนาดไฟล์ต้องไม่เกิน 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setLogoImage(ev.target.result); setLogoPreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const addDept = () => {
    const d = deptInput.trim();
    if (!d) return;
    if (departments.includes(d)) { alert('มีแผนกนี้อยู่แล้ว'); return; }
    setDepartments(prev => [...prev, d]);
    setDeptInput('');
  };

  const toggleCat = (list, setList, cat) => {
    setList(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const addCustomCat = (list, setList, input, setInput) => {
    const val = input.trim();
    if (!val) return;
    if (list.includes(val)) { alert('มีหมวดหมู่นี้อยู่แล้ว'); return; }
    setList(prev => [...prev, val]);
    setInput('');
  };

  const removeCustomCat = (setList, cat) => {
    setList(prev => prev.filter(c => c !== cat));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('กรุณากรอกชื่อธุรกิจ');
    if (!type.trim()) return alert('กรุณากรอกประเภทธุรกิจ');
    if (Number(pettyCashMax) < 0) return alert('วงเงินสดย่อยต้องมากกว่าหรือเท่ากับ 0');
    setLoading(true);
    const data = {
      name: name.trim(), type: type.trim(),
      petty_cash_max: Number(pettyCashMax),
      logo_type: logoMode,
      icon: logoMode === 'image' ? (logoImage || '🏪') : selectedEmoji,
      tax_name: taxName.trim(), tax_id: taxId.trim(), tax_address: taxAddress.trim(),
      departments, income_categories: incomeCategories, expense_categories: expenseCategories,
    };
    try {
      if (editingId) {
        const updated = await businessAPI.update(editingId, data);
        setBusinesses(prev => prev.map(b => b.id === editingId ? { ...b, ...updated } : b));
        onSuccess('อัปเดตธุรกิจสำเร็จ ✅');
      } else {
        const created = await businessAPI.create(data);
        setBusinesses(prev => [...prev, created]);
        onSuccess('เพิ่มธุรกิจสำเร็จ ✅');
      }
      setIsDrawerOpen(false);
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (biz) => {
    setDeleting(true);
    try {
      await businessAPI.delete(biz.id);
      setBusinesses(prev => prev.filter(b => b.id !== biz.id));
      setDeleteModal(null);
      onSuccess('ลบธุรกิจสำเร็จ ✅');
    } catch (err) { alert('ลบไม่สำเร็จ: ' + err.message); }
    finally { setDeleting(false); }
  };

  const toggleStatus = async (biz) => {
    const newStatus = biz.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await businessAPI.update(biz.id, { status: newStatus });
      setBusinesses(prev => prev.map(b => b.id === biz.id ? { ...b, status: newStatus } : b));
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
  };

  const fmt = (n) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

  return (
    <div className="space-y-6">

      {/* Delete Modal */}
      <Modal isOpen={!!deleteModal} onClose={() => !deleting && setDeleteModal(null)} title="ยืนยันการลบธุรกิจ">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-rose-50 border-2 border-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl overflow-hidden">
            {deleteModal?.logo_type === 'image' && deleteModal?.icon
              ? <img src={deleteModal.icon} className="w-full h-full object-cover rounded-full" alt="" />
              : (deleteModal?.icon || '🏪')}
          </div>
          <h4 className="text-lg font-bold text-slate-800 mb-1">ลบ "{deleteModal?.name}"?</h4>
          <p className="text-slate-500 text-sm mb-2">ข้อมูลธุรกิจและรายการธุรกรรมทั้งหมดจะถูกลบถาวร</p>
          <p className="text-rose-600 text-xs font-bold bg-rose-50 px-4 py-2 rounded-xl mb-6">⚠️ ไม่สามารถกู้คืนข้อมูลได้</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setDeleteModal(null)} disabled={deleting}
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100">ยกเลิก</button>
            <button onClick={() => handleDelete(deleteModal)} disabled={deleting}
              className="px-6 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2">
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} ยืนยันลบ
            </button>
          </div>
        </div>
      </Modal>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">จัดการธุรกิจ (Business)</h2>
          <p className="text-slate-500 text-sm mt-1">ตั้งค่าและจัดการสาขาทั้งหมด</p>
        </div>
        <button onClick={openAdd}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-100 transition-all">
          <Plus size={18} /> เพิ่มธุรกิจใหม่
        </button>
      </div>

      {/* Business Cards */}
      {businesses.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="text-5xl mb-4">🏪</div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">ยังไม่มีธุรกิจ</h3>
          <p className="text-slate-400 text-sm mb-6">เริ่มต้นโดยการเพิ่มธุรกิจแรกของคุณ</p>
          <button onClick={openAdd} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
            + เพิ่มธุรกิจใหม่
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {businesses.map(biz => (
            <div key={biz.id} className={`bg-white rounded-2xl border transition-all ${biz.status === 'Active' ? 'border-slate-200 shadow-sm hover:shadow-md' : 'border-slate-200 opacity-60'}`}>
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-2xl border border-slate-100 overflow-hidden shrink-0">
                      {biz.logo_type === 'image' && biz.icon
                        ? <img src={biz.icon} className="w-full h-full object-cover" alt={biz.name} />
                        : (biz.icon || '🏪')}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{biz.name}</h3>
                      <span className="text-xs text-slate-500">{biz.type}</span>
                    </div>
                  </div>
                  <Badge type={biz.status === 'Active' ? 'income' : 'default'}>
                    {biz.status === 'Active' ? 'เปิด' : 'ปิด'}
                  </Badge>
                </div>

                {/* Petty cash bar */}
                <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">เงินสดย่อย</span>
                    <span className="font-bold text-slate-700">
                      ฿{fmt(biz.petty_cash)} <span className="text-slate-400 font-normal">/ ฿{fmt(biz.petty_cash_max)}</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${((biz.petty_cash||0)/(biz.petty_cash_max||1)) < 0.3 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, ((biz.petty_cash||0)/(biz.petty_cash_max||1))*100)}%` }} />
                  </div>
                </div>

                {/* Departments */}
                {Array.isArray(biz.departments) && biz.departments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {biz.departments.slice(0, 3).map(d => (
                      <span key={d} className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs rounded-full border border-blue-100 font-medium">{d}</span>
                    ))}
                    {biz.departments.length > 3 && (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-400 text-xs rounded-full">+{biz.departments.length - 3}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="flex gap-2 px-5 pb-5 border-t border-slate-100 pt-4">
                <button onClick={() => openEdit(biz)}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-700 text-sm font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition-all">
                  <Edit2 size={15} /> ตั้งค่า
                </button>
                <button onClick={() => toggleStatus(biz)} title={biz.status === 'Active' ? 'ปิดชั่วคราว' : 'เปิดใช้งาน'}
                  className={`py-2.5 px-3 text-sm font-bold rounded-xl border flex items-center transition-all ${biz.status === 'Active' ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'}`}>
                  <Power size={15} />
                </button>
                <button onClick={() => setDeleteModal(biz)} title="ลบธุรกิจ"
                  className="py-2.5 px-3 bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-100 hover:text-rose-700 text-sm font-bold rounded-xl flex items-center transition-all">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── DRAWER ─── */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingId ? `ตั้งค่า: ${name}` : 'เพิ่มธุรกิจใหม่'}
        description={editingId ? 'แก้ไขข้อมูลและการตั้งค่าธุรกิจ' : 'กรอกข้อมูลเพื่อสร้างธุรกิจใหม่'}
      >
        <form onSubmit={handleSave} className="flex flex-col h-full">

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">

            {/* ── 1: ข้อมูลพื้นฐาน (FR2) ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <h3 className="font-bold text-slate-800">ข้อมูลพื้นฐาน</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">ชื่อธุรกิจ / สาขา <span className="text-rose-500">*</span></label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base transition-all"
                    placeholder="เช่น กาแฟ สาขา A" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">ประเภทธุรกิจ <span className="text-rose-500">*</span></label>
                    <input type="text" required value={type} onChange={e => setType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base transition-all"
                      placeholder="เช่น Cafe" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">วงเงินสดย่อยสูงสุด <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">฿</span>
                      <input type="number" required min="0" step="0.01" value={pettyCashMax} onChange={e => setPettyCashMax(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base transition-all"
                        placeholder="20000" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 2: โลโก้ (FR3) ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <h3 className="font-bold text-slate-800">โลโก้ธุรกิจ</h3>
              </div>
              <div className="flex bg-slate-100 rounded-xl p-1 mb-5 w-fit">
                <button type="button" onClick={() => setLogoMode('emoji')}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${logoMode === 'emoji' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  😊 Emoji
                </button>
                <button type="button" onClick={() => setLogoMode('image')}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${logoMode === 'image' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  🖼 อัพโหลดโลโก้
                </button>
              </div>

              {logoMode === 'emoji' ? (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-4xl shadow-sm">
                      {selectedEmoji}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Emoji ที่เลือก</p>
                      <p className="text-xs text-slate-400 mt-0.5">คลิก Emoji ด้านล่างเพื่อเปลี่ยน</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-8 gap-2">
                    {EMOJIS.map(e => (
                      <button key={e} type="button" onClick={() => setSelectedEmoji(e)}
                        className={`w-10 h-10 flex items-center justify-center text-xl rounded-xl border-2 transition-all ${selectedEmoji === e ? 'border-blue-500 bg-blue-50 scale-110 shadow-sm' : 'border-slate-100 hover:border-blue-300 hover:bg-blue-50'}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {logoPreview ? (
                    <div className="flex items-center gap-4">
                      <img src={logoPreview} alt="Logo preview" className="w-32 h-32 rounded-2xl object-cover border-2 border-slate-200 shadow-sm" />
                      <div className="space-y-2">
                        <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold cursor-pointer hover:bg-blue-100 transition-all">
                          <UploadCloud size={16} /> เปลี่ยนรูปภาพ
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        </label>
                        <button type="button" onClick={() => { setLogoImage(null); setLogoPreview(null); }}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-sm font-bold hover:bg-rose-100 w-full transition-all">
                          <Trash2 size={16} /> ลบรูปภาพ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                      <UploadCloud size={32} className="text-slate-400 mb-2" />
                      <p className="text-sm font-semibold text-slate-600">คลิกหรือลากไฟล์มาวางที่นี่</p>
                      <p className="text-xs text-slate-400 mt-1">JPG, PNG, SVG ขนาดไม่เกิน 5MB</p>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  )}
                </div>
              )}
            </section>

            {/* ── 3: ข้อมูลภาษี (FR4) ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <h3 className="font-bold text-slate-800">ข้อมูลบริษัทและภาษี</h3>
                <span className="text-xs text-slate-400 font-normal bg-slate-100 px-2 py-0.5 rounded-full">ไม่บังคับ</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">ชื่อนิติบุคคล / ชื่อจดทะเบียน</label>
                  <input type="text" value={taxName} onChange={e => setTaxName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base transition-all"
                    placeholder="เช่น บริษัท กาแฟดี จำกัด" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">เลขประจำตัวผู้เสียภาษี</label>
                  <input type="text" value={taxId} onChange={e => setTaxId(e.target.value.slice(0, 13))} maxLength={13}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-mono tracking-widest transition-all"
                    placeholder="0000000000000" />
                  <p className="text-xs text-slate-400 mt-1 text-right">{taxId.length}/13 หลัก</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">ที่อยู่จดทะเบียน</label>
                  <textarea value={taxAddress} onChange={e => setTaxAddress(e.target.value)} rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base resize-none transition-all"
                    placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์" />
                </div>
              </div>
            </section>

            {/* ── 4: แผนก (FR5) ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>
                <h3 className="font-bold text-slate-800">แผนก (Department)</h3>
              </div>
              <div className="flex gap-2 mb-3">
                <input type="text" value={deptInput} onChange={e => setDeptInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDept(); } }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
                  placeholder="ชื่อแผนก เช่น ครัว, บาร์, เซอร์วิส..." />
                <button type="button" onClick={addDept}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-1.5 transition-all shrink-0">
                  <Plus size={16} /> เพิ่ม
                </button>
              </div>
              {departments.length > 0 ? (
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 min-h-[52px]">
                  {departments.map(d => (
                    <span key={d} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl shadow-sm">
                      {d}
                      <button type="button" onClick={() => setDepartments(prev => prev.filter(x => x !== d))}
                        className="w-4 h-4 rounded-full bg-slate-200 hover:bg-rose-500 hover:text-white text-slate-500 flex items-center justify-center transition-all text-xs leading-none">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-sm text-slate-400">
                  ยังไม่มีแผนก — พิมพ์ชื่อแล้วกด "เพิ่ม" หรือกด Enter
                </div>
              )}
            </section>

            {/* ── 5: หมวดหมู่บัญชี (FR6) ── */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">5</span>
                <h3 className="font-bold text-slate-800">หมวดหมู่บัญชี</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4 ml-8">หมวดที่ติ๊ก ✅ จะปรากฏให้พนักงานเลือกตอนบันทึกรายรับ-รายจ่าย</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* หมวดรายรับ */}
                <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                    <p className="text-sm font-bold text-emerald-800">หมวดรายรับ</p>
                  </div>
                  <div className="space-y-1 mb-3">
                    {DEFAULT_INCOME_CATS.map(cat => (
                      <label key={cat} className="flex items-center gap-3 p-2 rounded-xl hover:bg-emerald-100 cursor-pointer transition-all">
                        <input type="checkbox" checked={incomeCategories.includes(cat)}
                          onChange={() => toggleCat(incomeCategories, setIncomeCategories, cat)}
                          className="w-4 h-4 rounded text-emerald-600 border-slate-300 cursor-pointer" />
                        <span className="text-sm text-slate-700">{cat}</span>
                      </label>
                    ))}
                    {/* Custom income categories */}
                    {incomeCategories.filter(c => !DEFAULT_INCOME_CATS.includes(c)).map(cat => (
                      <div key={cat} className="flex items-center gap-2 p-2 rounded-xl bg-emerald-100/60 border border-emerald-200">
                        <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                          <span className="w-3 h-3 bg-emerald-500 rounded-sm flex items-center justify-center">
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </span>
                        </span>
                        <span className="text-sm text-emerald-800 font-medium flex-1">{cat}</span>
                        <button type="button" onClick={() => removeCustomCat(setIncomeCategories, cat)}
                          className="p-0.5 rounded-md text-emerald-400 hover:text-rose-500 hover:bg-rose-50 transition-all" title="ลบ">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Add custom income category */}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={customIncomeCatInput}
                      onChange={e => setCustomIncomeCatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomCat(incomeCategories, setIncomeCategories, customIncomeCatInput, setCustomIncomeCatInput))}
                      placeholder="เพิ่มหมวดหมู่..."
                      className="flex-1 min-w-0 px-3 py-2 text-sm rounded-xl border border-emerald-200 bg-white focus:ring-2 focus:ring-emerald-400 outline-none placeholder-slate-300" />
                    <button type="button"
                      onClick={() => addCustomCat(incomeCategories, setIncomeCategories, customIncomeCatInput, setCustomIncomeCatInput)}
                      className="shrink-0 flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all">
                      <Plus size={13} /> เพิ่ม
                    </button>
                  </div>
                </div>

                {/* หมวดรายจ่าย */}
                <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
                    <p className="text-sm font-bold text-rose-800">หมวดรายจ่าย</p>
                  </div>
                  <div className="space-y-1 mb-3">
                    {DEFAULT_EXPENSE_CATS.map(cat => (
                      <label key={cat} className="flex items-center gap-3 p-2 rounded-xl hover:bg-rose-100 cursor-pointer transition-all">
                        <input type="checkbox" checked={expenseCategories.includes(cat)}
                          onChange={() => toggleCat(expenseCategories, setExpenseCategories, cat)}
                          className="w-4 h-4 rounded text-rose-600 border-slate-300 cursor-pointer" />
                        <span className="text-sm text-slate-700">{cat}</span>
                      </label>
                    ))}
                    {/* Custom expense categories */}
                    {expenseCategories.filter(c => !DEFAULT_EXPENSE_CATS.includes(c)).map(cat => (
                      <div key={cat} className="flex items-center gap-2 p-2 rounded-xl bg-rose-100/60 border border-rose-200">
                        <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                          <span className="w-3 h-3 bg-rose-500 rounded-sm flex items-center justify-center">
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </span>
                        </span>
                        <span className="text-sm text-rose-800 font-medium flex-1">{cat}</span>
                        <button type="button" onClick={() => removeCustomCat(setExpenseCategories, cat)}
                          className="p-0.5 rounded-md text-rose-400 hover:text-rose-600 hover:bg-rose-100 transition-all" title="ลบ">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Add custom expense category */}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={customExpenseCatInput}
                      onChange={e => setCustomExpenseCatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomCat(expenseCategories, setExpenseCategories, customExpenseCatInput, setCustomExpenseCatInput))}
                      placeholder="เพิ่มหมวดหมู่..."
                      className="flex-1 min-w-0 px-3 py-2 text-sm rounded-xl border border-rose-200 bg-white focus:ring-2 focus:ring-rose-400 outline-none placeholder-slate-300" />
                    <button type="button"
                      onClick={() => addCustomCat(expenseCategories, setExpenseCategories, customExpenseCatInput, setCustomExpenseCatInput)}
                      className="shrink-0 flex items-center gap-1 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all">
                      <Plus size={13} /> เพิ่ม
                    </button>
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* Sticky Footer (FR7) */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 flex gap-3">
            <button type="button" onClick={() => setIsDrawerOpen(false)}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition-all">
              ยกเลิก
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100">
              {loading ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : <><Check size={16} /> บันทึกข้อมูล</>}
            </button>
          </div>
        </form>
      </Drawer>

    </div>
  );
};


// ─── REPORTS ───
// ─── GENERATE P&L PDF ────────────────────────────────────────────────
const generatePLPDF = ({ data, businesses, selectedBiz, period, customStart, customEnd }) => {
  const fmt = (n) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
  const activeBiz = businesses.filter(b => b.status === 'Active');
  const bizObj = selectedBiz !== 'all' ? activeBiz.find(b => String(b.id) === String(selectedBiz)) : null;
  const bizName = bizObj ? (bizObj.tax_name || bizObj.name) : 'รวมทุกธุรกิจ';

  // คำนวณช่วงวันที่
  const now = new Date(new Date().getTime() + 7*60*60*1000);
  const today = now.toISOString().split('T')[0];
  let start = today, end = today;
  if (period === 'วันนี้') { start = today; end = today; }
  else if (period === 'สัปดาห์นี้') {
    const day = now.getDay();
    const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    start = mon.toISOString().split('T')[0]; end = today;
  } else if (period === 'เดือนที่แล้ว') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    start = first.toISOString().split('T')[0]; end = last.toISOString().split('T')[0];
  } else if (period === 'กำหนดเอง') { start = customStart || today; end = customEnd || today; }
  else { start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; end = today; }

  const fmtDate = (d) => {
    const [y, m, da] = d.split('-');
    return `${da}/${m}/${Number(y) + 543}`;
  };

  // รวมรายการค่าใช้จ่ายทั้งหมด (expense_items sub_items)
  const expenseRows = [];
  let rowNum = 1;
  (data.expense_items || []).forEach(item => {
    (item.sub_items || []).forEach(tx => {
      const amt = Number(tx.amount) || 0;
      const whtRate = Number(tx.wht_rate) || 0;
      const whtAmt = Math.round(amt * whtRate / 100 * 100) / 100;
      const net = amt - whtAmt;
      expenseRows.push({
        num: rowNum++,
        category: item.category || '(ไม่ระบุ)',
        note: tx.note || '(ไม่ระบุ)',
        amount: amt,
        whtRate: whtRate,
        whtAmt: whtAmt,
        net: net,
        hasWht: tx.is_tax_receipt || whtRate > 0,
      });
    });
  });

  // ถ้าไม่มี sub_items ให้แสดงแบบ category-level
  const useCategory = expenseRows.length === 0;
  const categoryRows = (data.expense_items || []).map((item, i) => ({
    num: i + 1,
    category: item.category || '(ไม่ระบุ)',
    note: '',
    amount: Number(item.total) || 0,
    whtRate: 0,
    whtAmt: 0,
    net: Number(item.total) || 0,
    hasWht: false,
  }));
  const rows = useCategory ? categoryRows : expenseRows;

  const rowsHTML = rows.map(r => `
    <tr>
      <td class="center">${r.num}</td>
      <td>${r.category}</td>
      <td>${r.note}</td>
      <td class="right">${fmt(r.amount)}</td>
      <td class="center">${r.whtRate > 0 ? r.whtRate + '%' : '0.00'}</td>
      <td class="right bold">${fmt(r.net)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="th"><head>
<meta charset="UTF-8"/>
<title>สรุปค่าใช้จ่าย</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Sarabun',sans-serif;font-size:13px;color:#1e293b;background:#fff;padding:14mm 16mm;}
h1{font-size:22px;font-weight:800;text-align:center;margin-bottom:4px;}
.sub-title{font-size:14px;font-weight:600;text-align:center;margin-bottom:2px;}
.date-range{font-size:13px;text-align:center;margin-bottom:18px;}
table{width:100%;border-collapse:collapse;margin-bottom:24px;}
th,td{border:1px solid #cbd5e1;padding:7px 10px;font-size:12px;}
th{background:#f1f5f9;font-weight:700;text-align:center;}
td.center{text-align:center;}
td.right{text-align:right;}
td.bold{font-weight:700;}
tr td{height:28px;}
.sig-row{display:flex;justify-content:space-between;margin-top:32px;padding-top:16px;}
.sig-box{text-align:center;width:45%;}
.sig-line{border-bottom:1px solid #94a3b8;margin:40px 16px 6px;}
.sig-label{font-size:12px;color:#475569;font-weight:700;}
.sig-subname{font-size:12px;color:#94a3b8;min-width:160px;display:inline-block;border-bottom:1px solid #cbd5e1;margin-bottom:4px;}
@media print{body{padding:0;}@page{margin:14mm;size:A4 portrait;}}
</style></head><body>
<h1>สรุปค่าใช้จ่าย</h1>
<div class="sub-title">บริษัท ${bizName}</div>
<div class="date-range">วันที่ : ${fmtDate(start)} - ${fmtDate(end)}</div>

<table>
  <thead><tr>
    <th style="width:36px">#</th>
    <th style="width:120px">หมวดหมู่</th>
    <th>รายการค่าใช้จ่าย</th>
    <th style="width:110px">ยอดเงิน</th>
    <th style="width:80px">หัก ณ ที่จ่าย</th>
    <th style="width:110px">ยอดรวม</th>
  </tr></thead>
  <tbody>
    ${rowsHTML}
  </tbody>
</table>

<div class="sig-row">
  <div class="sig-box">
    <div class="sig-line"></div>
    <div class="sig-subname">&nbsp;</div>
    <div class="sig-label">ตรวจสอบโดย</div>
  </div>
  <div class="sig-box">
    <div class="sig-line"></div>
    <div class="sig-subname">&nbsp;</div>
    <div class="sig-label">อนุมัติโดย</div>
  </div>
</div>
</body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.focus(); win.print(); }, 600); }
};

const Reports = ({ businesses }) => {
  const [selectedBiz, setSelectedBiz] = useState('all');
  const [period, setPeriod] = useState('เดือนนี้');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('category');
  const fmt = (n) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
  const activeBiz = businesses.filter(b => b.status === 'Active');

  const getDateRange = (p) => {
    const now = new Date(new Date().getTime() + 7*60*60*1000);
    const today = now.toISOString().split('T')[0];
    if (p === 'วันนี้') return { start: today, end: today };
    if (p === 'สัปดาห์นี้') {
      const day = now.getDay();
      const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      return { start: mon.toISOString().split('T')[0], end: today };
    }
    if (p === 'เดือนที่แล้ว') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: first.toISOString().split('T')[0], end: last.toISOString().split('T')[0] };
    }
    if (p === 'กำหนดเอง') return { start: customStart || today, end: customEnd || today };
    // เดือนนี้ (default)
    return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], end: today };
  };

  const load = async () => {
    setLoading(true); setError('');
    try {
      const { start, end } = getDateRange(period);
      const params = { start, end };
      if (selectedBiz !== 'all') params.business_id = selectedBiz;
      const result = await reportAPI.getPL(params);
      setData(result);
    } catch (err) {
      setError('โหลดรายงานไม่สำเร็จ: ' + err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selectedBiz, period, customStart, customEnd]);

  // Helper: expandable row with dropdown sub-items
  const BarRow = ({ label, total, base, color, subItems = [] }) => {
    const [open, setOpen] = useState(false);
    const pct = base > 0 ? Math.round(total / base * 100) : 0;
    const hasItems = subItems.length > 0;
    return (
      <div className={open ? (color === 'emerald' ? 'bg-emerald-50/40' : 'bg-rose-50/40') : ''}>
        {/* Main row */}
        <div
          className={`px-4 py-3 transition-colors ${hasItems ? 'cursor-pointer hover:bg-slate-50' : ''}`}
          onClick={() => hasItems && setOpen(v => !v)}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              {hasItems && (
                <span className={`transition-transform duration-200 shrink-0 inline-block ${open ? 'rotate-90' : ''} ${color === 'emerald' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  ▶
                </span>
              )}
              <span className="text-sm text-slate-700 font-medium truncate">{label}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`font-bold text-sm ${color === 'emerald' ? 'text-emerald-600' : 'text-rose-600'}`}>฿{fmt(total)}</span>
              <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
              {hasItems && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${color === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {subItems.length}
                </span>
              )}
            </div>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${color === 'emerald' ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{width: `${pct}%`}} />
          </div>
        </div>

        {/* Dropdown sub-items */}
        {open && hasItems && (
          <div className={`border-t ${color === 'emerald' ? 'border-emerald-100 bg-emerald-50/60' : 'border-rose-100 bg-rose-50/60'}`}>
            <div className={`px-4 py-2 flex items-center justify-between border-b ${color === 'emerald' ? 'border-emerald-100' : 'border-rose-100'}`}>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">รายการค่าใช้จ่าย : {subItems.length} รายการ</span>
            </div>
            <div className="divide-y divide-white/60 max-h-64 overflow-y-auto">
              {subItems.map((tx, idx) => (
                <div key={tx.id || idx} className="px-5 py-2.5 flex items-center justify-between gap-3 hover:bg-white/60 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 font-medium truncate">{tx.note || '(ไม่ระบุ)'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">
                        {tx.date ? new Date(tx.date).toLocaleDateString('th-TH', {day:'numeric', month:'short', year:'2-digit'}) : ''}
                      </span>
                      {tx.department && tx.department !== '(ไม่ระบุแผนก)' && (
                        <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{tx.department}</span>
                      )}
                    </div>
                  </div>
                  <span className={`font-bold text-sm shrink-0 ${color === 'emerald' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ฿{fmt(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
            <div className={`px-4 py-2 flex justify-between items-center border-t ${color === 'emerald' ? 'border-emerald-100' : 'border-rose-100'}`}>
              <span className="text-xs text-slate-400">รวมทั้งหมด</span>
              <span className={`text-xs font-bold ${color === 'emerald' ? 'text-emerald-700' : 'text-rose-700'}`}>฿{fmt(total)}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 -mx-4 sm:mx-auto px-0 sm:px-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 sm:px-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">รายงานงบกำไรขาดทุน (P&L)</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Profit & Loss Statement</p>
        </div>
        <button
          onClick={() => data && generatePLPDF({ data, businesses, selectedBiz, period, customStart, customEnd })}
          disabled={!data}
          className="shrink-0 px-3 py-2 sm:px-4 sm:py-2.5 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 disabled:opacity-50">
          <Printer size={14} /> Print
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-none sm:rounded-2xl shadow-sm border-y sm:border border-slate-200 space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">เลือกธุรกิจ</label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedBiz('all')}
              className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${selectedBiz === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
              รวมทุกร้าน
            </button>
            {activeBiz.map(biz => (
              <button key={biz.id} onClick={() => setSelectedBiz(String(biz.id))}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all ${selectedBiz === String(biz.id) ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                <BizIcon biz={biz} size="sm" />{biz.name}
              </button>
            ))}
          </div>
        </div>
        {/* Period picker — same style as Dashboard */}
        <div className="flex flex-col gap-2">
          <div className="flex bg-slate-100 rounded-lg p-1 gap-0.5">
            {['วันนี้', 'สัปดาห์นี้', 'เดือนนี้', 'เดือนที่แล้ว', 'กำหนดเอง'].map(p => (
              <button key={p} type="button" onClick={() => setPeriod(p)}
                className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors font-medium whitespace-nowrap ${period === p ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-200'}`}>
                {p}
              </button>
            ))}
          </div>
          {period === 'กำหนดเอง' && (
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-3 py-2">
              <CalendarDays size={14} className="text-slate-400 shrink-0" />
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="bg-transparent outline-none text-sm text-slate-700 font-medium" />
              <span className="text-slate-400 text-xs">—</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="bg-transparent outline-none text-sm text-slate-700 font-medium" />
            </div>
          )}
        </div>
      </div>

      {error && <div className="mx-4 sm:mx-0 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-sm"><AlertCircle size={16} />{error}</div>}

      {loading ? <div className="flex justify-center py-16"><Spinner /></div> : data && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 px-4 sm:px-0">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 sm:p-5 text-center">
              <p className="text-xs text-emerald-700 font-bold mb-1">รายรับรวม</p>
              <p className="text-base sm:text-2xl font-black text-emerald-600 break-all">฿{fmt(data.income)}</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 sm:p-5 text-center">
              <p className="text-xs text-rose-700 font-bold mb-1">รายจ่ายรวม</p>
              <p className="text-base sm:text-2xl font-black text-rose-600 break-all">฿{fmt(data.expense)}</p>
            </div>
            <div className={`border rounded-2xl p-3 sm:p-5 text-center ${Number(data.profit) >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
              <p className={`text-xs font-bold mb-1 ${Number(data.profit) >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>กำไรสุทธิ</p>
              <p className={`text-base sm:text-2xl font-black break-all ${Number(data.profit) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>฿{fmt(data.profit)}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-none sm:rounded-xl p-1 gap-1 border-y sm:border-0 border-slate-200 sm:mx-0">
            {[{id:'category',label:'แยกตามหมวดหมู่'},{id:'department',label:'แยกตามแผนก'}].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: หมวดหมู่ */}
          {activeTab === 'category' && (
            <div className="space-y-3">
              {/* รายรับ */}
              <div className="bg-white rounded-none sm:rounded-2xl border-y sm:border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                  <h3 className="font-bold text-emerald-800 text-sm">รายรับแยกตามหมวดหมู่</h3>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{data.income_items?.length || 0} รายการ</span>
                </div>
                {data.income_items?.length > 0 ? (
                  <div>
                    {data.income_items.map((item, i) => (
                      <BarRow key={i} label={item.category || '(ไม่ระบุ)'} total={parseFloat(item.total)} base={data.income} color="emerald" subItems={item.sub_items || []} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-6 text-sm">ไม่มีข้อมูลรายรับ</p>
                )}
              </div>
              {/* รายจ่าย */}
              <div className="bg-white rounded-none sm:rounded-2xl border-y sm:border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
                  <h3 className="font-bold text-rose-800 text-sm">รายจ่ายแยกตามหมวดหมู่</h3>
                  <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">{data.expense_items?.length || 0} รายการ</span>
                </div>
                {data.expense_items?.length > 0 ? (
                  <div>
                    {data.expense_items.map((item, i) => (
                      <BarRow key={i} label={item.category || '(ไม่ระบุ)'} total={parseFloat(item.total)} base={data.expense} color="rose" subItems={item.sub_items || []} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-6 text-sm">ไม่มีข้อมูลรายจ่าย</p>
                )}
              </div>
            </div>
          )}

          {/* Tab: แผนก */}
          {activeTab === 'department' && (
            <div className="space-y-3">
              {/* รายรับตามแผนก */}
              <div className="bg-white rounded-none sm:rounded-2xl border-y sm:border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                  <h3 className="font-bold text-emerald-800 text-sm">รายรับแยกตามแผนก</h3>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{data.income_by_dept?.length || 0} แผนก</span>
                </div>
                {data.income_by_dept?.length > 0 ? (
                  <div>
                    {data.income_by_dept.map((item, i) => (
                      <BarRow key={i} label={item.department} total={parseFloat(item.total)} base={data.income} color="emerald" subItems={item.sub_items || []} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-6 text-sm">ไม่มีข้อมูลรายรับตามแผนก</p>
                )}
              </div>
              {/* รายจ่ายตามแผนก */}
              <div className="bg-white rounded-none sm:rounded-2xl border-y sm:border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
                  <h3 className="font-bold text-rose-800 text-sm">รายจ่ายแยกตามแผนก</h3>
                  <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">{data.expense_by_dept?.length || 0} แผนก</span>
                </div>
                {data.expense_by_dept?.length > 0 ? (
                  <div>
                    {data.expense_by_dept.map((item, i) => (
                      <BarRow key={i} label={item.department} total={parseFloat(item.total)} base={data.expense} color="rose" subItems={item.sub_items || []} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-6 text-sm">ไม่มีข้อมูลรายจ่ายตามแผนก</p>
                )}
              </div>
            </div>
          )}

          {data.income === 0 && data.expense === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <FileText size={48} className="mx-auto mb-3 opacity-30" />
              <p>ไม่พบข้อมูลในช่วงเวลาที่เลือก</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── USER MANAGEMENT ───
const UserManagement = ({ businesses, onSuccess }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('พนักงาน');
  const [selectedBizs, setSelectedBizs] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [accessLevel, setAccessLevel] = useState('Own Data');
  const [saving, setSaving] = useState(false);
  // Change-password modal
  const [cpModal, setCpModal] = useState(null);
  const [cpCur, setCpCur] = useState(''); const [cpNew, setCpNew] = useState(''); const [cpConfirm, setCpConfirm] = useState('');
  const [cpSaving, setCpSaving] = useState(false);

  useEffect(() => {
    userAPI.getAll()
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const ALL_FEATURES = FEATURE_LIST.map(f => f.id);

  const openAdd = () => {
    setEditingId(null); setName(''); setUsername(''); setPassword(''); setPhone(''); setRole('พนักงาน');
    setSelectedBizs([]); setSelectedFeatures(ALL_FEATURES); setAccessLevel('Own Data');
    setIsDrawerOpen(true);
  };
  const openEdit = (u) => {
    setEditingId(u.id); setName(u.name||''); setUsername(u.username||''); setPassword('');
    setPhone(u.phone||''); setRole(u.role||'พนักงาน');
    setSelectedBizs(u.business_ids||[]); setSelectedFeatures(u.features||[]); setAccessLevel(u.access_level||'Own Data');
    setIsDrawerOpen(true);
  };
  const handleDelete = async (id, n) => {
    if (!confirm(`ลบผู้ใช้ "${n}" หรือไม่?`)) return;
    await userAPI.delete(id).catch(() => {});
    setUsers(prev => prev.filter(u => u.id !== id));
  };
  const toggleBiz = (id) => setSelectedBizs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleFeat = (id) => setSelectedFeatures(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!username.trim()) return alert('กรุณากรอก Username');
    if (!editingId && !password) return alert('กรุณากรอก Password สำหรับผู้ใช้ใหม่');
    setSaving(true);
    const data = {
      name: name||username, username, phone, role,
      business_ids: selectedBizs, features: selectedFeatures, access_level: accessLevel,
      ...(password ? { password } : {})
    };
    try {
      if (editingId) {
        const updated = await userAPI.update(editingId, data);
        setUsers(prev => prev.map(u => u.id === editingId ? { ...u, ...updated } : u));
        setIsDrawerOpen(false);
        onSuccess('อัปเดตผู้ใช้สำเร็จ ✅');
      } else {
        const created = await userAPI.create(data);
        setUsers(prev => [...prev, created]);
        setIsDrawerOpen(false);
        onSuccess('เพิ่มผู้ใช้สำเร็จ ✅');
      }
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleChangePw = async () => {
    if (cpNew !== cpConfirm) return alert('รหัสผ่านใหม่ไม่ตรงกัน');
    if (cpNew.length < 4) return alert('รหัสผ่านต้องมีอย่างน้อย 4 ตัว');
    setCpSaving(true);
    try {
      const res = await fetch(`/api/users/${cpModal.id}/change-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: cpCur, new_password: cpNew })
      });
      const data = await res.json();
      if (res.ok) { setCpModal(null); setCpCur(''); setCpNew(''); setCpConfirm(''); onSuccess('เปลี่ยนรหัสผ่านสำเร็จ ✅'); }
      else alert('เกิดข้อผิดพลาด: ' + data.error);
    } catch (err) { alert(err.message); }
    finally { setCpSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Change Password Modal ── */}
      {cpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800">เปลี่ยนรหัสผ่าน</h3>
                <p className="text-slate-500 text-sm mt-0.5">{cpModal.name} · @{cpModal.username}</p>
              </div>
              <button onClick={() => setCpModal(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">รหัสผ่านปัจจุบัน</label>
                <input type="password" value={cpCur} onChange={e => setCpCur(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="รหัสผ่านเดิม" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">รหัสผ่านใหม่</label>
                <input type="password" value={cpNew} onChange={e => setCpNew(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="อย่างน้อย 4 ตัวอักษร" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">ยืนยันรหัสผ่านใหม่</label>
                <input type="password" value={cpConfirm} onChange={e => setCpConfirm(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="พิมพ์ซ้ำอีกครั้ง" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCpModal(null)} className="flex-1 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50">ยกเลิก</button>
              <button onClick={handleChangePw} disabled={cpSaving}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {cpSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">จัดการสิทธิ์ผู้ใช้งาน</h2>
          <p className="text-slate-500 text-sm mt-1">User Management & Permissions</p>
        </div>
        <button onClick={openAdd} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-bold flex items-center gap-2 shadow-md">
          <Plus size={18} /> เพิ่มพนักงาน
        </button>
      </div>

      {users.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p>ยังไม่มีผู้ใช้งาน กด "เพิ่มพนักงาน" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {users.map(user => (
            <div key={user.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-black text-slate-800 text-lg">{user.name}</h3>
                  <p className="text-sm font-mono text-slate-500 mt-0.5">@{user.username}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold mt-1.5 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">
                    ✅ พร้อมใช้งาน
                  </span>
                </div>
                <Badge type={user.role === 'เจ้าของธุรกิจ' ? 'owner' : user.role === 'ผู้จัดการ' ? 'manager' : 'staff'}>{user.role}</Badge>
              </div>
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => openEdit(user)}
                  className="flex-1 py-2.5 bg-blue-50 text-blue-600 text-sm font-bold rounded-xl hover:bg-blue-100 flex items-center justify-center gap-2 border border-blue-100">
                  <Settings size={16} /> จัดการสิทธิ์
                </button>
                <button onClick={() => { setCpModal(user); setCpCur(''); setCpNew(''); setCpConfirm(''); }}
                  className="flex-1 py-2.5 bg-amber-50 text-amber-700 text-sm font-bold rounded-xl hover:bg-amber-100 flex items-center justify-center gap-2 border border-amber-200">
                  🔑 เปลี่ยนรหัส
                </button>
                <button onClick={() => handleDelete(user.id, user.name)}
                  className="px-4 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded-xl transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Drawer: เพิ่ม/แก้ไขผู้ใช้ ── */}
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}
        title={editingId ? `แก้ไข: ${name||username}` : 'เพิ่มพนักงานใหม่'}
        description={editingId ? 'แก้ไขข้อมูล สิทธิ์ และ Password' : 'กรอก Username + Password เพื่อสร้าง Account'}>
        <form onSubmit={handleSave} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">

            {/* ── Section 1: Account ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <h3 className="font-bold text-slate-800">ข้อมูล Account</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">ชื่อ-นามสกุล</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="เช่น สมชาย ใจดี (ไม่บังคับ)" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Username <span className="text-rose-500">*</span></label>
                    <input type="text" required value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                      placeholder="เช่น somchai01" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Password {editingId
                        ? <span className="text-slate-400 font-normal text-xs">(เว้นว่าง = ไม่เปลี่ยน)</span>
                        : <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'}
                        value={password} onChange={e => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                        placeholder={editingId ? "เว้นว่าง = ไม่เปลี่ยน" : "ตั้งรหัสผ่าน"} />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPw ? <EyeOff size={18}/> : <Eye size={18}/>}
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">เบอร์โทร</label>
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="08X-XXX-XXXX" />
                </div>
              </div>
            </section>

            {/* ── Section 2: บทบาท ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <h3 className="font-bold text-slate-800">บทบาทและระดับการเข้าถึง</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {['เจ้าของธุรกิจ','ผู้จัดการ','พนักงาน'].map(r => (
                  <button key={r} type="button" onClick={() => setRole(r)}
                    className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${role===r ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </section>

            {/* ── Section 3: สาขา ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <h3 className="font-bold text-slate-800">สาขาที่เข้าถึงได้</h3>
              </div>
              <div className="space-y-2">
                {businesses.filter(b => b.status === 'Active').map(biz => (
                  <label key={biz.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedBizs.includes(biz.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={selectedBizs.includes(biz.id)} onChange={() => toggleBiz(biz.id)} className="w-5 h-5 text-blue-600 rounded" />
                    <BizIcon biz={biz} size="sm" />
                    <span className="text-sm font-bold text-slate-700">{biz.name}</span>
                  </label>
                ))}
                {businesses.filter(b => b.status === 'Active').length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">ยังไม่มีสาขาที่เปิดใช้งาน</p>
                )}
              </div>
            </section>

            {/* ── Section 4: สิทธิ์เมนู ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <h3 className="font-bold text-slate-800">เมนูที่เข้าถึงได้</h3>
                <button type="button" onClick={() => setSelectedFeatures(selectedFeatures.length === ALL_FEATURES.length ? [] : ALL_FEATURES)}
                  className="ml-auto text-xs text-blue-600 font-bold hover:underline">
                  {selectedFeatures.length === ALL_FEATURES.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                </button>
              </div>
              {/* Mini sidebar preview */}
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <div className="px-3 py-2 bg-zinc-50 border-b border-slate-200 flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-zinc-900 flex items-center justify-center"><Wallet size={11} className="text-white" /></div>
                  <span className="text-[11px] font-bold text-zinc-700">P'KEEP Sidebar Preview</span>
                </div>
                <div className="p-2 space-y-0.5">
                  {(() => {
                    const IconMap = { LayoutDashboard, TrendingUp, TrendingDown, List, FileEdit, Receipt, FilePlus, FileText, Building2, Users };
                    return FEATURE_LIST.map(f => {
                      const Icon = IconMap[f.menuIcon] || LayoutDashboard;
                      const active = selectedFeatures.includes(f.id);
                      return (
                        <button key={f.id} type="button" onClick={() => toggleFeat(f.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${active
                            ? 'bg-zinc-100 text-zinc-900 border border-zinc-200'
                            : 'text-slate-300 hover:bg-slate-50'}`}>
                          <Icon size={16} className={active ? 'text-zinc-600' : 'text-slate-300'} />
                          <span className={active ? '' : 'line-through decoration-slate-200'}>{f.label}</span>
                          <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>
                            {active ? 'เปิด' : 'ปิด'}
                          </span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </section>
          </div>

          {/* ── Sticky footer ── */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 flex gap-3">
            <button type="button" onClick={() => setIsDrawerOpen(false)}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100">
              ยกเลิก
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : <><Check size={16} /> บันทึก</>}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};


// ═══════════════════════════════════════════════════════
// ─── DOCUMENTS MODULE ──────────────────────────────────
// ═══════════════════════════════════════════════════════

const DOC_TYPES = [
  { id: 'QO', label: 'ใบเสนอราคา', labelEn: 'Quotation', color: 'blue', icon: '📋' },
  { id: 'IV', label: 'ใบแจ้งหนี้/ใบวางบิล', labelEn: 'Invoice', color: 'amber', icon: '📄' },
  { id: 'RC', label: 'ใบเสร็จรับเงิน', labelEn: 'Receipt', color: 'emerald', icon: '🧾' },
];

const DOC_STATUS = {
  draft:     { label: 'ร่าง',       color: 'bg-slate-100 text-slate-600' },
  sent:      { label: 'ส่งแล้ว',    color: 'bg-blue-100 text-blue-700' },
  paid:      { label: 'ชำระแล้ว',   color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'ยกเลิก',     color: 'bg-rose-100 text-rose-700' },
};

const fmt = (n) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const formatDocDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
};

// ── PDF Generator (html→print) ──
const generatePDF = (doc, biz, settings) => {
  const typeInfo = DOC_TYPES.find(t => t.id === doc.doc_type) || DOC_TYPES[0];
  const items = Array.isArray(doc.items) ? doc.items : JSON.parse(doc.items || '[]');
  const sig = (settings && 'signature_image' in settings) ? settings.signature_image : doc.signature_image;
  const issuerAddress = biz?.tax_address || '135/9 หมู่ที่ 10 ตำบลสุเทพ อำเภอเมืองเชียงใหม่ จ.เชียงใหม่ 50200';
  const issuerTaxId = biz?.tax_id || biz?.business_tax_id || '';
  const issuerName = biz?.tax_name || biz?.name || '';

  const html = `<!DOCTYPE html><html lang="th">
<head>
<meta charset="UTF-8"/><title>${doc.doc_number} - ${typeInfo.label}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Sarabun',sans-serif;font-size:13px;color:#1e293b;background:#fff;padding:24px;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e2e8f0;}
  .doc-title{font-size:26px;font-weight:700;color:#1e293b;}
  .doc-sub{font-size:13px;color:#64748b;margin-top:2px;}
  .logo-box{width:64px;height:64px;background:#f1f5f9;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:28px;overflow:hidden;}.logo-box img{width:100%;height:100%;object-fit:contain;border-radius:12px;}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;}
  .info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;}
  .info-box h4{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;}
  .info-row{display:flex;gap:8px;margin-bottom:4px;font-size:12px;}
  .info-label{color:#64748b;min-width:80px;flex-shrink:0;}
  .info-val{font-weight:600;color:#1e293b;}
  table.items{width:100%;border-collapse:collapse;margin-bottom:16px;}
  table.items thead tr{background:#1e293b;color:#fff;}
  table.items thead th{padding:9px 12px;font-size:12px;font-weight:600;}
  table.items tbody tr:nth-child(even){background:#f8fafc;}
  table.items tbody td{padding:8px 12px;font-size:12px;border-bottom:1px solid #e2e8f0;vertical-align:top;}
  .totals-wrap{display:flex;gap:16px;align-items:flex-start;margin-bottom:20px;}
  .remarks-side{flex:1;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:12px;min-height:60px;}
  .totals{display:flex;justify-content:flex-end;flex-shrink:0;}
  .totals-box{min-width:260px;}
  .total-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #f1f5f9;}
  .total-final{display:flex;justify-content:space-between;padding:10px 14px;background:#f1f5f9;color:#1e293b;border-radius:8px;font-size:15px;font-weight:700;margin-top:6px;border:2px solid #e2e8f0;}
  .footer{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;}
  .sig-box{text-align:center;display:flex;flex-direction:column;justify-content:flex-end;}
  .sig-line{border-bottom:1px dashed #94a3b8;margin:32px 12px 6px;}
  .sig-img{max-height:60px;max-width:140px;margin:0 auto 4px;display:block;}
  .sig-name{font-size:12px;font-weight:600;color:#475569;}
  .sig-label{font-size:11px;color:#94a3b8;margin-top:2px;}
  .remarks{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;}
  @media print{body{padding:0!important;}@page{margin:15mm;size:A4 portrait;}}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="doc-title">${doc.doc_type === 'RC' ? 'ใบเสร็จรับเงิน/ใบกำกับภาษี' : typeInfo.label}</div>
    <div class="doc-sub">${doc.doc_type === 'RC' ? 'Receipt / Tax Invoice (ต้นฉบับ / Original)' : typeInfo.labelEn + ' (ต้นฉบับ / original)'}</div>
  </div>
  <div class="logo-box">${biz?.icon && biz.icon.startsWith('data:') ? `<img src="${biz.icon}" alt="logo"/>` : (biz?.icon || '🏪')}</div>
</div>

<div class="info-grid">
  <div class="info-box">
    <h4>ลูกค้า / Customer</h4>
    <div class="info-row"><span class="info-label">ชื่อ</span><span class="info-val">${doc.customer_name || '-'}</span></div>
    <div class="info-row"><span class="info-label">ที่อยู่</span><span class="info-val">${doc.customer_address || '-'}</span></div>
    <div class="info-row"><span class="info-label">เลขภาษี</span><span class="info-val">${doc.customer_tax_id || '-'}</span></div>
    <div class="info-row"><span class="info-label">โทร</span><span class="info-val">${doc.customer_phone || '-'}</span></div>
    <div class="info-row"><span class="info-label">อีเมล</span><span class="info-val">${doc.customer_email || '-'}</span></div>
  </div>
  <div class="info-box">
    <h4>รายละเอียดเอกสาร</h4>
    <div class="info-row"><span class="info-label">เลขที่</span><span class="info-val">${doc.doc_number}</span></div>
    <div class="info-row"><span class="info-label">วันที่</span><span class="info-val">${formatDocDate(doc.issue_date)}</span></div>
    ${doc.valid_date ? `<div class="info-row"><span class="info-label">ใช้ได้ถึง</span><span class="info-val">${formatDocDate(doc.valid_date)}</span></div>` : ''}
    ${doc.ref_doc ? `<div class="info-row"><span class="info-label">อ้างอิง</span><span class="info-val">${doc.ref_doc}</span></div>` : ''}
    <div class="info-row"><span class="info-label">ผู้ออก</span><span class="info-val">${issuerName}</span></div>
    <div class="info-row"><span class="info-label">เลขภาษีผู้ออก</span><span class="info-val">${issuerTaxId}</span></div>
  </div>
</div>

<table class="items">
  <thead>
    <tr>
      <th style="width:40px;text-align:center">รหัส</th>
      <th style="text-align:left">รายการ</th>
      <th style="width:70px;text-align:center">จำนวน</th>
      <th style="width:60px;text-align:center">หน่วย</th>
      <th style="width:100px;text-align:right">ราคา/หน่วย</th>
      <th style="width:110px;text-align:right">มูลค่า</th>
    </tr>
  </thead>
  <tbody>
    ${items.map((item, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${item.description || ''}</td>
      <td style="text-align:center">${item.qty || 1}</td>
      <td style="text-align:center">${item.unit || 'หน่วย'}</td>
      <td style="text-align:right">${fmt(item.unit_price)}</td>
      <td style="text-align:right;font-weight:600">${fmt((item.qty || 1) * (item.unit_price || 0))}</td>
    </tr>`).join('')}
  </tbody>
</table>

<div class="totals-wrap">
  <div class="remarks-side">
    ${doc.remarks ? `<strong>หมายเหตุ:</strong> ${doc.remarks}` : '<span style="color:#94a3b8">-</span>'}
  </div>
  <div class="totals">
    <div class="totals-box">
      <div class="total-row"><span>รวมเป็นเงิน</span><span>฿${fmt(doc.subtotal)}</span></div>
      ${Number(doc.discount) > 0 ? `<div class="total-row"><span>ส่วนลด</span><span>-฿${fmt(doc.discount)}</span></div>` : ''}
      ${Number(doc.vat) > 0 ? `<div class="total-row"><span>ภาษีมูลค่าเพิ่ม 7%</span><span>+฿${fmt(doc.vat)}</span></div>` : ''}
      ${Number(doc.wht_amount) > 0 ? `<div class="total-row"><span>หัก ณ ที่จ่าย ${doc.wht_rate}%</span><span>-฿${fmt(doc.wht_amount)}</span></div>` : ''}
      <div class="total-final"><span>จำนวนเงินรวมทั้งสิ้น</span><span>฿${fmt(doc.total)}</span></div>
    </div>
  </div>
</div>

${doc.doc_type === 'RC' ? `
<div class="footer" style="grid-template-columns:1fr 1fr;">
  <div class="sig-box">
    ${sig ? '<div style="height:64px;display:block;"></div>' : ''}
    <div class="sig-line"></div>
    <div class="sig-name">ผู้จ่ายเงิน / Paid by</div>
    <div class="sig-label">วันที่ / Date ................................</div>
  </div>
  <div class="sig-box">
    ${sig ? `<img class="sig-img" src="${sig}" alt="signature"/>` : '<div class="sig-line"></div>'}
    <div class="sig-name">ผู้รับเงิน / Received by</div>
    <div class="sig-label">วันที่ / Date ................................</div>
  </div>
</div>` : `
<div class="footer">
  <div class="sig-box">
    ${sig ? `<img class="sig-img" src="${sig}" alt="signature"/>` : '<div class="sig-line"></div>'}
    <div class="sig-name">อนุมัติโดย / Approved by</div>
    <div class="sig-label">วันที่ / Date ................................</div>
  </div>
  <div class="sig-box">
    <div class="sig-line"></div>
    <div class="sig-name">${doc.doc_type === 'QO' ? 'ยอมรับใบเสนอราคา / Accepted by' : 'ผู้รับใบแจ้งหนี้ / Accepted by'}</div>
    <div class="sig-label">วันที่ / Date ................................</div>
  </div>
</div>`}
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
};

// ── DocumentForm Component ──
const DocumentForm = ({ businesses, user, onClose, onSaved, editDoc, prefillDoc }) => {
  const src = editDoc || prefillDoc || {};
  const [bizId, setBizId] = useState(src.business_id || (businesses[0]?.id || ''));
  const [docType, setDocType] = useState(src.doc_type || 'QO');
  const [docNumber, setDocNumber] = useState(editDoc?.doc_number || '');
  const [customerName, setCustomerName] = useState(src.customer_name || '');
  const [customerAddr, setCustomerAddr] = useState(src.customer_address || '');
  const [customerTax, setCustomerTax] = useState(src.customer_tax_id || '');
  const [customerEmail, setCustomerEmail] = useState(src.customer_email || '');
  const [customerPhone, setCustomerPhone] = useState(src.customer_phone || '');
  const [issueDate, setIssueDate] = useState(editDoc?.issue_date || todayTH());
  const [validDate, setValidDate] = useState(editDoc?.valid_date || '');
  const [refDoc, setRefDoc] = useState(src.ref_doc || '');
  const [items, setItems] = useState(() => {
    const rawItems = editDoc?.items || prefillDoc?.items;
    if (rawItems) return Array.isArray(rawItems) ? rawItems : JSON.parse(rawItems);
    return [{ description: '', qty: 1, unit: 'หน่วย', unit_price: 0 }];
  });
  const [discount, setDiscount] = useState(editDoc?.discount_input ?? editDoc?.discount ?? 0);
  const [discountType, setDiscountType] = useState(editDoc?.discount_type || 'amount'); // 'amount' | 'percent'
  const [useVat, setUseVat] = useState(false);
  const [whtRate, setWhtRate] = useState(0); // 0, 1, 1.5, 3, 5, 10, 15
  const [remarks, setRemarks] = useState(editDoc?.remarks || '');
  const [saving, setSaving] = useState(false);
  const [loadingNum, setLoadingNum] = useState(!editDoc);

  const typeInfo = DOC_TYPES.find(t => t.id === docType);
  const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unit_price) || 0), 0);
  const discountAmt = discountType === 'percent'
    ? subtotal * (Math.min(Number(discount) || 0, 100) / 100)
    : (Number(discount) || 0);
  const afterDiscount = subtotal - discountAmt;
  const vatAmt = useVat ? afterDiscount * 0.07 : 0;
  const whtAmt = Number(whtRate) > 0 ? afterDiscount * (Number(whtRate) / 100) : 0;
  const total = afterDiscount + vatAmt - whtAmt;

  useEffect(() => {
    if (!editDoc && bizId && docType) {
      setLoadingNum(true);
      documentAPI.nextNumber(bizId, docType)
        .then(r => { setDocNumber(r.doc_number); setLoadingNum(false); })
        .catch(() => setLoadingNum(false));
    }
  }, [bizId, docType]);

  const addItem = () => setItems(prev => [...prev, { description: '', qty: 1, unit: 'หน่วย', unit_price: 0 }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const handleSave = async () => {
    if (!customerName.trim()) return alert('กรุณากรอกชื่อลูกค้า');
    if (items.length === 0) return alert('กรุณาเพิ่มรายการอย่างน้อย 1 รายการ');
    setSaving(true);
    const data = {
      business_id: bizId, doc_type: docType, customer_name: customerName,
      customer_address: customerAddr, customer_tax_id: customerTax,
      customer_email: customerEmail, customer_phone: customerPhone,
      issue_date: issueDate, valid_date: validDate || null, ref_doc: refDoc || null,
      items, subtotal, discount: discountAmt, discount_type: discountType, discount_input: Number(discount) || 0, total,
      remarks, created_by: user?.id || null,
    };
    try {
      let saved;
      if (editDoc) saved = await documentAPI.update(editDoc.id, { ...data, status: editDoc.status });
      else saved = await documentAPI.create(data);
      onSaved(saved, !editDoc);
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* ─ Section 1: ประเภท + สาขา ─ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <h3 className="font-bold text-slate-800">ประเภทเอกสารและสาขา</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {DOC_TYPES.map(t => (
              <button key={t.id} type="button" onClick={() => !editDoc && !prefillDoc && setDocType(t.id)} disabled={!!editDoc || !!prefillDoc}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${docType === t.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'} ${(editDoc || prefillDoc) ? 'opacity-60 cursor-not-allowed' : ''}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">สาขา <span className="text-rose-500">*</span></label>
              <select value={bizId} onChange={e => setBizId(Number(e.target.value))} disabled={!!editDoc}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm">
                {businesses.filter(b => b.status === 'Active').map(b => (
                  <option key={b.id} value={b.id}>{b.icon && !b.icon.startsWith("data:") ? b.icon + " " : ""}{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">เลขที่เอกสาร</label>
              <input type="text" value={loadingNum ? 'กำลังสร้างเลข...' : docNumber} readOnly
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-mono text-sm outline-none" />
            </div>
          </div>
        </section>

        {/* ─ Section 2: ข้อมูลลูกค้า ─ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <h3 className="font-bold text-slate-800">ข้อมูลลูกค้า</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">ชื่อ/บริษัท <span className="text-rose-500">*</span></label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="เช่น บริษัท ABC จำกัด" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">ที่อยู่</label>
              <textarea value={customerAddr} onChange={e => setCustomerAddr(e.target.value)} rows={2}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="ที่อยู่ลูกค้า" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">เลขภาษี</label>
                <input type="text" value={customerTax} onChange={e => setCustomerTax(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="13 หลัก" maxLength={13} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">โทร</label>
                <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="08X-XXX-XXXX" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">อีเมล</label>
              <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="email@example.com" />
            </div>
          </div>
        </section>

        {/* ─ Section 3: วันที่ ─ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <h3 className="font-bold text-slate-800">วันที่และอ้างอิง</h3>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">วันที่ออกเอกสาร</label>
                <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">ใช้ได้ถึง</label>
                <input type="date" value={validDate} onChange={e => setValidDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">เอกสารอ้างอิง</label>
              <input type="text" value={refDoc} onChange={e => setRefDoc(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                placeholder="เช่น QO-2568... (ถ้ามี)" />
            </div>
          </div>
        </section>

        {/* ─ Section 4: รายการสินค้า/บริการ ─ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <h3 className="font-bold text-slate-800">รายการสินค้า/บริการ</h3>
            </div>
            <button type="button" onClick={addItem}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 border border-blue-100">
              <Plus size={13} /> เพิ่มรายการ
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500">รายการที่ {i + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-rose-400 hover:text-rose-600 p-1">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <textarea value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                    rows={2} placeholder="คำอธิบายสินค้า/บริการ"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500 font-medium">จำนวน</label>
                      <input type="number" min="1" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-medium">หน่วย</label>
                      <input type="text" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="หน่วย" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-medium">ราคา/หน่วย (บาท)</label>
                    <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs text-slate-400">ยอดรายการ</span>
                    <span className="text-sm font-bold text-blue-700">฿{fmt((item.qty || 0) * (item.unit_price || 0))}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Totals */}
          <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
            <div className="flex justify-between text-sm text-slate-600">
              <span>รวมเป็นเงิน</span><span className="font-bold">฿{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>ส่วนลด</span>
              <div className="flex items-center gap-1">
                {/* Toggle ฿ / % */}
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
                  <button type="button"
                    onClick={() => setDiscountType('amount')}
                    className={`px-2.5 py-1.5 transition-colors ${discountType === 'amount' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                    ฿
                  </button>
                  <button type="button"
                    onClick={() => setDiscountType('percent')}
                    className={`px-2.5 py-1.5 transition-colors ${discountType === 'percent' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                    %
                  </button>
                </div>
                <input type="number" min="0" step="0.01"
                  max={discountType === 'percent' ? 100 : undefined}
                  value={discount} onChange={e => setDiscount(e.target.value)}
                  className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-right" />
                <span className="text-slate-400 w-4">{discountType === 'percent' ? '%' : '฿'}</span>
              </div>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>หลังหักส่วนลด{discountType === 'percent' ? ` (${Number(discount)}%)` : ''} (-฿{fmt(discountAmt)})</span>
                <span>฿{fmt(afterDiscount)}</span>
              </div>
            )}
            {/* VAT */}
            <div className="flex items-center justify-between text-sm text-slate-600 pt-1 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={useVat} onChange={e => setUseVat(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600" />
                <span className="font-medium">ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
              </label>
              <span className={useVat ? 'font-bold text-blue-600' : 'text-slate-300'}>+฿{fmt(vatAmt)}</span>
            </div>
            {/* WHT */}
            <div className="flex items-center justify-between text-sm text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="font-medium">หัก ณ ที่จ่าย</span>
              </label>
              <div className="flex items-center gap-2">
                <select value={whtRate} onChange={e => setWhtRate(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white">
                  <option value={0}>ไม่หัก</option>
                  <option value={1}>1%</option>
                  <option value={1.5}>1.5%</option>
                  <option value={2}>2%</option>
                  <option value={3}>3%</option>
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                  <option value={15}>15%</option>
                </select>
                <span className={Number(whtRate) > 0 ? 'font-bold text-rose-600 w-24 text-right' : 'text-slate-300 w-24 text-right'}>-฿{fmt(whtAmt)}</span>
              </div>
            </div>
            <div className="flex justify-between text-base font-black text-slate-800 pt-2 border-t-2 border-slate-200">
              <span>จำนวนเงินรวมทั้งสิ้น</span><span className="text-blue-700">฿{fmt(total)}</span>
            </div>
          </div>
        </section>

        {/* ─ Section 5: หมายเหตุ ─ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
            <h3 className="font-bold text-slate-800">หมายเหตุ</h3>
          </div>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            placeholder="หมายเหตุ/เงื่อนไขการชำระเงิน (ถ้ามี)" />
        </section>
      </div>

      {/* ─ Sticky footer ─ */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 flex gap-3">
        <button type="button" onClick={onClose}
          className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50">
          ยกเลิก
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : <><Check size={16} /> บันทึก</>}
        </button>
      </div>
    </div>
  );
};

// ── DocumentSettings Component ──
const DocumentSettings = ({ businesses, onClose }) => {
  const [bizId, setBizId] = useState(businesses[0]?.id || '');
  const [settings, setSettings] = useState({});
  const [sigPreview, setSigPreview] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!bizId) return;
    setSigPreview({}); // reset ก่อนทุกครั้งที่โหลดใหม่
    documentAPI.getSettings(bizId).then(rows => {
      const map = {};
      const newSigPreview = {};
      DOC_TYPES.forEach(t => {
        const row = rows.find(r => r.doc_type === t.id);
        map[t.id] = { prefix: row?.prefix || t.id, running_number: row?.running_number || 1,
          signature_image: row?.signature_image || null };
        newSigPreview[t.id] = row?.signature_image || null; // set เสมอ ไม่ว่าจะมีหรือไม่
      });
      setSettings(map);
      setSigPreview(newSigPreview);
    }).catch(() => {});
  }, [bizId]);

  const handleSigUpload = (docType, e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result;
      setSigPreview(p => ({ ...p, [docType]: b64 }));
      setSettings(p => ({ ...p, [docType]: { ...p[docType], signature_image: b64 } }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const t of DOC_TYPES) {
        const s = settings[t.id];
        if (!s) continue;
        await documentAPI.saveSettings({
          business_id: bizId, doc_type: t.id,
          prefix: s.prefix, running_number: Number(s.running_number) || 1,
          signature_image: 'signature_image' in s ? s.signature_image : (sigPreview[t.id] || null),
        });
      }
      onClose(true);
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">เลือกสาขา</label>
          <select value={bizId} onChange={e => setBizId(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none">
            {businesses.filter(b => b.status === 'Active').map(b => (
              <option key={b.id} value={b.id}>{b.icon && !b.icon.startsWith("data:") ? b.icon + " " : ""}{b.name}</option>
            ))}
          </select>
        </div>

        {DOC_TYPES.map(t => (
          <div key={t.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-4">{t.icon} {t.label}</h4>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">ตัวย่อเอกสาร (Prefix)</label>
                <input type="text" value={settings[t.id]?.prefix || t.id}
                  onChange={e => setSettings(p => ({ ...p, [t.id]: { ...p[t.id], prefix: e.target.value.toUpperCase() } }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                  placeholder={t.id} maxLength={10} />
                <p className="text-xs text-slate-400 mt-1">ตัวอย่าง: {settings[t.id]?.prefix || t.id}-256803{String(settings[t.id]?.running_number || 1).padStart(5,'0')}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">เลขรันเริ่มต้น</label>
                <input type="number" min="1" value={settings[t.id]?.running_number || 1}
                  onChange={e => setSettings(p => ({ ...p, [t.id]: { ...p[t.id], running_number: e.target.value } }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            {/* Signature */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">ลายเซ็นอิเล็กทรอนิกส์</label>
              <div className="flex items-center gap-3">
                {sigPreview[t.id] ? (
                  <div className="relative">
                    <img src={sigPreview[t.id]} alt="sig" className="h-16 max-w-[160px] object-contain bg-white border border-slate-200 rounded-xl p-2" />
                    <button onClick={() => { setSigPreview(p => ({ ...p, [t.id]: null })); setSettings(p => ({ ...p, [t.id]: { ...p[t.id], signature_image: null } })); }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs">×</button>
                  </div>
                ) : (
                  <div className="w-32 h-16 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-xs">ยังไม่มีลายเซ็น</div>
                )}
                <label className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
                  <Upload size={14} /> อัปโหลด
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleSigUpload(t.id, e)} />
                </label>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">รองรับ PNG, JPG ขนาดไม่เกิน 2MB (พื้นหลังโปร่งใส PNG ดีที่สุด)</p>
            </div>
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 flex gap-3">
        <button onClick={() => onClose(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50">ยกเลิก</button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <><Loader2 size={16} className="animate-spin" /> บันทึก...</> : <><Check size={16} /> บันทึกการตั้งค่า</>}
        </button>
      </div>
    </div>
  );
};



// ─── PV EDIT MODAL ──────────────────────────────────
const PVEditModal = ({ pv, businesses, onClose, onSaved }) => {
  const fmt = (n) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(Number(n) || 0);
  const [payTo, setPayTo] = useState(pv.pay_to || '');
  const [docRef, setDocRef] = useState(pv.doc_ref || '');
  const [description, setDescription] = useState(pv.description || '');
  const [amount, setAmount] = useState(String(pv.amount || 0));
  const [payMethod, setPayMethod] = useState(pv.pay_method || 'โอน');
  const [chequeNo, setChequeNo] = useState(pv.cheque_no || '');
  const [chequeDate, setChequeDate] = useState(pv.cheque_date || '');
  const [branchNo, setBranchNo] = useState(pv.branch_no || '0');
  const [issueDate, setIssueDate] = useState(pv.issue_date || '');
  const [note, setNote] = useState(pv.note || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!payTo.trim()) return alert('กรุณาระบุชื่อร้านค้า/ผู้รับเงิน');
    setSaving(true);
    try {
      const updated = {
        ...pv,
        pay_to: payTo, doc_ref: docRef, description,
        amount: Number(amount), pay_method: payMethod,
        cheque_no: chequeNo, cheque_date: chequeDate,
        branch_no: branchNo, issue_date: issueDate, note,
      };
      await pvAPI.update(pv.id, updated);
      onSaved(updated);
    } catch(e) {
      alert('เกิดข้อผิดพลาด: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-blue-50 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-black text-blue-900">แก้ไขใบสำคัญจ่าย</h2>
            <p className="text-xs text-blue-700 mt-0.5">{pv.pv_no}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-blue-100 text-blue-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">วันที่เอกสาร</label>
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-400 outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">จำนวนเงิน (฿)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-400 outline-none text-sm font-bold text-rose-600" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">จ่ายให้แก่ (ชื่อร้านค้า/ผู้รับเงิน) <span className="text-rose-500">*</span></label>
            <input value={payTo} onChange={e => setPayTo(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-400 outline-none text-sm"
              placeholder="ชื่อร้านค้า/ผู้รับเงิน..." />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">ช่องทางการจ่าย</label>
            <div className="flex gap-2">
              {['โอน','เงินสด','เช็คธนาคาร'].map(m => (
                <button key={m} type="button" onClick={() => setPayMethod(m)}
                  className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${payMethod === m ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}>
                  {m}
                </button>
              ))}
            </div>
            {payMethod === 'เช็คธนาคาร' && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">เลขที่เช็ค</label>
                  <input value={chequeNo} onChange={e => setChequeNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">เช็คลงวันที่</label>
                  <input type="date" value={chequeDate} onChange={e => setChequeDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">เลขที่เอกสารอ้างอิง</label>
              <input value={docRef} onChange={e => setDocRef(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-400 outline-none text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">สาขา</label>
              <input value={branchNo} onChange={e => setBranchNo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-400 outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">รายการ / Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-400 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">หมายเหตุ</label>
            <input value={note} onChange={e => setNote(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-400 outline-none text-sm" />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-sm hover:bg-slate-50">ยกเลิก</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? <><Loader2 size={15} className="animate-spin" /> บันทึก...</> : <><Check size={15} /> บันทึกการแก้ไข</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── PAYMENT VOUCHERS PAGE ──────────────────────────
const PaymentVouchersPage = ({ businesses, user, onSuccess }) => {
  const [pvs, setPvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [previewPv, setPreviewPv] = useState(null);
  const [editPv, setEditPv] = useState(null);
  const [pvImages, setPvImages] = useState({});
  const [loadingImages, setLoadingImages] = useState({});
  const [lightbox, setLightbox] = useState(null);
  const openLightbox = (images, index = 0) => setLightbox({ images, index });
  const closeLightbox = () => setLightbox(null);
  const fmt = (n) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(Number(n) || 0);

  const loadPvs = useCallback(async () => {
    setLoading(true);
    try { setPvs(await pvAPI.getAll()); } catch { setPvs([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPvs(); }, [loadPvs]);

  const filtered = pvs.filter(p =>
    !search || (p.pv_no || '').toLowerCase().includes(search.toLowerCase())
      || (p.pay_to || '').includes(search)
      || (p.description || '').includes(search)
  );

  // โหลดรูปภาพสำหรับ tx_id ที่ยังไม่เคยโหลด
  const loadImages = async (txId) => {
    if (!txId || pvImages[txId] !== undefined) return;
    setLoadingImages(prev => ({ ...prev, [txId]: true }));
    try {
      const imgs = await imageAPI.getAll(txId);
      setPvImages(prev => ({ ...prev, [txId]: Array.isArray(imgs) ? imgs : [] }));
    } catch {
      setPvImages(prev => ({ ...prev, [txId]: [] }));
    } finally {
      setLoadingImages(prev => ({ ...prev, [txId]: false }));
    }
  };

  // โหลดรูปของทุก PV ที่มี tx_id เมื่อ list เปลี่ยน
  useEffect(() => {
    pvs.forEach(pv => { if (pv.tx_id) loadImages(pv.tx_id); });
  }, [pvs]);

  const handleDelete = async (id) => {
    if (!confirm('ลบใบสำคัญจ่ายนี้หรือไม่?')) return;
    try {
      await pvAPI.delete(id);
      await loadPvs();
      onSuccess('ลบสำเร็จ');
    } catch { onSuccess('เกิดข้อผิดพลาด', 'error'); }
  };

  const handleReprint = async (pv) => {
    const biz = businesses.find(b => String(b.id) === String(pv.business_id));
    const settings = await pvAPI.getSettings().catch(() => ({}));
    generatePVPDF(pv, biz, settings);
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">ใบสำคัญจ่าย</h2>
          <p className="text-slate-500 text-sm mt-1">Payment Voucher — เอกสารทั้งหมด</p>
        </div>
        <button onClick={() => setSettingsOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-bold">
          <Settings size={16} /> ตั้งค่า
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาเลขที่, ชื่อผู้รับ, รายการ..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-400 outline-none text-sm" />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <FileEdit size={48} className="mx-auto mb-3 opacity-30" />
          <p>ยังไม่มีใบสำคัญจ่าย — ออกใบสำคัญจ่ายได้จากหน้ารายการธุรกรรม</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">เลขที่</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">วันที่</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">จ่ายให้แก่</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">รายการ</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">รูปแนบ</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">จำนวนเงิน</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(pv => {
                  const imgs = pvImages[pv.tx_id] || [];
                  const isLoadingImg = loadingImages[pv.tx_id];
                  return (
                    <tr key={pv.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-amber-700">{pv.pv_no}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{pv.issue_date}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{pv.pay_to}</td>
                      <td className="px-4 py-3 text-slate-600">{pv.description}</td>
                      <td className="px-4 py-3">
                        {isLoadingImg ? (
                          <Loader2 size={14} className="animate-spin text-slate-300" />
                        ) : imgs.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {imgs.map((img, idx) => (
                              <img key={img.id} src={img.file_data} alt={img.file_name}
                                className="w-9 h-9 object-cover rounded-lg border border-slate-200 cursor-pointer hover:scale-110 transition-transform"
                                onClick={() => openLightbox(imgs, idx)} />
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-800">฿{fmt(pv.amount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setPreviewPv(pv)} title="ดูรายละเอียด"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
                            <Eye size={15} />
                          </button>
                          <button onClick={() => setEditPv(pv)} title="แก้ไข"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => handleReprint(pv)} title="พิมพ์ PDF"
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50">
                            <Printer size={15} />
                          </button>
                          <button onClick={() => handleDelete(pv.id)} title="ลบ"
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map(pv => {
              const imgs = pvImages[pv.tx_id] || [];
              return (
              <div key={pv.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-black font-mono text-amber-700">{pv.pv_no}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{pv.issue_date} · {pv.business_name}</div>
                  </div>
                  <div className="text-base font-black text-slate-800">฿{fmt(pv.amount)}</div>
                </div>
                <div className="text-sm text-slate-700 mb-1"><span className="text-slate-400 text-xs">จ่ายให้แก่ </span>{pv.pay_to}</div>
                <div className="text-xs text-slate-500 mb-2">{pv.description}</div>
                {imgs.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mb-2 p-2 bg-slate-50 rounded-xl">
                    <span className="text-xs text-slate-400 w-full mb-1 flex items-center gap-1"><ImageIcon size={11} /> รูปแนบ ({imgs.length})</span>
                    {imgs.map((img, idx) => (
                      <img key={img.id} src={img.file_data} alt={img.file_name}
                        className="w-14 h-14 object-cover rounded-lg border border-slate-200 cursor-pointer"
                        onClick={() => openLightbox(imgs, idx)} />
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100">
                  <button onClick={() => setPreviewPv(pv)}
                    className="flex flex-col items-center gap-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-100">
                    <Eye size={14} /><span>ดู</span>
                  </button>
                  <button onClick={() => setEditPv(pv)}
                    className="flex flex-col items-center gap-1 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold border border-blue-100 hover:bg-blue-100">
                    <Edit2 size={14} /><span>แก้ไข</span>
                  </button>
                  <button onClick={() => handleReprint(pv)}
                    className="flex flex-col items-center gap-1 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-200 hover:bg-amber-100">
                    <Printer size={14} /><span>พิมพ์</span>
                  </button>
                  <button onClick={() => handleDelete(pv.id)}
                    className="flex flex-col items-center gap-1 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold border border-rose-100 hover:bg-rose-100">
                    <Trash2 size={14} /><span>ลบ</span>
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Preview Modal ── */}
      {previewPv && (() => {
        const biz = businesses.find(b => String(b.id) === String(previewPv.business_id));
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setPreviewPv(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
                <div>
                  <div className="font-black font-mono text-amber-700 text-lg">{previewPv.pv_no}</div>
                  <div className="text-xs text-slate-400 mt-0.5">ใบสำคัญจ่าย · {previewPv.issue_date}</div>
                </div>
                <button onClick={() => setPreviewPv(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-xs text-slate-400 mb-1">จ่ายให้แก่</div>
                    <div className="font-semibold text-slate-800">{previewPv.pay_to}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-xs text-slate-400 mb-1">ช่องทาง</div>
                    <div className="font-semibold text-slate-800">{previewPv.pay_method}</div>
                    {previewPv.cheque_no && <div className="text-xs text-slate-500 mt-0.5">เช็ค: {previewPv.cheque_no}</div>}
                  </div>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-800 text-white">
                      <th className="px-3 py-2 text-left text-xs font-semibold">วันที่</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">เลขที่เอกสาร</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">รายการ</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold">จำนวนเงิน</th>
                    </tr></thead>
                    <tbody><tr className="bg-white">
                      <td className="px-3 py-2 text-xs text-slate-600">{previewPv.issue_date}</td>
                      <td className="px-3 py-2 text-xs font-mono text-slate-700">{previewPv.doc_ref||'—'}</td>
                      <td className="px-3 py-2 text-xs text-slate-700">{previewPv.description}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-800">฿{fmt(previewPv.amount)}</td>
                    </tr></tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between bg-slate-800 text-white rounded-xl px-4 py-3">
                  <span className="font-semibold text-sm">จำนวนเงินรวมทั้งสิ้น</span>
                  <span className="font-black text-xl">฿{fmt(previewPv.amount)}</span>
                </div>
                {previewPv.note && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800"><span className="font-bold">หมายเหตุ: </span>{previewPv.note}</div>}
                {/* รูปภาพแนบ */}
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                    <ImageIcon size={13} /> รูปภาพหลักฐาน
                    {loadingImages[previewPv.tx_id] && <Loader2 size={12} className="animate-spin text-slate-400" />}
                  </div>
                  {(pvImages[previewPv.tx_id] || []).length === 0 && !loadingImages[previewPv.tx_id] ? (
                    <div className="text-xs text-slate-300 bg-slate-50 rounded-xl p-3 text-center">ไม่มีรูปภาพแนบ</div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      {(pvImages[previewPv.tx_id] || []).map((img, idx) => (
                        <div key={img.id} className="relative group cursor-pointer" onClick={() => openLightbox(pvImages[previewPv.tx_id] || [], idx)}>
                          <img src={img.file_data} alt={img.file_name}
                            className="w-20 h-20 object-cover rounded-xl border-2 border-slate-200 hover:border-amber-400 transition-all" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-all flex items-center justify-center">
                            <Eye size={16} className="text-white opacity-0 group-hover:opacity-100 transition-all" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-400">สาขา: {previewPv.business_name} · บันทึกโดย: {previewPv.created_by}</div>
              </div>
              <div className="p-4 border-t border-slate-200 flex gap-2">
                <button onClick={() => { setPreviewPv(null); setEditPv(previewPv); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold border border-blue-100 hover:bg-blue-100">
                  <Edit2 size={14} /> แก้ไข
                </button>
                <button onClick={() => handleReprint(previewPv)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700">
                  <Printer size={14} /> พิมพ์ PDF
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Edit Modal ── */}
      {editPv && (
        <PVEditModal pv={editPv} businesses={businesses}
          onClose={() => setEditPv(null)}
          onSaved={async (updated) => {
            try {
              await pvAPI.update(updated.id, updated);
              await loadPvs();
              setEditPv(null);
              onSuccess('แก้ไขใบสำคัญจ่ายสำเร็จ ✅');
            } catch { onSuccess('เกิดข้อผิดพลาด', 'error'); }
          }} />
      )}

      {/* Settings Drawer */}
      <Drawer isOpen={settingsOpen} onClose={() => setSettingsOpen(false)}
        title="ตั้งค่าใบสำคัญจ่าย" description="ตัวย่อเลขที่, ลายเซ็นผู้อนุมัติ และผู้จ่ายเงิน">
        {settingsOpen && <PVSettings onClose={(saved) => { setSettingsOpen(false); if (saved) onSuccess('บันทึกการตั้งค่าสำเร็จ ✅'); }} />}
      </Drawer>

      {/* ── Lightbox Modal ── */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closeLightbox}>
          <div className="relative flex flex-col items-center max-w-4xl w-full px-4" onClick={e => e.stopPropagation()}>
            {/* Close */}
            <button onClick={closeLightbox}
              className="absolute top-0 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all z-10">
              <X size={24} />
            </button>
            {/* Image */}
            <img
              src={lightbox.images[lightbox.index].file_data}
              alt={lightbox.images[lightbox.index].file_name}
              className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl" />
            {/* Caption */}
            <div className="mt-3 text-white/60 text-sm">
              {lightbox.images[lightbox.index].file_name}
              {lightbox.images.length > 1 && (
                <span className="ml-2 text-white/40">{lightbox.index + 1} / {lightbox.images.length}</span>
              )}
            </div>
            {/* Prev / Next */}
            {lightbox.images.length > 1 && (
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setLightbox(p => ({ ...p, index: Math.max(0, p.index - 1) }))}
                  disabled={lightbox.index === 0}
                  className="px-5 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white rounded-xl text-sm font-bold transition-all">
                  ← ก่อนหน้า
                </button>
                <button
                  onClick={() => setLightbox(p => ({ ...p, index: Math.min(p.images.length - 1, p.index + 1) }))}
                  disabled={lightbox.index === lightbox.images.length - 1}
                  className="px-5 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white rounded-xl text-sm font-bold transition-all">
                  ถัดไป →
                </button>
              </div>
            )}
            {/* Thumbnails */}
            {lightbox.images.length > 1 && (
              <div className="flex gap-2 mt-3 flex-wrap justify-center">
                {lightbox.images.map((img, idx) => (
                  <img key={img.id} src={img.file_data} alt={img.file_name}
                    onClick={() => setLightbox(p => ({ ...p, index: idx }))}
                    className={`w-12 h-12 object-cover rounded-lg border-2 cursor-pointer transition-all ${idx === lightbox.index ? 'border-amber-400 scale-110' : 'border-white/20 hover:border-white/50'}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


// ─── RV SETTINGS ────────────────────────────────────────────────────
const RVSettings = ({ businesses, onClose }) => {
  const activeBiz = businesses.filter(b => b.status === 'Active');
  const [bizId, setBizId] = useState(activeBiz[0]?.id || '');
  const [prefix, setPrefix] = useState('RV');
  const [payerName, setPayerName] = useState('');
  const [payerSig, setPayerSig] = useState('');
  const [receiverSig, setReceiverSig] = useState('');
  const [saving, setSaving] = useState(false);

  // load global settings (prefix) once
  useEffect(() => {
    rvAPI.getSettings().then(data => {
      const g = data?.global || data || {};
      setPrefix(g.prefix || 'RV');
    }).catch(() => {});
  }, []);

  // load per-biz settings เมื่อ bizId เปลี่ยน
  useEffect(() => {
    if (!bizId) return;
    rvAPI.getSettings(bizId).then(data => {
      const b = data?.biz || {};
      setPayerName(b.payer_name || '');
      setPayerSig(b.payer_sig || '');
      setReceiverSig(b.receiver_sig || '');
    }).catch(() => {});
  }, [bizId]);

  const handleSigUpload = (e, who) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (who === 'payer') setPayerSig(ev.target.result);
      else setReceiverSig(ev.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // save global prefix
      await rvAPI.saveSettings({ prefix });
      // save per-biz sigs
      await rvAPI.saveSettings({ payer_name: payerName, payer_sig: payerSig, receiver_sig: receiverSig, business_id: bizId });
      onClose(true);
    } catch { onClose(false); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {/* เลือกธุรกิจ */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5">ตั้งค่าสำหรับธุรกิจ</label>
        <select value={bizId} onChange={e => setBizId(Number(e.target.value))}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm">
          {activeBiz.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <p className="text-xs text-slate-400 mt-1">ลายเซ็นและผู้จ่ายเงินตั้งค่าแยกกันแต่ละธุรกิจ</p>
      </div>

      {/* prefix — global */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">ตัวย่อเลขที่เอกสาร <span className="text-xs font-normal text-slate-400">(ใช้ร่วมกันทุกธุรกิจ)</span></label>
        <div className="flex items-center gap-2">
          <input value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase())} maxLength={5}
            className="w-24 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-center" />
          <span className="text-slate-500 text-sm">เช่น RV-2503-001</span>
        </div>
      </div>

      {/* per-biz settings */}
      {[
        { key: 'payer', label: 'ผู้จ่ายเงิน (บริษัท)', name: payerName, setName: setPayerName, sig: payerSig, setSig: setPayerSig },
        { key: 'receiver', label: 'ลายเซ็นผู้รับเงิน (ตัวอย่าง/ไม่บังคับ)', name: null, sig: receiverSig, setSig: setReceiverSig },
      ].map(p => (
        <div key={p.key} className="bg-slate-50 rounded-2xl p-4 space-y-3">
          <h4 className="font-bold text-slate-700">{p.label}</h4>
          {p.name !== null && (
            <div>
              <label className="text-xs text-slate-500 block mb-1.5">ชื่อ-นามสกุล</label>
              <input value={p.name} onChange={e => p.setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="ระบุชื่อ-นามสกุล..." />
            </div>
          )}
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">ลายเซ็นอิเล็กทรอนิกส์</label>
            {p.sig ? (
              <div className="relative inline-block">
                <img src={p.sig} alt="sig" className="h-16 rounded-xl border border-slate-200 bg-white p-1" />
                <button onClick={() => p.setSig('')} className="absolute -top-2 -right-2 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center"><X size={11} /></button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all w-fit">
                <Upload size={16} className="text-slate-400" />
                <span className="text-sm text-slate-500 font-medium">อัพโหลดลายเซ็น (PNG/JPG)</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => handleSigUpload(e, p.key)} />
              </label>
            )}
          </div>
        </div>
      ))}

      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <button onClick={() => onClose(false)} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-sm hover:bg-slate-50">ยกเลิก</button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50">
          {saving ? <><Loader2 size={14} className="animate-spin" /> บันทึก...</> : <><Check size={14} /> บันทึกการตั้งค่า</>}
        </button>
      </div>
    </div>
  );
};

// ─── RECEIPT VOUCHERS PAGE ───────────────────────────────────────────
const WHT_RATES = [
  { label: 'ไม่หักภาษี', value: 0 },
  { label: '1% (ค่าเช่า)', value: 1 },
  { label: '1.5% (ค่าขนส่ง)', value: 1.5 },
  { label: '3% (ค่าบริการ/รับจ้าง)', value: 3 },
  { label: '5% (ค่านายหน้า)', value: 5 },
  { label: '10% (ค่าวิชาชีพ)', value: 10 },
  { label: '15% (รางวัล/โบนัส)', value: 15 },
];

const ReceiptVouchersPage = ({ businesses, user, onSuccess }) => {
  const [rvs, setRvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editRv, setEditRv] = useState(null);
  const [search, setSearch] = useState('');
  const fmt = (n) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(Number(n) || 0);

  const loadRvs = useCallback(async () => {
    setLoading(true);
    try { setRvs(await rvAPI.getAll()); } catch { setRvs([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRvs(); }, [loadRvs]);

  const filtered = rvs.filter(r =>
    !search || (r.rv_no||'').toLowerCase().includes(search.toLowerCase())
      || (r.receiver_name||'').includes(search)
      || (r.description||'').includes(search)
  );

  const handleDelete = async (id) => {
    if (!confirm('ลบใบสำคัญรับเงินนี้หรือไม่?')) return;
    try {
      await rvAPI.delete(id);
      await loadRvs();
      onSuccess('ลบสำเร็จ');
    } catch { onSuccess('เกิดข้อผิดพลาด', 'error'); }
  };

  const handlePrint = async (rv) => {
    const biz = businesses.find(b => String(b.id) === String(rv.business_id));
    const settingsData = await rvAPI.getSettings(rv.business_id).catch(() => ({}));
    const merged = { ...(settingsData.global || {}), ...(settingsData.biz || {}) };
    generateRVPDF(rv, biz, merged);
  };

  const openNew = () => { setEditRv(null); setIsFormOpen(true); };
  const openEdit = (rv) => { setEditRv(rv); setIsFormOpen(true); };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">ใบสำคัญรับเงิน</h2>
          <p className="text-slate-500 text-sm mt-1">Receipt Voucher — เอกสารทั้งหมด</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-bold">
            <Settings size={16}/> ตั้งค่า
          </button>
          <button onClick={openNew}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-bold shadow-sm">
            <Plus size={16}/> สร้างใบสำคัญรับเงิน
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาเลขที่, ชื่อผู้รับ, รายการ..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 outline-none text-sm"/>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Receipt size={48} className="mx-auto mb-3 opacity-30"/>
          <p>ยังไม่มีใบสำคัญรับเงิน — กดสร้างใบสำคัญรับเงินด้านบน</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm hidden sm:table">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-slate-600">เลขที่</th>
                <th className="px-4 py-3 text-left font-bold text-slate-600">วันที่</th>
                <th className="px-4 py-3 text-left font-bold text-slate-600">ผู้รับเงิน</th>
                <th className="px-4 py-3 text-left font-bold text-slate-600">รายการ</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">ยอดรวม</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">หัก ณ ที่จ่าย</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">สุทธิ</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(rv => {
                const gross = Number(rv.amount)||0;
                const whtAmt = Math.round(gross * (Number(rv.wht_rate)||0) / 100 * 100) / 100;
                const net = gross - whtAmt;
                return (
                  <tr key={rv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{rv.rv_no}</td>
                    <td className="px-4 py-3 text-slate-500">{rv.issue_date}</td>
                    <td className="px-4 py-3 font-medium">{rv.receiver_name}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate">{rv.description}</td>
                    <td className="px-4 py-3 text-right font-medium">฿{fmt(gross)}</td>
                    <td className="px-4 py-3 text-right text-rose-600">{rv.wht_rate > 0 ? `-฿${fmt(whtAmt)} (${rv.wht_rate}%)` : '—'}</td>
                    <td className="px-4 py-3 text-right font-black text-emerald-700">฿{fmt(net)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => handlePrint(rv)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600" title="พิมพ์ PDF"><Printer size={15}/></button>
                        <button onClick={() => openEdit(rv)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600" title="แก้ไข"><Edit2 size={15}/></button>
                        <button onClick={() => handleDelete(rv.id)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-500" title="ลบ"><Trash2 size={15}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-slate-100">
            {filtered.map(rv => {
              const gross = Number(rv.amount)||0;
              const whtAmt = Math.round(gross * (Number(rv.wht_rate)||0) / 100 * 100) / 100;
              const net = gross - whtAmt;
              return (
                <div key={rv.id} className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-bold text-blue-700 text-sm">{rv.rv_no}</span>
                      <p className="font-bold text-slate-800">{rv.receiver_name}</p>
                      <p className="text-xs text-slate-500">{rv.issue_date} · {rv.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-700">฿{fmt(net)}</p>
                      {rv.wht_rate > 0 && <p className="text-xs text-rose-500">หัก {rv.wht_rate}% = ฿{fmt(whtAmt)}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handlePrint(rv)} className="flex-1 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center gap-1"><Printer size={12}/> PDF</button>
                    <button onClick={() => openEdit(rv)} className="flex-1 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-xs font-bold flex items-center justify-center gap-1"><Edit2 size={12}/> แก้ไข</button>
                    <button onClick={() => handleDelete(rv.id)} className="flex-1 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold flex items-center justify-center gap-1"><Trash2 size={12}/> ลบ</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Settings Drawer */}
      <Drawer isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} title="ตั้งค่าใบสำคัญรับเงิน" description="ตัวย่อเลขที่ และลายเซ็นแยกตามธุรกิจ">
        <RVSettings businesses={businesses} onClose={(saved) => { setSettingsOpen(false); if (saved) onSuccess('บันทึกการตั้งค่าสำเร็จ'); }} />
      </Drawer>

      {/* Form Drawer */}
      <Drawer isOpen={isFormOpen} onClose={() => setIsFormOpen(false)}
        title={editRv ? 'แก้ไขใบสำคัญรับเงิน' : 'สร้างใบสำคัญรับเงิน'}
        description="กรอกข้อมูลผู้รับเงินและรายการ">
        <RVForm businesses={businesses} editRv={editRv} user={user}
          onClose={async (saved, rv, biz) => {
            setIsFormOpen(false);
            if (saved) {
              await loadRvs();
              onSuccess(editRv ? 'แก้ไขสำเร็จ' : 'สร้างใบสำคัญรับเงินสำเร็จ ✅');
              if (rv && biz) {
                const settingsData = await rvAPI.getSettings(rv.business_id).catch(() => ({}));
                const merged = { ...(settingsData.global || {}), ...(settingsData.biz || {}) };
                generateRVPDF(rv, biz, merged);
              }
            }
          }} />
      </Drawer>
    </div>
  );
};

// ─── RV FORM ────────────────────────────────────────────────────────
const RVForm = ({ businesses, editRv, user, onClose }) => {
  const activeBiz = businesses.filter(b => b.status === 'Active');
  const [bizId, setBizId] = useState(editRv?.business_id || activeBiz[0]?.id || '');
  const [receiverName, setReceiverName] = useState(editRv?.receiver_name || '');
  const [idNumber, setIdNumber] = useState(editRv?.id_number || '');
  const [receiverAddress, setReceiverAddress] = useState(editRv?.receiver_address || '');
  const defaultItems = editRv?.items?.length
    ? editRv.items
    : [{ description: editRv?.description || '', amount: editRv?.amount || '' }];
  const [items, setItems] = useState(defaultItems);
  const [whtRate, setWhtRate] = useState(editRv?.wht_rate ?? 3);
  const [issueDate, setIssueDate] = useState(editRv?.issue_date || todayTH());
  const [saving, setSaving] = useState(false);
  const fmt = (n) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(Number(n) || 0);

  const addItem = () => setItems(prev => [...prev, { description: '', amount: '' }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  const gross = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const whtAmt = Math.round(gross * Number(whtRate) / 100 * 100) / 100;
  const net = gross - whtAmt;

  const handleSave = async () => {
    if (!receiverName.trim()) return alert('กรุณาระบุชื่อผู้รับเงิน');
    if (items.some(it => !it.description.trim())) return alert('กรุณาระบุรายการทุกแถว');
    if (items.some(it => !it.amount || Number(it.amount) <= 0)) return alert('กรุณาระบุจำนวนเงินทุกแถว');
    setSaving(true);
    try {
      const payload = {
        // ไม่ส่ง rv_no ตอน create — server จะ generate เอง
        // ถ้าเป็น edit ให้คง rv_no เดิม
        ...(editRv?.rv_no ? { rv_no: editRv.rv_no } : {}),
        business_id: bizId, receiver_name: receiverName,
        id_number: idNumber, receiver_address: receiverAddress,
        items: items.map(it => ({ ...it, amount: Number(it.amount) })),
        description: items.map(it => it.description).join(', '),
        amount: gross, wht_rate: Number(whtRate),
        issue_date: issueDate,
        created_by: editRv?.created_by || user?.name || 'Admin',
      };
      const rv = editRv?.id
        ? await rvAPI.update(editRv.id, payload)
        : await rvAPI.create(payload);
      setSaving(false);
      onClose(true, rv, businesses.find(b => String(b.id) === String(bizId)));
    } catch(e) {
      setSaving(false);
      alert('เกิดข้อผิดพลาด: ' + e.message);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* สาขา + วันที่ */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">สาขา <span className="text-rose-500">*</span></label>
            <select value={bizId} onChange={e => setBizId(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm">
              {activeBiz.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">วันที่</label>
            <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"/>
          </div>
        </div>

        {/* ผู้รับเงิน */}
        <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
          <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><User size={15}/> ข้อมูลผู้รับเงิน</h3>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">ชื่อ-นามสกุล <span className="text-rose-500">*</span></label>
            <input value={receiverName} onChange={e => setReceiverName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              placeholder="นาย/นาง/นางสาว ชื่อ นามสกุล"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">เลขประจำตัวประชาชน</label>
            <input value={idNumber} onChange={e => setIdNumber(e.target.value.replace(/\D/g,'').slice(0,13))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono tracking-widest"
              placeholder="1 2345 67890 12 3" maxLength={13}/>
            <p className="text-xs text-slate-400 mt-1">{idNumber.length}/13 หลัก</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">ที่อยู่ตามบัตรประชาชน</label>
            <textarea value={receiverAddress} onChange={e => setReceiverAddress(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" rows={2}
              placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"/>
          </div>
        </div>

        {/* รายการและยอดเงิน */}
        <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><FileText size={15}/> รายการและยอดเงิน</h3>
            <button type="button" onClick={addItem}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100">
              <Plus size={12}/> เพิ่มรายการ
            </button>
          </div>
          {/* header */}
          <div className="grid grid-cols-[1fr_120px_28px] gap-2 px-1">
            <span className="text-xs font-semibold text-slate-500">รายการ <span className="text-rose-500">*</span></span>
            <span className="text-xs font-semibold text-slate-500 text-right">จำนวนเงิน (บาท)</span>
            <span/>
          </div>
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_28px] gap-2 items-start">
              <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                placeholder="ระบุรายละเอียดงาน..."/>
              <input type="number" value={item.amount} onChange={e => updateItem(i, 'amount', e.target.value)} min="0"
                className="px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-right"
                placeholder="0.00"/>
              <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1}
                className="mt-1 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-20">
                <X size={14}/>
              </button>
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">ภาษีหัก ณ ที่จ่าย (คำนวณจากยอดรวมทั้งหมด)</label>
            <select value={whtRate} onChange={e => setWhtRate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm">
              {WHT_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>

        {/* สรุปยอด */}
        {gross > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2 bg-slate-800 text-white text-xs font-bold uppercase tracking-wide">สรุปยอดเงิน</div>
            <div className="divide-y divide-slate-100">
              <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-slate-600">จำนวนเงิน</span><span className="font-semibold">฿{fmt(gross)}</span></div>
              {Number(whtRate) > 0 && <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-rose-600">หัก ณ ที่จ่าย {whtRate}%</span><span className="font-semibold text-rose-600">-฿{fmt(whtAmt)}</span></div>}
              <div className="flex justify-between px-4 py-3 bg-emerald-50"><span className="font-black text-slate-800">สุทธิที่ผู้รับได้รับ</span><span className="font-black text-emerald-700 text-base">฿{fmt(net)}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 flex gap-3">
        <button onClick={() => onClose(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100">ยกเลิก</button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <><Loader2 size={16} className="animate-spin"/> กำลังบันทึก...</> : <><Check size={16}/> บันทึก</>}
        </button>
      </div>
    </div>
  );
};

// ─── PV SETTINGS ────────────────────────────────────
const PVSettings = ({ onClose }) => {
  const [prefix, setPrefix] = useState('PV');
  const [approverName, setApproverName] = useState('');
  const [payerName, setPayerName] = useState('');
  const [approverSig, setApproverSig] = useState('');
  const [payerSig, setPayerSig] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    pvAPI.getSettings().then(s => {
      if (s) {
        setPrefix(s.prefix || 'PV');
        setApproverName(s.approver_name || '');
        setPayerName(s.payer_name || '');
        setApproverSig(s.approver_sig || '');
        setPayerSig(s.payer_sig || '');
      }
    }).catch(() => {});
  }, []);

  const handleSigUpload = (e, who) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (who === 'approver') setApproverSig(ev.target.result);
      else setPayerSig(ev.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await pvAPI.saveSettings({ prefix, approver_name: approverName, payer_name: payerName, approver_sig: approverSig, payer_sig: payerSig });
      onClose(true);
    } catch { onClose(false); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">ตัวย่อเลขที่เอกสาร</label>
        <div className="flex items-center gap-2">
          <input value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase())} maxLength={5}
            className="w-24 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-center" />
          <span className="text-slate-500 text-sm">เช่น PV-2503-001</span>
        </div>
      </div>

      {[
        { key: 'approver', label: 'ผู้อนุมัติ', name: approverName, setName: setApproverName, sig: approverSig, setSig: setApproverSig },
        { key: 'payer', label: 'ผู้จ่ายเงิน', name: payerName, setName: setPayerName, sig: payerSig, setSig: setPayerSig },
      ].map(p => (
        <div key={p.key} className="bg-slate-50 rounded-2xl p-4 space-y-3">
          <h4 className="font-bold text-slate-700">{p.label}</h4>
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">ชื่อ-นามสกุล</label>
            <input value={p.name} onChange={e => p.setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="ระบุชื่อ-นามสกุล..." />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">ลายเซ็นอิเล็กทรอนิกส์</label>
            {p.sig ? (
              <div className="relative inline-block">
                <img src={p.sig} alt="sig" className="h-16 rounded-xl border border-slate-200 bg-white p-1" />
                <button onClick={() => p.setSig('')} className="absolute -top-2 -right-2 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center"><X size={11} /></button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all w-fit">
                <Upload size={16} className="text-slate-400" />
                <span className="text-sm text-slate-500 font-medium">อัพโหลดลายเซ็น (PNG/JPG)</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => handleSigUpload(e, p.key)} />
              </label>
            )}
          </div>
        </div>
      ))}

      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <button onClick={() => onClose(false)} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-sm hover:bg-slate-50">ยกเลิก</button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50">
          {saving ? <><Loader2 size={14} className="animate-spin" /> บันทึก...</> : <><Check size={14} /> บันทึกการตั้งค่า</>}
        </button>
      </div>
    </div>
  );
};

// ── Documents (Main Page) ──
const Documents = ({ businesses, user, onSuccess }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBiz, setFilterBiz] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [prefillDoc, setPrefillDoc] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [printLoading, setPrintLoading] = useState(null);

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterBiz) params.business_id = filterBiz;
    if (filterType) params.doc_type = filterType;
    if (filterStatus) params.status = filterStatus;
    documentAPI.getAll(params)
      .then(data => setDocs(Array.isArray(data) ? data : []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterBiz, filterType, filterStatus]);

  const handlePrint = async (doc) => {
    setPrintLoading(doc.id);
    try {
      const full = await documentAPI.getOne(doc.id);
      const biz = businesses.find(b => b.id === full.business_id);
      const settings = await documentAPI.getSettings(full.business_id);
      const sigSettings = settings.find(s => s.doc_type === full.doc_type);
      generatePDF(full, biz, sigSettings);
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
    finally { setPrintLoading(null); }
  };

  const handleDelete = async (doc) => {
    if (!confirm(`ลบเอกสาร ${doc.doc_number} หรือไม่?`)) return;
    await documentAPI.delete(doc.id).catch(() => {});
    setDocs(prev => prev.filter(d => d.id !== doc.id));
    onSuccess('ลบเอกสารสำเร็จ');
  };

  const handleConvert = (doc, toType) => {
    setPrefillDoc({
      business_id: doc.business_id,
      doc_type: toType,
      customer_name: doc.customer_name,
      customer_address: doc.customer_address,
      customer_tax_id: doc.customer_tax_id,
      customer_email: doc.customer_email,
      customer_phone: doc.customer_phone,
      ref_doc: doc.doc_number,
      items: doc.items,
      remarks: doc.remarks,
    });
    setEditDoc(null);
    setIsFormOpen(true);
  };

  const handleStatusChange = async (doc, status) => {
    await documentAPI.updateStatus(doc.id, status).catch(() => {});
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status } : d));
  };

  const filtered = docs.filter(d =>
    !search || d.doc_number?.toLowerCase().includes(search.toLowerCase()) ||
    d.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header — desktop: row, mobile: stack */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">เอกสารทางธุรกิจ</h2>
          <p className="text-slate-500 text-sm mt-1">ใบเสนอราคา · ใบแจ้งหนี้ · ใบเสร็จ</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsSettingsOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-bold">
            <Settings size={16} /> ตั้งค่า
          </button>
          <button onClick={() => { setEditDoc(null); setPrefillDoc(null); setIsFormOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-bold shadow-md">
            <Plus size={16} /> สร้างเอกสาร
          </button>
        </div>
      </div>

      {/* แท็บประเภทเอกสาร */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button onClick={() => setFilterType('')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${filterType === '' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
          📁 ทั้งหมด
        </button>
        {DOC_TYPES.map(t => (
          <button key={t.id} onClick={() => setFilterType(t.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${filterType === t.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาเลขที่เอกสาร, ชื่อลูกค้า..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={filterBiz} onChange={e => setFilterBiz(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm">
            <option value="">ทุกสาขา</option>
            {businesses.filter(b => b.status === 'Active').map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm">
            <option value="">ทุกสถานะ</option>
            {Object.entries(DOC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Document list */}
      {loading ? <div className="flex justify-center py-12"><Spinner /></div> : (
        filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <FileText size={48} className="mx-auto mb-3 opacity-30" />
            <p>ยังไม่มีเอกสาร กด "สร้างเอกสาร" เพื่อเริ่มต้น</p>
          </div>
        ) : (<>
          {/* ── DESKTOP TABLE (hidden on mobile) ── */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">เลขที่เอกสาร</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">ลูกค้า</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">วันที่</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">สถานะ</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">ยอดรวม</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(doc => {
                  const typeInfo = DOC_TYPES.find(t => t.id === doc.doc_type);
                  const statusInfo = DOC_STATUS[doc.status] || DOC_STATUS.draft;
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{typeInfo?.icon}</span>
                          <span className="font-mono font-bold text-slate-800">{doc.doc_number}</span>
                        </div>
                        <div className="text-xs text-slate-400 ml-7">{doc.business_name}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{doc.customer_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{doc.issue_date?.slice(0,10)}</td>
                      <td className="px-4 py-3">
                        <select value={doc.status} onChange={e => handleStatusChange(doc, e.target.value)}
                          className={`px-2 py-1 rounded-lg border text-xs font-bold outline-none ${statusInfo.color}`}>
                          {Object.entries(DOC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-800">฿{fmt(doc.total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* ปุ่มแปลง — แสดงเฉพาะ QO/IV */}
                          {doc.doc_type === 'QO' && (
                            <button onClick={() => handleConvert(doc, 'IV')} title="สร้างใบแจ้งหนี้"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200 hover:bg-amber-100 whitespace-nowrap">
                              📄 → IV
                            </button>
                          )}
                          {doc.doc_type === 'IV' && (
                            <button onClick={() => handleConvert(doc, 'RC')} title="สร้างใบเสร็จ"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 hover:bg-emerald-100 whitespace-nowrap">
                              🧾 → RC
                            </button>
                          )}
                          {/* ปุ่มหลัก */}
                          <button onClick={() => setPreviewDoc(doc)} title="ดูรายละเอียด"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700">
                            <Eye size={15} />
                          </button>
                          <button onClick={() => handlePrint(doc)} disabled={printLoading === doc.id} title="ดาวน์โหลด PDF"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-40">
                            {printLoading === doc.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                          </button>
                          <button onClick={() => { setEditDoc(doc); setPrefillDoc(null); setIsFormOpen(true); }} title="แก้ไข"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => handleDelete(doc)} title="ลบ"
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── MOBILE CARDS (hidden on desktop) ── */}
          <div className="sm:hidden space-y-3">
            {filtered.map(doc => {
              const typeInfo = DOC_TYPES.find(t => t.id === doc.doc_type);
              const statusInfo = DOC_STATUS[doc.status] || DOC_STATUS.draft;
              return (
                <div key={doc.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">{typeInfo?.icon}</div>
                      <div>
                        <div className="font-black text-slate-800 font-mono text-sm">{doc.doc_number}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{doc.business_name} · {doc.issue_date?.slice(0,10)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-slate-800">฿{fmt(doc.total)}</div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700 mb-3">
                    <span className="text-slate-400 text-xs">ลูกค้า</span>
                    <span className="font-semibold">{doc.customer_name || '—'}</span>
                  </div>
                  {doc.doc_type === 'QO' && (
                    <div className="mb-2">
                      <button onClick={() => handleConvert(doc, 'IV')}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-200 hover:bg-amber-100">
                        📄 สร้างใบแจ้งหนี้จากใบเสนอราคานี้
                      </button>
                    </div>
                  )}
                  {doc.doc_type === 'IV' && (
                    <div className="mb-2">
                      <button onClick={() => handleConvert(doc, 'RC')}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 hover:bg-emerald-100">
                        🧾 สร้างใบเสร็จรับเงินจากใบแจ้งหนี้นี้
                      </button>
                    </div>
                  )}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    {/* แถว 1: Preview + PDF + แก้ไข + ลบ */}
                    <div className="grid grid-cols-4 gap-1.5">
                      <button onClick={() => setPreviewDoc(doc)}
                        className="flex flex-col items-center gap-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-100">
                        <Eye size={14} /><span>ดู</span>
                      </button>
                      <button onClick={() => handlePrint(doc)} disabled={printLoading === doc.id}
                        className="flex flex-col items-center gap-1 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50">
                        {printLoading === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        <span>PDF</span>
                      </button>
                      <button onClick={() => { setEditDoc(doc); setPrefillDoc(null); setIsFormOpen(true); }}
                        className="flex flex-col items-center gap-1 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold border border-blue-100 hover:bg-blue-100">
                        <Edit2 size={14} /><span>แก้ไข</span>
                      </button>
                      <button onClick={() => handleDelete(doc)}
                        className="flex flex-col items-center gap-1 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold border border-rose-100 hover:bg-rose-100">
                        <Trash2 size={14} /><span>ลบ</span>
                      </button>
                    </div>
                    {/* แถว 2: สถานะ */}
                    <select value={doc.status} onChange={e => handleStatusChange(doc, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white outline-none text-center">
                      {Object.entries(DOC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </>)
      )}

      {/* ── Preview Modal ── */}
      {previewDoc && (() => {
        const typeInfo = DOC_TYPES.find(t => t.id === previewDoc.doc_type);
        const statusInfo = DOC_STATUS[previewDoc.status] || DOC_STATUS.draft;
        const items = (() => { try { return Array.isArray(previewDoc.items) ? previewDoc.items : JSON.parse(previewDoc.items || '[]'); } catch { return []; } })();
        const biz = businesses.find(b => b.id === previewDoc.business_id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setPreviewDoc(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">{typeInfo?.icon}</div>
                  <div>
                    <div className="font-black text-slate-800 font-mono">{previewDoc.doc_number}</div>
                    <div className="text-xs text-slate-500">{typeInfo?.label}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
                  <button onClick={() => setPreviewDoc(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X size={18} /></button>
                </div>
              </div>
              {/* Body */}
              <div className="p-5 space-y-4">
                {/* ข้อมูลเอกสาร */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-xs text-slate-400 mb-1">ลูกค้า</div>
                    <div className="font-semibold text-slate-800 text-sm">{previewDoc.customer_name || '—'}</div>
                    {previewDoc.customer_address && <div className="text-xs text-slate-500 mt-1">{previewDoc.customer_address}</div>}
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-xs text-slate-400 mb-1">รายละเอียด</div>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div>วันที่: <span className="font-semibold">{previewDoc.issue_date?.slice(0,10)}</span></div>
                      {previewDoc.valid_date && <div>ใช้ได้ถึง: <span className="font-semibold">{previewDoc.valid_date?.slice(0,10)}</span></div>}
                      {previewDoc.ref_doc && <div>อ้างอิง: <span className="font-semibold">{previewDoc.ref_doc}</span></div>}
                      <div>สาขา: <span className="font-semibold">{biz?.name || previewDoc.business_name}</span></div>
                    </div>
                  </div>
                </div>
                {/* รายการ */}
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">รายการสินค้า/บริการ</div>
                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="flex justify-between items-start bg-slate-50 rounded-xl px-3 py-2.5">
                        <div className="flex-1 pr-3">
                          <div className="text-sm font-medium text-slate-800">{item.description || '—'}</div>
                          <div className="text-xs text-slate-500">{item.qty} {item.unit} × ฿{fmt(item.unit_price)}</div>
                        </div>
                        <div className="text-sm font-bold text-slate-800 flex-shrink-0">฿{fmt((item.qty||1)*(item.unit_price||0))}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* ยอดรวม */}
                <div className="bg-slate-800 text-white rounded-xl p-4 space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-slate-300">รวมเป็นเงิน</span><span>฿{fmt(previewDoc.subtotal)}</span></div>
                  {Number(previewDoc.discount) > 0 && <div className="flex justify-between text-sm"><span className="text-slate-300">ส่วนลด</span><span>-฿{fmt(previewDoc.discount)}</span></div>}
                  <div className="flex justify-between font-black text-base pt-1 border-t border-slate-600">
                    <span>ยอดรวมทั้งสิ้น</span><span>฿{fmt(previewDoc.total)}</span>
                  </div>
                </div>
                {previewDoc.remarks && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-slate-700">
                    <span className="font-semibold text-amber-700">หมายเหตุ: </span>{previewDoc.remarks}
                  </div>
                )}
              </div>
              {/* Footer actions */}
              <div className="p-4 border-t border-slate-200 flex gap-2">
                <button onClick={() => { setPreviewDoc(null); setEditDoc(previewDoc); setPrefillDoc(null); setIsFormOpen(true); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold border border-blue-100 hover:bg-blue-100">
                  <Edit2 size={14} /> แก้ไข
                </button>
                <button onClick={() => { handlePrint(previewDoc); setPreviewDoc(null); }} disabled={printLoading === previewDoc.id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
                  <Download size={14} /> ดาวน์โหลด PDF
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Document Form Drawer */}
      <Drawer isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setPrefillDoc(null); }}
        title={editDoc ? `แก้ไข ${editDoc.doc_number}` : prefillDoc ? `สร้าง${DOC_TYPES.find(t=>t.id===prefillDoc.doc_type)?.label || 'เอกสาร'}` : 'สร้างเอกสารใหม่'}
        description={editDoc ? 'แก้ไขรายละเอียดเอกสาร' : 'กรอกข้อมูลเพื่อสร้างเอกสาร'}>
        {isFormOpen && (
          <DocumentForm businesses={businesses} user={user} editDoc={editDoc} prefillDoc={prefillDoc}
            onClose={() => { setIsFormOpen(false); setPrefillDoc(null); }}
            onSaved={(saved, isNew) => {
              if (isNew) setDocs(prev => [saved, ...prev]);
              else setDocs(prev => prev.map(d => d.id === saved.id ? { ...d, ...saved } : d));
              setIsFormOpen(false);
              setPrefillDoc(null);
              onSuccess(isNew ? `สร้าง ${saved.doc_number} สำเร็จ ✅` : 'อัปเดตเอกสารสำเร็จ ✅');
            }} />
        )}
      </Drawer>

      {/* Settings Drawer */}
      <Drawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
        title="ตั้งค่าเอกสาร" description="ตั้งค่าตัวย่อ เลขรัน และลายเซ็น">
        {isSettingsOpen && (
          <DocumentSettings businesses={businesses}
            onClose={(saved) => { setIsSettingsOpen(false); if (saved) onSuccess('บันทึกการตั้งค่าสำเร็จ ✅'); }} />
        )}
      </Drawer>
    </div>
  );
};

// ─── MAIN APP ───
export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('fh_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [toast, setToast] = useState(null);

  const handleLogin = (userData) => {
    localStorage.setItem('fh_user', JSON.stringify(userData));
    setUser(userData);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('fh_user');
    setUser(null);
  };

  // Load businesses on login — กรองตาม business_ids ของ user (ยกเว้นเจ้าของธุรกิจ)
  const isOwner = user?.role === 'เจ้าของธุรกิจ';
  const userBizIds = isOwner ? null : (user?.business_ids || []);

  useEffect(() => {
    if (!user) return;
    businessAPI.getAll(userBizIds)
      .then(data => { if (Array.isArray(data)) setBusinesses(data); })
      .catch(() => {});
  }, [user]);

  const refreshBusinesses = () => {
    if (!user) return;
    businessAPI.getAll(userBizIds)
      .then(data => { if (Array.isArray(data)) setBusinesses(data); })
      .catch(() => {});
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    refreshBusinesses();
  };

  if (!user) {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) return <SetPasswordPage token={token} />;
    return <LoginPage onLogin={handleLogin} />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
    { id: 'income', label: 'รับเงิน', icon: TrendingUp, color: 'text-emerald-400' },
    { id: 'expense', label: 'จ่ายเงิน', icon: TrendingDown, color: 'text-rose-400' },
    { id: 'transactions', label: 'รายการธุรกรรม', icon: List },
    { id: 'payment_vouchers', label: 'ใบสำคัญจ่าย', icon: FileEdit, color: 'text-amber-400' },
    { id: 'documents', label: 'เอกสาร', icon: FilePlus, color: 'text-blue-400' },
    { id: 'reports', label: 'รายงาน P&L', icon: FileText },
    { id: 'businesses', label: 'จัดการธุรกิจ', icon: Building2 },
    { id: 'users', label: 'จัดการสิทธิ์', icon: Users },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard setCurrentView={setCurrentView} businesses={businesses} />;
      case 'income': return <IncomeEntry businesses={businesses} onSuccess={showToast} />;
      case 'expense': return <ExpenseEntry businesses={businesses} user={user} onSuccess={showToast} />;
      case 'transactions': return <Transactions businesses={businesses} user={user} />;
      case 'reports': return <Reports businesses={businesses} />;
      case 'businesses': return <BusinessManagement businesses={businesses} setBusinesses={setBusinesses} onSuccess={showToast} />;
      case 'users': return <UserManagement businesses={businesses} onSuccess={showToast} />;
      case 'documents': return <Documents businesses={businesses} user={user} onSuccess={showToast} />;
      case 'payment_vouchers': return <PaymentVouchersPage businesses={businesses} user={user} onSuccess={showToast} />;
      case 'receipt_vouchers': return <ReceiptVouchersPage businesses={businesses} user={user} onSuccess={showToast} />;
      default: return <Dashboard setCurrentView={setCurrentView} />;
    }
  };

  // Map feature id → menu id
  const FEATURE_MENU_MAP = {
    'Dashboard':     'dashboard',
    'Income':        'income',
    'Expense':       'expense',
    'Transactions':  'transactions',
    'Vouchers':      'payment_vouchers',
    'ReceiptVouchers': 'receipt_vouchers',
    'Documents':     'documents',
    'Reports':       'reports',
    'Businesses':    'businesses',
    'Users':         'users',
  };
  const userFeatures = user?.features || [];
  const canAccess = (menuId) => {
    if (isOwner) return true;
    const entry = Object.entries(FEATURE_MENU_MAP).find(([,v]) => v === menuId);
    if (!entry) return true;
    return userFeatures.includes(entry[0]);
  };

  const allMenuGroups = [
    {
      label: 'General',
      items: [
        { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
        { id: 'income', label: 'รับเงิน', icon: TrendingUp },
        { id: 'expense', label: 'จ่ายเงิน', icon: TrendingDown },
        { id: 'transactions', label: 'รายการธุรกรรม', icon: List },
      ]
    },
    {
      label: 'เอกสาร',
      items: [
        { id: 'payment_vouchers', label: 'ใบสำคัญจ่าย', icon: FileEdit },
        { id: 'receipt_vouchers', label: 'ใบสำคัญรับเงิน', icon: Receipt },
        { id: 'documents', label: 'เอกสาร', icon: FilePlus },
        { id: 'reports', label: 'รายงาน P&L', icon: FileText },
      ]
    },
    {
      label: 'Settings',
      items: [
        { id: 'businesses', label: 'จัดการธุรกิจ', icon: Building2 },
        { id: 'users', label: 'จัดการสิทธิ์', icon: Users },
      ]
    },
  ];

  const menuGroups = allMenuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => canAccess(item.id))
    }))
    .filter(group => group.items.length > 0);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
            <Wallet size={18} className="text-white" />
          </div>
          <div>
            <span className="text-[15px] font-bold text-zinc-900 leading-none block">P'KEEP</span>
            <span className="text-[11px] text-zinc-400 leading-none mt-0.5 block">Finance Admin</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-5">
        {menuGroups.map(group => (
          <div key={group.label}>
            <p className="text-[11px] font-semibold text-zinc-400 px-2 mb-2">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setCurrentView(item.id); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                      isActive
                        ? 'bg-zinc-100 text-zinc-900 font-semibold'
                        : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 font-medium'
                    }`}
                  >
                    <Icon size={17} className={isActive ? 'text-zinc-900' : 'text-zinc-500'} />
                    <span className="text-[14px]">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-zinc-200 p-3">
        <div className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-zinc-100 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm font-semibold shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-zinc-900 truncate leading-tight">{user.name}</p>
            <p className="text-[11px] text-zinc-500 truncate">{user.role}</p>
          </div>
          <button onClick={handleLogout} className="text-zinc-400 hover:text-rose-500 transition-colors p-1 rounded-md hover:bg-zinc-200">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <aside className="hidden md:flex flex-col w-56 bg-white text-zinc-700 fixed h-full z-10 border-r border-zinc-200"><SidebarContent /></aside>
      {isMobileMenuOpen && <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setIsMobileMenuOpen(false)}></div>}
      <aside className={`md:hidden fixed inset-y-0 left-0 w-56 bg-white text-zinc-700 z-50 transform transition-transform duration-300 flex flex-col border-r border-zinc-200 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}><SidebarContent /></aside>

      <main className="flex-1 md:ml-56 flex flex-col min-h-screen">
        <header className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-1.5 text-zinc-600 hover:bg-zinc-100 rounded-md" onClick={() => setIsMobileMenuOpen(true)}><Menu size={20} /></button>
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="font-semibold text-zinc-900">P'KEEP</span>
              <span className="text-zinc-300">/</span>
              <span className="font-medium text-zinc-500">{menuGroups.flatMap(g => g.items).find(m => m.id === currentView)?.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-semibold text-xs">
              {user.name.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <p className="text-[13px] font-semibold text-zinc-900 leading-tight">{user.name}</p>
              <p className="text-[11px] text-zinc-500">{user.role}</p>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 flex-1">
          {renderView()}
        </div>
      </main>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
