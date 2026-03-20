function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isValidArray(value) {
  return Array.isArray(value) && value.length > 0;
}

module.exports = {
  isPositiveNumber,
  isValidArray,
};
