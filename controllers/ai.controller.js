// controllers/ai.controller.js
const { getGeminiResponse } = require('../services/gemini.service');

// --- DATABASE INTERACTION ---
// Import các Mongoose model của bạn từ thư mục models
// Đảm bảo đường dẫn này chính xác với cấu trúc project của bạn
const Product = require('../models/product.model');
const Category = require('../models/category.model');
const Discount = require('../models/discount.model');

/**
 * Hàm lấy dữ liệu sản phẩm từ cơ sở dữ liệu.
 * @returns {Promise<Array>} Mảng các đối tượng sản phẩm.
 */
async function getProductsFromDB() {
  try {
    const products = await Product.find({})
      .populate('categoryId', 'category description') // Lấy tên danh mục và mô tả
      .lean();
    return products;
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu sản phẩm từ DB:', error);
    return [];
  }
}

/**
 * Hàm lấy dữ liệu danh mục từ cơ sở dữ liệu.
 * @returns {Promise<Array>} Mảng các đối tượng danh mục.
 */
async function getCategoriesFromDB() {
  try {
    const categories = await Category.find({}).lean();
    return categories;
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu danh mục từ DB:', error);
    return [];
  }
}

/**
 * Hàm lấy dữ liệu khuyến mãi/voucher từ cơ sở dữ liệu.
 * @returns {Promise<Array>} Mảng các đối tượng khuyến mãi/voucher.
 */
async function getDiscountsFromDB() {
  try {
    const discounts = await Discount.find({}).lean();
    return discounts;
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu khuyến mãi từ DB:', error);
    return [];
  }
}
// --- END DATABASE INTERACTION ---

/**
 * Hàm chuyển đổi văn bản Markdown cơ bản sang HTML.
 * Xử lý xuống dòng, in đậm và danh sách đơn giản.
 * @param {string} markdownText - Chuỗi văn bản có định dạng Markdown.
 * @returns {string} - Chuỗi văn bản đã được định dạng HTML.
 */
function convertMarkdownToHtml(markdownText) {
  let htmlText = markdownText;

  // 1. Chuyển đổi xuống dòng (\n) thành <br/>
  htmlText = htmlText.replace(/\n/g, '<br/>');

  // 2. Chuyển đổi in đậm (**) thành <strong>
  // Sử dụng regex với non-greedy match (.*?) để tránh match quá dài
  htmlText = htmlText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 3. Chuyển đổi danh sách (*) thành <ul><li>
  // Đây là một cách đơn giản, có thể cần regex phức tạp hơn cho các trường hợp lồng nhau
  // Tách thành các dòng để xử lý danh sách
  const lines = htmlText.split('<br/>');
  let inList = false;
  let processedLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (line.startsWith('* ')) {
      if (!inList) {
        processedLines.push('<ul>');
        inList = true;
      }
      // Loại bỏ dấu * và khoảng trắng đầu dòng, sau đó bọc trong <li>
      processedLines.push('<li>' + line.substring(2).trim() + '</li>');
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      processedLines.push(line);
    }
  }
  if (inList) { // Đóng thẻ <ul> nếu danh sách kết thúc mà chưa đóng
    processedLines.push('</ul>');
  }

  htmlText = processedLines.join(''); // Nối lại các dòng

  return htmlText;
}


/**
 * Controller để xử lý yêu cầu chatbot từ người dùng.
 * Nó nhận prompt từ request body, lấy dữ liệu từ DB,
 * và gửi đến Gemini để nhận phản hồi.
 * @param {object} req - Đối tượng Request của Express.
 * @param {object} res - Đối tượng Response của Express.
 */
exports.askAIAboutCoffeeShop = async (req, res) => {
  const userPrompt = req.body.prompt; // Lấy prompt từ body của request

  if (!userPrompt) {
    return res.status(400).json({ error: 'Thiếu prompt từ người dùng' });
  }

  try {
    // Lấy tất cả dữ liệu cần thiết từ database một lần
    const products = await getProductsFromDB();
    const categories = await getCategoriesFromDB();
    const discounts = await getDiscountsFromDB();

    let contextData = {};
    let systemInstruction = 'Bạn là một trợ lý ảo tư vấn thông tin cho chuỗi cửa hàng cà phê. Hãy trả lời các câu hỏi về sản phẩm, danh mục, voucher và khuyến mãi. Nếu không có thông tin, hãy nói rằng bạn không tìm thấy.';

    const lowerCaseQuery = userPrompt.toLowerCase();

    // Logic để xác định loại yêu cầu của người dùng
    if (lowerCaseQuery.includes('sản phẩm') || lowerCaseQuery.includes('cà phê') || lowerCaseQuery.includes('thức uống') || lowerCaseQuery.includes('menu') || lowerCaseQuery.includes('món')) {
      contextData = products;
      systemInstruction = 'Bạn là một trợ lý ảo tư vấn về các sản phẩm và thức uống của chuỗi cửa hàng cà phê. Hãy cung cấp thông tin chi tiết về sản phẩm, giá cả, mô tả và danh mục. Nếu người dùng hỏi về một sản phẩm cụ thể, hãy cố gắng cung cấp thông tin chi tiết về sản phẩm đó. Nếu không có thông tin, hãy nói rằng bạn không tìm thấy.';
    } else if (lowerCaseQuery.includes('danh mục') || lowerCaseQuery.includes('loại')) {
      contextData = categories;
      systemInstruction = 'Bạn là một trợ lý ảo tư vấn về các danh mục sản phẩm của chuỗi cửa hàng cà phê. Hãy cung cấp thông tin về các loại sản phẩm có sẵn. Nếu không có thông tin, hãy nói rằng bạn không tìm thấy.';
    } else if (lowerCaseQuery.includes('voucher') || lowerCaseQuery.includes('mã giảm giá') || lowerCaseQuery.includes('phiếu ưu đãi')) {
      contextData = discounts; // Sử dụng Discount schema cho cả voucher
      systemInstruction = 'Bạn là một trợ lý ảo tư vấn về các mã voucher và phiếu ưu đãi hiện có của chuỗi cửa hàng cà phê. Hãy cung cấp thông tin về mã voucher, giá trị, điều kiện áp dụng, thời hạn sử dụng và điểm yêu cầu để đổi (nếu có). Nếu không có thông tin, hãy nói rằng bạn không tìm thấy.';
    } else if (lowerCaseQuery.includes('khuyến mãi') || lowerCaseQuery.includes('ưu đãi') || lowerCaseQuery.includes('giảm giá')) {
      contextData = discounts;
      systemInstruction = 'Bạn là một trợ lý ảo tư vấn về các chương trình khuyến mãi và ưu đãi giảm giá của chuỗi cửa hàng cà phê. Hãy cung cấp thông tin chi tiết về chương trình, điều kiện áp dụng, thời gian diễn ra và điểm yêu cầu để đổi (nếu có). Nếu không có thông tin, hãy nói rằng bạn không tìm thấy.';
    } else {
      // Nếu không khớp với bất kỳ loại nào, cung cấp tất cả dữ liệu có thể và hướng dẫn AI trả lời tổng quát hơn.
      contextData = {
        products: products,
        categories: categories,
        discounts: discounts,
      };
      systemInstruction = 'Bạn là một trợ lý ảo tư vấn thông tin cho chuỗi cửa hàng cà phê. Hãy trả lời các câu hỏi về sản phẩm, danh mục, voucher và khuyến mãi dựa trên dữ liệu được cung cấp. Nếu không có thông tin cụ thể, hãy nói rằng bạn không tìm thấy và có thể hỏi thêm để làm rõ ý định của người dùng.';
    }

    // Gọi dịch vụ Gemini để lấy phản hồi
    const aiResponse = await getGeminiResponse(contextData, userPrompt, systemInstruction);

    // --- BƯỚC MỚI: Định dạng phản hồi để hiển thị đẹp trên UI ---
    const formattedResponse = convertMarkdownToHtml(aiResponse);
    // --- KẾT THÚC BƯỚC MỚI ---

    res.json({ answer: formattedResponse }); // Trả về phản hồi đã được định dạng HTML
  } catch (error) {
    console.error('🔥 Lỗi trong quá trình xử lý chatbot:', error);
    res.status(500).json({ error: 'Lỗi nội bộ khi xử lý yêu cầu chatbot.' });
  }
};
