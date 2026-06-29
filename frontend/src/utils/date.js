export function getCurrentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

