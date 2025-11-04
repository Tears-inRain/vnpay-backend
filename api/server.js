// Import các thư viện
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const dateFormat = require('dateformat'); // Đã sửa lỗi dateformat phiên bản 4
const qs = require('qs');
const cors = require('cors');

// Khởi tạo app Express
const app = express();
app.use(cors());
app.use(bodyParser.json());

// ⛔️ THÔNG TIN CẤU HÌNH (Đã đúng) ⛔️
const vnp_TmnCode = 'Y18IGTHF';
const vnp_HashSecret = 'KQ6V4KNVKM0K93MO7QEUZHHP4DIZMBDY'; // Key MỚI
const vnp_Url = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const vnp_ReturnUrl = 'prm392project://payment/result';

// API Endpoint
app.post('/api/server', (req, res) => {
    let amount = req.body.totalPrice;
    if (!amount) {
        return res.status(400).json({ error: "Missing totalPrice" });
    }

    // --- ⛔️ PHẦN SỬA LỖI THỜI GIAN (TIMEZONE) ⛔️ ---
    // Lấy thời gian UTC hiện tại
    let now = new Date();
    // Offset của GMT+7 là 7 giờ * 60 phút * 60 giây * 1000ms
    let GTM_PLUS_7 = 7 * 60 * 60 * 1000;
    // Tạo đối tượng Date mới bằng cách thêm offset GMT+7
    let gmt7Time = new Date(now.getTime() + GTM_PLUS_7);

    // Dùng 'dateFormat' với cờ "UTC:" để nó "in" ra thời gian GMT+7
    // mà không áp dụng múi giờ của server (cũng là UTC)
    let createDate = dateFormat(gmt7Time, 'UTC:yyyymmddHHmmss');
    let orderId = dateFormat(gmt7Time, 'UTC:HHmmss');
    // --- KẾT THÚC PHẦN SỬA LỖI ---

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
    vnp_Params['vnp_CreateDate'] = createDate; // ✅ Bây giờ là giờ GMT+7

    // Sắp xếp params
    let sortedParams = Object.keys(vnp_Params).sort().reduce((acc, key) => {
        acc[key] = vnp_Params[key];
        return acc;
    }, {});

    // Tạo chuỗi query cho signData (KHÔNG mã hóa)
    let signData = qs.stringify(sortedParams, { encode: false }); // Đã sửa 'querystring' thành 'qs'

    // Tạo chữ ký
    let hmac = crypto.createHmac('sha512', secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnp_Params['vnp_SecureHash'] = signed;

    // Tạo URL thanh toán (Mã hóa - default)
    let paymentUrl = vnp_Url + '?' + qs.stringify(vnp_Params); // Đã sửa 'querystring' thành 'qs'

    console.log("Created URL: ", paymentUrl);
    res.status(200).json({ url: paymentUrl });
});

// Xuất app cho Vercel
module.exports = app;