// Import các thư viện
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const dateFormat = require('dateformat');
const qs = require('qs');
const cors = require('cors');

// Khởi tạo app Express
const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- THÔNG TIN CẤU HÌNH ---
// ⚠️ Lưu ý: phải trùng với cấu hình trong tài khoản sandbox VNPAY
const vnp_TmnCode = 'Y18IGTHF';
const vnp_HashSecret = 'KQ6V4KNVKM8K93MO7QEUZHHP4DIZMBDY';
const vnp_Url = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

// ⚠️ Nếu deploy trên Vercel, hãy thay localhost bằng domain thật của bạn
const vnp_ReturnUrl = 'prm392project://payment/result';

// API Endpoint
app.post('/api/server', (req, res) => {
    let amount = req.body.totalPrice;
    if (!amount) {
        return res.status(400).json({ error: "Missing totalPrice" });
    }

    let now = new Date();
    // Offset của GMT+7 là 7 giờ * 60 phút * 60 giây * 1000ms
    let GTM_PLUS_7 = 7 * 60 * 60 * 1000;
    // Tạo Date object mới với thời gian GMT+7
    let gmt7Time = new Date(now.getTime() + GTM_PLUS_7);

    // 1. TẠO THỜI GIAN TẠO (CREATE DATE)
    // Dùng 'UTC:' để in ra thời gian gmt7Time mà không bị server đổi múi giờ
    //let createDate = dateFormat(gmt7Time, 'UTC:yyyyMMddHHmmss');
    let createDate = dateFormat(gmt7Time, 'UTC:yyyyMMddHHmmss');
    
    // 2. TẠO THỜI GIAN HẾT HẠN (EXPIRE DATE) 15 PHÚT
    let expireTime = new Date(gmt7Time.getTime() + 15 * 60 * 1000);
    let expireDate = dateFormat(expireTime, 'UTC:yyyyMMddHHmmss');
    // --- KẾT THÚC SỬA LỖI ---

    let orderId = dateFormat(gmt7Time, 'UTC:HHmmss');
    let tmnCode = vnp_TmnCode;
    let secretKey = vnp_HashSecret;
    let returnUrl = vnp_ReturnUrl;
    let ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log("createDate:", createDate);
    console.log("expireDate:", expireDate);
    let vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = orderId;
    vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang ' + orderId;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = amount * 100;
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;
    vnp_Params['vnp_ExpireDate'] = expireDate;

    // Sắp xếp params
    let sortedParams = Object.keys(vnp_Params).sort().reduce((acc, key) => {
        acc[key] = vnp_Params[key];
        return acc;
    }, {});

    // Tạo chuỗi ký và hash
    let signData = qs.stringify(sortedParams, { encode: false });
    let hmac = crypto.createHmac('sha512', secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    sortedParams['vnp_SecureHash'] = signed;

    // URL thanh toán cuối cùng
    let paymentUrl = vnp_Url + '?' + qs.stringify(sortedParams);

    console.log("Created URL: ", paymentUrl);
    res.status(200).json({ url: paymentUrl });
});

// Xuất app cho Vercel
module.exports = app;
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

console.log('✅ Server starting at', new Date().toLocaleString());