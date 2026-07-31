import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Toaster, toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';
import PaymentSlip from '@/components/PaymentSlip';
import Footer from '@/components/Footer';
import { decodeSlipData } from '@/utils/slipLink';
import { generateIPSString } from '@/utils/ipsGenerator';
import { AlertCircle, Download } from 'lucide-react';

const ShareView: React.FC = () => {
  // The slip lives entirely in the URL fragment — decode it once, synchronously.
  const slip = useMemo(() => decodeSlipData(window.location.hash), []);

  const handleDownloadPaymentSlip = async () => {
    const element = document.getElementById('shared-payment-slip');
    if (!element) return;

    try {
      // Clone the payment slip element
      const clone = element.cloneNode(true) as HTMLElement;
      clone.id = 'payment-slip-clone';

      // Create a container for the clone
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.zIndex = '-1';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';

      // Append clone to container, then container to body
      container.appendChild(clone);
      document.body.appendChild(container);

      // Replace all inputs with divs to fix html2canvas rendering issues
      const inputs = clone.querySelectorAll('input');
      inputs.forEach((input) => {
        const div = document.createElement('div');
        const value = document.createElement('span');
        value.textContent = input.value;
        value.style.display = 'block';
        value.style.transform = 'translateY(-6px)';
        div.appendChild(value);
        const inputStyle = getComputedStyle(input);

        // Match input styling exactly
        div.style.border = '2px solid #000';
        div.style.fontSize = inputStyle.fontSize;
        div.style.padding = '2px';
        div.style.width = '100%';
        div.style.height = inputStyle.height;
        div.style.boxSizing = 'border-box';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.lineHeight = inputStyle.lineHeight;
        div.style.fontFamily = 'Arial, sans-serif';
        div.style.backgroundColor = '#ffffff';

        input.parentNode?.replaceChild(div, input);
      });

      // Replace all textareas with divs
      const textareas = clone.querySelectorAll('textarea');
      textareas.forEach((textarea) => {
        const div = document.createElement('div');
        div.textContent = textarea.value;
        const textareaStyle = getComputedStyle(textarea);

        // Match textarea styling exactly
        div.style.border = '1px solid #000';
        div.style.fontSize = textareaStyle.fontSize;
        div.style.padding = '2px';
        div.style.width = '100%';
        div.style.height = textareaStyle.height;
        div.style.boxSizing = 'border-box';
        div.style.display = 'block';
        div.style.whiteSpace = 'pre-line';
        div.style.lineHeight = textareaStyle.lineHeight;
        div.style.fontFamily = 'Arial, sans-serif';
        div.style.backgroundColor = '#ffffff';

        textarea.parentNode?.replaceChild(div, textarea);
      });

      clone.querySelectorAll<HTMLElement>('.form-group label').forEach((label) => {
        label.style.transform = 'translateY(-2px)';
      });

      // Wait briefly for DOM to update
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Capture the clone with html2canvas
      const canvas = await html2canvas(clone, {
        scale: 3,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
      });

      // Remove the container
      document.body.removeChild(container);

      // Download the PNG
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      const prefix = slip?.formType === 'prenos' ? 'Prenos' : 'Uplatnica';
      downloadLink.download = `${prefix}-${slip?.data.receiverName || 'Nalog'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();

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

  if (!slip) {
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

  const { data, formType } = slip;
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
              Skenirajte QR kod ili preuzmite uplatnicu
            </p>
          </div>

          {/* Content Grid - Payment Slip gets more space */}
          <div className="grid grid-cols-1 xl:grid-cols-[740px_1fr] gap-6 justify-center">
            {/* Payment Slip - Fixed width container */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {formType === 'prenos' ? 'Nalog za prenos' : 'Uplatnica'}
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
              Preuzmi uplatnicu
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
    </>
  );
};

export default ShareView;
