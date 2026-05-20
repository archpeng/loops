import fs from "fs";
import path from "path";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGE_DIR = path.resolve(__dirname, "../public/photos");
const DATA_FILE = path.resolve(__dirname, "../public/data.json");

// Read existing data
let data = { images: [] };
if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    console.log(`Loaded existing data.json with ${data.images.length} images.`);
  } catch (e) {
    console.error("Error reading data.json, starting fresh:", e);
  }
}

// Find all image files
const allFiles = fs.readdirSync(IMAGE_DIR);
const imageExtensions = [".jpg", ".jpeg", ".png", ".JPG", ".PNG", ".JPEG"];
const imageFiles = allFiles.filter(file => {
  const ext = path.extname(file);
  return imageExtensions.includes(ext);
});

console.log(`Found ${imageFiles.length} total image files in directory.`);
const existingFiles = new Set(data.images.map(img => img.filename));
const filesToProcess = imageFiles.filter(file => !existingFiles.has(file));
console.log(`${filesToProcess.length} images need to be analyzed.`);

const apiKey = process.env.GEMINI_API_KEY;
const baseUrl = process.env.GOOGLE_GEMINI_BASE_URL || "https://nekoapi.dangtang8.net";
const model = "gemini-3-flash-preview";

async function analyzeImage(filename) {
  const imgPath = path.join(IMAGE_DIR, filename);
  console.log(`[Processing] Starting: ${filename}`);
  
  try {
    const imgBuffer = fs.readFileSync(imgPath);
    const base64Image = imgBuffer.toString("base64");
    const ext = path.extname(filename).toLowerCase();
    const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const prompt = `你是一个专业的植物学家和文艺作家。请分析这张植物照片。
请返回一个 JSON 对象，包含以下字段：
1. "name": 该植物的中文常用名，比如"绣球花"、"黄金葛"等。若照片是一片场景（如"森林"、"小桥"、"走廊"），可以使用场景名。
2. "scientificName": 它的拉丁学名，比如"Hydrangea macrophylla"。如果是场景，学名写空字符串 ""。
3. "features": 简短的特征介绍，介绍植物的外观、习性等，在50到80字之间。如果是场景，介绍场景中的植物配置和氛围。
4. "caption": 一句适合配图的文艺、诗意、治愈系描述，在30到50字之间。
5. "color": 一个与该植物/照片最契合的莫兰迪色系或明亮糖果色的十六进制颜色代码（如 "#E8F9FD", "#FFF5E4", "#FFE3E3", "#D2DAFF", "#E3F2C1", "#F9F5EB", "#FFF9DE" 等，用于网页卡片背景）。

请直接返回 JSON，不要包含 markdown 格式化代码块，也不要有任何其他前导或后继说明文字。`;

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } }
            ]
          }
        ],
        temperature: 0.7
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP status: ${res.status}`);
    }

    const resData = await res.json();
    const content = resData.choices[0].message.content.trim();
    
    // Parse JSON
    const parsed = JSON.parse(content);
    
    const result = {
      filename,
      name: parsed.name || filename.split(".")[0],
      scientificName: parsed.scientificName || "",
      features: parsed.features || "",
      caption: parsed.caption || "",
      color: parsed.color || "#FFF5E4"
    };

    console.log(`[Success] Finished: ${filename} -> ${result.name}`);
    return result;
  } catch (error) {
    console.error(`[Error] Failed to process ${filename}:`, error.message);
    return null;
  }
}

// Concurrency pool runner
async function runPool() {
  const limit = 12; // 12 concurrent requests
  let index = 0;

  async function worker() {
    while (index < filesToProcess.length) {
      const currentIndex = index++;
      const file = filesToProcess[currentIndex];
      const result = await analyzeImage(file);
      if (result) {
        // Read current state to avoid overwrite from race conditions, then append and save
        let currentData = { images: [] };
        if (fs.existsSync(DATA_FILE)) {
          try {
            currentData = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
          } catch (e) {}
        }
        currentData.images.push(result);
        fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2), "utf-8");
      }
    }
  }

  const workers = Array.from({ length: limit }, () => worker());
  await Promise.all(workers);
  console.log("All processing complete!");
}

if (filesToProcess.length > 0) {
  runPool();
} else {
  console.log("No new images to process.");
}
