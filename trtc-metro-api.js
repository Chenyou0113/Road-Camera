/**
 * 台北捷運 API Worker (CORS 修復版)
 * * 修復重點：在所有 API 回應中強制加入 CORS 標頭，允許跨域存取
 */

// 定義通用的 CORS 標頭
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  
  export default {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      const client = new TaipeiMetroClient(env.TRTC_USER, env.TRTC_PASS);
  
      try {
        // 1. 處理預檢請求 (Preflight)
        if (request.method === "OPTIONS") {
          return new Response(null, {
            headers: corsHeaders,
          });
        }
  
        let response;
  
        switch (url.pathname) {
          // 1. 列車位置
          case "/train-position":
            const carId = url.searchParams.get("carID");
            if (!carId) return new Response("Missing carID parameter", { status: 400, headers: corsHeaders });
            response = await client.getTrainInfo(carId);
            break;
  
          // 3. 停車場車位即時資訊
          case "/parking":
            const stationForParking = url.searchParams.get("station");
            response = await client.getParkingLot(stationForParking);
            break;
  
          // 4. 車站 YouBike 資訊
          case "/youbike":
            const stationForBike = url.searchParams.get("station");
            response = await client.getYouBike(stationForBike);
            break;
  
          // 6. 高運量列車車廂擁擠度 (含板南線)
          case "/crowdedness/high-capacity":
            response = await client.getCarWeightHighCapacity();
            break;
  
          // 7. 文湖線列車車廂擁擠度
          case "/crowdedness/wenhu":
            response = await client.getCarWeightWenhu();
            break;
  
          // 9. 列車到站資訊
          case "/arrival":
            response = await client.getTrackInfo();
            break;
  
          // 11. 常客優惠資訊
          case "/loyalty":
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
            const queryDate = url.searchParams.get("date") || today;
            response = await client.getLoyaltyInfo(queryDate);
            break;
  
          // 首頁說明
          default:
            response = new Response(
              JSON.stringify({
                message: "TRTC API Proxy (CORS Fixed)",
                status: "Running",
                available_endpoints: {
                  "列車到站資訊": "/arrival",
                  "擁擠度(高運量)": "/crowdedness/high-capacity",
                  "擁擠度(文湖線)": "/crowdedness/wenhu"
                }
              }, null, 2),
              { 
                status: 200, 
                headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } 
              }
            );
            break;
        }
  
        return response;
  
      } catch (err) {
        // 錯誤處理也要加上 CORS，不然前端看不到錯誤訊息
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    },
  };
  
  /**
   * 台北捷運 API 客戶端
   */
  class TaipeiMetroClient {
    constructor(user, pass) {
      this.username = user;
      this.password = pass;
    }
  
    /**
     * 通用 SOAP 發送器
     */
    async sendSoapRequest(endpoint, actionName, contentGenerator) {
      const variations = [
        { userTag: "userName", passTag: "password" },
        { userTag: "username", passTag: "password" },
        { userTag: "userName", passTag: "passWord" },
      ];
  
      let lastErrorResponse = null;
  
      for (const style of variations) {
        const bodyXml = contentGenerator(style.userTag, style.passTag);
        const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><${actionName} xmlns="http://tempuri.org/">${bodyXml}</${actionName}></soap:Body></soap:Envelope>`;
  
        const headers = {
          "Content-Type": "text/xml; charset=utf-8",
          "SOAPAction": `http://tempuri.org/${actionName}`,
          "User-Agent": "PostmanRuntime/7.26.8",
          "Accept": "*/*",
          "Host": new URL(endpoint).host
        };
  
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: headers,
            body: soapEnvelope,
          });
  
          const buffer = await response.arrayBuffer();
          const decoder = new TextDecoder("utf-8");
          const text = decoder.decode(buffer);
  
          if (!text.includes("帳號或密碼錯誤") && !text.includes("Login Fail")) {
            return this.parseXmlResponse(text, actionName);
          }
          lastErrorResponse = text;
        } catch (e) {
          lastErrorResponse = e.message;
        }
      }
  
      return this.parseXmlResponse(lastErrorResponse, actionName);
    }
  
    /**
     * 解析 XML 回傳 (含 CORS 注入)
     */
    parseXmlResponse(xml, actionName) {
      // 定義回應標頭 (合併 CORS 與 Content-Type)
      const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" };
      const textHeaders = { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" };
  
      if (!xml) return new Response("Unknown Error", { status: 500, headers: textHeaders });
  
      // 1. 檢查權限
      if (xml.includes("帳號或密碼錯誤") || xml.includes("Login Fail")) {
        return new Response(JSON.stringify({ 
          error: "Unauthorized", 
          message: "驗證失敗，請確認您的帳號密碼是否有權限存取此 API。" 
        }, null, 2), {
          status: 401,
          headers: jsonHeaders,
        });
      }
  
      // 2. 策略 A：標準 XML 解析
      const regex = new RegExp(`<${actionName}Result>([\\s\\S]*?)<\\/${actionName}Result>`);
      const match = xml.match(regex);
  
      if (match && match[1]) {
        try {
          const jsonString = match[1].trim();
          const data = JSON.parse(jsonString);
          return new Response(JSON.stringify(data, null, 2), {
            headers: jsonHeaders,
          });
        } catch (e) {}
      }
  
      // 3. 策略 B：暴力擷取 JSON
      const firstBracket = xml.indexOf('[');
      const lastBracket = xml.lastIndexOf(']');
  
      if (firstBracket >= 0 && lastBracket > firstBracket) {
        try {
          const potentialJson = xml.substring(firstBracket, lastBracket + 1);
          const data = JSON.parse(potentialJson);
          return new Response(JSON.stringify(data, null, 2), {
            headers: jsonHeaders,
          });
        } catch (e) {}
      }
      
      // 4. 解析失敗，回傳純文字
      return new Response(xml, { headers: textHeaders });
    }
  
    // 以下 API 呼叫函式維持不變
    async getTrainInfo(carID) {
      const url = "https://mobileapp.metro.taipei/TRTCTrainInfo/TrainTimeControl.asmx";
      return this.sendSoapRequest(url, "GetTrainInfo", (u, p) => `<carID>${carID}</carID><${u}>${this.username}</${u}><${p}>${this.password}</${p}>`);
    }
    async getParkingLot(stationName = null) {
      const url = "https://api.metro.taipei/MetroAPI/ParkingLot.asmx";
      if (stationName) {
        return this.sendSoapRequest(url, "getParkingLotBySationName", (u, p) => `<${u}>${this.username}</${u}><${p}>${this.password}</${p}><SationName>${stationName}</SationName>`);
      }
      return this.sendSoapRequest(url, "getParkingLot", (u, p) => `<${u}>${this.username}</${u}><${p}>${this.password}</${p}>`);
    }
    async getYouBike(stationName = null) {
      const url = "https://api.metro.taipei/MetroAPI/UBike.asmx";
      if (stationName) {
          return this.sendSoapRequest(url, "getYourBikeNearByName", (u, p) => `<${u}>${this.username}</${u}><${p}>${this.password}</${p}><SationName>${stationName}</SationName>`);
      }
      return this.sendSoapRequest(url, "getYourBikeNearBy", (u, p) => `<${u}>${this.username}</${u}><${p}>${this.password}</${p}>`);
    }
    async getCarWeightHighCapacity() {
      return this.sendSoapRequest("https://api.metro.taipei/metroapi/CarWeight.asmx", "getCarWeightByInfoEx", (u, p) => `<${u}>${this.username}</${u}><${p}>${this.password}</${p}>`);
    }
    async getCarWeightWenhu() {
      return this.sendSoapRequest("https://api.metro.taipei/metroapi/CarWeightBR.asmx", "getCarWeightBRInfo", (u, p) => `<${u}>${this.username}</${u}><${p}>${this.password}</${p}>`);
    }
    async getTrackInfo() {
      return this.sendSoapRequest("https://api.metro.taipei/metroapi/TrackInfo.asmx", "getTrackInfo", (u, p) => `<${u}>${this.username}</${u}><${p}>${this.password}</${p}>`);
    }
    async getLoyaltyInfo(queryDate) {
      return this.sendSoapRequest("https://api.metro.taipei/metroapi/FrequencyBaseTypeOne.asmx", "Frequerency", (u, p) => `<QryDate>${queryDate}</QryDate><${u}>${this.username}</${u}><${p}>${this.password}</${p}>`);
    }
  }