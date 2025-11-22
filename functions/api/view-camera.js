/**
 * 📊 Cloudflare D1 - 相機觀看計數 API
 * 
 * 路由: POST /api/view-camera
 * 功能: 當使用者點擊相機時，增加觀看次數
 * 
 * 請求格式:
 * {
 *   "id": "國道一號-15k"  // 或其他相機 ID
 * }
 * 
 * 回應格式:
 * {
 *   "success": true,
 *   "camera_id": "國道一號-15k",
 *   "new_views": 5
 * }
 */

export async function onRequestPost(context) {
  const { request, env } = context;

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

    // 解析請求體
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const cameraId = body.id || body.camera_id;

    // 驗證相機 ID
    if (!cameraId || typeof cameraId !== "string" || cameraId.trim() === "") {
      return new Response(
        JSON.stringify({
          error: "Missing or invalid camera ID",
          message: "請提供有效的相機 ID (id 欄位)"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 🔍 Upsert SQL 語法: 如果 ID 存在就 views + 1，不存在就插入新的一筆設為 1
    const upsertQuery = `
      INSERT INTO camera_views (camera_id, views, last_updated)
      VALUES (?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(camera_id) DO UPDATE SET
        views = views + 1,
        last_updated = CURRENT_TIMESTAMP;
    `;

    // 執行 Upsert
    await env.DB.prepare(upsertQuery).bind(cameraId).run();

    // 取得更新後的觀看數
    const selectQuery = `SELECT views FROM camera_views WHERE camera_id = ?;`;
    const result = await env.DB.prepare(selectQuery).bind(cameraId).first();

    console.log(`✅ 相機 ${cameraId} 計數已更新至 ${result?.views || 1}`);

    return new Response(
      JSON.stringify({
        success: true,
        camera_id: cameraId,
        new_views: result?.views || 1
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        }
      }
    );
  } catch (error) {
    console.error("❌ 計數失敗:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message || "資料庫操作失敗"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * CORS 預檢請求
 */
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
