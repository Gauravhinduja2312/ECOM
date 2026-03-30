function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonEmptyStringWithMaxLength(value, maxLength) {
  return isNonEmptyString(value) && value.trim().length <= maxLength;
}

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isIntegerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function isValidArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function isArrayLengthInRange(value, min, max) {
  return Array.isArray(value) && value.length >= min && value.length <= max;
}

function isUuid(value) {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

module.exports = {
  isNonEmptyString,
  isNonEmptyStringWithMaxLength,
  isPositiveNumber,
  isIntegerInRange,
  isValidArray,
  isArrayLengthInRange,
  isUuid,
};
