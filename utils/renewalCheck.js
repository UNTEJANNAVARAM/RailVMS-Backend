function isEligibleForRenewal(validToDate) {
  const today = new Date();
  const validTo = new Date(validToDate);

  const twoMonthsBefore = new Date(validTo);
  twoMonthsBefore.setMonth(validTo.getMonth() - 2);

  return today >= twoMonthsBefore && today <= validTo;
}

module.exports = isEligibleForRenewal;