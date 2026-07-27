// ============================================
// PromptPay QR Code Payload Generator (EMV QR)
// ============================================

function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  return ((crc & 0xffff).toString(16).toUpperCase().padStart(4, "0"));
}

function tlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${tag}${len}${value}`;
}

export function generatePromptPayPayload(target: string, amount: number): string {
  // Clean target (remove dashes/spaces)
  const clean = target.replace(/[-\s]/g, "");

  // Determine if phone (10 digits) or national ID (13 digits) or tax ID (10 digits)
  let merchantId: string;
  if (clean.length === 10 && clean.startsWith("0")) {
    // Phone number → 0066 format
    merchantId = `0066${clean.substring(1)}`;
  } else {
    // National ID / Tax ID
    merchantId = clean;
  }

  const merchantAccId = tlv("01", merchantId);
  const merchantInfo = tlv("29", tlv("00", "A000000677010111") + tlv("01", merchantAccId));

  const amountStr = amount.toFixed(2);
  const amountField = tlv("54", amountStr);

  const payload =
    tlv("00", "01") +           // Payload Format Indicator
    tlv("01", "12") +           // Point of Initiation Method (dynamic)
    merchantInfo +              // Merchant Account Information
    tlv("53", "764") +          // Transaction Currency (THB)
    amountField +               // Transaction Amount
    tlv("58", "TH") +           // Country Code
    "6304";                     // CRC placeholder

  const crc = crc16(payload);
  return payload + crc;
}

export function getQrCodeUrl(promptpayId: string, amount: number, size = 250): string {
  const payload = generatePromptPayPayload(promptpayId, amount);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
}
