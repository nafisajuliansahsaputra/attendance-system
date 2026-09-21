param(
  [Parameter(Mandatory = $true)]
  [string]$PortName,

  [int]$BaudRate = 9600,

  [string]$BridgeUrl = "http://127.0.0.1:8765"
)

$ErrorActionPreference = "Stop"
$serial = New-Object System.IO.Ports.SerialPort
$serial.PortName = $PortName
$serial.BaudRate = $BaudRate
$serial.Parity = [System.IO.Ports.Parity]::None
$serial.DataBits = 8
$serial.StopBits = [System.IO.Ports.StopBits]::One
$serial.Handshake = [System.IO.Ports.Handshake]::None
$serial.NewLine = [Environment]::NewLine
$serial.ReadTimeout = 1000

try {
  $serial.Open()
  Write-Host "RFID serial adapter active on $PortName @ $BaudRate baud."
  Write-Host "Forwarding UID lines to $BridgeUrl/scan"
  Write-Host "Press Ctrl+C to stop."

  while ($true) {
    try {
      $line = $serial.ReadLine().Trim()
      if ([string]::IsNullOrWhiteSpace($line)) {
        continue
      }

      $uid = ($line -replace '^(?i)RFID\s*[:=]\s*', '').Trim()
      if ([string]::IsNullOrWhiteSpace($uid)) {
        continue
      }

      $payload = @{
        rfidUid = $uid
        source = "windows-serial:$PortName"
      } | ConvertTo-Json -Compress

      try {
        $result = Invoke-RestMethod -Uri "$BridgeUrl/scan" -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 15

        if ($result.ok) {
          Write-Host "RFID -> $uid"
        }
      }
      catch {
        Write-Warning "Bridge rejected RFID '$uid': $($_.Exception.Message)"
      }
    }
    catch [System.TimeoutException] {
      continue
    }
  }
}
finally {
  if ($serial.IsOpen) {
    $serial.Close()
  }
  $serial.Dispose()
}
