/**
 * 🏆 取得熱門相機排行 API
 * 
 * 路由: GET /api/get-top-cameras
 * 功能: 返回觀看數最高的前 N 個相機
 * 
 * 查詢參數:
 * - limit: 返回的數量 (預設 10)
 *   例: /api/get-top-cameras?limit=5
 * 
 * 回應格式:
 * [
 *   { "camera_id": "國道一號-15k", "views": 120 },
 *   { "camera_id": "國道一號-20k", "views": 95 },
 *   ...
 * ]
 * 
 * 失敗回應:
 * {
 *   "error": "Database not configured",
 *   "message": "請在 Cloudflare Dashboard 中配置 D1 資料庫"
 * }
 */

export async function onRequest(context) {
  const { request, env } = context;

  // 僅允許 GET 和 OPTIONS 方法
  if (request.method === "OPTIONS") {
    return handleOptions();
  }

  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // 檢查 D1 資料庫是否配置
    if (!env.DB) {
      console.error("❌ D1 資料庫未配置");
      return new Response(
        JSON.stringify({
          error: "Database not configured",
          message: "請在 Cloudflare Dashboard 中配置 D1 資料庫"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 從 URL 參數取得 limit (預設 10)
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit")) || 10, 100);

    // 🏆 SQL: 取出觀看數最高的相機
    const query = `
      SELECT camera_id, views, last_updated
      FROM camera_views
      ORDER BY views DESC
      LIMIT ?;
    `;

    const { results } = await env.DB.prepare(query).bind(limit).all();

    console.log(`✅ 成功取得前 ${limit} 名熱門相機`);

    return new Response(JSON.stringify(results || []), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=60, stale-while-revalidate=120"
      }
    });
  } catch (error) {
    console.error("❌ 查詢失敗:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message || "資料庫查詢失敗"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * CORS 預檢請求
 */
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
