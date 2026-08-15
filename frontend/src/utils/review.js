export function getImportantWarnings(data) {
  if (!data) return [];

  const warnings = [];
  if (!data.issueDate) warnings.push('Липсва дата');
  if (data.totalAmount === null || data.totalAmount === undefined) warnings.push('Липсва сума');
  if (!data.supplierName) warnings.push('Липсва доставчик');
  return warnings;
}
