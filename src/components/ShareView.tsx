import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Toaster, toast } from 'react-hot-toast';
import JSZip from 'jszip';
import PaymentSlip from '@/components/PaymentSlip';
import Footer from '@/components/Footer';
import OrderTabs from '@/components/OrderTabs';
import { decodeSlipsData } from '@/utils/slipLink';
import { generateIPSString } from '@/utils/ipsGenerator';
import { sanitizeFilename, captureSlipElementToPngBlob, downloadBlob } from '@/utils/downloadHelpers';
import { AlertCircle, Download } from 'lucide-react';

const ShareView: React.FC = () => {
  // The slip(s) live entirely in the URL fragment — decode it once, synchronously.
  const orders = useMemo(() => decodeSlipsData(window.location.hash), []);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeOrder = orders?.[activeIndex] ?? null;

  const handleDownloadSingleSlip = async () => {
    const element = document.getElementById('shared-payment-slip');
    if (!element || !activeOrder) return;

    try {
      const blob = await captureSlipElementToPngBlob(element);
      const prefix = activeOrder.formType === 'prenos' ? 'Prenos' : 'Uplatnica';
      downloadBlob(blob, `${prefix}-${activeOrder.data.receiverName || 'Nalog'}.png`);

      toast.success('Uplatnica sačuvana!', {
        duration: 2000,
        position: 'bottom-center',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Greška pri preuzimanju uplatnice', {
        duration: 2000,
        position: 'bottom-center',
      });
    }
  };

  const handleDownloadAllSlips = async () => {
    if (!orders) return;

    try {
      const zip = new JSZip();
      for (let i = 0; i < orders.length; i++) {
        const element = document.getElementById(`shared-payment-slip-page-${i}`);
        if (!element) continue;
        const blob = await captureSlipElementToPngBlob(element);
        const prefix = orders[i].formType === 'prenos' ? 'Prenos' : 'Uplatnica';
        const label = sanitizeFilename(orders[i].data.receiverName, `Nalog-${i + 1}`);
        zip.file(`${prefix}-${i + 1}-${label}.png`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, 'Uplatnice.zip');
      toast.success('Uplatnice preuzete kao ZIP!', {
        duration: 2000,
        position: 'bottom-center',
      });
    } catch (error) {
      console.error('ZIP download error:', error);
      toast.error('Greška pri preuzimanju uplatnica', {
        duration: 2000,
        position: 'bottom-center',
      });
    }
  };

  const handleDownloadPaymentSlip = () =>
    orders && orders.length > 1 ? handleDownloadAllSlips() : handleDownloadSingleSlip();

  if (!orders || !activeOrder) {
    return (
      <>
        <Toaster />
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Nevažeći link</h1>
            <p className="text-gray-600">Link za uplatnicu nije ispravan ili je nepotpun.</p>
            <a
              href="/"
              className="mt-6 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Nazad na početnu
            </a>
          </div>
        </div>
      </>
    );
  }

  const { data, formType } = activeOrder;
  const qrString = generateIPSString(data);

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-gray-100 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
              Podeljeno sa vama
            </h1>
            <p className="text-gray-600 text-center text-sm">
              {orders.length > 1
                ? `Skenirajte QR kod ili preuzmite uplatnicu (${orders.length} uplatnice)`
                : 'Skenirajte QR kod ili preuzmite uplatnicu'}
            </p>
            {orders.length > 1 && (
              <div className="flex justify-center mt-4">
                <OrderTabs count={orders.length} activeIndex={activeIndex} onSelect={setActiveIndex} />
              </div>
            )}
          </div>

          {/* Content Grid - Payment Slip gets more space */}
          <div className="grid grid-cols-1 xl:grid-cols-[740px_1fr] gap-6 justify-center">
            {/* Payment Slip - Fixed width container */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {formType === 'prenos' ? 'Nalog za prenos' : 'Uplatnica'}
                {orders.length > 1 && (
                  <span className="text-sm font-normal text-gray-400 ml-2">
                    (stranica {activeIndex + 1} od {orders.length})
                  </span>
                )}
              </h2>
              <div className="bg-gray-50 rounded-xl p-4 flex justify-center overflow-x-auto">
                <div id="shared-payment-slip">
                  <PaymentSlip data={data} qrString={qrString} formType={formType} />
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center">
              <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                NBS IPS QR Kod
              </h2>
              <div className="flex justify-center items-center">
                {qrString ? (
                  <div className="bg-gray-50 p-6 rounded-2xl">
                    <QRCodeSVG value={qrString} size={300} level="M" includeMargin={true} />
                  </div>
                ) : (
                  <div className="w-[300px] h-[300px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                    QR kod nije dostupan
                  </div>
                )}
              </div>
              <p className="text-center text-sm text-gray-500 mt-4">
                Skenirajte u bankarskoj aplikaciji
              </p>
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleDownloadPaymentSlip}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download size={20} />
              {orders.length > 1 ? 'Preuzmi uplatnice (ZIP)' : 'Preuzmi uplatnicu'}
            </button>
            <a
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Kreirajte svoju uplatnicu
            </a>
          </div>

          <Footer />
        </div>
      </div>

      {/* Off-screen mirror of every uplatnica, used only to build the ZIP when
          downloading multiple slips at once. */}
      {orders.length > 1 && (
        <div
          aria-hidden="true"
          style={{ position: 'fixed', top: 0, left: '-9999px', opacity: 0, pointerEvents: 'none' }}
        >
          {orders.map((order, index) => (
            <div id={`shared-payment-slip-page-${index}`} key={index}>
              <PaymentSlip data={order.data} qrString={generateIPSString(order.data)} formType={order.formType} />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default ShareView;
