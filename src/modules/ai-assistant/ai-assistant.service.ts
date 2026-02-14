import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { StatisticsService } from '../statistics/statistics.service';

@Injectable()
export class AiAssistantService {
  private openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly statisticsService: StatisticsService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async chat(message: string): Promise<string> {
    const overview = await this.statisticsService.getOverview();

    const systemPrompt = `
      Bạn là một trợ lý ảo hỗ trợ quản lý cửa hàng kinh doanh đồ uống.
      Dưới đây là một số thông tin hiện tại về cửa hàng:
      - Tổng doanh thu: ${overview.totalRevenue} VNĐ
      - Tổng số đơn hàng: ${overview.totalOrders}
      - Số đơn hàng đã thanh toán: ${overview.paidOrders}
      - Tỷ lệ hoàn thành: ${overview.completionRate.toFixed(2)}%
      
      Hãy trả lời câu hỏi của người dùng một cách chuyên nghiệp, ngắn gọn và hữu ích dựa trên dữ liệu này.
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      });

      return (
        response.choices[0]?.message?.content ||
        'Xin lỗi, tôi không thể xử lý yêu cầu này lúc này.'
      );
    } catch (error) {
      console.error('OpenAI Error:', error);
      return 'Đã có lỗi xảy ra khi kết nối với trợ lý AI.';
    }
  }
}
