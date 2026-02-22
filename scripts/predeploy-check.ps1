param()

$ErrorActionPreference = "Stop"

Write-Host "[predeploy] Running JS syntax checks..."
$jsFiles = @(
    "src/theme.js",
    "src/utils.js",
    "src/ui.js",
    "src/game.js",
    "src/render.js"
)

foreach ($file in $jsFiles) {
    if (!(Test-Path $file)) {
        throw "Missing required file: $file"
    }
    node --check $file
}

Write-Host "[predeploy] Checking required top-level files..."
$requiredFiles = @("index.html", "src/style.css", ".nojekyll")
foreach ($file in $requiredFiles) {
    if (!(Test-Path $file)) {
        throw "Missing required file: $file"
    }
}

Write-Host "[predeploy] Checking for symlinks (GitHub Pages/Jekyll can fail without .nojekyll)..."
$gitLinks = git ls-files -s | Select-String "120000"
if ($gitLinks -and -not (Test-Path ".nojekyll")) {
    throw "Symlink detected in repo but .nojekyll is missing."
}

Write-Host "[predeploy] Verifying HTML script load order..."
$html = Get-Content "index.html" -Raw
$expectedScripts = @(
    'src/theme.js',
    'src/utils.js',
    'src/ui.js',
    'src/game.js',
    'src/render.js'
)

$lastIndex = -1
foreach ($script in $expectedScripts) {
    $idx = $html.IndexOf($script)
    if ($idx -lt 0) { throw "Script reference missing in index.html: $script" }
    if ($idx -lt $lastIndex) { throw "Script load order invalid around: $script" }
    $lastIndex = $idx
}

Write-Host "[predeploy] OK"
