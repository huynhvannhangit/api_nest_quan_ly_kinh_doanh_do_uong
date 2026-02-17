import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { StatisticsService } from '../statistics/statistics.service';
import axios from 'axios';

@Injectable()
export class AiAssistantService {
  private genAI: GoogleGenerativeAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly statisticsService: StatisticsService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
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
      - Tổng số khu vực: ${overview.totalAreas}
      - Tổng số bàn: ${overview.totalTables}
      - Tổng số danh mục sản phẩm: ${overview.totalCategories}
      - Tổng số sản phẩm: ${overview.totalProducts}
      - Tổng số nhân viên: ${overview.totalEmployees}
      - Tổng số đơn hàng hệ thống: ${overview.totalOrdersCount}
      - Tổng số người dùng: ${overview.totalUsers}
      - Yêu cầu phê duyệt đang chờ: ${overview.pendingApprovals}
      
      Hãy trả lời câu hỏi của người dùng một cách chuyên nghiệp, ngắn gọn và hữu ích dựa trên dữ liệu hệ thống này.
    `;

    const ollamaBaseUrl = this.configService.get<string>('OLLAMA_BASE_URL');
    const modelName =
      this.configService.get<string>('GEMINI_MODEL') || 'llama3.2';

    // Try Ollama first if configured
    if (ollamaBaseUrl) {
      try {
        const response = await axios.post<{
          message: { content: string };
        }>(`${ollamaBaseUrl}/api/chat`, {
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          stream: false,
        });

        if (response.data?.message) {
          return response.data.message.content;
        }
      } catch (ollamaError: unknown) {
        const err = ollamaError as { message?: string };
        console.error(
          'Ollama Error (falling back to Gemini if possible):',
          err.message,
        );
      }
    }

    // Fallback to Gemini
    try {
      const model = this.genAI.getGenerativeModel({
        model: modelName,
      });

      const chatSession = model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }],
          },
          {
            role: 'model',
            parts: [
              {
                text: 'Tôi đã hiểu vai trò của mình. Tôi sẵn sàng hỗ trợ bạn quản lý cửa hàng đồ uống dựa trên các số liệu bạn cung cấp.',
              },
            ],
          },
        ],
      });

      const result = await chatSession.sendMessage(message);
      return result.response.text();
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 404) {
        console.error(
          `Gemini Model Not Found (404): Try changing the model name in ai-assistant.service.ts. Error:`,
          err.message,
        );
      } else {
        console.error('Gemini AI Error:', error);
      }
      return 'Đã có lỗi xảy ra khi kết nối với trợ lý AI. Vui lòng thử lại sau.';
    }
  }
}
