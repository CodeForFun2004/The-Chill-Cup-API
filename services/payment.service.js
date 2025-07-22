const QRCode = require('qrcode');

async function generateVietQR(bankCode, accountNumber, amount, orderId) {
  const vietQRUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.jpg?amount=${amount}&addInfo=${orderId}`;

  
  const qrImage = await QRCode.toDataURL(vietQRUrl);
  
  return vietQRUrl;
}

module.exports = { generateVietQR };