# Test builds

Test releases of a Windows tool for configuring Cisco switches and routers, checking them against DISA STIGs, and keeping backups. These are pre-release builds for invited testers.

Download the latest build from **[Releases](../../releases)**.

## Which file do I want?

| File | What it is |
| --- | --- |
| `SwitchForge-<version>-setup.exe` | Installer. Start here if you're not sure. |
| `SwitchForge-<version>-win-x64.exe` | The same app as one portable exe. Nothing to install. |
| `SwitchForge-<version>-sbom.cdx.json` | Software bill of materials (CycloneDX), for your security review. |
| `SHA256SUMS.txt` | SHA-256 checksums of the files above. |

Windows 10 or 11, 64-bit. No other software is needed.

## Installing

1. **Check the download (optional).** In PowerShell run `Get-FileHash .\SwitchForge-<version>-setup.exe` and compare the result with the line in `SHA256SUMS.txt`.
2. **Get past SmartScreen.** Test builds aren't code-signed yet, so Windows may say "Windows protected your PC". Click **More info**, then **Run anyway**.
3. **Silent install (optional).** `SwitchForge-<version>-setup.exe /VERYSILENT /SUPPRESSMSGBOXES /NORESTART`

## License file

You need a license file (`.sflic`), sent to you with your invitation. Without one the app opens read-only: you can look around but not change configs or push to switches.

- Load it on the first screen with **Open license file...**, or later in **Settings > License**.
- To license everyone on a PC, an admin can copy it to `%ProgramData%\SwitchForge\license.sflic`.
- The first time, you'll be asked to accept a short tester agreement.

A tester license lasts 30 days. When it runs out the app goes read-only again; your projects and backups stay where they are.

## Your data

Your projects, backups and settings stay on your PC, in `%AppData%\SwitchForge`. The app has no telemetry, and the license is checked offline, so it works on air-gapped networks. The only outside connection is the optional Cisco security advisory lookup on the Versions page, which you turn on with your own Cisco API key.

## Feedback

Report problems through the contact you received your invitation from. Please include the version number (shown on the sign-in screen) and what you were doing.
