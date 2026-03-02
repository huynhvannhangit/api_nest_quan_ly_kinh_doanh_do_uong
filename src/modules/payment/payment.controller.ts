/* cspell:disable */
import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import type { Request, Response } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('vnpay/create-url')
  async createVnPayUrl(
    @Body('invoiceId') invoiceId: number,
    @Req() req: Request,
  ): Promise<{ url: string }> {
    let ipAddr = req.headers['x-forwarded-for'] || req.ip || '127.0.0.1';
    if (Array.isArray(ipAddr)) {
      ipAddr = ipAddr[0];
    }
    const url = await this.paymentService.createVnPayUrl(invoiceId, ipAddr);
    return { url };
  }

  @Get('vnpay/vnpay-return')
  async vnpayReturn(@Req() req: Request, @Res() res: Response): Promise<void> {
    const query = req.query as Record<string, string>; // Typed
    try {
      await this.paymentService.handleIpn(query);
    } catch (e) {
      console.error('Lỗi khi xử lý IPN dự phòng:', e);
    }

    const result = this.paymentService.verifyReturnUrl(query);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (result.isSuccess) {
      res.redirect(
        `${frontendUrl}/goi-mon?paymentId=${result.invoiceId}&success=true&message=${encodeURIComponent(result.message)}`,
      );
    } else {
      res.redirect(
        `${frontendUrl}/goi-mon?paymentId=${result.invoiceId}&success=false&message=${encodeURIComponent(result.message)}`,
      );
    }
  }

  @Get('momo/momo-return')
  momoReturn(@Req() req: Request, @Res() res: Response): void {
    const query = req.query as Record<string, string>;
    const resultCode = parseInt(query.resultCode || '99', 10);
    const orderId = String(query.orderId || '');
    const invoiceId = orderId.split('_')[0];
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const message = String(query.message || 'Giao dịch MoMo');

    if (resultCode === 0) {
      res.redirect(
        `${frontendUrl}/goi-mon?paymentId=${invoiceId}&success=true&message=${encodeURIComponent(message)}`,
      );
    } else {
      res.redirect(
        `${frontendUrl}/goi-mon?paymentId=${invoiceId}&success=false&message=${encodeURIComponent(message)}`,
      );
    }
  }

  @Get('vnpay/vnpay-ipn')
  async vnpayIpn(@Req() req: Request, @Res() res: Response): Promise<Response> {
    const query = req.query as Record<string, string>; // Typed
    const result = await this.paymentService.handleIpn(query);
    return res.status(HttpStatus.OK).json(result);
  }

  @Post('momo/create-url')
  async createMomoUrl(
    @Body('invoiceId') invoiceId: number,
  ): Promise<{ url: string }> {
    const url = await this.paymentService.createMomoUrl(invoiceId);
    return { url };
  }

  @Post('momo/ipn')
  async handleMomoIpn(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    const payload = req.body as Record<string, string>; // Typed
    const result = await this.paymentService.handleMomoIpn(payload);
    if (result.resultCode === 0) {
      return res.status(HttpStatus.NO_CONTENT).send();
    } else {
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }
  }
}
