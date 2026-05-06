export const getISTDateString = (date: Date = new Date()) => {
  // Use toLocaleDateString with Asia/Kolkata timezone to get YYYY-MM-DD format
  // en-CA is a reliable format for YYYY-MM-DD
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

export const getISTDate = (date: Date = new Date()) => {
  // Return a date object that represents the same point in time
  return new Date(date.getTime());
};

export const isSameISTDay = (date1: Date, date2: Date) => {
  return getISTDateString(date1) === getISTDateString(date2);
};
