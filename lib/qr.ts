import QRCode from "qrcode";

export function getPassUrl(passId: string, baseUrl = ""): string {
  return `${baseUrl}/pass/${passId}`;
}

export async function generateQRDataURL(passId: string, baseUrl = ""): Promise<string> {
  const url = getPassUrl(passId, baseUrl);
  return QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: "#1e293b", light: "#ffffff" },
  });
}
