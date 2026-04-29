import { GoogleGenAI, Type } from "@google/genai";
import { TravelPlan, UserPreferences } from "../types";

const ai = new GoogleGenAI({ apiKey: "AIzaSyAwEgh5JB4uOU3OraHW_AsJkjM-ow9JgFc" });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    tourName: { type: Type.STRING },
    story: { type: Type.STRING },
    itinerary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          morning: {
            type: Type.OBJECT,
            properties: {
              activity: { type: Type.STRING },
              location: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              cost: { type: Type.NUMBER },
              description: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              reviewCount: { type: Type.INTEGER },
            },
            required: ["activity", "location", "cost", "description", "rating", "reviewCount"]
          },
          afternoon: {
            type: Type.OBJECT,
            properties: {
              activity: { type: Type.STRING },
              location: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              cost: { type: Type.NUMBER },
              description: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              reviewCount: { type: Type.INTEGER },
            },
            required: ["activity", "location", "cost", "description", "rating", "reviewCount"]
          },
          evening: {
            type: Type.OBJECT,
            properties: {
              activity: { type: Type.STRING },
              location: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              cost: { type: Type.NUMBER },
              description: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              reviewCount: { type: Type.INTEGER },
            },
            required: ["activity", "location", "cost", "description", "rating", "reviewCount"]
          },
          totalDayCost: { type: Type.NUMBER },
          preview360Url: { type: Type.STRING },
          logic: { type: Type.STRING },
        },
        required: ["day", "morning", "afternoon", "evening", "totalDayCost", "logic"]
      }
    },
    mapPoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          lat: { type: Type.NUMBER },
          lng: { type: Type.NUMBER },
          type: { type: Type.STRING },
          description: { type: Type.STRING },
          streetViewUrl: { type: Type.STRING },
          rating: { type: Type.NUMBER },
          reviewCount: { type: Type.INTEGER },
        },
        required: ["name", "type", "description", "rating", "reviewCount"]
      }
    },
    totalEstimatedCost: { type: Type.NUMBER },
    budgetAnalysis: { type: Type.STRING },
    personalizationLogic: { type: Type.STRING },
    aiInsight: { type: Type.STRING },
  },
  required: ["tourName", "story", "itinerary", "mapPoints", "totalEstimatedCost", "budgetAnalysis", "personalizationLogic", "aiInsight"]
};

export async function generateTravelPlan(prefs: UserPreferences): Promise<TravelPlan> {
  const prompt = `
    Tạo một kế hoạch du lịch chi tiết bằng tiếng VIỆT dựa trên các thông tin sau:
    - Ngân sách: ${prefs.budget.toLocaleString('vi-VN')} VNĐ
    - Thời gian: ${prefs.duration} ngày
    - Điểm khởi đầu: ${prefs.startLocation}
    - Danh sách điểm muốn đến (wishlist - CẦN ƯU TIÊN): ${prefs.wishlist.join(", ")}
    - Sở thích: ${prefs.interests.join(", ")}
    - Tâm trạng: ${prefs.mood}

    Kế hoạch phải bao gồm:
    1. Một "tour name" (tên chuyến đi) bắt tai bằng tiếng Việt phản ánh đúng tâm trạng.
    2. Một đoạn mô tả ngắn (story) dạng kể chuyện (2-3 đoạn văn) về hành trình. Hãy nhắc đến các địa điểm trong wishlist nếu có thể.
    3. Lịch trình chi tiết từng ngày với các mốc Sáng, Chiều, Tối. Cố gắng đưa các địa điểm trong wishlist vào lịch trình một cách hợp lý.
    4. Chi phí ước tính cho mỗi hoạt động (Đơn vị: VNĐ).
    5. Danh sách các điểm trên bản đồ (lộ trình tối ưu) cho các điểm tham quan, nhà hàng và khách sạn.
    6. Kinh độ (lng) và Vĩ độ (lat) cụ thể cho MỖI hoạt động và điểm bản đồ.
    7. Cho 'preview360Url', cung cấp URL nhúng Google Maps Street View (svembed) sử dụng lat/lng.
       Định dạng: https://www.google.com/maps?q=&layer=c&cbll=LAT,LNG&cbp=11,0,0,0,0&output=svembed
    8. Giải thích lý do (personalizationLogic) tại sao lại chọn các địa điểm cụ thể đó bằng tiếng Việt.
    9. Phân tích ngân sách (budgetAnalysis) cho thấy cách kế hoạch duy trì trong giới hạn ${prefs.budget.toLocaleString('vi-VN')} VNĐ.
    10. Cung cấp điểm đánh giá (rating - từ 1.0 đến 5.0) và số lượng đánh giá (reviewCount) giả lập thực tế cho mỗi địa điểm/hoạt động.
    11. Một câu "aiInsight" (tiếng Việt) ngắn gọn, sắc sảo về ưu điểm cốt lõi của hành trình này (ví dụ: "Sự kết hợp hoàn hảo giữa lịch sử và ẩm thực đường phố, tiết kiệm 15% chi phí đi lại nhờ lộ trình tối ưu").

    Hãy thực tế và cụ thể. Đảm bảo tọa độ chính xác cho các địa điểm được đề cập. Tất cả văn bản phải bằng tiếng Việt. Chi phí phải thực tế với mệnh giá VNĐ.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA as any,
      },
    });

    if (!response.text) {
      throw new Error("No response from Gemini");
    }

    return JSON.parse(response.text) as TravelPlan;
  } catch (error) {
    console.error("Error generating travel plan:", error);
    throw error;
  }
}
