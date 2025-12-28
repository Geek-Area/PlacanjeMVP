import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { PaymentData } from '@/types';

interface PaymentSlipProps {
  data: PaymentData;
  qrString: string | null;
}

const PaymentSlip: React.FC<PaymentSlipProps> = ({ data, qrString }) => {
  // Format account number for display
  const formatAccountDisplay = (account: string) => {
    if (!account) return '';
    const cleaned = account.replace(/[^0-9]/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 16) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 16)}-${cleaned.slice(16)}`;
  };

  // Format amount for display
  const formatAmountDisplay = (amount: string) => {
    if (!amount) return '';
    const num = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(num)) return '';
    return '= ' + num.toLocaleString('sr-RS', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div id="payment-slip" style={{ width: '100%', display: 'flex', justifyContent: 'center', overflow: 'visible' }}>
      <style>{`
        #payment-slip-wrapper {
          transform-origin: top center;
          width: 680px;
          transition: transform 0.2s ease;
        }

        /* Continuous responsive scaling - desktop to mobile */
        @media (max-width: 1400px) {
          #payment-slip-wrapper {
            transform: scale(0.95);
          }
        }
        @media (max-width: 1280px) {
          #payment-slip-wrapper {
            transform: scale(0.90);
          }
        }
        @media (max-width: 1150px) {
          #payment-slip-wrapper {
            transform: scale(0.85);
          }
        }
        @media (max-width: 1024px) {
          #payment-slip-wrapper {
            transform: scale(0.80);
          }
        }
        @media (max-width: 900px) {
          #payment-slip-wrapper {
            transform: scale(0.75);
          }
        }
        @media (max-width: 800px) {
          #payment-slip-wrapper {
            transform: scale(0.70);
          }
        }
        @media (max-width: 768px) {
          #payment-slip-wrapper {
            transform: scale(0.95);
          }
        }
        @media (max-width: 700px) {
          #payment-slip-wrapper {
            transform: scale(0.88);
          }
        }
        @media (max-width: 650px) {
          #payment-slip-wrapper {
            transform: scale(0.82);
          }
        }
        @media (max-width: 600px) {
          #payment-slip-wrapper {
            transform: scale(0.76);
          }
        }
        @media (max-width: 550px) {
          #payment-slip-wrapper {
            transform: scale(0.70);
          }
        }
        @media (max-width: 500px) {
          #payment-slip-wrapper {
            transform: scale(0.64);
          }
        }
        @media (max-width: 450px) {
          #payment-slip-wrapper {
            transform: scale(0.58);
          }
        }
        @media (max-width: 420px) {
          #payment-slip-wrapper {
            transform: scale(0.54);
          }
        }
        @media (max-width: 390px) {
          #payment-slip-wrapper {
            transform: scale(0.50);
          }
        }
        @media (max-width: 360px) {
          #payment-slip-wrapper {
            transform: scale(0.46);
          }
        }
        body {
          font-family: Arial, sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: center;
          margin: 0;
        }
        input, textarea {
          font-size: 12px;
        }
        input {
          border: 2px solid #000;
        }
        textarea {
          border: 1px solid #000;
        }
        .container {
          margin-top: 20px;
          width: 680px;
          border: 1px solid #000;
          padding: 20px;
          box-sizing: border-box;
        }
        .columns {
          display: flex;
          justify-content: space-between;
        }
        .left, .right {
          flex: 1;
        }
        .left {
          padding-right: 20px;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .left::before {
          content: '';
          position: absolute;
          right: 0;
          top: 0;
          height: 80%;
          width: 1px;
          background-color: #000;
        }
        .right {
          padding-left: 20px;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .form-group {
          margin-bottom: 2px;
        }
        .form-group label {
          display: block;
          margin-bottom: 2px;
          font-size: 10px;
        }
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 2px;
          box-sizing: border-box;
        }
        .form-group textarea {
          resize: none;
        }
        .form-group small {
          display: block;
          margin-top: 5px;
        }
        .right .form-group {
          margin-bottom: 8px;
        }
        .title {
          text-align: right;
          font-weight: bold;
          margin-bottom: 4px;
          font-size: 14px;
        }
        .sifra-iznos {
          display: flex;
          flex-direction: row;
          gap: 10px;
          align-items: end;
        }
        .potpis-datum {
          margin-bottom: auto;
          display: flex;
          justify-content: space-between;
          margin-top: 30px;
        }
        .pp, .mdp, .dv {
          font-size: 10px;
          border-top: 1px solid #000;
          padding-top: 2px;
          width: 45%;
          text-align: center;
          margin-top: 16px;
        }
        .mdp {
          margin-top: 2px;
          margin-left: auto;
        }
        .dv {
          margin-top: auto;
          flex: 4;
        }
        .sifra-placanja {
          flex: 1;
        }
        .valuta {
          flex: 1;
        }
        .iznos {
          flex: 3;
        }
        .model-poziv, .dv-ips {
          display: flex;
          flex-direction: row;
          gap: 10px;
          align-items: end;
        }
        .broj-modela {
          flex: 1;
        }
        .poziv {
          flex: 4;
        }
        .ips {
          flex: 4;
          text-align: right;
        }
      `}</style>

      <div id="payment-slip-wrapper">
        <div className="container">
          <div className="title">НАЛОГ ЗА УПЛАТУ</div>
          <div className="columns">
            <div className="left">
              <div className="form-group">
                <label htmlFor="uplatilac">уплатилац</label>
                <textarea
                  id="uplatilac"
                  name="uplatilac"
                  rows={3}
                  disabled
                  value={[data.payerName, data.payerAddress, data.payerCity].filter(Boolean).join('\n')}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label htmlFor="svrha">сврха уплате</label>
                <textarea
                  id="svrha"
                  name="svrha"
                  rows={3}
                  disabled
                  value={data.purpose}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label htmlFor="primalac">прималац</label>
                <textarea
                  id="primalac"
                  name="primalac"
                  rows={3}
                  disabled
                  value={[data.receiverName, data.receiverAddress, data.receiverCity].filter(Boolean).join('\n')}
                  readOnly
                />
              </div>
              <div className="pp">
                печат и потпис уплатиоца
              </div>
              <div className="mdp">
                место и датум пријема
              </div>
            </div>
            <div className="right">
              <div className="sifra-iznos">
                <div className="form-group sifra-placanja">
                  <label htmlFor="sifra">шифра<br/>плаћања</label>
                  <input
                    type="text"
                    id="sifra"
                    name="sifra"
                    value={data.paymentCode}
                    disabled
                    readOnly
                  />
                </div>
                <div className="form-group valuta">
                  <label htmlFor="valuta">валута</label>
                  <input
                    type="text"
                    id="valuta"
                    name="valuta"
                    value={data.currency}
                    disabled
                    readOnly
                  />
                </div>
                <div className="form-group iznos">
                  <label htmlFor="iznos">износ</label>
                  <input
                    type="text"
                    id="iznos"
                    name="iznos"
                    value={formatAmountDisplay(data.amount)}
                    disabled
                    readOnly
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="racun">рачун примаоца</label>
                <input
                  type="text"
                  id="racun"
                  name="racun"
                  value={formatAccountDisplay(data.receiverAccount)}
                  disabled
                  readOnly
                />
              </div>
              <div className="model-poziv">
                <div className="form-group broj-modela">
                  <label htmlFor="broj-modela">модел</label>
                  <input
                    type="text"
                    id="broj-modela"
                    name="broj-modela"
                    value={data.model}
                    disabled
                    readOnly
                  />
                </div>
                <div className="form-group poziv">
                  <label htmlFor="poziv-na-broj">позив на број (одобрење)</label>
                  <input
                    type="text"
                    id="poziv-na-broj"
                    name="poziv-na-broj"
                    value={data.reference}
                    disabled
                    readOnly
                  />
                </div>
              </div>
              <div className="dv-ips">
                <div className="dv">
                  датум валуте
                </div>
                <div className="ips">
                  {qrString && <QRCodeSVG value={qrString} size={110} level="M" />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSlip;
