$ErrorActionPreference = "SilentlyContinue"

Write-Output "=== VIDEO METADATA (unit_2_activity_5.mp4) ==="
$shell = New-Object -ComObject Shell.Application
$folder = $shell.Namespace('C:\Users\jesus\Documents\Codex\2026-06-23\m\outputs\lectura-reino\assets\videos')
$file = $folder.ParseName('unit_2_activity_5.mp4')
if ($file) {
  foreach ($i in 0..320) {
    $name = $folder.GetDetailsOf($null, $i)
    if ($name) {
      $val = $folder.GetDetailsOf($file, $i)
      if ($val) {
        Write-Output ("[{0}] {1} => {2}" -f $i, $name, $val)
      }
    }
  }
} else {
  Write-Output "File not found"
}

Write-Output ""
Write-Output "=== OPTION AUDIO FILES (unit_2_sounds/theme1) ==="
$audioDir = 'C:\Users\jesus\Documents\Codex\2026-06-23\m\outputs\lectura-reino\assets\unit_2_sounds\theme1'
Get-ChildItem -Path $audioDir -Filter *.mp3 | Sort-Object Name | ForEach-Object {
  $len = $_.Length
  Write-Output ("{0}  =>  {1:N2} KB" -f $_.Name, ($len / 1KB))
}

Write-Output ""
Write-Output "=== CORRECT SOUNDS (correct_sounds2) ==="
Get-ChildItem -Path 'C:\Users\jesus\Documents\Codex\2026-06-23\m\outputs\lectura-reino\assets\correct_sounds2' -Filter *.mp3 | Sort-Object Name | ForEach-Object {
  Write-Output ("{0}  =>  {1:N2} KB" -f $_.Name, ($_.Length / 1KB))
}

