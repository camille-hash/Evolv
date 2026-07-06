$base = 'https://evolv-kappa.vercel.app'
$paths = @(
  '/operations',
  '/operations/contracts',
  '/operations/revenue',
  '/operations/integrity',
  '/api/operations/workbench',
  '/api/operations/contracts',
  '/api/operations/revenue',
  '/api/master-data-integrity/contracts',
  '/api/contracts',
  '/api/contracts/test'
)
$results = foreach ($p in $paths) {
  try {
    $r = Invoke-WebRequest -Uri ($base + $p) -MaximumRedirection 0 -ErrorAction Stop
    [pscustomobject]@{ path = $p; status = [int]$r.StatusCode; location = $r.Headers.Location; length = $r.Content.Length }
  }
  catch {
    $resp = $_.Exception.Response
    if ($resp) {
      [pscustomobject]@{ path = $p; status = [int]$resp.StatusCode; location = $resp.Headers.Location; length = $null }
    }
    else {
      [pscustomobject]@{ path = $p; status = 'ERR'; location = $null; length = $null; message = $_.Exception.Message }
    }
  }
}
$results | ConvertTo-Json -Depth 3
