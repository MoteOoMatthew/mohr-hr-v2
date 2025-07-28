/**
 * Calculate age from date of birth
 * @param {string} dateOfBirth - Date of birth in YYYY-MM-DD format
 * @returns {number} Age in years
 */
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  // Adjust age if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Format date for display
 * @param {string} dateString - Date string
 * @returns {string} Formatted date
 */
const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
};

/**
 * Validate date of birth (must be in the past and reasonable)
 * @param {string} dateOfBirth - Date of birth in YYYY-MM-DD format
 * @returns {boolean} True if valid
 */
const validateDateOfBirth = (dateOfBirth) => {
  if (!dateOfBirth) return false;
  
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  const minDate = new Date('1900-01-01');
  
  // Must be in the past
  if (birthDate >= today) return false;
  
  // Must be after 1900
  if (birthDate < minDate) return false;
  
  return true;
};

module.exports = {
  calculateAge,
  formatDate,
  validateDateOfBirth
}; 