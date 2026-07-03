import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { prisma } from '@/infrastructure/database/prisma';
import type { Guest, Companion } from '@prisma/client';

export type ExportFormat = 'xlsx' | 'csv' | 'pdf';
export type ExportOrder = 'alphabetical' | 'confirmation' | 'age' | 'buffet';

export interface ExportGuestsInput {
  eventId: string;
  format: ExportFormat;
  order: ExportOrder;
}

type GuestWithCompanions = Guest & { companions: Companion[] };

/**
 * Modulo de Exportacao — gera listas de convidados prontas para uso externo
 * (Excel, CSV, PDF) com diferentes ordenacoes/finalidades:
 *  - alphabetical: lista geral em ordem alfabetica
 *  - confirmation: agrupada por status (confirmados primeiro)
 *  - age: agrupada por faixa etaria (util para brinquedos/atividades infantis)
 *  - buffet: uma linha por PESSOA (titular + acompanhantes), pronta para contagem de buffet
 */
export class ExportGuestsUseCase {
  async execute(input: ExportGuestsInput): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
    const event = await prisma.event.findUniqueOrThrow({ where: { id: input.eventId } });
    const guests = await prisma.guest.findMany({
      where: { eventId: input.eventId },
      include: { companions: true },
    });

    const rows = this.buildRows(guests, input.order);
    const baseFileName = `${event.name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}-${input.order}`;

    if (input.format === 'csv') {
      return { buffer: this.toCsv(rows), contentType: 'text/csv; charset=utf-8', fileName: `${baseFileName}.csv` };
    }
    if (input.format === 'pdf') {
      const title = input.order === 'buffet' ? `Lista de confirmados — ${event.name}` : `Lista de convidados — ${event.name}`;
      return { buffer: await this.toPdf(title, rows), contentType: 'application/pdf', fileName: `${baseFileName}.pdf` };
    }
    return { buffer: await this.toXlsx(rows), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fileName: `${baseFileName}.xlsx` };
  }

  private buildRows(guests: GuestWithCompanions[], order: ExportOrder): Record<string, string | number>[] {
    if (order === 'buffet') {
      return guests
        .filter((g) => g.status === 'CONFIRMED')
        .flatMap((g) => [
          { Nome: g.name, Telefone: g.phone, Tipo: 'Titular', Idade: '' },
          ...g.companions.map((c) => ({ Nome: c.name, Telefone: g.phone, Tipo: 'Acompanhante', Idade: c.age ?? '' })),
        ]);
    }

    let sorted = [...guests];
    if (order === 'alphabetical') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (order === 'confirmation') {
      const rank: Record<string, number> = { CONFIRMED: 0, SENT: 1, PENDING: 2, NO_RESPONSE: 3, DECLINED: 4 };
      sorted.sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || a.name.localeCompare(b.name));
    } else if (order === 'age') {
      const youngestAge = (g: GuestWithCompanions) =>
        g.companions.length > 0 ? Math.min(...g.companions.map((c) => c.age ?? 999)) : 999;
      sorted.sort((a, b) => youngestAge(a) - youngestAge(b));
    }

    return sorted.map((g) => ({
      Nome: g.name,
      Telefone: g.phone,
      Status: this.statusLabel(g.status),
      'Pessoas Confirmadas': g.status === 'CONFIRMED' ? g.confirmedCount : '',
      Acompanhantes: g.companions.map((c) => `${c.name}${c.age !== null ? ` (${c.age})` : ''}`).join(', '),
      Origem: g.origin,
      'Respondido em': g.respondedAt ? g.respondedAt.toLocaleString('pt-BR') : '',
    }));
  }

  private statusLabel(status: string) {
    const map: Record<string, string> = {
      PENDING: 'Pendente',
      SENT: 'Enviado',
      CONFIRMED: 'Confirmado',
      DECLINED: 'Recusado',
      NO_RESPONSE: 'Sem resposta',
    };
    return map[status] ?? status;
  }

  private toCsv(rows: Record<string, string | number>[]): Buffer {
    if (rows.length === 0) return Buffer.from('');
    const headers = Object.keys(rows[0]!);
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h] ?? '')).join(','))];
    return Buffer.from('﻿' + lines.join('\n'), 'utf-8');
  }

  private async toXlsx(rows: Record<string, string | number>[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Convidados');

    if (rows.length > 0) {
      const headers = Object.keys(rows[0]!);
      sheet.columns = headers.map((h) => ({ header: h, key: h, width: 24 }));
      sheet.addRows(rows);
      sheet.getRow(1).font = { bold: true };
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  /** Colunas que recebem largura dupla na tabela do PDF (nomes tendem a ser mais longos). */
  private static readonly WIDE_COLUMNS = new Set(['Nome', 'Acompanhantes']);

  private toPdf(title: string, rows: Record<string, string | number>[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text(title, { align: 'center' });
      doc.moveDown();

      if (rows.length === 0) {
        doc.fontSize(12).text('Nenhum convidado encontrado.');
      } else {
        doc.fontSize(9);
        this.drawTable(doc, rows);
      }

      doc.end();
    });
  }

  private drawTable(doc: PDFKit.PDFDocument, rows: Record<string, string | number>[]) {
    const headers = Object.keys(rows[0]!);
    const tableLeft = doc.page.margins.left;
    const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const units = headers.reduce((sum, h) => sum + (ExportGuestsUseCase.WIDE_COLUMNS.has(h) ? 2 : 1), 0);
    const colWidths = headers.map((h) => ((ExportGuestsUseCase.WIDE_COLUMNS.has(h) ? 2 : 1) / units) * tableWidth);
    const rowPadding = 6;
    const bottomLimit = doc.page.height - doc.page.margins.bottom;

    const drawHeaderRow = () => {
      const y = doc.y;
      doc.font('Helvetica-Bold').fontSize(9);
      let x = tableLeft;
      headers.forEach((h, i) => {
        doc.text(h, x + 2, y, { width: colWidths[i]! - 4 });
        x += colWidths[i]!;
      });
      const headerHeight = Math.max(...headers.map((h, i) => doc.heightOfString(h, { width: colWidths[i]! - 4 }))) + rowPadding;
      doc
        .moveTo(tableLeft, y + headerHeight - 2)
        .lineTo(tableLeft + tableWidth, y + headerHeight - 2)
        .strokeColor('#333333')
        .stroke();
      doc.y = y + headerHeight;
      doc.font('Helvetica').fontSize(9);
    };

    drawHeaderRow();

    for (const row of rows) {
      const cellTexts = headers.map((h) => String(row[h] ?? ''));
      const rowHeight = Math.max(...cellTexts.map((text, i) => doc.heightOfString(text, { width: colWidths[i]! - 4 }))) + rowPadding;

      if (doc.y + rowHeight > bottomLimit) {
        doc.addPage();
        drawHeaderRow();
      }

      const y = doc.y;
      let x = tableLeft;
      cellTexts.forEach((text, i) => {
        doc.text(text, x + 2, y, { width: colWidths[i]! - 4 });
        x += colWidths[i]!;
      });
      doc
        .moveTo(tableLeft, y + rowHeight - 2)
        .lineTo(tableLeft + tableWidth, y + rowHeight - 2)
        .strokeColor('#dddddd')
        .stroke();
      doc.y = y + rowHeight;
    }
  }
}
