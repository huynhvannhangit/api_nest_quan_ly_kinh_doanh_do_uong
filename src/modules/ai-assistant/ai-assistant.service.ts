import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { StatisticsService } from '../statistics/statistics.service';
import { ProductService } from '../product/product.service';
import { CategoryService } from '../category/category.service';
import { AreaService } from '../area/area.service';
import { TableService } from '../table/table.service';
import { InvoiceService } from '../invoice/invoice.service';
import { EmployeeService } from '../employee/employee.service';
import { OrderService } from '../order/order.service';
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
    private readonly employeeService: EmployeeService,
    private readonly orderService: OrderService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async chat(
    message: string,
    history: { role: string; content: string }[] = [],
    userRole: string = 'customer',
  ): Promise<string> {
    const normalizedRole = userRole.toUpperCase();
    const isAdmin =
      normalizedRole === 'CHỦ CỬA HÀNG' ||
      normalizedRole === 'QUẢN LÝ' ||
      normalizedRole === 'ADMIN' ||
      normalizedRole === 'MANAGER';
    const currentTime = new Date().toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
    });

    let systemPrompt = '';

    if (isAdmin) {
      const [
        overview,
        topProducts,
        allTables,
        recentInvoices,
        allEmployees,
        activeOrdersResult,
      ] = await Promise.all([
        this.statisticsService.getOverview().then((res) => res || {}),
        this.statisticsService.getTopProducts().then((res) => res || []),
        this.tableService.findAll().then((res) => res || []),
        this.invoiceService.findAll().then((res) => res || []),
        this.employeeService.findAll().then((res) => res || []),
        this.orderService.findAll(1, 10).then((res) => res.items || []),
      ]);
      const top5Invoices = recentInvoices.slice(0, 5);
      const staffSummary = allEmployees.reduce(
        (acc: Record<string, number>, emp) => {
          const status = emp.status || 'UNKNOWN';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        },
        {},
      );
      const staffStatusText = Object.entries(staffSummary)
        .map(([status, count]) => {
          const statusMap: Record<string, string> = {
            WORKING: 'Đang làm việc',
            LEAVE: 'Đang nghỉ',
            OFF: 'Nghỉ việc',
            PENDING: 'Chờ duyệt',
          };
          return `${statusMap[status] || status}: ${count}`;
        })
        .join(', ');

      const tableStatusMap: Record<string, string> = {
        AVAILABLE: 'Trống',
        OCCUPIED: 'Có khách',
        RESERVED: 'Đã đặt',
        MAINTENANCE: 'Bảo trì',
      };

      const orderStatusMap: Record<string, string> = {
        PENDING: 'Chờ xử lý',
        PROCESSING: 'Đang làm',
        COMPLETED: 'Hoàn thành',
        CANCELLED: 'Đã hủy',
      };

      systemPrompt = `
        Bạn là một trợ lý ảo thông minh CHUYÊN SÂU dành cho QUẢN TRỊ VIÊN/CHỦ CỬA HÀNG.
        Thời gian hiện tại: ${currentTime}.

        TỔNG QUAN KINH DOANH:
        - Tổng doanh thu: ${(overview.totalRevenue || 0).toLocaleString('vi-VN')} VNĐ
        - Đơn hàng: ${overview.totalOrders || 0} (Đã thanh toán: ${overview.paidOrders || 0})
        - Tỉ lệ hoàn thành: ${(overview.completionRate || 0).toFixed(2)}%
        - Quy mô: ${overview.totalAreas || 0} khu vực, ${overview.totalTables || 0} bàn, ${overview.totalProducts || 0} món.
        - Nhân sự: ${overview.totalEmployees || 0} nhân viên.
        - Đang chờ duyệt: ${overview.pendingApprovals || 0} yêu cầu.

        CHI TIẾT NHÂN SỰ:
        - Tổng số nhân viên: ${allEmployees.length}
        - Trạng thái: ${staffStatusText}

        ĐƠN HÀNG VÀ BÀN HIỆN TẠI:
        - Đơn hàng gần đây: ${activeOrdersResult.map((o) => `${o.orderNumber} (${orderStatusMap[o.status] || o.status}) - ${o.totalPrice.toLocaleString('vi-VN')}đ`).join(', ')}
        - Trạng thái bàn: ${allTables.map((t) => `${t.tableNumber.includes('Bàn') ? t.tableNumber : `Bàn ${t.tableNumber}`} (${tableStatusMap[t.status] || t.status})`).join(', ')}

        GIAO DỊCH GẦN ĐÂY (HÓA ĐƠN):
        ${top5Invoices.map((inv) => `- ${inv.invoiceNumber}: ${inv.total.toLocaleString('vi-VN')}đ (${inv.table?.tableNumber.includes('Bàn') ? inv.table?.tableNumber : `Bàn ${inv.table?.tableNumber || 'N/A'}`})`).join('\n        ')}

        SẢN PHẨM BÁN CHẠY:
        ${topProducts.map((p, i) => `${i + 1}. ${p.name} (${p.quantity} lượt bán)`).join('\n        ')}

        QUY TẮC TRẢ LỜI:
        1. Phân tích số liệu một cách chuyên nghiệp, đưa ra cảnh báo hoặc lời khuyên kinh doanh nếu thấy thông số bất thường.
        2. Xưng "Trợ lý", gọi người dùng là "Sếp" hoặc "Admin".
        3. Luôn sử dụng tiếng Việt để trả lời. TUYỆT ĐỐI không sử dụng các ngôn ngữ khác như tiếng Nga (vd: Доступен, Занято) hay tiếng Anh trong các báo cáo trạng thái.
        4. Có thể truy cập thông tin nhân viên, sản phẩm, và đơn hàng chi tiết để trả lời. 
        5. Nếu cần so sánh dữ liệu, hãy sử dụng bảng biểu Markdown.
        6. Luôn ưu tiên sự chính xác dựa trên số liệu thực tế được cung cấp.
      `;
    } else {
      const [categories, productData, areas] = await Promise.all([
        this.categoryService.findAll(),
        this.productService.findAll(undefined, 1, 100), // Get up to 100 products for context
        this.areaService.findAll(),
      ]);

      const products = 'items' in productData ? productData.items : productData;

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
    const ollamaModel =
      this.configService.get<string>('OLLAMA_MODEL') || 'qwen2.5-coder:7b';
    const geminiModelConfig =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-1.5-flash';

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
            model: ollamaModel,
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
      // Ensure we don't try to use an Ollama model name for Gemini
      const geminiModelName =
        geminiModelConfig.includes(':') ||
        geminiModelConfig.includes('llama') ||
        geminiModelConfig.includes('qwen')
          ? 'gemini-1.5-flash'
          : geminiModelConfig;

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
