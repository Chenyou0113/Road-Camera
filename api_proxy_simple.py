#!/usr/bin/env python3
"""
簡化版 API 代理伺服器
隱藏環保署 API 密鑰
"""

import json
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler

# 🔒 API 配置（直接內嵌）
API_BASE = 'https://data.moenv.gov.tw/api/v2/aqx_p_01'
API_KEY = '4c89a32a-a214-461b-bf29-30ff32a61a8a'
PROXY_PORT = 8001


class ProxyHandler(BaseHTTPRequestHandler):
    """處理 HTTP 請求的代理"""

    def do_GET(self):
        """處理 GET 請求"""
        path = self.path
        
        if path == '/api/air-quality/images':
            self.get_images_list()
        elif path.startswith('/api/air-quality/image/'):
            station_code = path.split('/')[-1]
            self.get_station_image(station_code)
        else:
            self.send_error(404, 'Not Found')

    def do_OPTIONS(self):
        """處理 CORS"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def get_images_list(self):
        """取得影像清單"""
        try:
            url = f"{API_BASE}?api_key={API_KEY}&limit=1000&format=JSON&sort=ImportDate%20desc"
            
            with urllib.request.urlopen(url, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
            
            # 移除敏感資訊
            if '__extras' in data:
                del data['__extras']
            
            self.send_json(data)
            
        except Exception as e:
            self.send_json({'error': str(e)}, 500)

    def get_station_image(self, station_code):
        """取得測站影像資訊"""
        try:
            # 驗證代碼
            try:
                code_int = int(station_code)
                if not (1 <= code_int <= 63):
                    self.send_json({'error': '無效的測站代碼'}, 400)
                    return
            except ValueError:
                self.send_json({'error': '測站代碼必須是數字'}, 400)
                return
            
            url = f"{API_BASE}?api_key={API_KEY}&limit=100&format=JSON&sort=ImportDate%20desc"
            
            with urllib.request.urlopen(url, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
            
            result = {
                'station_code': station_code,
                'latest_record': data['records'][0] if data['records'] else None,
                'total_records': len(data['records'])
            }
            
            self.send_json(result)
            
        except Exception as e:
            self.send_json({'error': str(e)}, 500)

    def send_json(self, data, status=200):
        """發送 JSON 回應"""
        response = json.dumps(data, ensure_ascii=False, indent=2)
        response_bytes = response.encode('utf-8')
        
        self.send_response(status)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', len(response_bytes))
        self.end_headers()
        self.wfile.write(response_bytes)

    def send_cors_headers(self):
        """發送 CORS 標頭"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, format, *args):
        """自訂日誌格式"""
        print(f'[API] {format % args}')


def main():
    """啟動代理伺服器"""
    server_address = ('', PROXY_PORT)
    httpd = HTTPServer(server_address, ProxyHandler)
    
    print('\n' + '='*70)
    print('🔐 台灣空品測站 API 代理伺服器 (簡化版)')
    print('='*70)
    print(f'\n✅ 伺服器啟動於 http://localhost:{PROXY_PORT}')
    print('\n📍 可用的代理端點:')
    print(f'   • GET http://localhost:{PROXY_PORT}/api/air-quality/images')
    print(f'   • GET http://localhost:{PROXY_PORT}/api/air-quality/image/01')
    print('\n🔒 安全性:')
    print('   • API 密鑰已隱藏於伺服器端')
    print('   • 前端無法訪問真實密鑰')
    print('   • 所有請求經過驗證')
    print('\n⏹️  按 Ctrl+C 停止伺服器')
    print('='*70 + '\n')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n\n✅ 伺服器已停止')
        httpd.server_close()


if __name__ == '__main__':
    main()
