// Vision: image understanding + OCR + tagging via Gemini through chat.completions.
// Sends a data-URL image, asks for strict JSON output, parses the response.

import fs from "node:fs/promises";
import path from "node:path";
import { getClient, modelId } from "./client";
import { extractJson, isJsonExtractionError } from "./json-utils";

export interface VisionResult {
  visionCaption: string;
  ocrText: string;
  objects: string[];
  scene: string;
  possibleTags: string[];
  importantDetails: string[];
}

const SYSTEM_PROMPT = `你是一个图片分析助手。请仔细观察图片，并以严格的 JSON 格式返回结果。`;

const USER_PROMPT = `请分析这张图片，输出以下 JSON（用中文）：

{
  "vision_caption": "用一两句中文自然语言描述图片的主要内容",
  "ocr_text": "图片中可读文字，按出现顺序用 / 分隔，最多 800 字。如果文字很多，优先保留密码、Wi-Fi 名、金额、日期、标题、店名、地点等关键信息。如果没有文字，返回空字符串。",
  "objects": ["主要可见物体的名称数组，最多 8 个"],
  "scene": "场景描述，例如：餐厅 / 咖啡店 / 户外 / 室内 / 课堂 / 商场 / 工位 / 实验室",
  "possible_tags": ["3-8 个最适合检索这张照片的中文标签"],
  "important_details": ["2-4 条值得注意的细节，每条不超过 30 字"]
}

要求：
- 只返回 JSON，不要任何额外文字、不要代码块标记
- 字段名严格使用 snake_case
- 如果某个数组没有内容，返回空数组 []
- 不要输出 Markdown，不要解释字段含义`;

const RETRY_USER_PROMPT = `上一次输出不是合法 JSON。请重新分析图片，只返回一个可被 JSON.parse 解析的 JSON 对象：

{
  "vision_caption": "一句中文描述",
  "ocr_text": "可读文字，最多 500 字，优先保留密码、金额、日期、标题、地点",
  "objects": ["最多 6 个物体"],
  "scene": "一个场景短语",
  "possible_tags": ["3-6 个中文标签"],
  "important_details": ["2-3 条短细节"]
}

只返回 JSON，不要 Markdown，不要额外解释。`;

interface RawVisionJson {
  vision_caption?: string;
  ocr_text?: string;
  objects?: string[];
  scene?: string;
  possible_tags?: string[];
  important_details?: string[];
}

function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  return map[ext.toLowerCase()] ?? "image/jpeg";
}

export async function analyzeImage(imageAbsPath: string): Promise<VisionResult> {
  const buffer = await fs.readFile(imageAbsPath);
  const mime = mimeFromExt(path.extname(imageAbsPath));
  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;

  async function requestVision(prompt: string, maxTokens: number): Promise<RawVisionJson> {
    const client = getClient();
    const res = await client.chat.completions.create({
      model: modelId("VISION"),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
    });

    const text = res.choices[0]?.message?.content ?? "";
    if (!text.trim()) throw new Error("Vision model returned empty response");
    return extractJson<RawVisionJson>(text);
  }

  let parsed: RawVisionJson;
  try {
    parsed = await requestVision(USER_PROMPT, 2500);
  } catch (err) {
    if (!isJsonExtractionError(err)) throw err;
    parsed = await requestVision(RETRY_USER_PROMPT, 1800);
  }

  return {
    visionCaption: parsed.vision_caption?.trim() ?? "",
    ocrText: parsed.ocr_text?.trim() ?? "",
    objects: Array.isArray(parsed.objects) ? parsed.objects : [],
    scene: parsed.scene?.trim() ?? "",
    possibleTags: Array.isArray(parsed.possible_tags) ? parsed.possible_tags : [],
    importantDetails: Array.isArray(parsed.important_details)
      ? parsed.important_details
      : [],
  };
}
