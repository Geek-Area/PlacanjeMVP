import React, { useState, useEffect, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Toaster, toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';
import domtoimage from 'dom-to-image-more';
import { PaymentData, FormType } from "@/types";
import {
  generateIPSString,
  formatAmount,
  formatBankAccount,
  validateModel97,
} from "@/utils/ipsGenerator";
import PaymentSlip from "@/components/PaymentSlip";
import { saveSharedSlip } from "@/supabase/shareUtils";
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
  Share2,
  History,
  Plus,
  Trash2,
  ArrowLeftRight,
} from "lucide-react";

interface SavedSlip {
  id: string;
  timestamp: Date;
  data: PaymentData;
  formType: FormType;
}

const App: React.FC = () => {
  const [formType, setFormType] = useState<FormType>('uplata');
  const [formData, setFormData] = useState<PaymentData>({
    payerName: "",
    payerAddress: "",
    payerCity: "",
    payerAccount: "",
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
    debitModel: "",
    debitReference: "",
  });

  const [qrString, setQrString] = useState<string | null>(null);
  const [savedSlips, setSavedSlips] = useState<SavedSlip[]>([]);
  const [isFormattingAccount, setIsFormattingAccount] = useState(false);

  // Save current payment slip to history
  const handleSaveSlip = () => {
    const validation = getValidationStatus();
    if (!validation.isValid) {
      toast.error('Popunite sve obavezne podatke pre čuvanja', {
        duration: 2000,
        position: 'bottom-center',
      });
      return;
    }

    const newSlip: SavedSlip = {
      id: Date.now().toString(),
      timestamp: new Date(),
      data: { ...formData },
      formType,
    };

    setSavedSlips((prev) => [newSlip, ...prev]);
    toast.success('Uplatnica sačuvana!', {
      duration: 2000,
      position: 'bottom-center',
    });
  };

  // Load a saved slip
  const handleLoadSlip = (slip: SavedSlip) => {
    setFormData(slip.data);
    setFormType(slip.formType || 'uplata');
    toast.success('Uplatnica učitana!', {
      duration: 1500,
      position: 'bottom-center',
    });
  };

  // Delete a saved slip
  const handleDeleteSlip = (id: string) => {
    setSavedSlips((prev) => prev.filter((slip) => slip.id !== id));
    toast.success('Uplatnica obrisana', {
      duration: 1500,
      position: 'bottom-center',
    });
  };

  // Validate if QR code is truly valid and return validation status
  const getValidationStatus = () => {
    // If no input yet, return waiting status
    if (!formData.receiverAccount && !formData.receiverName && !formData.purpose && !formData.amount) {
      return {
        isValid: false,
        showError: false,
        icon: "waiting",
        message: "Čeka se unos podataka...",
      };
    }

    // Check receiver account (must be exactly 18 digits)
    const cleanAccount = formData.receiverAccount.replace(/[^0-9]/g, "");
    if (cleanAccount.length > 0 && cleanAccount.length !== 18) {
      return {
        isValid: false,
        showError: true,
        icon: "error",
        message: "Račun primaoca mora imati tačno 18 cifara",
      };
    }

    // Check receiver name
    if (!formData.receiverName || formData.receiverName.trim() === "") {
      return {
        isValid: false,
        showError: true,
        icon: "error",
        message: "Naziv primaoca nije popunjen",
      };
    }

    // Check if account is complete (18 digits)
    if (cleanAccount.length !== 18) {
      return {
        isValid: false,
        showError: true,
        icon: "error",
        message: "Račun primaoca mora imati tačno 18 cifara",
      };
    }

    // Check if amount is filled
    if (!formData.amount) {
      return {
        isValid: false,
        showError: true,
        icon: "error",
        message: "Iznos nije unet",
      };
    }

    // All validations passed
    return {
      isValid: true,
      showError: false,
      icon: "success",
      message: "NBS IPS QR kod je validan",
    };
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

  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Remove all non-digit characters (dashes, spaces, etc.)
    const cleaned = value.replace(/[^0-9]/g, "");
    // Store only digits (max 18)
    setFormData((prev) => ({
      ...prev,
      receiverAccount: cleaned.substring(0, 18),
    }));
  };

  const autoFormatAccountField = async (fieldName: 'receiverAccount' | 'payerAccount') => {
    const account = formData[fieldName];
    if (!account || account.length === 0) return;

    const cleaned = account.replace(/[^0-9]/g, "");

    // Need at least 6 digits: 3 (bank) + 1 (account) + 2 (check)
    if (cleaned.length < 6) return;

    // If already 18 digits, no need to format
    if (cleaned.length === 18) return;

    setIsFormattingAccount(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Serbian bank account format: XXX-AAAAAAAAAAAAA-CC (3 + 13 + 2 = 18)
    // Always treat first 3 as bank code and last 2 as check digit
    const bankCode = cleaned.substring(0, 3);
    const checkDigit = cleaned.substring(cleaned.length - 2);
    const middlePart = cleaned.substring(3, cleaned.length - 2);

    // Pad middle with leading zeros to 13 digits
    const paddedMiddle = middlePart.padStart(13, "0");

    const formatted = bankCode + paddedMiddle + checkDigit;

    setFormData((prev) => ({
      ...prev,
      [fieldName]: formatted,
    }));

    setIsFormattingAccount(false);

    toast.success('Račun automatski formatiran', {
      duration: 1500,
      position: 'bottom-center',
    });
  };

  const getFormattedAccountDisplay = () => {
    const account = formData.receiverAccount;
    if (!account) return "";

    // Remove any non-digits
    const cleaned = account.replace(/[^0-9]/g, "");

    // Format as XXX-XXXXXXXXXXXXX-XX
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 16) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 16)}-${cleaned.slice(16)}`;
    }
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

  const handleDownloadPaymentSlip = async () => {
    const element = document.getElementById("payment-slip");
    if (!element) return;

    try {
      // Clone the payment slip element
      const clone = element.cloneNode(true) as HTMLElement;
      clone.id = "payment-slip-clone";

      // Create a container for the clone
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.top = "0";
      container.style.left = "0";
      container.style.zIndex = "-1";
      container.style.opacity = "0";
      container.style.pointerEvents = "none";

      // Append clone to container, then container to body
      container.appendChild(clone);
      document.body.appendChild(container);

      // Replace all inputs with divs to fix html2canvas rendering issues
      const inputs = clone.querySelectorAll("input");
      inputs.forEach((input) => {
        const div = document.createElement("div");
        div.textContent = input.value;

        // Match input styling exactly
        div.style.border = "2px solid #000";
        div.style.fontSize = "12px";
        div.style.padding = "2px";
        div.style.width = "100%";
        div.style.boxSizing = "border-box";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.minHeight = "20px";
        div.style.fontFamily = "Arial, sans-serif";
        div.style.backgroundColor = "#ffffff";

        input.parentNode?.replaceChild(div, input);
      });

      // Replace all textareas with divs
      const textareas = clone.querySelectorAll("textarea");
      textareas.forEach((textarea) => {
        const div = document.createElement("div");
        div.textContent = textarea.value;

        // Match textarea styling exactly
        div.style.border = "1px solid #000";
        div.style.fontSize = "12px";
        div.style.padding = "2px";
        div.style.width = "100%";
        div.style.boxSizing = "border-box";
        div.style.whiteSpace = "pre-line";
        div.style.fontFamily = "Arial, sans-serif";
        div.style.minHeight = getComputedStyle(textarea).height;
        div.style.backgroundColor = "#ffffff";

        textarea.parentNode?.replaceChild(div, textarea);
      });

      // Wait briefly for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));

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
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      const dlPrefix = formType === 'prenos' ? 'Prenos' : 'Uplatnica';
      downloadLink.download = `${dlPrefix}-${formData.receiverName || "Nalog"}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();

      toast.success('Uplatnica sačuvana!', {
        duration: 2000,
        position: 'bottom-center',
      });
    } catch (error) {
      console.error("Download error:", error);
      toast.error('Greška pri preuzimanju uplatnice', {
        duration: 2000,
        position: 'bottom-center',
      });
    }
  };

  const handleShare = async () => {
    const validation = getValidationStatus();
    if (!validation.isValid) {
      toast.error('Popunite sve obavezne podatke pre deljenja', {
        duration: 2000,
        position: 'bottom-center',
      });
      return;
    }

    try {
      toast.loading('Kreiranje linka za deljenje...', {
        duration: 1000,
        position: 'bottom-center',
      });

      // Save to Supabase
      const shareId = await saveSharedSlip(formData, qrString, formType);

      // Generate share URL
      const shareUrl = `${window.location.origin}/share/${shareId}`;

      // Copy to clipboard with fallback for non-HTTPS contexts
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);
        } else {
          // Fallback for browsers/contexts without clipboard API
          const textArea = document.createElement('textarea');
          textArea.value = shareUrl;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
      } catch (clipboardError) {
        console.error('Clipboard error:', clipboardError);
        // Still show the link even if clipboard fails
        alert(`Link: ${shareUrl}\n\nKopirajte link ručno.`);
      }

      toast.success('Link kopiran u clipboard!', {
        duration: 3000,
        position: 'bottom-center',
      });
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Greška pri kreiranju linka', {
        duration: 2000,
        position: 'bottom-center',
      });
    }
  };

  // Helper for input classes to keep JSX clean
  const inputClass =
    "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400";
  const labelClass =
    "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider";

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-8 font-sans">
      <Toaster />

      {/* Main Container - Vertical Layout */}
      <div className="w-full max-w-7xl mx-auto space-y-6">

        {/* Top Row: Form + History Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Form Section - 75% */}
          <div className="w-full lg:w-3/4 bg-white rounded-2xl shadow-lg p-6 lg:p-8">
            <div className="mb-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <span className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                    <FileText size={24} />
                  </span>
                  {formType === 'uplata' ? 'Nalog za uplatu' : 'Nalog za prenos'}
                </h1>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setFormType('uplata')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      formType === 'uplata'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Uplata
                  </button>
                  <button
                    onClick={() => setFormType('prenos')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
                      formType === 'prenos'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ArrowLeftRight size={14} />
                    Prenos
                  </button>
                </div>
              </div>
              <p className="text-gray-400 text-sm mt-1 ml-14">
                {formType === 'uplata'
                  ? 'Popunite podatke o plaćanju da biste generisali NBS IPS QR kod.'
                  : 'Popunite podatke za prenos sredstava između računa.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: People & Purpose */}
              <div className="space-y-6">
                {/* Uplatilac */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative group hover:border-blue-200 transition-colors">
                  <div className="absolute top-3 right-4 text-gray-300 group-hover:text-blue-400 transition-colors">
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
                      autoComplete="section-payer name"
                    />
                    <input
                      name="payerAddress"
                      value={formData.payerAddress}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="Adresa (Ulica i broj)"
                      autoComplete="section-payer address-line1"
                    />
                    <input
                      name="payerCity"
                      value={formData.payerCity}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="Mesto"
                      autoComplete="section-payer address-level2"
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
                    autoComplete="off"
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
                      autoComplete="section-receiver organization"
                    />
                    <input
                      name="receiverAddress"
                      value={formData.receiverAddress}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="Adresa primaoca"
                      autoComplete="section-receiver address-line1"
                    />
                    <input
                      name="receiverCity"
                      value={formData.receiverCity}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="Mesto primaoca"
                      autoComplete="section-receiver address-level2"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Financials */}
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
                      autoComplete="off"
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

                {/* Payer Account - only for Prenos */}
                {formType === 'prenos' && (
                  <div>
                    <label className={labelClass}>Račun uplatioca</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Wallet size={16} className="text-gray-400" />
                      </div>
                      <input
                        name="payerAccount"
                        type="text"
                        inputMode="numeric"
                        value={(() => {
                          const acc = formData.payerAccount;
                          if (!acc) return "";
                          const c = acc.replace(/[^0-9]/g, "");
                          if (c.length <= 3) return c;
                          if (c.length <= 16) return `${c.slice(0, 3)}-${c.slice(3)}`;
                          return `${c.slice(0, 3)}-${c.slice(3, 16)}-${c.slice(16)}`;
                        })()}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/[^0-9]/g, "");
                          setFormData((prev) => ({ ...prev, payerAccount: cleaned.substring(0, 18) }));
                        }}
                        onBlur={() => autoFormatAccountField('payerAccount')}
                        className={`${inputClass} pl-10 pr-10 font-mono tracking-wide`}
                        placeholder="XXX-XXXXXXXXXXXXXXX-XX"
                        maxLength={21}
                        autoComplete="on"
                      />
                      {isFormattingAccount && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <RefreshCw size={16} className="text-blue-600 animate-spin" />
                        </div>
                      )}
                      {!isFormattingAccount && formData.payerAccount.length === 18 && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <CheckCircle2 size={16} className="text-green-600" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Unesite račun sa ili bez crtica (18 cifara)
                    </p>
                  </div>
                )}

                {/* Debit Model and Reference - only for Prenos */}
                {formType === 'prenos' && (
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3">
                      <label className={labelClass}>Model</label>
                      <input
                        name="debitModel"
                        value={formData.debitModel}
                        onChange={handleInputChange}
                        className={`${inputClass} text-center font-mono`}
                        placeholder="97"
                        maxLength={2}
                        autoComplete="off"
                      />
                    </div>
                    <div className="col-span-9">
                      <label className={labelClass}>
                        Poziv na broj (zaduženje)
                      </label>
                      <input
                        name="debitReference"
                        value={formData.debitReference}
                        onChange={handleInputChange}
                        className={`${inputClass} font-mono`}
                        placeholder="Poziv na broj"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                )}

                {/* Receiver Account Number */}
                <div>
                  <label className={labelClass}>Račun primaoca</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Wallet size={16} className="text-gray-400" />
                    </div>
                    <input
                      name="receiverAccount"
                      type="text"
                      inputMode="numeric"
                      value={getFormattedAccountDisplay()}
                      onChange={handleAccountChange}
                      onBlur={() => autoFormatAccountField('receiverAccount')}
                      className={`${inputClass} pl-10 pr-10 font-mono tracking-wide`}
                      placeholder="XXX-XXXXXXXXXXXXXXX-XX"
                      maxLength={21}
                      autoComplete="on"
                    />
                    {isFormattingAccount && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <RefreshCw size={16} className="text-blue-600 animate-spin" />
                      </div>
                    )}
                    {!isFormattingAccount && formData.receiverAccount.length === 18 && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <CheckCircle2 size={16} className="text-green-600" />
                      </div>
                    )}
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
                      autoComplete="off"
                    />
                  </div>
                  <div className="col-span-9">
                    <label className={labelClass}>
                      Poziv na broj (odobrenje)
                    </label>
                    <div className="relative">
                      <input
                        name="reference"
                        value={formData.reference}
                        onChange={handleInputChange}
                        className={`${inputClass} font-mono pr-10`}
                        placeholder="Poziv na broj"
                        autoComplete="off"
                      />
                      {formData.model === "97" && formData.reference.length >= 3 && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          {validateModel97(formData.reference) ? (
                            <CheckCircle2 size={16} className="text-green-600" />
                          ) : (
                            <AlertCircle size={16} className="text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {formData.model === "97" && formData.reference.length >= 3 && !validateModel97(formData.reference) && (
                      <p className="text-[10px] text-red-500 mt-1">
                        Kontrolni broj nije ispravan za Model 97
                      </p>
                    )}
                  </div>
                </div>

                {/* Helpful tips */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-8">
                  <h4 className="text-blue-800 text-xs font-bold mb-1 flex items-center gap-2">
                    <RefreshCw size={12} />
                    INFORMACIJE
                  </h4>
                  <p className="text-blue-700 text-xs leading-relaxed">
                    Za Model 97 unesite kompletan poziv na broj uključujući kontrolne cifre.
                    Podaci se automatski formatiraju za NBS IPS standard.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Slips Sidebar - 25% */}
          <div className="w-full lg:w-1/4 bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-gray-700">
                <FileText size={20} />
                <h2 className="text-lg font-bold">Uplatnice</h2>
              </div>
              <button
                onClick={handleSaveSlip}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Sačuvaj trenutnu uplatnicu"
              >
                <Plus size={18} />
              </button>
            </div>

            {savedSlips.length === 0 ? (
              <div className="text-sm text-gray-400 italic text-center py-8">
                Nema sačuvanih uplatnica
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {savedSlips.map((slip) => (
                  <div
                    key={slip.id}
                    className="border border-gray-200 rounded-lg p-3 hover:border-blue-400 transition-colors cursor-pointer group"
                    onClick={() => handleLoadSlip(slip)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {slip.data.receiverName || "Bez naziva"}
                          </p>
                          {slip.formType === 'prenos' && (
                            <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium shrink-0">
                              PRENOS
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {slip.data.amount ? formatAmount(slip.data.amount) : "0,00"} RSD
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(slip.timestamp).toLocaleString("sr-RS", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSlip(slip.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        title="Obriši"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payment Slip Display */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileText size={24} className="text-blue-600" />
            {formType === 'uplata' ? 'Uplatnica' : 'Nalog za prenos'}
          </h2>
          <div className="bg-gray-50 rounded-xl p-4 flex justify-center">
            <PaymentSlip data={formData} qrString={qrString} formType={formType} />
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleDownload}
            disabled={!getValidationStatus().isValid}
            className={`py-4 px-6 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg
              ${
                getValidationStatus().isValid
                  ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 cursor-pointer"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50"
              }`}
          >
            <Download size={20} />
            Sačuvaj QR
          </button>

          <button
            onClick={handleDownloadPaymentSlip}
            disabled={!getValidationStatus().isValid}
            className={`py-4 px-6 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg
              ${
                getValidationStatus().isValid
                  ? "bg-green-600 text-white hover:bg-green-700 active:scale-95 cursor-pointer"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50"
              }`}
          >
            <FileText size={20} />
            Preuzmi Uplatnicu
          </button>

          <button
            onClick={handleShare}
            disabled={!getValidationStatus().isValid}
            className={`py-4 px-6 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg
              ${
                getValidationStatus().isValid
                  ? "bg-purple-600 text-white hover:bg-purple-700 active:scale-95 cursor-pointer"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50"
              }`}
          >
            <Share2 size={20} />
            Podeli
          </button>
        </div>

        {/* Blue Info Section - Pregled plaćanja */}
        <div className="bg-[#1e40af] text-white rounded-2xl shadow-lg p-6 lg:p-8 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-blue-900 to-transparent opacity-40"></div>

          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Pregled plaćanja</h2>
            <p className="text-blue-200 text-sm mb-6">
              Skenirajte kod bankarskom aplikacijom ili preuzmite uplatnicu.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                <span className="text-blue-200 text-xs block mb-1">Datum transakcije</span>
                <span className="font-bold text-lg">
                  {new Date().toLocaleDateString("sr-RS")}
                </span>
              </div>
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                <span className="text-blue-200 text-xs block mb-1">Ukupno za uplatu</span>
                <span className="font-bold text-2xl">
                  {formData.amount ? formatAmount(formData.amount) : "0,00"}{" "}
                  <span className="text-sm font-normal text-blue-300">RSD</span>
                </span>
              </div>
              {formData.receiverName && (
                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                  <span className="text-blue-200 text-xs block mb-1">Primalac</span>
                  <span className="font-semibold truncate block">
                    {formData.receiverName}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* QR Code + Validation Status */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-4">NBS IPS QR Kod</h2>

            {/* Validation Status */}
            <div className="mb-6">
              <div className="flex items-center gap-2 justify-center text-sm">
                {(() => {
                  const validation = getValidationStatus();
                  if (validation.icon === "waiting") {
                    return (
                      <>
                        <CheckCircle2 size={20} className="text-gray-400" />
                        <span className="text-gray-600">{validation.message}</span>
                      </>
                    );
                  } else if (validation.icon === "success") {
                    return (
                      <>
                        <CheckCircle2 size={20} className="text-green-600" />
                        <span className="text-green-600 font-semibold">{validation.message}</span>
                      </>
                    );
                  } else {
                    return (
                      <>
                        <AlertCircle size={20} className="text-yellow-600" />
                        <span className="text-yellow-600">{validation.message}</span>
                      </>
                    );
                  }
                })()}
              </div>
            </div>

            {/* QR Code Display */}
            <div className="inline-block bg-gray-50 p-6 rounded-2xl">
              {qrString && getValidationStatus().isValid ? (
                <QRCodeSVG
                  id="ips-qr-code"
                  value={qrString}
                  size={300}
                  level="M"
                  includeMargin={true}
                />
              ) : (
                <div className="w-[300px] h-[300px] bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400">
                  <CreditCard size={60} className="mb-4 opacity-50" />
                  <span className="text-sm text-center px-4">
                    Unesite podatke za prikaz koda
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-400 text-xs">
        Placanje.RS &copy; 2026
      </div>
    </div>
  );
};

export default App;
