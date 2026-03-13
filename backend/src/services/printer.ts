/**
 * Label printer abstraction service.
 *
 * Supports two transport types:
 *   - "tcp"  — raw socket to port 9100 (Zebra LP2844, GK420t, ZD420, etc.)
 *   - "http" — HTTP POST to a print server URL (some Brother/Citizen setups)
 *
 * Printer configuration is read from the PRINTERS_CONFIG environment variable,
 * which must be a JSON array:
 *
 *   [
 *     {
 *       "id": "zebra-sofia",
 *       "name": "Lab Printer — Sofia",
 *       "type": "tcp",
 *       "host": "192.168.1.100",
 *       "port": 9100
 *     },
 *     {
 *       "id": "brother-munich",
 *       "name": "Label Printer — Munich",
 *       "type": "http",
 *       "url": "http://192.168.2.50:8080/print"
 *     }
 *   ]
 *
 * If PRINTERS_CONFIG is not set, an empty list is returned and print calls fail.
 */

import net from "net";
import https from "https";
import http from "http";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TcpPrinterConfig = {
  id: string;
  name: string;
  type: "tcp";
  host: string;
  port: number;
};

export type HttpPrinterConfig = {
  id: string;
  name: string;
  type: "http";
  /** Full URL, e.g. http://192.168.1.200:8080/print */
  url: string;
};

export type PrinterConfig = TcpPrinterConfig | HttpPrinterConfig;

// ─── Config loading ───────────────────────────────────────────────────────────

let _printers: PrinterConfig[] | null = null;

export function getPrinters(): PrinterConfig[] {
  if (_printers !== null) return _printers;

  const raw = process.env.PRINTERS_CONFIG;
  if (!raw) {
    _printers = [];
    return _printers;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("PRINTERS_CONFIG must be a JSON array");
    _printers = parsed as PrinterConfig[];
  } catch (err) {
    console.error("Failed to parse PRINTERS_CONFIG:", err);
    _printers = [];
  }

  return _printers;
}

export function getPrinterById(id: string): PrinterConfig | undefined {
  return getPrinters().find((p) => p.id === id);
}

// ─── Print transport ──────────────────────────────────────────────────────────

/**
 * Send raw ZPL to a printer.
 * Resolves on success, rejects with an Error on failure.
 */
export async function sendToPrinter(zpl: string, printerId: string): Promise<void> {
  const printer = getPrinterById(printerId);
  if (!printer) {
    throw new Error(`Printer not found: ${printerId}`);
  }

  if (printer.type === "tcp") {
    return sendViaTcp(zpl, printer);
  } else {
    return sendViaHttp(zpl, printer);
  }
}

// ── TCP (raw socket) ─────────────────────────────────────────────────────────

function sendViaTcp(zpl: string, printer: TcpPrinterConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = 10_000; // 10 s

    socket.setTimeout(timeout);

    socket.connect(printer.port, printer.host, () => {
      socket.write(zpl, "utf8", (err) => {
        if (err) {
          socket.destroy();
          return reject(new Error(`TCP write failed: ${err.message}`));
        }
        socket.end();
      });
    });

    socket.on("close", () => resolve());

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error(`TCP connection to ${printer.host}:${printer.port} timed out`));
    });

    socket.on("error", (err) => {
      socket.destroy();
      reject(new Error(`TCP error (${printer.host}:${printer.port}): ${err.message}`));
    });
  });
}

// ── HTTP ─────────────────────────────────────────────────────────────────────

function sendViaHttp(zpl: string, printer: HttpPrinterConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(zpl, "utf8");
    const url = new URL(printer.url);
    const isHttps = url.protocol === "https:";
    const transport = isHttps ? https : http;

    const options: http.RequestOptions = {
      method: "POST",
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/vnd.zpl",
        "Content-Length": body.length,
      },
      timeout: 10_000,
    };

    const req = transport.request(options, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`Print server returned HTTP ${res.statusCode}`));
      } else {
        resolve();
      }
      res.resume(); // discard response body
    });

    req.on("error", (err) => reject(new Error(`HTTP print error: ${err.message}`)));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`HTTP print request to ${printer.url} timed out`));
    });

    req.write(body);
    req.end();
  });
}
