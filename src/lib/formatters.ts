export function fd(n: any): string {
  if (n === null || n === undefined || isNaN(Number(n))) return "$0";
  return "$" + Math.round(Number(n)).toLocaleString("en-CA");
}

export function pn(s: any): number {
  if (!s) return 0;
  return parseFloat(String(s).replace(/[$,\s]/g, "")) || 0;
}

export function cPmt(P: number, rPct: number, yrs: number): number {
  if (!P || !rPct || !yrs) return 0;
  const r = rPct / 100 / 12;
  const n = yrs * 12;
  if (r === 0) return P / n;
  return P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function pToAmt(pmt: number, rPct: number, yrs: number): number {
  const r = rPct / 100 / 12;
  const n = yrs * 12;
  if (r === 0 || pmt <= 0) return 0;
  return pmt * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
}
