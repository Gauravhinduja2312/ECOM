function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isValidArray(value) {
  return Array.isArray(value) && value.length > 0;
}

module.exports = {
  isNonEmptyString,
  isPositiveNumber,
  isValidArray,
};
