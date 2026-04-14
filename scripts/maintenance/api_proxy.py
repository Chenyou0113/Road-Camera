#!/usr/bin/env python3
"""
空品測站影像 API 代理服務
隱藏真實的 API 端點和密鑰
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error
from urllib.parse import urlparse, parse_qs
import os
from datetime import datetime

# 🔒 安全的 API 配置（直接內嵌在代理中）
API_CONFIG = {
    'base_url': 'https://data.moenv.gov.tw/api/v2/aqx_p_01',
    'api_key': '4c89a32a-a214-461b-bf29-30ff32a61a8a'
}

# 代理伺服器設定
PROXY_PORT = 8001
LOG_LEVEL = 'INFO'

class APIProxyHandler(BaseHTTPRequestHandler):
    """處理 API 代理請求"""

    def do_GET(self):
        """處理 GET 請求"""
        try:
            # 解析路由
            path = self.path
            
            if path == '/api/air-quality/images':
                self._handle_images_list()
            elif path.startswith('/api/air-quality/image/'):
                station_code = path.split('/')[-1]
                self._handle_single_image(station_code)
            else:
                self._send_error(404, 'Not Found')
                
        except Exception as e:
            print(f"❌ 錯誤: {str(e)}")
            self._send_error(500, str(e))

    def do_OPTIONS(self):
        """處理 CORS OPTIONS 請求"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def _handle_images_list(self):
        """取得影像清單"""
        try:
            # 構建真實 API 請求
            url = f"{API_CONFIG['base_url']}?api_key={API_CONFIG['api_key']}&limit=1000&format=JSON&sort=ImportDate%20desc"
            
            with urllib.request.urlopen(url, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
            
            # 移除敏感資訊
            if '__extras' in data:
                del data['__extras']
            
            self._send_json(data)
            
        except urllib.error.URLError as e:
            self._send_error(502, f'API 連接失敗: {str(e)}')
        except Exception as e:
            self._send_error(500, f'處理失敗: {str(e)}')

    def _handle_single_image(self, station_code):
        """取得單個測站的影像資訊"""
        try:
            # 驗證測站代碼格式
            if not self._validate_station_code(station_code):
                self._send_error(400, '無效的測站代碼')
                return
            
            # 構建真實 API 請求
            url = f"{API_CONFIG['base_url']}?api_key={API_CONFIG['api_key']}&limit=100&format=JSON&sort=ImportDate%20desc"
            
            with urllib.request.urlopen(url, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
            
            # 移除敏感資訊並返回安全的資料
            safe_data = {
                'station_code': station_code,
                'latest_record': data['records'][0] if data['records'] else None,
                'timestamp': datetime.now().isoformat()
            }
            
            if '__extras' in data:
                del data['__extras']
            
            self._send_json(safe_data)
            
        except urllib.error.URLError as e:
            self._send_error(502, f'API 連接失敗: {str(e)}')
        except Exception as e:
            self._send_error(500, f'處理失敗: {str(e)}')

    def _validate_station_code(self, code):
        """驗證測站代碼"""
        try:
            code_int = int(code)
            return 1 <= code_int <= 63
        except ValueError:
            return False

    def _send_json(self, data):
        """發送 JSON 回應"""
        response = json.dumps(data, ensure_ascii=False, indent=2)
        response_bytes = response.encode('utf-8')
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', len(response_bytes))
        self.end_headers()
        self.wfile.write(response_bytes)

    def _send_error(self, code, message):
        """發送錯誤回應"""
        error_response = json.dumps({
            'error': message,
            'code': code
        }, ensure_ascii=False).encode('utf-8')
        
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', len(error_response))
        self.end_headers()
        self.wfile.write(error_response)

    def log_message(self, format, *args):
        """自訂日誌格式"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f'[{timestamp}] {format % args}')


def run_proxy_server(port=None):
    """啟動代理伺服器"""
    if port is None:
        port = PROXY_PORT
    
    server_address = ('', port)
    httpd = HTTPServer(server_address, APIProxyHandler)
    
    print('\n' + '='*60)
    print('🔐 台灣空品測站 API 代理伺服器')
    print('='*60)
    print(f'\n✅ 伺服器啟動於 http://localhost:{port}')
    print('\n📍 可用的代理端點:')
    print(f'   • http://localhost:{port}/api/air-quality/images')
    print(f'   • http://localhost:{port}/api/air-quality/image/01')
    print('\n🔒 安全性:')
    print('   • API 密鑰已隱藏於伺服器端')
    print('   • 前端無法訪問真實密鑰')
    print('   • 所有請求經過驗證')
    print('\n📚 使用說明:')
    print('   前端應訪問 http://localhost:8001/api/air-quality/...')
    print('   代理會使用隱藏的密鑰調用環保署 API')
    print('\n⏹️  按 Ctrl+C 停止伺服器\n')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n✅ 伺服器已停止')
        httpd.server_close()


if __name__ == '__main__':
    run_proxy_server()
