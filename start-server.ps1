# 簡單的 PowerShell HTTP 服務器
$Hso = New-Object -ComObject HtmlFile
$port = 8080
$url = "http://localhost:$port/"

Write-Host "正在啟動本地服務器於 $url" -ForegroundColor Green
Write-Host "按 Ctrl+C 停止服務器" -ForegroundColor Yellow

try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($url)
    $listener.Start()
    
    Write-Host "服務器已啟動! 請在瀏覽器中訪問 $url" -ForegroundColor Green
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $path = $request.Url.LocalPath
        if ($path -eq "/") { $path = "/index.html" }
        
        $filePath = Join-Path $PWD $path.TrimStart('/')
        
        if (Test-Path $filePath) {
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $content.Length
            
            # 設置 Content-Type
            $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($extension) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".js" { $response.ContentType = "application/javascript" }
                ".css" { $response.ContentType = "text/css" }
                ".png" { $response.ContentType = "image/png" }
                ".jpg" { $response.ContentType = "image/jpeg" }
                ".jpeg" { $response.ContentType = "image/jpeg" }
                default { $response.ContentType = "application/octet-stream" }
            }
            
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
            $responseString = "<h1>404 - File Not Found</h1>"
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($responseString)
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        
        $response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
}