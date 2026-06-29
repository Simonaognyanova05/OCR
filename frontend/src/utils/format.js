export function formatMoney(value, currency = 'BGN') {
  const amount = new Intl.NumberFormat('bg-BG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

  if (currency === 'BGN') return `${amount} лв`;
  if (currency === 'mixed') return `${amount} смесена валута`;
  return `${amount} ${currency || 'BGN'}`;
}

