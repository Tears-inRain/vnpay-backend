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
const vnp_TmnCode = 'Y18IGTHF';
const vnp_HashSecret = 'KQ6V4KNVKM0K93MO7QEUZHHP4DIZMBDY'; // Key MỚI
const vnp_Url = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

// ⛔️ CHÚNG TA ĐANG TEST BẰNG "localhost" ĐỂ SỬA LỖI CHỮ KÝ ⛔️
const vnp_ReturnUrl = 'http://localhost';

// API Endpoint
app.post('/api/server', (req, res) => {
    let amount = req.body.totalPrice;
    if (!amount) {
        return res.status(400).json({ error: "Missing totalPrice" });
    }

    // --- Sửa lỗi Timezone (GMT+7) ---
    let now = new Date();
    let GTM_PLUS_7 = 7 * 60 * 60 * 1000;
    let gmt7Time = new Date(now.getTime() + GTM_PLUS_7);

    // Tạo vnp_CreateDate (Giờ GMT+7)
    let createDate = dateFormat(gmt7Time, 'UTC:yyyymmddHHmmss');
    
    // --- ⛔️ THÊM vnp_ExpireDate (BẮT BUỘC) ⛔️ ---
    // Thêm 15 phút vào thời gian GMT+7
    let expireTime = new Date(gmt7Time.getTime() + 15 * 60 * 1000);
    let expireDate = dateFormat(expireTime, 'UTC:yyyymmddHHmmss');
    // --- KẾT THÚC THÊM ---

    let orderId = dateFormat(gmt7Time, 'UTC:HHmmss');
    let tmnCode = vnp_TmnCode;
    let secretKey = vnp_HashSecret;
    let returnUrl = vnp_ReturnUrl;
    let ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

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
    
    // ⛔️ THÊM vnp_ExpireDate VÀO DANH SÁCH PARAMS ⛔️
    vnp_Params['vnp_ExpireDate'] = expireDate;

    // Sắp xếp params
    let sortedParams = Object.keys(vnp_Params).sort().reduce((acc, key) => {
        acc[key] = vnp_Params[key];
        return acc;
    }, {});

    // Logic Hashing của NodeJS (đã sửa lỗi 'querystring')
    let signData = qs.stringify(sortedParams, { encode: false });
    let hmac = crypto.createHmac('sha512', secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    sortedParams['vnp_SecureHash'] = signed;

    // URL cuối cùng (đã sửa lỗi 'querystring')
    let paymentUrl = vnp_Url + '?' + qs.stringify(sortedParams);
    
    console.log("Created URL: ", paymentUrl);
    res.status(200).json({ url: paymentUrl });
});

// Xuất app cho Vercel
module.exports = app;