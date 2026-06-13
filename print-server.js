// ============================================
// Xprinter XP-B6 Local Print Server - My Restaurant POS
// v1.7 — PowerShell Raw Spooler API (Windows Native)
// ============================================
// Run: node print-server.js
// Open POS: http://localhost:6789
// ============================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile, exec } = require('child_process');
const app = express();
const PORT = 6789;

app.use(cors({ origin: '*' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '1mb' }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const WIN_PRINTER_NAME = 'Xprinter XP-B6';

// ----------------------------
// Load usb (fallback only)
// ----------------------------
let usb, getDeviceList;
try {
  usb = require('usb');
  if (typeof usb.getDeviceList === 'function') {
    getDeviceList = () => usb.getDeviceList();
    console.log('[OK] usb v1 loaded (fallback)');
  } else if (usb.usb && typeof usb.usb.getDeviceList === 'function') {
    getDeviceList = () => usb.usb.getDeviceList();
    console.log('[OK] usb v2 loaded (fallback)');
  }
} catch (e) {
  console.warn('[WARN] usb:', e.message);
}

const KNOWN_VENDORS = [0x0483, 0x0416, 0x6868, 0x1FC9, 0x4B43, 0x0DD4, 0x0519, 0x20D1, 0x0456];

// ============================================
// PING
// ============================================
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', printer: 'Xprinter XP-B6', version: '1.7.0' });
});

// ============================================
// STATUS
// ============================================
app.get('/status', (req, res) => {
  res.json({ status: 'ok', printerName: WIN_PRINTER_NAME, method: 'PowerShell-RawSpooler' });
});

// ============================================
// PRINT
// ============================================
app.post('/print', async (req, res) => {
  const data = req.body;
  console.log('[PRINT] Job received, size:', data.length, 'bytes');

  // METHOD 1: PowerShell Raw Spooler API (most reliable on Windows)
  try {
    await printViaPowerShell(data);
    console.log('[PRINT] Printed via PowerShell Raw Spooler');
    return res.json({ status: 'printed', method: 'powershell-raw-spooler' });
  } catch (e) {
    console.log('[PRINT] PowerShell failed:', e.message);
  }

  // METHOD 2: Raw node-usb fallback
  if (getDeviceList) {
    try {
      await printViaRawUSB(data);
      console.log('[PRINT] Printed via raw USB');
      return res.json({ status: 'printed', method: 'raw-usb' });
    } catch (e) {
      console.log('[PRINT] Raw USB failed:', e.message);
    }
  }

  res.status(500).json({ error: 'All print methods failed. Check Xprinter XP-B6 is ON and USB connected.' });
});

// ============================================
// METHOD 1: PowerShell Raw Spooler API
// Uses Win32 OpenPrinter/WritePrinter to send
// raw ESC/POS bytes via Windows print spooler
// ============================================
async function printViaPowerShell(data) {
  return new Promise((resolve, reject) => {
    // Write ESC/POS data to a temp binary file
    const tmpFile = path.join(os.tmpdir(), 'xpb6_' + Date.now() + '.bin').replace(/\\/g, '\\\\');
    const printerName = WIN_PRINTER_NAME.replace(/'/g, "\\'");

    fs.writeFile(tmpFile.replace(/\\\\/g, '\\'), data, (writeErr) => {
      if (writeErr) return reject(writeErr);

      // PowerShell script using Win32 API to send raw bytes to printer
      const psScript = `
$printerName = '${printerName}'
$filePath = '${tmpFile}'
$bytes = [System.IO.File]::ReadAllBytes($filePath)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class RawPrint {
    [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
    public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
    public static extern int StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFO pDocInfo);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Auto)]
    public struct DOCINFO {
        [MarshalAs(UnmanagedType.LPTStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPTStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPTStr)] public string pDataType;
    }
}
"@

$hPrinter = [IntPtr]::Zero
if (-not [RawPrint]::OpenPrinter($printerName, [ref]$hPrinter, [IntPtr]::Zero)) {
    Write-Error "OpenPrinter failed"
    exit 1
}

$docInfo = New-Object RawPrint+DOCINFO
$docInfo.pDocName = "ESC/POS Receipt"
$docInfo.pOutputFile = $null
$docInfo.pDataType = "RAW"

$docId = [RawPrint]::StartDocPrinter($hPrinter, 1, [ref]$docInfo)
if ($docId -le 0) { [RawPrint]::ClosePrinter($hPrinter); Write-Error "StartDocPrinter failed"; exit 1 }

[RawPrint]::StartPagePrinter($hPrinter) | Out-Null
$written = 0
$result = [RawPrint]::WritePrinter($hPrinter, $bytes, $bytes.Length, [ref]$written)
[RawPrint]::EndPagePrinter($hPrinter) | Out-Null
[RawPrint]::EndDocPrinter($hPrinter) | Out-Null
[RawPrint]::ClosePrinter($hPrinter) | Out-Null

Remove-Item -Path $filePath -Force -ErrorAction SilentlyContinue

if ($result -and $written -eq $bytes.Length) {
    Write-Output "OK:$written"
} else {
    Write-Error "WritePrinter failed or incomplete"
    exit 1
}
`;

      execFile('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-Command', psScript
      ], { timeout: 15000 }, (err, stdout, stderr) => {
        // Clean up temp file
        try { fs.unlinkSync(tmpFile.replace(/\\\\/g, '\\')); } catch(_) {}

        if (err) {
          return reject(new Error(stderr || err.message));
        }
        if (stdout && stdout.includes('OK:')) {
          resolve(true);
        } else {
          reject(new Error(stderr || 'PowerShell print failed: ' + stdout));
        }
      });
    });
  });
}

// ============================================
// METHOD 2: Raw node-usb fallback
// ============================================
async function printViaRawUSB(data) {
  return new Promise((resolve, reject) => {
    try {
      const devices = getDeviceList();
      const printer = devices.find(d => KNOWN_VENDORS.includes(d.deviceDescriptor.idVendor));
      if (!printer) return reject(new Error('Printer not found in USB device list'));
      printer.open();
      let iface = null;
      for (let i = 0; i < printer.interfaces.length; i++) {
        try { printer.claimInterface(i); iface = printer.interfaces[i]; break; } catch(e) { continue; }
      }
      if (!iface) { try { printer.close(); } catch(_) {} return reject(new Error('Could not claim interface')); }
      const endpoint = iface.endpoints.find(e => e.direction === 'out');
      if (!endpoint) { try { printer.close(); } catch(_) {} return reject(new Error('No OUT endpoint')); }
      endpoint.transfer(data, (err) => {
        try { printer.close(); } catch(_) {}
        if (err) reject(err); else resolve(true);
      });
    } catch(e) { reject(e); }
  });
}

// ============================================
// LIST DEVICES
// ============================================
app.get('/devices', (req, res) => {
  const result = { devices: [] };
  if (getDeviceList) {
    try {
      result.devices = getDeviceList().map(d => ({
        vid: '0x' + d.deviceDescriptor.idVendor.toString(16).toUpperCase(),
        pid: '0x' + d.deviceDescriptor.idProduct.toString(16).toUpperCase(),
        isKnownPrinter: KNOWN_VENDORS.includes(d.deviceDescriptor.idVendor)
      }));
    } catch(e) { result.error = e.message; }
  }
  res.json(result);
});

// ============================================
// Start server
// ============================================
app.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('========================================');
  console.log('  Xprinter XP-B6 Print Server v1.7');
  console.log('  My Restaurant POS');
  console.log('  Listening on http://localhost:' + PORT);
  console.log('========================================');
  console.log('');
  console.log('  Open POS : http://localhost:' + PORT + '/restaurant_pos_v2_escpos_storage.html');
  console.log('  Printer  : ' + WIN_PRINTER_NAME);
  console.log('  Method   : PowerShell Raw Spooler API');
  console.log('');
});
