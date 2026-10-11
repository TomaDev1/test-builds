# Test builds

Early builds of a Windows app for building, checking and pushing Cisco switch and router configs. It checks configs against DISA STIGs as you edit, keeps backups, and sends only the changed lines when you push to a switch. These builds are for invited testers, so expect rough edges.

Download the latest build from **[Releases](../../releases)**. There's a tour of what's in it at **[tomadev1.github.io/test-builds](https://tomadev1.github.io/test-builds/)**.

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

Reply to whoever sent you the invitation. Anything that surprised you is useful: a check that's wrong for your config, a screen you couldn't figure out, a crash, or a step that took longer than doing it by hand. Results from real switches help most, ideally a lab switch first. Please include the version number (shown on the sign-in screen) and what you were doing.
