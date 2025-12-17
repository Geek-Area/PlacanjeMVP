import React, { useState, useEffect, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { PaymentData } from "@/types";
import {
  generateIPSString,
  formatAmount,
  formatBankAccount,
} from "@/utils/ipsGenerator";
import {
  CreditCard,
  CheckCircle2,
  Download,
  RefreshCw,
  Wallet,
  Building2,
  FileText,
  User,
  AlertCircle,
} from "lucide-react";

const App: React.FC = () => {
  const [formData, setFormData] = useState<PaymentData>({
    payerName: "",
    payerAddress: "",
    payerCity: "",
    purpose: "",
    receiverName: "",
    receiverAddress: "",
    receiverCity: "",
    receiverAccount: "",
    paymentCode: "189",
    currency: "RSD",
    amount: "",
    model: "",
    reference: "",
  });

  const [qrString, setQrString] = useState<string | null>(null);

  // Validate if QR code is truly valid
  const isQRValid = () => {
    if (!qrString) return false;

    // Check if receiver account has exactly 18 digits
    const cleanAccount = formData.receiverAccount.replace(/[^0-9]/g, "");
    if (cleanAccount.length !== 18) return false;

    // Check if amount and receiver name are filled
    if (!formData.amount || !formData.receiverName) return false;

    return true;
  };

  // Real-time generation
  useEffect(() => {
    const generated = generateIPSString(formData);
    setQrString(generated);
  }, [formData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Remove all formatting (dots and convert comma to dot for storage)
    const cleaned = value.replace(/\./g, "").replace(",", ".");
    // Store the clean value
    setFormData((prev) => ({
      ...prev,
      amount: cleaned,
    }));
  };

  const getFormattedAmountDisplay = () => {
    if (!formData.amount) return "";
    const value = formData.amount;
    // If the value is being edited (contains letters or is incomplete), return as is
    const num = parseFloat(value);
    if (isNaN(num)) return value;

    // Format for display with thousand separators
    const parts = value.split(".");
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Add thousand separators to integer part
    const formatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // Return with decimal part if exists
    return decimalPart !== undefined
      ? `${formatted},${decimalPart}`
      : formatted;
  };

  const handleDownload = () => {
    const svg = document.getElementById("ips-qr-code");
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width + 40; // Add padding
        canvas.height = img.height + 40;
        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 20, 20);
          const pngFile = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.download = `IPS-QR-${formData.receiverName || "Uplata"}.png`;
          downloadLink.href = pngFile;
          downloadLink.click();
        }
      };
      img.src =
        "data:image/svg+xml;base64," +
        btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  // Helper for input classes to keep JSX clean
  const inputClass =
    "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400";
  const labelClass =
    "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider";

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 lg:p-8 font-sans">
      {/* Main Container */}
      <div className="w-full max-w-6xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[700px]">
        {/* Left Side: The "Slip" Form */}
        <div className="w-full lg:w-2/3 p-6 lg:p-10 flex flex-col">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <span className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                <FileText size={24} />
              </span>
              Nalog za uplatu
            </h1>
            <p className="text-gray-400 text-sm mt-1 ml-14">
              Popunite podatke o plaćanju da biste generisali NBS IPS kod.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow">
            {/* Left Column of the Slip: People & Purpose */}
            <div className="space-y-6">
              {/* Uplatilac */}
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative group hover:border-blue-200 transition-colors">
                <div className="absolute top-3  right-4 text-gray-300 group-hover:text-blue-400 transition-colors">
                  <User size={18} />
                </div>
                <label className={labelClass}>Uplatilac</label>
                <div className="space-y-2">
                  <input
                    name="payerName"
                    value={formData.payerName}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="Ime i prezime / Naziv firme"
                  />
                  <input
                    name="payerAddress"
                    value={formData.payerAddress}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="Adresa (Ulica i broj)"
                  />
                  <input
                    name="payerCity"
                    value={formData.payerCity}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="Mesto"
                  />
                </div>
              </div>

              {/* Svrha uplate */}
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-blue-200 transition-colors">
                <label className={labelClass}>Svrha uplate</label>
                <input
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  className={`${inputClass} h-20 resize-none`}
                  placeholder="Opis plaćanja (npr. Račun za struju 03/24)"
                />
              </div>

              {/* Primalac */}
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative group hover:border-blue-200 transition-colors">
                <div className="absolute top-3 right-4 text-gray-300 group-hover:text-blue-400 transition-colors">
                  <Building2 size={18} />
                </div>
                <label className={labelClass}>Primalac</label>
                <div className="space-y-2">
                  <input
                    name="receiverName"
                    value={formData.receiverName}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="Naziv primaoca"
                  />
                  <input
                    name="receiverAddress"
                    value={formData.receiverAddress}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="Adresa primaoca"
                  />
                  <input
                    name="receiverCity"
                    value={formData.receiverCity}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="Mesto primaoca"
                  />
                </div>
              </div>
            </div>

            {/* Right Column of the Slip: Financials */}
            <div className="space-y-6">
              {/* Top Row: Code, Currency, Amount */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <label className={labelClass}>Šifra</label>
                  <input
                    name="paymentCode"
                    value={formData.paymentCode}
                    onChange={handleInputChange}
                    className={`${inputClass} text-center font-mono`}
                    maxLength={3}
                  />
                </div>
                <div className="col-span-3">
                  <label className={labelClass}>Valuta</label>
                  <input
                    name="currency"
                    value={formData.currency}
                    readOnly
                    className={`${inputClass} text-center bg-gray-100 cursor-not-allowed`}
                  />
                </div>
                <div className="col-span-6">
                  <label className={labelClass}>Iznos</label>
                  <div className="relative">
                    <input
                      name="amount"
                      type="text"
                      inputMode="decimal"
                      value={getFormattedAmountDisplay()}
                      onChange={handleAmountChange}
                      className={`${inputClass} text-right pr-14 font-semibold text-blue-900`}
                      placeholder="0,00"
                    />
                    <span className="absolute right-3 top-2 text-gray-400 text-sm">
                      RSD
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Number */}
              <div>
                <label className={labelClass}>Račun primaoca</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Wallet size={16} className="text-gray-400" />
                  </div>
                  <input
                    name="receiverAccount"
                    value={formData.receiverAccount}
                    onChange={handleInputChange}
                    className={`${inputClass} pl-10 font-mono tracking-wide`}
                    placeholder="XXX-XXXXXXXXXXXXXXX-XX"
                    maxLength={20}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Unesite račun sa ili bez crtica (18 cifara)
                </p>
              </div>

              {/* Model and Reference */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <label className={labelClass}>Model</label>
                  <input
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    className={`${inputClass} text-center font-mono`}
                    placeholder="97"
                    maxLength={2}
                  />
                </div>
                <div className="col-span-9">
                  <label className={labelClass}>
                    Poziv na broj (odobrenje)
                  </label>
                  <input
                    name="reference"
                    value={formData.reference}
                    onChange={handleInputChange}
                    className={`${inputClass} font-mono`}
                    placeholder="Referenca plaćanja"
                  />
                </div>
              </div>

              {/* Helpful tips */}
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 mt-8">
                <h4 className="text-yellow-800 text-xs font-bold mb-1 flex items-center gap-2">
                  <RefreshCw size={12} />
                  AUTOMATSKA OBRADA
                </h4>
                <p className="text-yellow-700 text-xs leading-relaxed">
                  Poziv na broj će automatski biti izračunat ako koristite Model
                  97. Podaci se automatski formatiraju za NBS IPS standard.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: The "Settings" / QR Panel */}
        <div className="w-full lg:w-1/3 bg-[#1e40af] text-white p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-blue-900 to-transparent opacity-40"></div>

          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Pregled plaćanja</h2>
            <p className="text-blue-200 text-sm mb-8">
              Skenirajte kod bankarskom aplikacijom.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center border-b border-blue-500/30 pb-3">
                <span className="text-blue-200 text-sm">
                  Datum transakcije:
                </span>
                <span className="font-medium">
                  {new Date().toLocaleDateString("sr-RS")}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-500/30 pb-3">
                <span className="text-blue-200 text-sm">Ukupno za uplatu:</span>
                <span className="font-bold text-xl">
                  {formData.amount ? formatAmount(formData.amount) : "0,00"}{" "}
                  <span className="text-sm font-normal text-blue-300">RSD</span>
                </span>
              </div>
              {formData.receiverName && (
                <div className="flex justify-between items-start border-b border-blue-500/30 pb-3">
                  <span className="text-blue-200 text-sm whitespace-nowrap mr-4">
                    Primalac:
                  </span>
                  <span className="font-medium text-right text-sm truncate">
                    {formData.receiverName}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* QR Code Section */}
          <div className="relative z-10 flex-grow flex flex-col items-center justify-center">
            <div className="bg-white p-4 rounded-2xl shadow-lg transition-transform hover:scale-105 duration-300">
              {qrString ? (
                <QRCodeSVG
                  id="ips-qr-code"
                  value={qrString}
                  size={220}
                  level="M"
                  includeMargin={true}
                />
              ) : (
                <div className="w-[220px] h-[220px] bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400 text-center p-4">
                  <CreditCard size={48} className="mb-3 opacity-50" />
                  <span className="text-xs">
                    Unesite račun primaoca i iznos za prikaz koda
                  </span>
                </div>
              )}
            </div>
            <p className="mt-6 text-sm text-blue-200 flex items-center gap-2">
              {!qrString ? (
                <>
                  <CheckCircle2 size={16} className="text-gray-500" />
                  <span>Čeka se unos podataka...</span>
                </>
              ) : isQRValid() ? (
                <>
                  <CheckCircle2 size={16} className="text-green-400" />
                  <span>IPS QR kod je validan</span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} className="text-yellow-400" />
                  <span>Unos nije kompletan (račun mora imati 18 cifara)</span>
                </>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="relative z-10 mt-8">
            <button
              onClick={handleDownload}
              disabled={!isQRValid()}
              className={`w-full py-4 rounded-xl font-bold text-blue-900 transition-all flex items-center justify-center gap-2 shadow-lg
                  ${
                    isQRValid()
                      ? "bg-white hover:bg-blue-50 active:scale-95 cursor-pointer"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
            >
              <Download size={20} />
              Sačuvaj QR Kod
            </button>
          </div>
        </div>
      </div>

      {/* Footer / Branding */}
      <div className="fixed bottom-4 left-0 w-full text-center text-gray-400 text-xs pointer-events-none">
        Pretplata.RS &copy; 2026
      </div>
    </div>
  );
};

export default App;
