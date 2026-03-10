/* cspell:disable */
import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Res,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('vnpay/create-url')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @HttpCode(200)
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
  @HttpCode(200)
  async momoReturn(@Req() req: Request, @Res() res: Response): Promise<void> {
    const query = req.query as Record<string, string>;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Verify MoMo signature and process payment (MoMo-documented approach for return URL)
    const result = await this.paymentService.verifyAndProcessMomoReturn(query);

    if (result.isSuccess) {
      res.redirect(
        `${frontendUrl}/goi-mon?paymentId=${result.invoiceId}&success=true&message=${encodeURIComponent(result.message)}`,
      );
    } else {
      const invoiceId = result.invoiceId || query.orderId?.split('_')[0] || '';
      res.redirect(
        `${frontendUrl}/goi-mon?paymentId=${invoiceId}&success=false&message=${encodeURIComponent(result.message)}`,
      );
    }
  }

  @Get('vnpay/vnpay-ipn')
  @HttpCode(200)
  async vnpayIpn(@Req() req: Request, @Res() res: Response): Promise<Response> {
    const query = req.query as Record<string, string>; // Typed
    const result = await this.paymentService.handleIpn(query);
    return res.status(HttpStatus.OK).json(result);
  }

  @Post('momo/create-url')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async createMomoUrl(
    @Body('invoiceId') invoiceId: number,
  ): Promise<{ url: string }> {
    const url = await this.paymentService.createMomoUrl(invoiceId);
    return { url };
  }

  @Post('momo/ipn')
  @HttpCode(200)
  async handleMomoIpn(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    const payload = req.body as Record<string, string>; // Typed
    const result = await this.paymentService.handleMomoIpn(payload);
    // MoMo expects HTTP 200 to acknowledge IPN receipt regardless of result
    return res.status(HttpStatus.OK).json(result);
  }
}
