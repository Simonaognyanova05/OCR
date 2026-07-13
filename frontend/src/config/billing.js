export const BILLING_INFO = {
  iban: process.env.REACT_APP_BILLING_IBAN || 'Добави IBAN в REACT_APP_BILLING_IBAN',
  beneficiary: process.env.REACT_APP_BILLING_BENEFICIARY || 'OCR Finance',
  bank: process.env.REACT_APP_BILLING_BANK || '',
};

export function buildPaymentReason(companyName, plan) {
  const cleanCompanyName = companyName || 'фирма';
  const cleanPlan = plan || 'абонамент';
  return `Абонамент ${cleanPlan} - ${cleanCompanyName}`;
}
