/**
 * ==============================================================================
 * 🚀 WangWei Admin Worker v2.1 (CORS & Stability Edition)
 * ==============================================================================
 * 1. 統一 CORS 授權：完全支援 X-Username 與 X-Password 標頭。
 * 2. 強化密碼安全：基於 Web Crypto API 的 SHA-256 校驗。
 * 3. 整合公告與跑馬燈：支援 admin.html 所有的管理功能。
 */

// 工具：SHA-256 加密
async function hashPassword(text) {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 工具：隨機碼生成 (6碼)
function generateRandomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 🔥 1. CORS 配置：必須與 tra-schedule-worker 保持一致
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Username, X-Password",
      "Access-Control-Max-Age": "86400", // 減少瀏覽器預檢請求次數
    };

    // 處理瀏覽器 Preflight 預檢請求
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    if (!env.DB) {
        return new Response(JSON.stringify({ success: false, error: "資料庫未綁定" }), { status: 500, headers: corsHeaders });
    }

    // --- 權限驗證小幫手 ---
    const authenticate = async () => {
        const username = request.headers.get('X-Username');
        const password = request.headers.get('X-Password');
        if (!username || !password) return { success: false, error: "請先登入" };
        
        const userRecord = await env.DB.prepare("SELECT password FROM users WHERE username = ?").bind(username).first();
        if (!userRecord) return { success: false, error: "帳號不存在" };
        
        const inputHash = await hashPassword(password);
        if (inputHash !== userRecord.password) return { success: false, error: "密碼錯誤" };
        
        return { success: true, username };
    };

    // ============================
    // API: 註冊帳號
    // ============================
    if (url.pathname === '/register' && request.method === 'POST') {
        try {
            const { username, password, invite_code } = await request.json();
            if (!username || !password || !invite_code) throw new Error("請輸入完整資訊");

            const validCode = await env.DB.prepare("SELECT code FROM invite_codes WHERE code = ? AND is_used = 0").bind(invite_code).first();
            if (!validCode) return new Response(JSON.stringify({ success: false, error: "⛔ 邀請碼無效或已被使用" }), { status: 403, headers: corsHeaders });

            const existUser = await env.DB.prepare("SELECT username FROM users WHERE username = ?").bind(username).first();
            if (existUser) throw new Error("此帳號已被使用");

            const hashedPassword = await hashPassword(password);
            await env.DB.batch([
                env.DB.prepare("INSERT INTO users (username, password, created_at) VALUES (?, ?, ?)").bind(username, hashedPassword, Date.now()),
                env.DB.prepare("UPDATE invite_codes SET is_used = 1, used_by = ? WHERE code = ?").bind(username, invite_code)
            ]);
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (e) { return new Response(JSON.stringify({ success: false, error: e.message }), { headers: corsHeaders }); }
    }

    // ============================
    // API: 產生邀請碼
    // ============================
    if (url.pathname === '/generate-invite' && request.method === 'POST') {
        const auth = await authenticate();
        if (!auth.success) return new Response(JSON.stringify(auth), { status: 401, headers: corsHeaders });

        try {
            let newCode = generateRandomCode();
            await env.DB.prepare("INSERT INTO invite_codes (code, created_at) VALUES (?, ?)").bind(newCode, Date.now()).run();
            return new Response(JSON.stringify({ success: true, code: newCode }), { headers: corsHeaders });
        } catch (e) { return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders }); }
    }

    // ============================
    // API: 跑馬燈管理 (message)
    // ============================
    if (url.pathname === '/message') {
        if (request.method === 'GET') {
            const record = await env.DB.prepare("SELECT value FROM app_config WHERE key = 'wangwei_msg'").first();
            return new Response(JSON.stringify({ message: record ? record.value : "系統建置中..." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (request.method === 'POST') {
            const auth = await authenticate();
            if (!auth.success) return new Response(JSON.stringify(auth), { status: 401, headers: corsHeaders });
            try {
                const body = await request.json();
                await env.DB.prepare("INSERT OR REPLACE INTO app_config (key, value, updated_at) VALUES ('wangwei_msg', ?, ?)").bind(body.message, Date.now()).run();
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            } catch (e) { return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders }); }
        }
    }

    // ============================
    // API: 系統公告管理 (announcement)
    // ============================
    if (url.pathname === '/announcement') {
        if (request.method === 'GET') {
            const record = await env.DB.prepare("SELECT value FROM app_config WHERE key = 'maintenance_modal'").first();
            let data = { active: false, title: "", content: "", list: [] };
            if (record?.value) { try { data = JSON.parse(record.value); } catch(e){} }
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (request.method === 'POST') {
            const auth = await authenticate();
            if (!auth.success) return new Response(JSON.stringify(auth), { status: 401, headers: corsHeaders });
            try {
                const body = await request.json();
                await env.DB.prepare("INSERT OR REPLACE INTO app_config (key, value, updated_at) VALUES ('maintenance_modal', ?, ?)").bind(JSON.stringify(body), Date.now()).run();
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            } catch (e) { return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders }); }
        }
    }

    // ============================
    // API: 列車與區段停駛規則設定
    // ============================
    if (url.pathname === '/api/admin/suspension-rules' && request.method === 'GET') {
        try {
            const record = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'SUSPENSION_RULES'").first();
            return new Response(record?.Value || "[]", {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify([]), { headers: corsHeaders });
        }
    }

    if (url.pathname === '/api/admin/update-suspension-rules' && request.method === 'POST') {
        const auth = await authenticate();
        if (!auth.success) return new Response(JSON.stringify(auth), { status: 401, headers: corsHeaders });

        try {
            const body = await request.json(); // 預期接收一個陣列
            const rulesJson = JSON.stringify(Array.isArray(body) ? body : []);

            await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value, ExpiresAt) VALUES ('SUSPENSION_RULES', ?, 9999999999)")
                .bind(rulesJson)
                .run();

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
    }

    // ============================
    // API: PIDS 跑馬燈/素材管理 (for tra-worker AppConfig)
    // ============================
    if (url.pathname === '/api/pids/marquee' && request.method === 'GET') {
        try {
            const record = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'PIDS_TOP_MARQUEE'").first();
            return new Response(JSON.stringify({ text: record?.Value || '' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
    }

    if (url.pathname === '/api/pids/assets' && request.method === 'GET') {
        try {
            const imgRes = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'PIDS_IMAGES'").first();
            const vidRes = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'PIDS_VIDEO'").first();

            let images = [];
            let video = [];
            try { images = JSON.parse(imgRes?.Value || '[]'); } catch (_) {}
            try { video = JSON.parse(vidRes?.Value || '[]'); } catch (_) { video = vidRes?.Value ? [vidRes.Value] : []; }

            return new Response(JSON.stringify({ images, video, marquee_speed: 40 }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
    }

    // ============================
    // API: 捷運 PIDS 跑馬燈管理
    // ============================
    if (url.pathname === '/api/metro/marquee' && request.method === 'GET') {
        try {
            const record = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'METRO_MARQUEE'").first();
            // 如果資料庫沒資料，給予預設值
            const defaultMsg = "【TPASS 2.0】每月搭乘 11 次以上享回饋，國道客運最高 30% 回饋。　　捷運系統全面禁菸，違者最高處新台幣 1 萬元罰鍰。";
            return new Response(JSON.stringify({ text: record?.Value || defaultMsg }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
    }

    if (url.pathname === '/api/admin/update-metro-marquee' && request.method === 'POST') {
        const auth = await authenticate();
        if (!auth.success) return new Response(JSON.stringify(auth), { status: 401, headers: corsHeaders });

        try {
            const body = await request.json();
            const newText = String(body?.text || '').trim();
            if (!newText) throw new Error('捷運跑馬燈文字不得為空');

            await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value, ExpiresAt) VALUES (?, ?, ?)")
                .bind('METRO_MARQUEE', newText, 9999999999)
                .run();

            return new Response(JSON.stringify({ success: true, text: newText }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
    }

    // ============================
    // API: 捷運 PIDS 影片管理
    // ============================
    if (url.pathname === '/api/metro/assets' && request.method === 'GET') {
        try {
            const vidRes = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'METRO_VIDEO'").first();
            let video = [];
            try { video = JSON.parse(vidRes?.Value || '[]'); } catch (_) { video = vidRes?.Value ? [vidRes.Value] : []; }
            
            // 預設給一支宣導影片，避免畫面空轉
            if (video.length === 0) video = ["https://www.youtube.com/watch?v=Y_siE2Wsp38"];
            
            return new Response(JSON.stringify({ video }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
    }

    if (url.pathname === '/api/admin/update-metro-assets' && request.method === 'POST') {
        const auth = await authenticate();
        if (!auth.success) return new Response(JSON.stringify(auth), { status: 401, headers: corsHeaders });

        try {
            const body = await request.json();
            const video = Array.isArray(body?.video) ? body.video : [];
            await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value) VALUES ('METRO_VIDEO', ?)")
                .bind(JSON.stringify(video))
                .run();

            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
    }

    if (url.pathname === '/api/admin/update-pids' && request.method === 'POST') {
        const auth = await authenticate();
        if (!auth.success) return new Response(JSON.stringify(auth), { status: 401, headers: corsHeaders });

        try {
            const body = await request.json();
            const newText = String(body?.text || '').trim();
            if (!newText) throw new Error('PIDS 文字不得為空');

            await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value, ExpiresAt) VALUES (?, ?, ?)")
                .bind('PIDS_TOP_MARQUEE', newText, 9999999999)
                .run();

            return new Response(JSON.stringify({ success: true, text: newText }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
    }

    if (url.pathname === '/api/admin/update-assets' && request.method === 'POST') {
        const auth = await authenticate();
        if (!auth.success) return new Response(JSON.stringify(auth), { status: 401, headers: corsHeaders });

        try {
            const body = await request.json();
            const images = Array.isArray(body?.images) ? body.images : [];
            const video = Array.isArray(body?.video) ? body.video : [];

            await env.DB.batch([
                env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value) VALUES ('PIDS_IMAGES', ?)").bind(JSON.stringify(images)),
                env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value) VALUES ('PIDS_VIDEO', ?)").bind(JSON.stringify(video))
            ]);

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
    }

    return new Response("WangWei Admin API v2.1 Ready", { headers: corsHeaders });
  }
};