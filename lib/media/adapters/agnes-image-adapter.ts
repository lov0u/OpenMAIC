/**
 * AGNES-AI Image Generation Adapter
 *
 * Uses OpenAI-compatible synchronous API format.
 * Endpoint: https://apihub.agnes-ai.com/v1/images/generations
 *
 * Supported models:
 * - agnes-image-2.1-flash  (latest)
 * - agnes-image-2.0-flash
 *
 * Authentication: Bearer token via Authorization header
 */

import type {
  ImageGenerationConfig,
  ImageGenerationOptions,
  ImageGenerationResult,
} from '../types';

const DEFAULT_MODEL = 'agnes-image-2.1-flash';
const DEFAULT_BASE_URL = 'https://apihub.agnes-ai.com/v1';

function normalizeBaseUrl(baseUrl?: string): string {
  return (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
}

function resolveSize(options: ImageGenerationOptions): string {
  return `${options.width || 1024}x${options.height || 1024}`;
}

/**
 * Lightweight connectivity test — validates API key by making a minimal
 * request that triggers auth check. 401/403 means key invalid.
 */
export async function testAgnesImageConnectivity(
  config: ImageGenerationConfig,
): Promise<{ success: boolean; message: string }> {
  const baseUrl = normalizeBaseUrl(config.baseUrl);

  try {
    const response = await fetch(
      `${baseUrl}/models/${encodeURIComponent(config.model || DEFAULT_MODEL)}`,
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      },
    );

    if (response.ok) {
      return { success: true, message: 'Connected to AGNES-AI Image' };
    }

    const text = await response.text().catch(() => response.statusText);
    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: `AGNES-AI Image auth failed (${response.status}): ${text}`,
      };
    }
    if (response.status === 404) {
      return {
        success: false,
        message: `AGNES-AI Image model not found: ${config.model || DEFAULT_MODEL}`,
      };
    }
    return { success: false, message: `AGNES-AI Image API error (${response.status}): ${text}` };
  } catch (err) {
    return { success: false, message: `AGNES-AI Image connectivity error: ${err}` };
  }
}

export async function generateWithAgnesImage(
  config: ImageGenerationConfig,
  options: ImageGenerationOptions,
): Promise<ImageGenerationResult> {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const width = options.width || 1024;
  const height = options.height || 1024;

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || DEFAULT_MODEL,
      prompt: options.prompt,
      n: 1,
      size: resolveSize(options),
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`AGNES-AI image generation failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const imageData = data.data?.[0];
  if (!imageData?.url && !imageData?.b64_json) {
    throw new Error('AGNES-AI Image returned empty image response');
  }

  return {
    url: imageData.url,
    base64: imageData.b64_json,
    width,
    height,
  };
}
