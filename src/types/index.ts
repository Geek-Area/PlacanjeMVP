export interface PaymentData {
  payerName: string;
  payerAddress: string;
  payerCity: string;
  
  purpose: string;
  
  receiverName: string;
  receiverAddress: string;
  receiverCity: string;
  receiverAccount: string;
  
  paymentCode: string; // SF (Šifra plaćanja)
  currency: string;    // Valuta (Default RSD)
  amount: string;      // Iznos
  
  model: string;       // Model (e.g., 97)
  reference: string;   // Poziv na broj
}

export interface ValidationErrors {
  receiverAccount?: string;
  amount?: string;
  receiverName?: string;
  payerName?: string;
  purpose?: string;
}