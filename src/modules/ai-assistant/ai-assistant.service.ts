import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { StatisticsService } from '../statistics/statistics.service';
import { ProductService } from '../product/product.service';
import { CategoryService } from '../category/category.service';
import { AreaService } from '../area/area.service';
import { TableService } from '../table/table.service';
import { InvoiceService } from '../invoice/invoice.service';
import axios from 'axios';

@Injectable()
export class AiAssistantService {
  private genAI: GoogleGenerativeAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly statisticsService: StatisticsService,
    private readonly productService: ProductService,
    private readonly categoryService: CategoryService,
    private readonly areaService: AreaService,
    private readonly tableService: TableService,
    private readonly invoiceService: InvoiceService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async chat(
    message: string,
    history: { role: string; content: string }[] = [],
    userRole: string = 'customer',
  ): Promise<string> {
    const isAdmin =
      userRole.toLowerCase() === 'admin' ||
      userRole.toLowerCase() === 'manager';
    const currentTime = new Date().toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
    });

    let systemPrompt = '';

    if (isAdmin) {
      const [overview, topProducts, allTables, recentInvoices] =
        await Promise.all([
          this.statisticsService.getOverview().then((res) => res || {}),
          this.statisticsService.getTopProducts().then((res) => res || []),
          this.tableService.findAll().then((res) => res || []),
          this.invoiceService.findAll().then((res) => res || []),
        ]);
      const top5Invoices = recentInvoices.slice(0, 5);

      systemPrompt = `
        Bạn là một trợ lý ảo thông minh CHUYÊN SÂU dành cho QUẢN TRỊ VIÊN.
        Thời gian hiện tại: ${currentTime}.

        Số liệu thống kê kinh doanh thực tế:
        - Tổng doanh thu: ${(overview.totalRevenue || 0).toLocaleString('vi-VN')} VNĐ
        - Đơn hàng: ${overview.totalOrders || 0} (Đã thanh toán: ${overview.paidOrders || 0})
        - Hiệu suất: ${(overview.completionRate || 0).toFixed(2)}% hoàn thành
        - Quy mô: ${overview.totalAreas || 0} khu vực, ${overview.totalTables || 0} bàn, ${overview.totalProducts || 0} món.
        - Nhân sự: ${overview.totalEmployees || 0} nhân viên.
        - Tồn đọng: ${overview.pendingApprovals || 0} yêu cầu chờ duyệt.

        Trạng thái bàn hiện tại:
        ${allTables.map((t) => `- Bàn ${t.tableNumber} (${t.area?.name || 'Khu vực chung'}): ${t.status}`).join('\n        ')}

        5 Hóa đơn mới nhất:
        ${top5Invoices.map((inv) => `- ${inv.invoiceNumber}: ${inv.total.toLocaleString('vi-VN')}đ (Bàn ${inv.table?.tableNumber || 'N/A'})`).join('\n        ')}

        Top 5 sản phẩm bán chạy nhất:
        ${topProducts.map((p, i) => `${i + 1}. ${p.name} (${p.quantity} lượt bán)`).join('\n        ')}

        Quy tắc trả lời:
        1. Phân tích số liệu một cách chuyên nghiệp, đưa ra cảnh báo hoặc lời khuyên kinh doanh nếu thấy thông số bất thường.
        2. Xưng "Trợ lý", gọi người dùng là "Quản trị viên" hoặc "Sếp".
        3. Sử dụng Markdown với bảng biểu để so sánh dữ liệu nếu cần.
        4. Nếu người dùng hỏi về số lượng khách ngồi tại bàn: Giải thích rằng hiện tại hệ thống chỉ ghi nhận trạng thái bàn (Có khách/Trống) chứ chưa ghi nhận cụ thể số lượng khách (đầu người) tại bàn đó.
      `;
    } else {
      const [categories, products, areas] = await Promise.all([
        this.categoryService.findAll(),
        this.productService.findAll(),
        this.areaService.findAll(),
      ]);

      // Filter active products
      const availableProducts = products.filter((p) => p.isAvailable);

      systemPrompt = `
        Bạn là một THÂN THIỆN dành cho KHÁCH HÀNG và NHÂN VIÊN PHỤC VỤ.
        Thời gian hiện tại: ${currentTime}.

        Thông tin thực đơn (Món nước):
        ${categories
          .map((cat) => {
            const catProducts = availableProducts.filter(
              (p) => p.categoryId === cat.id,
            );
            if (catProducts.length === 0) return '';
            return `- **${cat.name}**: ${catProducts.map((p) => `${p.name} (${(p.price || 0).toLocaleString('vi-VN')}đ)`).join(', ')}`;
          })
          .join('\n        ')}

        Thông tin không gian và bàn:
        ${areas
          .map(
            (a) =>
              `- **${a.name}**: ${a.tables?.length || 0} bàn (${a.description || 'Không gian thoáng mát'})`,
          )
          .join('\n        ')}

        Quy tắc trả lời:
        1. Luôn niềm nở, lịch sự, đóng vai trò là "Người phục vụ ảo".
        2. Giới thiệu các món nước đặc sắc dựa trên giá cả và sở thích khách hàng. 
        3. Tuyệt đối KHÔNG tiết lộ doanh thu, lợi nhuận hay số liệu nội bộ của quán cho khách hàng.
        4. Trả lời bằng tiếng Việt, súc tích và hấp dẫn.
      `;
    }

    const ollamaBaseUrl = this.configService.get<string>('OLLAMA_BASE_URL');
    const modelName =
      this.configService.get<string>('GEMINI_MODEL') || 'llama3.2';

    // Format history for messages
    const formattedMessages: { role: string; content: string }[] = [];
    if (history && history.length > 0) {
      for (const item of history) {
        formattedMessages.push({
          role: item.role === 'assistant' ? 'assistant' : 'user',
          content: item.content,
        });
      }
    }

    // Try Ollama first
    if (ollamaBaseUrl) {
      try {
        const response = await axios.post<{
          message: { content: string };
        }>(
          `${ollamaBaseUrl}/api/chat`,
          {
            model: modelName,
            messages: [
              { role: 'system', content: systemPrompt },
              ...formattedMessages,
              { role: 'user', content: message },
            ],
            stream: false,
          },
          { timeout: 120000 },
        );

        if (response.data?.message) {
          return response.data.message.content;
        }
      } catch (ollamaError: unknown) {
        const errorMsg =
          ollamaError instanceof Error
            ? ollamaError.message
            : String(ollamaError);
        console.error('Ollama Error:', errorMsg);
      }
    }

    // Fallback to Gemini
    try {
      const geminiModelName =
        modelName.includes(':') ||
        modelName.includes('llama') ||
        modelName.includes('qwen')
          ? 'gemini-2.5-flash'
          : modelName;

      const model = this.genAI.getGenerativeModel({ model: geminiModelName });

      const geminiHistory = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        {
          role: 'model',
          parts: [
            {
              text: 'Đã rõ. Tôi đã nắm được vai trò của mình và dữ liệu ngữ cảnh. Tôi đã sẵn sàng hỗ trợ!',
            },
          ],
        },
      ];

      if (history && history.length > 0) {
        for (const item of history) {
          geminiHistory.push({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: item.content }],
          });
        }
      }

      const chatSession = model.startChat({ history: geminiHistory });
      const result = await chatSession.sendMessage(message);
      return result.response.text();
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Gemini AI Error:', errorMsg);
      return 'Trợ lý AI đang gặp sự cố kết nối. Vui lòng thử lại sau giây lát.';
    }
  }
}
