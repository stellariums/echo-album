// Vision: image understanding + OCR + tagging via Gemini through chat.completions.
// Sends a data-URL image, asks for strict JSON output, parses the response.

import fs from "node:fs/promises";
import path from "node:path";
import { getClient, modelId } from "./client";
import { extractJson } from "./json-utils";

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
  "ocr_text": "图片中所有可读的文字（中文、英文、数字、符号），按出现顺序，用 / 分隔。如果图片中没有任何文字，返回空字符串。注意保留密码、Wi-Fi 名、金额、日期等关键信息。",
  "objects": ["主要可见物体的名称数组"],
  "scene": "场景描述，例如：餐厅 / 咖啡店 / 户外 / 室内 / 课堂 / 商场 / 工位 / 实验室",
  "possible_tags": ["3-8 个最适合检索这张照片的中文标签"],
  "important_details": ["3-5 条值得注意的细节"]
}

要求：
- 只返回 JSON，不要任何额外文字、不要代码块标记
- 字段名严格使用 snake_case
- 如果某个数组没有内容，返回空数组 []`;

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

  const client = getClient();
  const res = await client.chat.completions.create({
    model: modelId("VISION"),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: USER_PROMPT },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0.2,
    max_tokens: 1200,
  });

  const text = res.choices[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("Vision model returned empty response");

  const parsed = extractJson<RawVisionJson>(text);

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
