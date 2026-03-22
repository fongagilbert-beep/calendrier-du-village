$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$prefix = "http://localhost:8000/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Output "Serving $root at $prefix"

$contentTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".js" = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".webmanifest" = "application/manifest+json; charset=utf-8"
  ".png" = "image/png"
  ".ico" = "image/x-icon"
  ".svg" = "image/svg+xml"
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  try {
    $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($requestPath)) { $requestPath = "index.html" }

    $filePath = Join-Path $root $requestPath
    if ((Test-Path $filePath) -and (Get-Item $filePath).PSIsContainer) {
      $filePath = Join-Path $filePath "index.html"
    }

    if (-not (Test-Path $filePath)) {
      $context.Response.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      continue
    }

    $ext = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
    $context.Response.ContentType = $contentTypes[$ext]
    if (-not $context.Response.ContentType) {
      $context.Response.ContentType = "application/octet-stream"
    }

    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  }
  catch {
    $context.Response.StatusCode = 500
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($_.Exception.Message)
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  }
  finally {
    $context.Response.OutputStream.Close()
  }
}
