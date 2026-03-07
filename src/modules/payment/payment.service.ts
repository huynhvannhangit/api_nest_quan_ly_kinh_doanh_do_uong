/* cspell:disable */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InvoiceService } from '../invoice/invoice.service';
import { VNPay, HashAlgorithm, ProductCode, VnpLocale } from 'vnpay';
import {
  InvoiceStatus,
  PaymentMethod,
} from '../invoice/entities/invoice.entity';
import * as crypto from 'crypto';
import axios from 'axios';
import { MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class PaymentService {
  private vnpay: VNPay;

  constructor(private readonly invoiceService: InvoiceService) {
    this.vnpay = new VNPay({
      tmnCode: process.env.VNP_TMNCODE || 'LVU9MZ7L',
      secureSecret:
        process.env.VNP_HASHSECRET || 'ZQNU92HEM9RC8SWJ28TH851NNB3SZ36T',
      vnpayHost: 'https://sandbox.vnpayment.vn',
      testMode: true,
      hashAlgorithm: HashAlgorithm.SHA512,
    });
  }

  // --- VNPAY ---

  async createVnPayUrl(invoiceId: number, ipAddr: string): Promise<string> {
    const invoice = await this.invoiceService.findOne(invoiceId);
    if (!invoice) throw new BadRequestException(MESSAGES.INVOICE_NOT_FOUND);

    const returnUrl = process.env.VNP_RETURN_URL;
    if (!returnUrl) {
      throw new BadRequestException(MESSAGES.VNPAY_CONFIG_MISSING);
    }

    const pad = (n: number) => (n < 10 ? '0' + n : n.toString());
    const date = new Date();
    const txnRef = `${invoice.id}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

    let cleanIp = ipAddr || '127.0.0.1';
    if (cleanIp === '::1' || cleanIp === '::ffff:127.0.0.1') {
      cleanIp = '127.0.0.1';
    }

    const urlString = this.vnpay.buildPaymentUrl({
      vnp_Amount: Number(invoice.total),
      vnp_IpAddr: cleanIp,
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: 'Thanh toan hoa don ' + invoice.invoiceNumber,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: returnUrl,
      vnp_Locale: VnpLocale.VN,
    });

    console.log('--- VNPAY URL GENERATED ---');
    console.log(urlString);
    return urlString;
  }

  verifyReturnUrl(vnp_Params: Record<string, string>): {
    isSuccess: boolean;
    invoiceId: number;
    message: string;
  } {
    let verify: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      verify = this.vnpay.verifyReturnUrl(vnp_Params as any);
    } catch {
      return { isSuccess: false, invoiceId: 0, message: 'Chữ ký không hợp lệ' };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!verify?.isSuccess) {
      return { isSuccess: false, invoiceId: 0, message: 'Chữ ký không hợp lệ' };
    }

    const safeParams = vnp_Params;
    const txnRefVal = String(safeParams['vnp_TxnRef'] || '');
    const invoiceId = parseInt(txnRefVal.split('_')[0], 10);

    const responseCode = String(safeParams['vnp_ResponseCode'] || '');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (responseCode === '00' || !!verify.isSuccess) {
      return { isSuccess: true, invoiceId, message: 'Giao dịch thành công' };
    } else {
      return {
        isSuccess: false,
        invoiceId,
        message: 'Giao dịch thất bại / Bị hủy',
      };
    }
  }

  async handleIpn(
    vnp_Params: Record<string, string>,
  ): Promise<{ RspCode: string; Message: string }> {
    let verify: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      verify = this.vnpay.verifyIpnCall(vnp_Params as any);
    } catch {
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!verify?.isSuccess) {
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    const safeParams = vnp_Params;
    const txnRefVal = String(safeParams['vnp_TxnRef'] || '');
    const invoiceId = parseInt(txnRefVal.split('_')[0], 10);

    try {
      const invoice = await this.invoiceService.findOne(invoiceId);
      const vnpAmount = Number(safeParams['vnp_Amount'] ?? 0);

      if (Number(invoice.total) * 100 !== vnpAmount) {
        return { RspCode: '04', Message: 'Invalid amount' };
      }
      if (invoice.status === InvoiceStatus.PAID) {
        return { RspCode: '02', Message: 'Order already confirmed' };
      }

      const responseCode = String(safeParams['vnp_ResponseCode'] || '');
      if (responseCode === '00') {
        // System admin ID = 1
        await this.invoiceService.processPayment(
          invoiceId,
          { paymentMethod: PaymentMethod.VNPAY },
          1,
        );
        return { RspCode: '00', Message: 'Confirm Success' };
      } else {
        return {
          RspCode: '00',
          Message: 'Payment failed but IPN acknowledged',
        };
      }
    } catch {
      return { RspCode: '01', Message: 'Order not found' };
    }
  }

  // --- MOMO ---

  async createMomoUrl(invoiceId: number): Promise<string> {
    const invoice = await this.invoiceService.findOne(invoiceId);
    if (!invoice) throw new BadRequestException(MESSAGES.INVOICE_NOT_FOUND);

    const partnerCode = (process.env.MOMO_PARTNER_CODE || 'MOMO').trim();
    const accessKey = (process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85').trim();
    const secretKey = (
      process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz'
    ).trim();
    const apiUrl = (
      process.env.MOMO_API_URL ||
      'https://test-payment.momo.vn/v2/gateway/api/create'
    ).trim();

    const ipnUrl = (
      process.env.MOMO_IPN_URL || 'http://localhost:9999/api/payment/momo/ipn'
    ).trim();

    // Create the MoMo redirectUrl to hit the SAME backend tunnel origin as the IPN
    // MoMo's strict signature validator requires the redirectUrl to match the host of the IPN url
    const matchOrigin = ipnUrl.match(/^(https?:\/\/[^/]+)/);
    const backendOrigin = matchOrigin
      ? matchOrigin[0]
      : 'http://localhost:9999';
    // Must be exactly this to satisfy MoMo signature creation
    const redirectUrl = `${backendOrigin}/api/payment/momo/momo-return`;

    // We do NOT use process.env.MOMO_RETURN_URL for the initial MoMo checkout session redirectUrl
    // because MoMo rejects mismatched frontend/backend domains during sandbox testing.
    // Instead we route it to backend first, then redirect inside PaymentController.momoReturn()
    // which is already configured to redirect to FRONTEND_URL/goi-mon.

    const requestType = 'payWithMethod';

    const orderId = `${invoiceId}_${new Date().getTime()}`;
    const requestId = orderId;
    const amount = Number(invoice.total).toString();
    const orderInfo = `Thanh toan hoa don ${invoice.invoiceNumber}`;
    const extraData = '';

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    console.log('--- MOMO RAW SIGNATURE START ---');
    console.log(rawSignature);
    console.log('--- MOMO RAW SIGNATURE END ---');
    console.log(`Length: ${rawSignature.length}`);

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      requestType,
      extraData,
      lang: 'vi',
      signature,
    };

    console.log('--- MOMO REQUEST BODY START ---');
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('--- MOMO REQUEST BODY END ---');

    try {
      const response = await axios.post<{ payUrl: string }>(
        apiUrl,
        requestBody,
      );
      if (response.data?.payUrl) {
        return response.data.payUrl;
      }
      throw new BadRequestException(MESSAGES.MOMO_API_ERROR);
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errData = err.response?.data;
      console.error('MoMo Create URL Error:', errData || err.message);
      throw new BadRequestException(
        'Lỗi khi gọi API MoMo: ' + (errData?.message || err.message),
      );
    }
  }

  async handleMomoIpn(
    payload: Record<string, any>,
  ): Promise<{ resultCode: number; message: string }> {
    // extracting partnerCode from payload; used in rawSignature below
    const accessKey = (process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85').trim();
    const secretKey = (
      process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz'
    ).trim();

    console.log('Momo IPN receive', payload);

    try {
      const {
        partnerCode: pCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature: moMoSignature,
      } = payload;

      const rawSignature = `accessKey=${accessKey}&amount=${String(amount)}&extraData=${String(extraData || '')}&message=${String(message)}&orderId=${String(orderId)}&orderInfo=${String(orderInfo)}&orderType=${String(orderType)}&partnerCode=${String(pCode)}&payType=${String(payType)}&requestId=${String(requestId)}&responseTime=${String(responseTime)}&resultCode=${String(resultCode)}&transId=${String(transId)}`;
      const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');

      if (moMoSignature !== expectedSignature) {
        console.error('Momo signature mismatch');
        return { resultCode: 99, message: 'Invalid signature' };
      }

      if (Number(resultCode) === 0) {
        const orderIdStr = String(orderId || '');
        const invoiceId = parseInt(orderIdStr.split('_')[0], 10);
        const invoice = await this.invoiceService.findOne(invoiceId);

        if (invoice && invoice.status !== InvoiceStatus.PAID) {
          await this.invoiceService.processPayment(
            invoiceId,
            { paymentMethod: PaymentMethod.MOMO },
            1,
          );
        }
        return { resultCode: 0, message: 'Success' };
      } else {
        return {
          resultCode: Number(resultCode),
          message: 'Payment failed on MoMo side',
        };
      }
    } catch (error: unknown) {
      console.error('Momo IPN error', error);
      return { resultCode: 99, message: 'Exception processing IPN' };
    }
  }

  /**
   * Verify MoMo return URL signature and process payment if valid.
   * MoMo signs the return URL query params with the same HMAC-SHA256 algorithm as IPN.
   * This is the documented approach for processing payments when the return URL is used.
   */
  async verifyAndProcessMomoReturn(query: Record<string, string>): Promise<{
    isSuccess: boolean;
    invoiceId: number;
    message: string;
  }> {
    const accessKey = (process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85').trim();
    const secretKey = (
      process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz'
    ).trim();

    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature: momoSignature,
    } = query;

    if (!momoSignature) {
      return { isSuccess: false, invoiceId: 0, message: 'Thiếu chữ ký' };
    }

    // Build raw signature string (alphabetical order, same as IPN spec)
    const rawSignature = `accessKey=${accessKey}&amount=${String(amount)}&extraData=${String(extraData || '')}&message=${String(message)}&orderId=${String(orderId)}&orderInfo=${String(orderInfo)}&orderType=${String(orderType)}&partnerCode=${String(partnerCode)}&payType=${String(payType)}&requestId=${String(requestId)}&responseTime=${String(responseTime)}&resultCode=${String(resultCode)}&transId=${String(transId)}`;

    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    if (momoSignature !== expectedSignature) {
      console.error('MoMo return URL signature mismatch');
      return {
        isSuccess: false,
        invoiceId: 0,
        message: 'Chữ ký không hợp lệ',
      };
    }

    const invoiceId = parseInt(String(orderId || '').split('_')[0], 10);

    if (Number(resultCode) !== 0) {
      return {
        isSuccess: false,
        invoiceId,
        message: String(message || 'Giao dịch thất bại'),
      };
    }

    try {
      const invoice = await this.invoiceService.findOne(invoiceId);
      if (invoice && invoice.status !== InvoiceStatus.PAID) {
        await this.invoiceService.processPayment(
          invoiceId,
          { paymentMethod: PaymentMethod.MOMO },
          1,
        );
        console.log(`[MoMo Return] Payment processed for invoice ${invoiceId}`);
      }
      return {
        isSuccess: true,
        invoiceId,
        message: String(message || 'Thanh toán thành công'),
      };
    } catch (error: unknown) {
      console.error('[MoMo Return] Error processing payment:', error);
      return { isSuccess: false, invoiceId, message: 'Lỗi xử lý thanh toán' };
    }
  }
}
