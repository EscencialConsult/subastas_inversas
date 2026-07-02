$controllersPath = "c:\Users\santi\Desktop\subastas_inversas\backend\src\SICST.Api\Controllers"
$files = Get-ChildItem -Path $controllersPath -Filter *.cs

foreach ($file in $files) {
    $content = Get-Content -Raw -Path $file.FullName
    $modified = $false
    
    # Update Auctions
    if ($content -match 'using SICST\.Application\.Auctions') {
        $content = $content -replace 'using SICST\.Application\.Auctions', 'using SICST.Application.Modules.Auctions'
        $modified = $true
    }
    
    # Update Purchases
    if ($content -match 'using SICST\.Application\.Purchases') {
        $content = $content -replace 'using SICST\.Application\.Purchases', 'using SICST.Application.Modules.Purchases'
        $modified = $true
    }
    
    # Update Suppliers
    if ($content -match 'using SICST\.Application\.Suppliers') {
        $content = $content -replace 'using SICST\.Application\.Suppliers', 'using SICST.Application.Modules.Suppliers'
        $modified = $true
    }
    
    # Update Configuration
    if ($content -match 'using SICST\.Application\.Configuration') {
        $content = $content -replace 'using SICST\.Application\.Configuration', 'using SICST.Application.Modules.Configuration'
        $modified = $true
    }

    # Update Audit
    if ($content -match 'using SICST\.Application\.Audit') {
        $content = $content -replace 'using SICST\.Application\.Audit', 'using SICST.Application.Modules.Audit'
        $modified = $true
    }

    # Update Users to Identity.Users
    if ($content -match 'using SICST\.Application\.Users') {
        $content = $content -replace 'using SICST\.Application\.Users', 'using SICST.Application.Modules.Identity.Users'
        $modified = $true
    }

    # Update Auth to Identity.Auth
    if ($content -match 'using SICST\.Application\.Auth') {
        $content = $content -replace 'using SICST\.Application\.Auth', 'using SICST.Application.Modules.Identity.Auth'
        $modified = $true
    }

    # Update Companies to Identity.Companies
    if ($content -match 'using SICST\.Application\.Companies') {
        $content = $content -replace 'using SICST\.Application\.Companies', 'using SICST.Application.Modules.Identity.Companies'
        $modified = $true
    }
    
    if ($modified) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Fixed usings in $($file.Name)"
    }
}
