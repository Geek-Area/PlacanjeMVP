export type FormType = 'uplata' | 'prenos';

export interface PaymentData {
  payerName: string;
  payerAddress: string;
  payerCity: string;
  payerAccount: string;  // Used in "nalog za prenos"

  purpose: string;

  receiverName: string;
  receiverAddress: string;
  receiverCity: string;
  receiverAccount: string;

  paymentCode: string; // SF (Šifra plaćanja)
  currency: string;    // Valuta (Default RSD)
  amount: string;      // Iznos

  model: string;       // Model (e.g., 97) - poziv na broj (odobrenje)
  reference: string;   // Poziv na broj (odobrenje)

  debitModel: string;       // Model - poziv na broj (zaduženje), used in "nalog za prenos"
  debitReference: string;   // Poziv na broj (zaduženje), used in "nalog za prenos"
}

export interface ValidationErrors {
  receiverAccount?: string;
  amount?: string;
  receiverName?: string;
  payerName?: string;
  purpose?: string;
}