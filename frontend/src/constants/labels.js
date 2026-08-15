export const reviewReasonLabels = {
  document_type_missing: 'Липсва тип на документа',
  document_number_missing: 'Липсва номер на документа',
  issue_date_missing: 'Липсва дата',
  invalid_issue_date: 'Датата не е във формат YYYY-MM-DD',
  future_issue_date: 'Датата е в бъдещето',
  supplier_name_missing: 'Липсва доставчик',
  supplier_vat_missing: 'Липсва ДДС/ЕИК номер на доставчика',
  recipient_name_missing: 'Липсва получател',
  currency_missing: 'Липсва валута',
  unsupported_currency: 'Валутата не се поддържа',
  total_missing: 'Липсва сума',
  net_amount_missing: 'Липсва сума без ДДС',
  non_positive_total: 'Общата сума трябва да е положителна',
  negative_net_amount: 'Сумата без ДДС не може да е отрицателна',
  vat_missing: 'Липсва ДДС',
  negative_vat_amount: 'ДДС не може да е отрицателен',
  vat_exceeds_total: 'ДДС не може да е по-голям от общата сума',
  amount_mismatch: 'Общата сума не съвпада с основа + ДДС',
  payment_method_missing: 'Липсва начин на плащане',
  payment_method_unknown: 'Начинът на плащане трябва да бъде потвърден',
  low_confidence: 'Ниска увереност при разчитане',
  unclear_image: 'Документът не е достатъчно ясен',
};

export const warningLabels = {
  amount_mismatch: 'Общата сума не съвпада с основа + ДДС',
  future_issue_date: 'Датата е в бъдещето',
  item_amount_mismatch: 'Има ред с несъвпадащи количество, ед. цена и сума',
  possible_duplicate: 'Възможен дубликат: същият номер, доставчик и сума вече съществуват',
  recipient_vat_missing: 'Липсва ДДС/ЕИК номер на получателя',
  vat_rate_unusual: 'ДДС ставката изглежда необичайна',
};

export const documentTypeLabels = {
  invoice: 'Фактура',
  receipt: 'Касова бележка',
};

export const paymentMethodLabels = {
  cash: 'В брой',
  card: 'Карта',
  bank_transfer: 'Банков превод',
  unknown: 'Неизвестно',
};
