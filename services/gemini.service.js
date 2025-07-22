// services/gemini.service.js
const { askGemini } = require('../config/aisetup');

/**
 * Hàm dịch vụ để tương tác với Gemini AI.
 * Nó nhận dữ liệu ngữ cảnh, câu hỏi của người dùng và hướng dẫn hệ thống.
 * @param {object} contextData - Dữ liệu ngữ cảnh (ví dụ: sản phẩm, danh mục, voucher, discount).
 * @param {string} userPrompt - Câu hỏi của người dùng.
 * @param {string} systemInstruction - Hướng dẫn cho AI về vai trò của nó.
 * @returns {Promise<string>} - Chuỗi phản hồi từ Gemini.
 */
async function getGeminiResponse(contextData, userPrompt, systemInstruction) {
  // Gọi hàm askGemini từ aisetup để lấy phản hồi
  return await askGemini(contextData, userPrompt, systemInstruction);
}

module.exports = {
  getGeminiResponse: getGeminiResponse
};
