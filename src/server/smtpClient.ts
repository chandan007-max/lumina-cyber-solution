/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Native Node.js SMTP Transport
 * Zero external dependencies. Uses Node.js native net & tls sockets.
 */

import net from 'node:net';
import tls from 'node:tls';

export interface SmtpConfig {
  host: string;
  port: number;
  security?: 'TLS' | 'STARTTLS' | 'NONE';
  username: string;
  password?: string;
  senderName?: string;
  senderEmail?: string;
  replyTo?: string;
  timeoutMs?: number;
}

export interface SmtpMailOptions {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: {
    filename: string;
    contentType: string;
    contentBase64?: string;
  }[];
}

export interface SmtpResult {
  success: boolean;
  messageId?: string;
  message?: string;
  errorCode?: string;
}

export class NativeSmtpClient {
  /**
   * Test SMTP server connection and credentials
   */
  static async testConnection(config: SmtpConfig): Promise<SmtpResult> {
    return this.executeSmtpSession(config, null);
  }

  /**
   * Send mail over SMTP
   */
  static async sendMail(config: SmtpConfig, mail: SmtpMailOptions): Promise<SmtpResult> {
    return this.executeSmtpSession(config, mail);
  }

  private static executeSmtpSession(
    config: SmtpConfig,
    mail: SmtpMailOptions | null
  ): Promise<SmtpResult> {
    const timeout = config.timeoutMs || 15000;
    const isDirectTls = config.port === 465 || config.security === 'TLS';

    return new Promise((resolve) => {
      let socket: net.Socket;
      let buffer = '';
      let step = 0;
      let timer: NodeJS.Timeout;

      const finish = (result: SmtpResult) => {
        clearTimeout(timer);
        try {
          if (socket && !socket.destroyed) {
            socket.write('QUIT\r\n');
            socket.end();
            socket.destroy();
          }
        } catch (_) {}
        resolve(result);
      };

      timer = setTimeout(() => {
        finish({
          success: false,
          errorCode: 'CONNECTION_TIMEOUT',
          message: `Connection to SMTP server ${config.host}:${config.port} timed out after ${timeout}ms.`,
        });
      }, timeout);

      try {
        if (isDirectTls) {
          socket = tls.connect({
            host: config.host,
            port: config.port,
            rejectUnauthorized: false,
          });
        } else {
          socket = net.connect({
            host: config.host,
            port: config.port,
          });
        }
      } catch (err: any) {
        return finish({
          success: false,
          errorCode: 'SOCKET_INIT_ERROR',
          message: `Could not initiate socket: ${err.message}`,
        });
      }

      const send = (cmd: string) => {
        if (socket.writable) {
          socket.write(cmd + '\r\n');
        }
      };

      socket.on('error', (err: any) => {
        finish({
          success: false,
          errorCode: 'SOCKET_ERROR',
          message: `SMTP socket error: ${err.message}`,
        });
      });

      socket.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\r\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line) continue;
          const code = parseInt(line.slice(0, 3), 10);
          const isFinal = line.length < 4 || line.charAt(3) !== '-';
          if (!isFinal) continue; // Multiline response waiting for final line

          if (step === 0 && code === 220) {
            // Received greeting
            step = 1;
            send(`EHLO lumina.local`);
          } else if (step === 1 && code === 250) {
            // EHLO accepted
            if (!isDirectTls && config.security === 'STARTTLS') {
              step = 2;
              send('STARTTLS');
            } else if (config.username && config.password) {
              step = 4;
              send('AUTH LOGIN');
            } else if (mail) {
              step = 7;
              send(`MAIL FROM:<${config.senderEmail || config.username}>`);
            } else {
              // Testing complete without auth
              return finish({ success: true, message: 'SMTP server greeted successfully.' });
            }
          } else if (step === 2 && code === 220) {
            // Upgrade socket to TLS
            step = 3;
            socket.removeAllListeners('data');
            const tlsSocket = tls.connect({
              socket,
              host: config.host,
              rejectUnauthorized: false,
            });
            socket = tlsSocket;

            tlsSocket.on('data', (tlsChunk) => {
              buffer += tlsChunk.toString();
              const tlsLines = buffer.split('\r\n');
              buffer = tlsLines.pop() || '';
              for (const tl of tlsLines) {
                if (!tl) continue;
                const c = parseInt(tl.slice(0, 3), 10);
                const fin = tl.length < 4 || tl.charAt(3) !== '-';
                if (!fin) continue;

                if (step === 3 && c === 250) {
                  if (config.username && config.password) {
                    step = 4;
                    send('AUTH LOGIN');
                  } else if (mail) {
                    step = 7;
                    send(`MAIL FROM:<${config.senderEmail || config.username}>`);
                  } else {
                    return finish({ success: true, message: 'TLS connection established successfully.' });
                  }
                } else if (step === 4 && c === 334) {
                  // Username challenge
                  step = 5;
                  send(Buffer.from(config.username).toString('base64'));
                } else if (step === 5 && c === 334) {
                  // Password challenge
                  step = 6;
                  send(Buffer.from(config.password || '').toString('base64'));
                } else if (step === 6 && (c === 235 || c === 250)) {
                  // Auth successful
                  if (!mail) {
                    return finish({ success: true, message: 'SMTP Authentication successful!' });
                  }
                  step = 7;
                  send(`MAIL FROM:<${config.senderEmail || config.username}>`);
                } else if (step === 7 && c === 250) {
                  step = 8;
                  send(`RCPT TO:<${mail!.to}>`);
                } else if (step === 8 && (c === 250 || c === 251)) {
                  step = 9;
                  send('DATA');
                } else if (step === 9 && c === 354) {
                  step = 10;
                  const mime = NativeSmtpClient.buildMimeMessage(config, mail!);
                  socket.write(mime + '\r\n.\r\n');
                } else if (step === 10 && c === 250) {
                  const messageId = `msg_${Date.now()}@lumina.pos`;
                  return finish({
                    success: true,
                    messageId,
                    message: 'Email delivered to SMTP transport server.',
                  });
                } else if (c >= 400) {
                  return finish({
                    success: false,
                    errorCode: `SMTP_${c}`,
                    message: `SMTP error ${c}: ${tl}`,
                  });
                }
              }
            });

            // Re-send EHLO over TLS
            send(`EHLO lumina.local`);
          } else if (step === 4 && code === 334) {
            step = 5;
            send(Buffer.from(config.username).toString('base64'));
          } else if (step === 5 && code === 334) {
            step = 6;
            send(Buffer.from(config.password || '').toString('base64'));
          } else if (step === 6 && (code === 235 || code === 250)) {
            if (!mail) {
              return finish({ success: true, message: 'SMTP Authentication successful!' });
            }
            step = 7;
            send(`MAIL FROM:<${config.senderEmail || config.username}>`);
          } else if (step === 7 && code === 250) {
            step = 8;
            send(`RCPT TO:<${mail!.to}>`);
          } else if (step === 8 && (code === 250 || code === 251)) {
            step = 9;
            send('DATA');
          } else if (step === 9 && code === 354) {
            step = 10;
            const mime = NativeSmtpClient.buildMimeMessage(config, mail!);
            socket.write(mime + '\r\n.\r\n');
          } else if (step === 10 && code === 250) {
            const messageId = `msg_${Date.now()}@lumina.pos`;
            return finish({
              success: true,
              messageId,
              message: 'Email delivered to SMTP transport server.',
            });
          } else if (code >= 400) {
            return finish({
              success: false,
              errorCode: `SMTP_${code}`,
              message: `SMTP server error ${code}: ${line}`,
            });
          }
        }
      });
    });
  }

  /**
   * Construct RFC 2822 / MIME multipart message
   */
  private static buildMimeMessage(config: SmtpConfig, mail: SmtpMailOptions): string {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const sender = config.senderName
      ? `"${config.senderName}" <${config.senderEmail || config.username}>`
      : config.senderEmail || config.username;

    const recipient = mail.toName ? `"${mail.toName}" <${mail.to}>` : mail.to;

    let headers = [
      `From: ${sender}`,
      `To: ${recipient}`,
      `Subject: ${mail.subject}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${Date.now()}@lumina.pos>`,
      `MIME-Version: 1.0`,
    ];

    if (config.replyTo) {
      headers.push(`Reply-To: ${config.replyTo}`);
    }

    // If attachments present, use multipart/mixed
    if (mail.attachments && mail.attachments.length > 0) {
      headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      let body = headers.join('\r\n') + '\r\n\r\n';

      // Text part
      body += `--${boundary}\r\n`;
      body += `Content-Type: text/plain; charset=UTF-8\r\n`;
      body += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
      body += mail.text + '\r\n\r\n';

      // Attachments
      for (const att of mail.attachments) {
        if (!att.contentBase64) continue;
        body += `--${boundary}\r\n`;
        body += `Content-Type: ${att.contentType || 'application/octet-stream'}; name="${att.filename}"\r\n`;
        body += `Content-Transfer-Encoding: base64\r\n`;
        body += `Content-Disposition: attachment; filename="${att.filename}"\r\n\r\n`;
        body += att.contentBase64.replace(/(.{76})/g, '$1\r\n') + '\r\n\r\n';
      }

      body += `--${boundary}--\r\n`;
      return body;
    }

    // Plain message without attachments
    headers.push(`Content-Type: text/plain; charset=UTF-8`);
    headers.push(`Content-Transfer-Encoding: 8bit`);
    return headers.join('\r\n') + '\r\n\r\n' + mail.text;
  }
}
