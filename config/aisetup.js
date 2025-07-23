// config/aisetup.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Khởi tạo Google Generative AI với API Key từ biến môi trường
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Hàm tổng quát để gửi yêu cầu đến Gemini với dữ liệu và câu hỏi của người dùng.
 * @param {object} contextData - Dữ liệu ngữ cảnh (ví dụ: sản phẩm, danh mục, voucher, discount) dưới dạng đối tượng JSON.
 * @param {string} userPrompt - Câu hỏi của người dùng.
 * @param {string} systemInstruction - Hướng dẫn cho AI về vai trò của nó và cách phản hồi.
 * @returns {Promise<string>} - Chuỗi phản hồi từ Gemini.
 */
async function askGemini(contextData, userPrompt, systemInstruction) {
  // Chọn mô hình Gemini
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Xây dựng lời nhắc (prompt) dựa trên hướng dẫn hệ thống, dữ liệu ngữ cảnh và câu hỏi của người dùng.
  // Dữ liệu ngữ cảnh được chuyển đổi thành chuỗi JSON để Gemini có thể hiểu.
  const prompt =
    systemInstruction + '\n\n' +
    'Dưới đây là thông tin liên quan dưới dạng JSON:\n"""' +
    JSON.stringify(contextData, null, 2) + // Sử dụng null, 2 để định dạng JSON dễ đọc hơn
    '"""\n\n' +
    'Câu hỏi của người dùng:\n"' + userPrompt + '"\n\n' +
    'Hãy trả lời bằng tiếng Việt, rõ ràng và chính xác, dựa trên thông tin đã cung cấp.';

  try {
    // Gửi yêu cầu đến Gemini và chờ phản hồi
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    return text;
  } catch (err) {
    console.error('🔥 Lỗi khi gọi Gemini:', err);
    // Trả về thông báo lỗi thân thiện với người dùng
    return 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn vào lúc này. Vui lòng thử lại sau.';
  }
}

module.exports = {
  askGemini: askGemini
};
