import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import PaymentSlip from '@/components/PaymentSlip';
import OrderTabs from '@/components/OrderTabs';
import { decodeSlipsData, DecodedSlip } from '@/utils/slipLink';
import { generateIPSString, formatAmount } from '@/utils/ipsGenerator';
import { captureSlipElementToPngBlob, downloadBlob } from '@/utils/downloadHelpers';
import { AlertCircle, Download, Loader2 } from 'lucide-react';

// Natural width of the slip in PaymentSlip.
const SLIP_WIDTH = 680;
// Below this width the slip is unreadable, so only the QR code and key details are shown.
const COMPACT_WIDTH = 480;

/**
 * Bare payment slip for embedding in other sites: `<iframe src="https://placanje.rs/e#2.<code>">`.
 * Same link format as /s, without the page chrome. Reports its height to the parent page
 * (`placanje-embed:height`), which /embed.js uses to size the iframe; nothing else is sent.
 */
const EmbedView: React.FC = () => {
  const [orders, setOrders] = useState<DecodedSlip[] | null | undefined>(undefined);
  const [activeIndex, setActiveIndex] = useState(0);
  const [width, setWidth] = useState(() => window.innerWidth);
  const [slipHeight, setSlipHeight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const slipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const decode = () => {
      decodeSlipsData(window.location.hash).then((decoded) => {
        if (cancelled) return;
        setOrders(decoded);
        setActiveIndex(0);
      });
    };
    decode();
    window.addEventListener('hashchange', decode);
    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', decode);
    };
  }, []);

  // The site-wide 80% zoom (index.css) would shrink the slip and skew the height reported to the
  // parent, so the embed sizes itself at 100%. This page is always its own document in the iframe.
  useLayoutEffect(() => {
    document.body.style.zoom = '1';
  }, []);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // A CSS transform does not change layout size, so the scaled slip's box is sized by hand.
  useLayoutEffect(() => {
    const wrapper = slipRef.current?.querySelector<HTMLElement>('#payment-slip-wrapper');
    if (!wrapper) return;
    const observer = new ResizeObserver(() => setSlipHeight(wrapper.offsetHeight));
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [orders, activeIndex, width]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.parent === window) return;
    const report = () =>
      window.parent.postMessage({ type: 'placanje-embed:height', height: Math.ceil(root.scrollHeight) }, '*');
    const observer = new ResizeObserver(report);
    observer.observe(root);
    report();
    return () => observer.disconnect();
  }, []);

  const activeOrder = orders?.[activeIndex] ?? null;
  const qrString = activeOrder ? generateIPSString(activeOrder.data) : null;
  const compact = width < COMPACT_WIDTH;
  const scale = Math.max(0.3, Math.min(1, (width - 16) / SLIP_WIDTH));

  const handleDownload = async () => {
    const element = document.getElementById('embed-payment-slip');
    if (!element || !activeOrder) return;
    try {
      const blob = await captureSlipElementToPngBlob(element);
      const prefix = activeOrder.formType === 'prenos' ? 'Prenos' : 'Uplatnica';
      downloadBlob(blob, `${prefix}-${activeOrder.data.receiverName || 'Nalog'}.png`);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  let content: React.ReactNode;
  if (orders === undefined) {
    content = (
      <div className="flex justify-center py-10">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  } else if (!activeOrder) {
    content = (
      <div className="flex items-center justify-center gap-2 py-8 text-gray-600 text-sm">
        <AlertCircle className="w-5 h-5 text-red-500" />
        Link za uplatnicu nije ispravan ili je nepotpun.
      </div>
    );
  } else {
    const { data, formType } = activeOrder;
    content = (
      <>
        {orders!.length > 1 && (
          <div className="flex justify-center mb-2">
            <OrderTabs count={orders!.length} activeIndex={activeIndex} onSelect={setActiveIndex} />
          </div>
        )}

        {compact ? (
          <div className="flex flex-col items-center text-center gap-2">
            {qrString ? (
              <QRCodeSVG value={qrString} size={Math.max(120, Math.min(240, width - 48))} level="M" includeMargin={true} />
            ) : (
              <p className="text-sm text-gray-500 py-6">QR kod nije dostupan</p>
            )}
            <div className="text-sm text-gray-700 space-y-0.5">
              <p className="font-semibold">{data.receiverName}</p>
              <p className="text-lg font-bold">
                {formatAmount(data.amount)} {data.currency || 'RSD'}
              </p>
              {data.purpose && <p className="text-gray-500">{data.purpose}</p>}
            </div>
            <p className="text-xs text-gray-400">Skenirajte u bankarskoj aplikaciji</p>
          </div>
        ) : (
          <div className="embed-slip" ref={slipRef} style={{ height: slipHeight * scale || undefined }}>
            <style>{`.embed-slip #payment-slip-wrapper { transform: scale(${scale}) !important; }`}</style>
            <div id="embed-payment-slip">
              <PaymentSlip data={data} qrString={qrString} formType={formType} />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div ref={rootRef} className="bg-white font-sans p-2">
      {content}
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500">
        {activeOrder && !compact ? (
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
          >
            <Download size={14} />
            Preuzmi uplatnicu
          </button>
        ) : (
          <span />
        )}
        <a
          href="https://placanje.rs"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 hover:text-blue-600"
        >
          <img src="/favicon-32x32.png" alt="" width={14} height={14} />
          Napravljeno preko Plaćanje.rs
        </a>
      </div>
    </div>
  );
};

export default EmbedView;
