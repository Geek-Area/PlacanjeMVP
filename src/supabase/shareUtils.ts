import { supabase } from './config';
import { PaymentData } from '@/types';

export interface SharedSlipData {
  id: string;
  data: PaymentData;
  qr_string: string | null;
  created_at: string;
  expires_at: string;
}

// Save payment slip to Supabase and return share ID
export const saveSharedSlip = async (
  paymentData: PaymentData,
  qrString: string | null
): Promise<string> => {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

    const { data, error } = await supabase
      .from('shared_slips')
      .insert({
        data: paymentData,
        qr_string: qrString,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error('Failed to save shared slip');
    }

    return data.id;
  } catch (error) {
    console.error('Error saving shared slip:', error);
    throw new Error('Failed to save shared slip');
  }
};

// Fetch shared payment slip by ID
export const getSharedSlip = async (shareId: string): Promise<SharedSlipData | null> => {
  try {
    const { data, error } = await supabase
      .from('shared_slips')
      .select('*')
      .eq('id', shareId)
      .single();

    if (error || !data) {
      console.error('Supabase error:', error);
      return null;
    }

    // Check if expired
    const expiresAt = new Date(data.expires_at);
    if (Date.now() > expiresAt.getTime()) {
      return null;
    }

    return data as SharedSlipData;
  } catch (error) {
    console.error('Error fetching shared slip:', error);
    return null;
  }
};
