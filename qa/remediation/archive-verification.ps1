param([switch]$PlanOnly)
$ErrorActionPreference = 'Stop'
$auditRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
Set-Location -LiteralPath $auditRoot
Add-Type -AssemblyName System.IO.Compression.FileSystem
function Get-StreamSHA256($stream) {
  $algorithm = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-','').ToLowerInvariant() }
  finally { $algorithm.Dispose() }
}
function Get-CompleteArchiveExpectedFiles {
  # Independent, explicit expansion of scripts/package.mjs. Every file from
  # each source glob and each generated-site destination must appear exactly
  # once: checking only entries already present cannot detect omissions.
  $packageSource = [IO.File]::ReadAllText((Join-Path $auditRoot 'scripts/package.mjs'))
  $recipeFragments = @'
for(const dir of ['src','dist','upstream','assets/bootstrap-icons','qa'])archive.glob('**/*',{cwd:dir,dot:true,ignore:['**/*.tmp','**/.cache/**',...(dir==='qa'?['results/package-portability.json']:[])]},{prefix:'tq-bootstrap/'+dir});
for(const file of ['package.json','package-lock.json','README.md','LICENSE','THIRD-PARTY-NOTICES.md','docs/INTEGRATION.md',...files('scripts')])archive.file(file,{name:'tq-bootstrap/'+file});
archive.glob('**/*',{cwd:'docs-source',dot:true,ignore:['node_modules/**','**/node_modules/**','site/public/**','site/.astro/**','site/dist/**','**/.cache/**','**/.DS_Store','build-docs.log','tq-customize.mjs']},{prefix:'tq-bootstrap/docs-source'});
archive.glob('**/*',{cwd:'docs-source/site/dist',dot:true},{prefix:'tq-bootstrap'});
'@
  foreach ($fragment in @($recipeFragments -split '\r?\n' | Where-Object { $_.Length })) {
    if (!$packageSource.Contains($fragment)) { throw 'Complete-archive recipe changed; independently review the expected inventory before packaging' }
  }
  $expected = [Collections.Generic.Dictionary[string,string]]::new([StringComparer]::Ordinal)
  $add = {
    param([string]$entry,[string]$source)
    if ($expected.ContainsKey($entry)) { throw ('Package recipe would create a duplicate entry: ' + $entry) }
    $expected.Add($entry,$source)
  }
  foreach ($directory in @('src','dist','upstream','assets/bootstrap-icons','qa')) {
    $directoryRoot = Join-Path $auditRoot $directory
    foreach ($item in Get-ChildItem -LiteralPath $directoryRoot -Recurse -File -Force) {
      $relative = $item.FullName.Substring($auditRoot.Length + 1).Replace('\','/')
      $within = $relative.Substring($directory.Length + 1)
      if ($within -cmatch '\.tmp$|(^|/)\.cache/' -or ($directory -eq 'qa' -and $within -ceq 'results/package-portability.json')) { continue }
      & $add ('tq-bootstrap/' + $relative) $relative
    }
  }
  $rootFiles = @('package.json','package-lock.json','README.md','LICENSE','THIRD-PARTY-NOTICES.md','docs/INTEGRATION.md') + @(Get-ChildItem -LiteralPath (Join-Path $auditRoot 'scripts') -Recurse -File -Force | ForEach-Object { $_.FullName.Substring($auditRoot.Length + 1).Replace('\','/') })
  foreach ($relative in $rootFiles) {
    if (!(Test-Path -LiteralPath (Join-Path $auditRoot $relative) -PathType Leaf)) { throw ('Missing package recipe source: ' + $relative) }
    & $add ('tq-bootstrap/' + $relative) $relative
  }
  foreach ($item in Get-ChildItem -LiteralPath (Join-Path $auditRoot 'docs-source') -Recurse -File -Force) {
    $relative = $item.FullName.Substring($auditRoot.Length + 1).Replace('\','/')
    $within = $relative.Substring('docs-source/'.Length)
    if ($within -cmatch '(^|/)(node_modules|\.cache)/|^site/(public|\.astro|dist)/|(^|/)\.DS_Store$' -or $within -ceq 'build-docs.log' -or $within -ceq 'tq-customize.mjs') { continue }
    & $add ('tq-bootstrap/' + $relative) $relative
  }
  foreach ($item in Get-ChildItem -LiteralPath (Join-Path $auditRoot 'docs-source/site/dist') -Recurse -File -Force) {
    $source = $item.FullName.Substring($auditRoot.Length + 1).Replace('\','/')
    $destination = $source.Substring('docs-source/site/dist/'.Length)
    & $add ('tq-bootstrap/' + $destination) $source
  }
  return ,$expected
}
$completeExpectedFiles = Get-CompleteArchiveExpectedFiles
$completeExpectedNames = [string[]]@($completeExpectedFiles.Keys)
[Array]::Sort($completeExpectedNames,[StringComparer]::Ordinal)
$inventoryStream = [IO.MemoryStream]::new([Text.Encoding]::UTF8.GetBytes(([string]::Join("`n",$completeExpectedNames) + "`n")))
try { $completeInventoryHash = Get-StreamSHA256 $inventoryStream } finally { $inventoryStream.Dispose() }
$completePlan = [ordered]@{
  expectedFiles=$completeExpectedNames.Count
  expectedEntryInventorySHA256=$completeInventoryHash
  packageRecipeSHA256=(Get-FileHash -LiteralPath 'scripts/package.mjs' -Algorithm SHA256).Hash.ToLowerInvariant()
  plannerSHA256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant()
  generatedWebsiteFiles=@($completeExpectedFiles.Values | Where-Object { $_.StartsWith('docs-source/site/dist/',[StringComparison]::Ordinal) }).Count
  generatedHTMLPages=@($completeExpectedFiles.Values | Where-Object { $_.StartsWith('docs-source/site/dist/',[StringComparison]::Ordinal) -and $_.EndsWith('.html',[StringComparison]::Ordinal) }).Count
  frameworkCSSDistributions=@($completeExpectedNames | Where-Object { $_ -cmatch '^tq-bootstrap/dist/css/[^/]+\.css$' }).Count
  rootIndexIncluded=$completeExpectedFiles.ContainsKey('tq-bootstrap/index.html')
  bootstrapMinCSSIncluded=$completeExpectedFiles.ContainsKey('tq-bootstrap/dist/css/bootstrap.min.css')
  publishedMinCSSIncluded=$completeExpectedFiles.ContainsKey('tq-bootstrap/docs/5.3/dist/css/bootstrap.min.css')
}
if ($PlanOnly) { $completePlan | ConvertTo-Json -Depth 5; return }
$downloads = Get-Content -Raw -LiteralPath 'release/downloads.json' | ConvertFrom-Json
$checksums = Get-Content -Raw -LiteralPath 'release/checksums.json' | ConvertFrom-Json
$sourceManifest = Get-Content -Raw -LiteralPath 'qa/remediation-source/manifest.json' | ConvertFrom-Json
$baselineEvidence = Get-Content -Raw -LiteralPath 'qa/remediation-source/baseline-evidence.json' | ConvertFrom-Json
$companions = @('tq-accessibility.js','tq-accessibility.js.map','tq-accessibility.min.js','tq-accessibility.min.js.map','tq-accessibility.esm.js','tq-accessibility.esm.js.map')
$definitions = @(
  @{ name='tq-bootstrap-1.0.0.zip'; prefix='tq-bootstrap'; kind='complete' },
  @{ name='tq-bootstrap-1.0.0-dist.zip'; prefix='tq-bootstrap-dist'; kind='dist' },
  @{ name='tq-bootstrap-1.0.0-source.zip'; prefix='tq-bootstrap-source'; kind='source' },
  @{ name='tq-bootstrap-1.0.0-examples.zip'; prefix='tq-bootstrap-examples'; kind='examples' }
)
$archiveReport = [ordered]@{ started=[DateTime]::UtcNow.ToString('o'); completeExpectedInventory=$completePlan; archives=@() }
foreach ($definition in $definitions) {
  $archiveName=$definition.name; $prefix=$definition.prefix
  $archivePath = Join-Path $auditRoot ('release/' + $archiveName)
  $archiveHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  $download = @($downloads.downloads | Where-Object { $_.file -eq $archiveName })
  $expectedHash = if ($definition.kind -eq 'complete') {
    @($checksums.outputs | Where-Object { $_.file -eq ('release/' + $archiveName) })[0].sha256
  } elseif ($download.Count -eq 1) { $download[0].sha256 } else { $null }
  $zip = [IO.Compression.ZipFile]::OpenRead($archivePath)
  try {
    $duplicates = @($zip.Entries | Group-Object FullName | Where-Object Count -gt 1 | ForEach-Object { $_.Name })
    $unsafe=@(); $wrongPrefixes=@(); $mismatches=@(); $notWorkspaceFiles=@(); $generatedFiles=@(); $missingRequired=@(); $inventoryDifferences=@()
    $files=0; $byteCompared=0
    $entryNames = @($zip.Entries | Where-Object { !$_.FullName.EndsWith('/') } | ForEach-Object { $_.FullName.Replace('\','/') })
    if ($definition.kind -eq 'complete') {
      $inventoryDifferences += @(Compare-Object -ReferenceObject $completeExpectedNames -DifferenceObject $entryNames -CaseSensitive | ForEach-Object { $_.SideIndicator + ' ' + $_.InputObject })
    } else {
      if ($download.Count -ne 1) { $inventoryDifferences += 'Missing or duplicate independent download inventory' }
      else {
        $expectedNames = @($download[0].entries | ForEach-Object { $_.name })
        $inventoryDifferences += @(Compare-Object -ReferenceObject $expectedNames -DifferenceObject $entryNames -CaseSensitive | ForEach-Object { $_.SideIndicator + ' ' + $_.InputObject })
      }
    }
    foreach ($entry in $zip.Entries) {
      $entryName = $entry.FullName.Replace('\','/')
      if ($entryName -match '(^/|(^|/)\.\.(/|$)|^[a-zA-Z]:)' -or $entryName.Contains(':')) { $unsafe += $entryName; continue }
      if (!$entryName.StartsWith($prefix + '/',[StringComparison]::Ordinal)) { $wrongPrefixes += $entryName; continue }
      if ($entryName.EndsWith('/')) { continue }
      $files++
      $relative = $entryName.Substring($prefix.Length + 1)
      $stream = $entry.Open()
      try { $entryHash = Get-StreamSHA256 $stream }
      finally { $stream.Dispose() }
      if ($definition.kind -ne 'complete' -and $relative -eq 'README.txt') {
        $readme = @($download[0].entries | Where-Object { $_.name -eq $entryName })
        if ($readme.Count -eq 1 -and $readme[0].sha256 -eq $entryHash -and $readme[0].bytes -eq $entry.Length) {
          $generatedFiles += [ordered]@{ entry=$entryName; bytes=$entry.Length; sha256=$entryHash; evidence='release/downloads.json generated README entry' }
        } else { $mismatches += [ordered]@{ entry=$entryName; reason='Generated README differs from exact download inventory'; zipSHA256=$entryHash } }
        continue
      }
      $compareTarget = $relative
      if ($definition.kind -eq 'complete' -and $completeExpectedFiles.ContainsKey($entryName)) { $compareTarget=$completeExpectedFiles[$entryName] }
      if ($definition.kind -eq 'dist' -and ($relative.StartsWith('css/') -or $relative.StartsWith('js/') -or $relative.StartsWith('tq/'))) { $compareTarget='dist/' + $relative }
      if ($definition.kind -eq 'examples' -and $relative.StartsWith('source/examples/')) { $compareTarget='docs-source/site/src/assets/examples/' + $relative.Substring('source/examples/'.Length) }
      $localTarget = [IO.Path]::GetFullPath((Join-Path $auditRoot $compareTarget))
      if (!$localTarget.StartsWith($auditRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { $unsafe += $entryName; continue }
      if (!(Test-Path -LiteralPath $localTarget -PathType Leaf)) { $notWorkspaceFiles += $entryName; continue }
      $localHash = (Get-FileHash -LiteralPath $localTarget -Algorithm SHA256).Hash.ToLowerInvariant()
      $byteCompared++
      if ($entryHash -ne $localHash) { $mismatches += [ordered]@{ entry=$entryName; target=$compareTarget; zipSHA256=$entryHash; currentSHA256=$localHash } }
    }
    $required = switch ($definition.kind) {
      'dist' { @('README.txt','css/bootstrap.min.css','js/bootstrap.bundle.min.js') + @($companions | ForEach-Object { 'tq/' + $_ }) }
      'source' { @('README.txt','src/js/tq-accessibility.js','scripts/build.mjs','docs-source/build-tq-docs.mjs') }
      'examples' { @('README.txt','docs/5.3/examples/carousel/index.html','docs/5.3/dist/js/bootstrap.bundle.min.js') + @($companions | ForEach-Object { 'docs/5.3/dist/tq/' + $_ }) }
      'complete' {
        @('src/js/tq-accessibility.js','qa/remediation/acceptance.mjs','qa/remediation/source-proof.mjs','qa/remediation/archive-verification.ps1','qa/package-portability.mjs','qa/remediation-source/manifest.json','qa/remediation-source/baseline-evidence.json','qa/remediation-source/docs/edit-manifest.json') +
        @($companions | ForEach-Object { 'dist/tq/' + $_; 'docs/5.3/dist/tq/' + $_ }) +
        @($checksums.evidence | ForEach-Object { $_.file }) +
        @($sourceManifest.files | Where-Object { $_.beforeFile } | ForEach-Object { $_.beforeFile }) +
        @($sourceManifest.files | Where-Object { $_.status -ne 'removed' -and $_.afterSHA256 } | ForEach-Object { $_.file }) +
        @($baselineEvidence.entries | ForEach-Object { $_.file })
      }
    }
    foreach ($requiredFile in @($required | Sort-Object -Unique)) { if ($entryNames -cnotcontains ($prefix + '/' + $requiredFile)) { $missingRequired += $requiredFile } }
    $nestedZIPs = @($entryNames | Where-Object { $_ -match '\.zip$' })
    $allowedNested = if ($definition.kind -eq 'complete') { @($downloads.downloads | ForEach-Object { $prefix + '/release/' + $_.file }) } else { @() }
    $unexpectedNested = @($nestedZIPs | Where-Object { $allowedNested -cnotcontains $_ })
    if ($definition.kind -eq 'complete') { foreach ($nested in $allowedNested) { if ($nestedZIPs -cnotcontains $nested) { $missingRequired += $nested.Substring($prefix.Length + 1) } } }
    $archiveReport.archives += [ordered]@{
      archive=$archiveName; expectedRoot=$prefix; sha256=$archiveHash; expectedSHA256=$expectedHash; archiveHashMatches=($expectedHash -eq $archiveHash)
      entries=$zip.Entries.Count; files=$files; compared=$byteCompared; generatedFilesVerified=$generatedFiles
      duplicates=$duplicates; unsafe=$unsafe; wrongPrefixes=$wrongPrefixes; mismatches=$mismatches; archiveOnlyFiles=$notWorkspaceFiles
      missingRequired=$missingRequired; inventoryDifferences=$inventoryDifferences; nestedZIPs=$nestedZIPs; unexpectedNestedZIPs=$unexpectedNested
      forbiddenBrightspace=@($entryNames | Where-Object { $_ -match 'brightspace.*\.zip$' })
    }
  } finally { $zip.Dispose() }
}
$archiveReport.finished = [DateTime]::UtcNow.ToString('o')
$archiveReport | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath 'release/archive-verification.json'
if (@($archiveReport.archives | Where-Object { !$_.archiveHashMatches -or $_.duplicates.Count -or $_.unsafe.Count -or $_.wrongPrefixes.Count -or $_.mismatches.Count -or $_.archiveOnlyFiles.Count -or $_.missingRequired.Count -or $_.inventoryDifferences.Count -or $_.unexpectedNestedZIPs.Count -or $_.forbiddenBrightspace.Count }).Count) { throw 'Archive verification failed' }
$archiveReport.archives | Select-Object archive,entries,files,compared,@{N='Generated';E={$_.generatedFilesVerified.Count}},@{N='Duplicates';E={$_.duplicates.Count}},@{N='Mismatches';E={$_.mismatches.Count}},@{N='Missing';E={$_.missingRequired.Count}},@{N='Unexpected';E={$_.archiveOnlyFiles.Count + $_.unexpectedNestedZIPs.Count}} | Format-Table -AutoSize
