$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = $PSScriptRoot
$packages = @('ownai-design', 'ownai-design-free', 'ownai-design-oauth')

foreach ($pkg in $packages) {
    $srcDir = Join-Path $root $pkg
    $zipPath = Join-Path $root ("$pkg.zip")
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }

    $zipStream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::CreateNew)
    try {
        $archive = New-Object System.IO.Compression.ZipArchive($zipStream, [System.IO.Compression.ZipArchiveMode]::Create, $false)
        try {
            $files = Get-ChildItem -Path $srcDir -Recurse -File
            foreach ($f in $files) {
                $relPath = $f.FullName.Substring($srcDir.Length).TrimStart('\', '/') -replace '\\', '/'
                [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                    $archive,
                    $f.FullName,
                    $relPath,
                    [System.IO.Compression.CompressionLevel]::Optimal
                ) | Out-Null
            }
        } finally {
            $archive.Dispose()
        }
    } finally {
        $zipStream.Dispose()
    }

    $info = Get-Item $zipPath
    Write-Output ("Packed {0} ({1} bytes)" -f $info.FullName, $info.Length)
}
