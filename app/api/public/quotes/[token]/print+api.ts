import { HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

type Item = { description: string; quantity: number | string; unitPrice: number; lineTotal: number };
type Stage = { key: string; title: string; amount: number; trigger: string };
type Option = { id: string; kind: 'optional' | 'alternative'; groupKey: string | null; label: string; description: string; priceAdjustment: number; selected: boolean };
type Row = {
  quoteNumber: string;
  businessName: string;
  traderEmail: string | null;
  traderPhone: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  jobTitle: string;
  jobAddress: string | null;
  workIncluded: string;
  notIncluded: string | null;
  expectedStart: string | null;
  durationText: string | null;
  warrantyText: string | null;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethod: 'undecided' | 'buildpair' | 'external';
  paymentTerms: string;
  paymentSchedule: Stage[];
  notes: string | null;
  showBreakdown: boolean;
  validUntil: string | null;
  status: string;
  createdAt: string;
  items: Item[];
  options: Option[];
};

function esc(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function money(pence: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format((pence || 0) / 100);
}

function paymentLabel(value: Row['paymentMethod']) {
  if (value === 'buildpair') return 'BuildPair payments';
  if (value === 'external') return 'Paid directly to the tradesperson';
  return 'Payment method to be agreed';
}

export async function GET(request: Request, { token }: { token: string }) {
  try {
    const rows = await getSql()`
      SELECT q.quote_number AS "quoteNumber",
             tp.business_name AS "businessName",
             u.email AS "traderEmail", u.phone AS "traderPhone",
             q.customer_name AS "customerName", q.customer_email AS "customerEmail", q.customer_phone AS "customerPhone",
             q.job_title AS "jobTitle", q.job_address AS "jobAddress",
             q.work_included AS "workIncluded", q.not_included AS "notIncluded",
             q.expected_start AS "expectedStart", q.duration_text AS "durationText", q.warranty_text AS "warrantyText",
             q.subtotal, q.vat_rate AS "vatRate", q.vat_amount AS "vatAmount", q.total_amount AS "totalAmount",
             q.payment_method AS "paymentMethod", q.payment_terms AS "paymentTerms", q.payment_schedule AS "paymentSchedule",
             q.notes, q.show_breakdown AS "showBreakdown", q.valid_until AS "validUntil", q.status, q.created_at AS "createdAt",
             COALESCE((SELECT json_agg(json_build_object(
               'description', i.description, 'quantity', i.quantity, 'unitPrice', i.unit_price, 'lineTotal', i.line_total
             ) ORDER BY i.sort_order) FROM business_quote_items i WHERE i.quote_id = q.id), '[]'::json) AS items,
             COALESCE((SELECT json_agg(json_build_object(
               'id', o.id, 'kind', o.kind, 'groupKey', o.group_key, 'label', o.label,
               'description', o.description, 'priceAdjustment', o.price_adjustment, 'selected', o.selected
             ) ORDER BY o.sort_order) FROM business_quote_options o WHERE o.quote_id = q.id), '[]'::json) AS options
      FROM business_quotes q
      JOIN trader_profiles tp ON tp.user_id = q.trader_id
      JOIN users u ON u.id = q.trader_id
      WHERE q.share_token = ${token}
      LIMIT 1
    ` as unknown as Row[];
    const quote = rows[0];
    if (!quote || quote.status === 'draft' || quote.status === 'withdrawn') throw new HttpError(404, 'Quote not found.');

    const created = new Date(quote.createdAt).toLocaleDateString('en-GB');
    const valid = quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('en-GB') : '';
    const items = quote.showBreakdown ? quote.items.map((item) => `<tr><td>${esc(item.description)}${Number(item.quantity) !== 1 ? `<small>${esc(item.quantity)} × ${money(item.unitPrice)}</small>` : ''}</td><td>${money(item.lineTotal)}</td></tr>`).join('') : `<tr><td>Quoted works</td><td>${money(quote.subtotal)}</td></tr>`;
    const stages = (quote.paymentSchedule || []).map((stage) => `<div class="stage"><div><strong>${esc(stage.title)}</strong><strong>${money(stage.amount)}</strong></div>${stage.trigger ? `<p>${esc(stage.trigger)}</p>` : ''}</div>`).join('');
    const options = (quote.options || []).map((option) => `<div class="stage"><div><strong>${esc(option.label)}</strong><strong>+${money(option.priceAdjustment)}</strong></div><p>${esc(option.kind === 'alternative' ? (option.groupKey || 'Alternative') : 'Optional extra')}${option.selected ? ' · SELECTED' : ''}</p>${option.description ? `<p>${esc(option.description)}</p>` : ''}</div>`).join('');
    const autoPrint = new URL(request.url).searchParams.get('download') === '1';

    const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(quote.quoteNumber)} · ${esc(quote.businessName)}</title>
<style>
:root{font-family:Arial,Helvetica,sans-serif;color:#23272b;background:#f4f1ed}*{box-sizing:border-box}body{margin:0}.toolbar{position:sticky;top:0;background:#232930;color:#fff;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;gap:12px}.toolbar button{border:0;border-radius:999px;background:#d35400;color:white;font-weight:700;padding:10px 18px;cursor:pointer}.paper{width:min(900px,calc(100% - 28px));margin:26px auto;background:white;padding:42px;border-radius:16px;box-shadow:0 12px 35px rgba(0,0,0,.08)}.top{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap}.brand{font-size:28px;font-weight:800}.orange{color:#d35400}.muted{color:#686f72}.right{text-align:right}.rule{border-top:1px solid #e3dbd2;margin:24px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:28px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.08em;color:#686f72}.section{margin-top:28px}.section h2{font-size:20px;margin:0 0 10px}.body{white-space:pre-wrap;line-height:1.55}.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:22px}.fact,.stage{background:#f7f2ec;border-radius:12px;padding:14px}.fact strong{display:block;margin-top:5px}.stage{margin:8px 0}.stage>div{display:flex;justify-content:space-between;gap:16px}.stage p{margin:7px 0 0;color:#686f72}table{width:100%;border-collapse:collapse}td{padding:11px 0;border-bottom:1px solid #eee}td:last-child{text-align:right;font-weight:700}td small{display:block;color:#686f72;margin-top:3px}.totals{width:min(360px,100%);margin-left:auto;margin-top:16px}.totals div{display:flex;justify-content:space-between;padding:5px 0}.grand{font-size:22px;font-weight:800;color:#d35400;border-top:2px solid #232930;margin-top:6px;padding-top:10px!important}.footer{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;color:#686f72;font-size:12px;margin-top:28px}@media(max-width:650px){.paper{width:100%;margin:0;border-radius:0;padding:24px}.grid,.facts{grid-template-columns:1fr}.right{text-align:left}}@media print{body{background:#fff}.toolbar{display:none}.paper{width:100%;margin:0;padding:18mm;box-shadow:none;border-radius:0}.section{break-inside:avoid}.stage{break-inside:avoid}@page{size:A4;margin:0}}
</style>
</head>
<body>
<div class="toolbar"><span>BuildPair quote preview</span><button onclick="window.print()">Print / Save as PDF</button></div>
<main class="paper">
  <div class="top"><div><div class="brand">${esc(quote.businessName)}</div><div class="muted">Professional quotation</div>${quote.traderEmail ? `<div>${esc(quote.traderEmail)}</div>` : ''}${quote.traderPhone ? `<div>${esc(quote.traderPhone)}</div>` : ''}</div><div class="right"><div class="eyebrow orange">QUOTE</div><strong>${esc(quote.quoteNumber)}</strong><div class="muted">${esc(created)}</div></div></div>
  <div class="rule"></div>
  <div class="grid"><div><div class="eyebrow">PREPARED FOR</div><h3>${esc(quote.customerName)}</h3>${quote.customerEmail ? `<div>${esc(quote.customerEmail)}</div>` : ''}${quote.customerPhone ? `<div>${esc(quote.customerPhone)}</div>` : ''}</div><div><div class="eyebrow">JOB</div><h3>${esc(quote.jobTitle)}</h3>${quote.jobAddress ? `<div>${esc(quote.jobAddress)}</div>` : ''}</div></div>
  <section class="section"><h2>Work included</h2><div class="body">${esc(quote.workIncluded)}</div></section>
  ${quote.notIncluded ? `<section class="section"><h2>Not included</h2><div class="body">${esc(quote.notIncluded)}</div></section>` : ''}
  <section class="section"><h2>Price</h2><table>${items}</table><div class="totals"><div><span>Subtotal</span><span>${money(quote.subtotal)}</span></div>${quote.vatAmount ? `<div><span>VAT (${quote.vatRate}%)</span><span>${money(quote.vatAmount)}</span></div>` : ''}<div class="grand"><span>Total</span><span>${money(quote.totalAmount)}</span></div></div></section>
  ${(quote.expectedStart || quote.durationText || quote.warrantyText) ? `<div class="facts">${quote.expectedStart ? `<div class="fact"><span class="eyebrow">EXPECTED START</span><strong>${esc(quote.expectedStart)}</strong></div>` : ''}${quote.durationText ? `<div class="fact"><span class="eyebrow">ESTIMATED TIME</span><strong>${esc(quote.durationText)}</strong></div>` : ''}${quote.warrantyText ? `<div class="fact"><span class="eyebrow">GUARANTEE / WARRANTY</span><strong>${esc(quote.warrantyText)}</strong></div>` : ''}</div>` : ''}
  ${quote.options?.length ? `<section class="section"><h2>Choices & optional extras</h2><p class="muted">${quote.status === 'accepted' ? 'Selected choices form part of the accepted record.' : 'These choices sit outside the core quote until selected by the customer.'}</p>${options}</section>` : ''}
  <section class="section"><h2>Payment</h2><p>${esc(paymentLabel(quote.paymentMethod))}</p>${stages}<div class="body">${esc(quote.paymentTerms)}</div></section>
  ${quote.notes ? `<section class="section"><h2>Notes</h2><div class="body">${esc(quote.notes)}</div></section>` : ''}
  <div class="rule"></div><div class="footer"><span>Prepared with BuildPair</span>${valid ? `<span>Valid until ${esc(valid)}</span>` : ''}</div>
</main>
${autoPrint ? '<script>setTimeout(()=>window.print(),350)</script>' : ''}
</body></html>`;

    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  } catch (error) {
    const response = jsonError(error);
    return response;
  }
}
