// Helper to convert English digits to Bengali digits
export function toBengaliNumber(num: number | string | undefined | null): string {
  if (num === undefined || num === null || num === '') return '০';
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const str = String(num);
  return str.replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit, 10)] || digit);
}

// Currency format with Taka symbol: ৳ ৪,৫০০
export function formatTaka(amount: number | string | undefined | null): string {
  if (!amount && amount !== 0) return '৳ ০';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '৳ ০';
  const formatted = num.toLocaleString('en-IN');
  return `৳ ${toBengaliNumber(formatted)}`;
}

// Discount calculator
export function calculateDiscount(original: number, discounted: number) {
  if (original <= 0 || original <= discounted) {
    return { amount: 0, percent: 0 };
  }
  const amount = original - discounted;
  const percent = Math.round((amount / original) * 100);
  return { amount, percent };
}

// Trigger browser download for a blob or URL
export function downloadFile(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
