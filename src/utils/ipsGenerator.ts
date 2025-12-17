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

export const calculateModel97 = (reference: string): string => {
  const letterToNumber: Record<string, number> = {
    'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15, 'G': 16, 'H': 17,
    'I': 18, 'J': 19, 'K': 20, 'L': 21, 'M': 22, 'N': 23, 'O': 24, 'P': 25,
    'Q': 26, 'R': 27, 'S': 28, 'T': 29, 'U': 30, 'V': 31, 'W': 32, 'X': 33,
    'Y': 34, 'Z': 35
  };

  const clean = reference.replace(/[\s-]/g, '').toUpperCase();
  if (!clean) return '';

  const numericString = clean.split('').map(char =>
    (letterToNumber[char] !== undefined ? letterToNumber[char] : char)
  ).join('');

  // We need big integer arithmetic here
  try {
    const numeric = BigInt(numericString);
    const checkDigit = (98n - (numeric * 100n % 97n)) % 97n;
    return checkDigit.toString().padStart(2, '0') + clean;
  } catch (e) {
    return '00' + clean; // Fallback if invalid chars
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

  const formattedAmount = formatAmount(data.amount);
  
  // Payer formatting
  let payerStr = transliterate(data.payerName);
  if (data.payerAddress) payerStr += '\n' + transliterate(data.payerAddress);
  if (data.payerCity) payerStr += '\n' + transliterate(data.payerCity);
  payerStr = payerStr.substring(0, 70);

  const code = formatPaymentCode(data.paymentCode);
  const purpose = transliterate(data.purpose).substring(0, 35);
  const currency = data.currency || 'RSD';

  // Base String
  let qrString = `K:PR|V:01|C:1|R:${account}|N:${receiverStr}|I:${currency}${formattedAmount}|P:${payerStr}|SF:${code}|S:${purpose}`;

  // Optional Reference
  if (data.reference && data.reference.trim()) {
    const modelPrefix = data.model === '97' ? '97' : (data.model || '00');
    let formattedReference = data.reference.trim();
    
    if (data.model === '97') {
       formattedReference = calculateModel97(formattedReference);
    }
    
    qrString += `|RO:${modelPrefix}${formattedReference}`;
  }

  return qrString;
};