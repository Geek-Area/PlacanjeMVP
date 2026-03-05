import { PaymentData } from '@/types';

const cyrillicToLatinMap: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ђ': 'đ',
  'е': 'e', 'ж': 'ž', 'з': 'z', 'и': 'i', 'ј': 'j', 'к': 'k',
  'л': 'l', 'љ': 'lj', 'м': 'm', 'н': 'n', 'њ': 'nj', 'о': 'o',
  'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'ћ': 'ć', 'у': 'u',
  'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'č', 'џ': 'dž', 'ш': 'š',
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Ђ': 'Đ',
  'Е': 'E', 'Ж': 'Ž', 'З': 'Z', 'И': 'I', 'Ј': 'J', 'К': 'K',
  'Л': 'L', 'Љ': 'LJ', 'М': 'M', 'Н': 'N', 'Њ': 'NJ', 'О': 'O',
  'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'Ћ': 'Ć', 'У': 'U',
  'Ф': 'F', 'Х': 'H', 'Ц': 'C', 'Ч': 'Č', 'Џ': 'DŽ', 'Ш': 'Š'
};

export const transliterate = (text: string): string => {
  if (!text) return '';
  return text.split('').map(char => cyrillicToLatinMap[char] || char).join('');
};

export const formatBankAccount = (account: string): string => {
  // Remove all non-digit characters
  const cleaned = account.replace(/[^0-9]/g, '');
  if (!cleaned) return '';
  
  // Take first 3 digits
  const first3 = cleaned.substring(0, 3);
  // Take remaining digits and pad to 15 digits with leading zeros
  const rest = cleaned.substring(3).padStart(15, '0');
  
  return (first3 + rest).substring(0, 18);
};

export const formatAmount = (amount: string): string => {
  // Replace comma with dot for parsing, remove any existing dots (thousand separators)
  const cleanAmount = amount.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleanAmount);
  if (isNaN(num)) return '0,00';

  // Format with 2 decimals
  const formatted = num.toFixed(2);
  const [integerPart, decimalPart] = formatted.split('.');

  // Add thousand separators (dots) to integer part
  const withThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Return with comma as decimal separator
  return `${withThousands},${decimalPart}`;
};

// Format amount for QR code - NO thousand separators (NBS IPS requirement)
export const formatAmountForQR = (amount: string): string => {
  // Replace comma with dot for parsing, remove any existing dots (thousand separators)
  const cleanAmount = amount.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleanAmount);
  if (isNaN(num)) return '0,00';

  // Format with 2 decimals
  const formatted = num.toFixed(2);
  const [integerPart, decimalPart] = formatted.split('.');

  // NO thousand separators for QR code - just comma as decimal separator
  return `${integerPart},${decimalPart}`;
};

export const formatPaymentCode = (code: string): string => {
  const originalCode = parseInt(code) || 189;
  // NBS standard requires adding 100 to the code (e.g. 189 -> 289)
  // If user enters 289 directly, we assume they know what they are doing, 
  // but standard usually implies inputting base code. 
  // However, specifically for the generator string SF:{code}, 
  // if the input is standard '189', the output SF should be '289'.
  // If user types '289', it becomes '389' which is wrong. 
  // We will assume user inputs the standard code (189, 221, etc).
  return (originalCode + 100).toString();
};

// Validate a complete Model 97 reference number (check digits + reference body)
// Returns true if the check digits are correct per MOD 97 algorithm
export const validateModel97 = (fullReference: string): boolean => {
  const letterToNumber: Record<string, number> = {
    'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15, 'G': 16, 'H': 17,
    'I': 18, 'J': 19, 'K': 20, 'L': 21, 'M': 22, 'N': 23, 'O': 24, 'P': 25,
    'Q': 26, 'R': 27, 'S': 28, 'T': 29, 'U': 30, 'V': 31, 'W': 32, 'X': 33,
    'Y': 34, 'Z': 35
  };

  const clean = fullReference.replace(/[\s-]/g, '').toUpperCase();
  if (clean.length < 3) return false; // Need at least 2 check digits + 1 char

  const checkDigits = clean.substring(0, 2);
  const body = clean.substring(2);

  // Check digits must be numeric
  if (!/^\d{2}$/.test(checkDigits)) return false;

  // Convert body to numeric string (letters → numbers)
  const numericBody = body.split('').map(char =>
    (letterToNumber[char] !== undefined ? letterToNumber[char].toString() : char)
  ).join('');

  // Verify: (body * 100 + checkDigits) mod 97 === 1, or equivalently
  // check that (98 - (body * 100 mod 97)) mod 97 === checkDigits
  try {
    const numeric = BigInt(numericBody);
    const expectedCheck = (98n - (numeric * 100n % 97n)) % 97n;
    return expectedCheck.toString().padStart(2, '0') === checkDigits;
  } catch {
    return false;
  }
};

export const generateIPSString = (data: PaymentData): string | null => {
  // Basic validation before generation
  if (!data.receiverAccount || !data.amount || !data.receiverName) return null;

  const account = formatBankAccount(data.receiverAccount);
  // Receiver formatting: Name \n Address \n City
  let receiverStr = transliterate(data.receiverName);
  if (data.receiverAddress) receiverStr += '\n' + transliterate(data.receiverAddress);
  if (data.receiverCity) receiverStr += '\n' + transliterate(data.receiverCity);
  receiverStr = receiverStr.substring(0, 70);

  // Use formatAmountForQR for QR code (no thousand separators)
  const formattedAmount = formatAmountForQR(data.amount);

  const code = formatPaymentCode(data.paymentCode);
  const currency = data.currency || 'RSD';

  // Base String - mandatory fields (payer data excluded per NBS IPS standard)
  let qrString = `K:PR|V:01|C:1|R:${account}|N:${receiverStr}|I:${currency}${formattedAmount}`;

  // Add payment code
  qrString += `|SF:${code}`;

  // Add purpose only if provided (optional field)
  if (data.purpose && data.purpose.trim()) {
    const purpose = transliterate(data.purpose).substring(0, 35);
    qrString += `|S:${purpose}`;
  }

  // Optional Reference — user enters the complete reference (including check digits for model 97)
  if (data.reference && data.reference.trim()) {
    const modelPrefix = data.model || '00';
    const formattedReference = data.reference.replace(/[\s-]/g, '').trim();
    qrString += `|RO:${modelPrefix}${formattedReference}`;
  }

  return qrString;
};