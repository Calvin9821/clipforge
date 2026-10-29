import { NextRequest, NextResponse } from "next/server";
import { createProvider } from "@/lib/providers";
import { toRemoteUsableImage } from "@/lib/remote-image";
import { apiError, errText } from "@/lib/api-error";
import { getCurrentUser } from "@/lib/auth";
import { consumeCredit, refundCredit } from "@/lib/billing";

// AI image generation
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { provider: providerName, model, prompt, imageUrl, imageUrls, mode, apiKey, baseUrl, options } = body;

  if (!providerName || !model || !prompt) {
    return apiError(req, "缺少必要参数", "Missing required parameters");
  }

  if (!apiKey) {
    return apiError(req, "缺少 API Key，请先在设置中配置对应平台", "Missing API Key, please configure the corresponding platform in settings first");
  }

  // Self-hosted installs remain unlimited. Hosted users reserve one credit before
  // calling a paid provider and receive it back when the provider fails.
  const currentUser = await getCurrentUser();
  const reservation = currentUser ? await consumeCredit(currentUser.id, { reason: "image_generation" }) : null;
  if (reservation && !reservation.ok) return apiError(req, "额度不足，请升级套餐", "You have no credits left; please upgrade your plan", 402);

  try {
    const provider = createProvider({ name: providerName, apiKey, baseUrl });

    // For image-to-image mode, convert local reference images to data URIs.
    // imageUrls (plural) feeds multi-reference edits (e.g. character sheet + product photo);
    // the array order is preserved so prompts can cite references by position.
    const referenceImageUrl = await toRemoteUsableImage(imageUrl);
    const referenceImageUrls = Array.isArray(imageUrls) && imageUrls.length > 0
      ? (await Promise.all((imageUrls as string[]).map(toRemoteUsableImage))).filter((u): u is string => !!u)
      : undefined;

    const result = await provider.generateImage({
      modelId: model,
      mode: mode || "text-to-image",
      prompt,
      referenceImageUrl,
      ...(referenceImageUrls?.length && { referenceImageUrls }),
      ...options,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (currentUser && reservation?.ok) await refundCredit(currentUser.id, { reason: "image_generation_failed_refund" });
    console.error("生图失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : errText(req, "生图失败", "Image generation failed") },
      { status: 500 }
    );
  }
}
