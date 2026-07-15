# Auto-cleanup for Claude Code pasted-image temp files.
# These accumulate in %TEMP% every time an image is pasted into the Claude Code prompt.
# Deletes claude_img_*.png older than 1 day so the folder never piles up.
$temp = $env:TEMP
Get-ChildItem -Path $temp -Filter 'claude_img_*.png' -File -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-1) } |
    Remove-Item -Force -ErrorAction SilentlyContinue
