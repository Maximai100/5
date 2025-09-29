import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Estimate, Project, CompanyProfile, WorkStage, Item, FinanceEntry } from '../types';

// Расширяем типы для jsPDF с autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

class PdfService {
  private static readonly FONT_NAME = 'Roboto';
  private static readonly BRAND_PRIMARY: [number, number, number] = [52, 120, 246];
  private static readonly BRAND_DARK: [number, number, number] = [40, 40, 40];
  private static readonly BRAND_LIGHT: [number, number, number] = [245, 248, 255];

  // Cache loaded base64 font data to avoid repeated fetches
  private static fontCache: { regular?: string; bold?: string } = {};

  private static async loadFontBase64(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load font at ${url}: ${res.status} ${res.statusText}`);
    }
    const buffer = await res.arrayBuffer();
    // Convert ArrayBuffer to base64 in chunks to avoid call stack limits
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const sub = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(sub) as unknown as number[]);
    }
    return btoa(binary);
  }

  private static async ensureFontsLoaded(): Promise<void> {
    if (this.fontCache.regular && this.fontCache.bold) return;
    const base = (import.meta as any).env?.BASE_URL ?? '/';
    const prefix = base.endsWith('/') ? base : base + '/';
    const [regularRes, boldRes] = await Promise.allSettled([
      this.loadFontBase64(`${prefix}fonts/Roboto-Regular.ttf`),
      this.loadFontBase64(`${prefix}fonts/Roboto-Bold.ttf`),
    ]);
    if (regularRes.status === 'fulfilled') {
      this.fontCache.regular = regularRes.value;
    }
    if (boldRes.status === 'fulfilled') {
      this.fontCache.bold = boldRes.value;
    }
  }

  private static addFontsToDoc(doc: jsPDF): void {
    const docWithFlag = doc as jsPDF & { _robotoRegistered?: boolean };
    if (docWithFlag._robotoRegistered) return;

    // At this point fonts must be in cache
    if (this.fontCache.regular) {
      doc.addFileToVFS('Roboto-Regular.ttf', this.fontCache.regular);
      doc.addFont('Roboto-Regular.ttf', PdfService.FONT_NAME, 'normal');
    }
    if (this.fontCache.bold) {
      doc.addFileToVFS('Roboto-Bold.ttf', this.fontCache.bold);
      doc.addFont('Roboto-Bold.ttf', PdfService.FONT_NAME, 'bold');
    }
    docWithFlag._robotoRegistered = true;
  }

  private static async fetchImageAsDataUrl(url: string): Promise<string | null> {
    if (!url) return null;
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) return null;
      const blob = await res.blob();
      const reader = new FileReader();
      const dataUrlPromise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image as DataURL'));
      });
      reader.readAsDataURL(blob);
      return await dataUrlPromise;
    } catch (e) {
      console.warn('fetchImageAsDataUrl failed:', e);
      return null;
    }
  }

  private static async drawCompanyHeader(
    doc: jsPDF,
    companyProfile: CompanyProfile | null,
    title: string,
    subtitle?: string
  ): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 18;

    // Top accent bar
    doc.setFillColor(...PdfService.BRAND_PRIMARY);
    doc.rect(0, 0, pageWidth, 6, 'F');

    // Logo (left) + company info (right)
    let logoDrawn = false;
    if (companyProfile?.logo) {
      try {
        const dataUrl = await PdfService.fetchImageAsDataUrl(companyProfile.logo);
        if (dataUrl) {
          const imgW = 28;
          const imgH = 28;
          doc.addImage(dataUrl, 'PNG', 16, 10, imgW, imgH, undefined, 'FAST');
          logoDrawn = true;
        }
      } catch (e) {
        console.warn('Logo draw failed:', e);
      }
    }

    // Company name and details
    const leftX = logoDrawn ? 50 : 16;
    doc.setTextColor(...PdfService.BRAND_DARK);
    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text(companyProfile?.name || 'Компания', leftX, 18);

    if (companyProfile?.details) {
      doc.setFontSize(9);
      PdfService.ensureCyrillicSupport(doc);
      const detailsLines = companyProfile.details.split('\n');
      let detailsY = 24;
      detailsLines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) doc.text(trimmed, leftX, detailsY);
        detailsY += 5;
      });
      y = Math.max(y, detailsY);
    } else {
      y = 26;
    }

    // Title band spacing (extra gap between header and title)
    y += 14;
    doc.setFillColor(...PdfService.BRAND_LIGHT);
    doc.setDrawColor(220, 226, 236);
    doc.roundedRect(14, y - 10, pageWidth - 28, 18, 3, 3, 'FD');
    doc.setFontSize(14);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text(title, pageWidth / 2, y + 2, { align: 'center' });

    if (subtitle) {
      doc.setFontSize(10);
      PdfService.ensureCyrillicSupport(doc);
      doc.text(subtitle, pageWidth / 2, y + 9, { align: 'center' });
      y += 14;
    } else {
      y += 10;
    }

    return y + 2;
  }

  private static addPageNumbers(doc: jsPDF) {
    try {
      const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : (doc as any).internal.getNumberOfPages();
      const size = doc.internal.pageSize;
      const pageWidth = size.getWidth();
      const pageHeight = size.getHeight();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        PdfService.ensureCyrillicSupport(doc);
        doc.setTextColor(120);
        doc.text(`Стр. ${i} из ${pageCount}`, pageWidth - 20, pageHeight - 8, { align: 'right' });
      }
    } catch (e) {
      console.warn('addPageNumbers failed:', e);
    }
  }

  private static formatCurrency(value: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  private static formatDate(date: string): string {
    return new Date(date).toLocaleDateString('ru-RU');
  }

  private static wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
    if (!text || text.trim() === '') return [''];
    
    try {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        
        try {
          const textWidth = doc.getTextWidth(testLine);
          
          if (textWidth <= maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              // Если даже одно слово не помещается, добавляем его как есть
              lines.push(word);
            }
          }
        } catch (error) {
          // Если getTextWidth не работает, просто добавляем слово
          if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            lines.push(word);
          }
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines;
    } catch (error) {
      console.warn('Ошибка в wrapText, возвращаем исходный текст:', error);
      return [text];
    }
  }

  // Приватный статический метод для инициализации документа со шрифтом
  private static async initializeDoc(): Promise<jsPDF> {
    const doc = new jsPDF();
    
    try {
      await PdfService.ensureFontsLoaded();
      PdfService.addFontsToDoc(doc);
      PdfService.ensureCyrillicSupport(doc);
    } catch (error) {
      console.warn('Ошибка при загрузке кириллических шрифтов, используем стандартный шрифт:', error);
      // Если не удалось загрузить кириллические шрифты, используем стандартный
      doc.setFont('helvetica');
    }
    
    return doc;
  }

  private static ensureCyrillicSupport(doc: jsPDF, style: 'normal' | 'bold' = 'normal'): void {
    try {
      // Ensure fonts added to this doc instance (idempotent)
      PdfService.addFontsToDoc(doc);
      doc.setFont(PdfService.FONT_NAME, style);
    } catch (error) {
      console.warn('Ошибка при установке кириллического шрифта, используем стандартный:', error);
      doc.setFont('helvetica', style);
    }
  }

  /**
   * Генерирует PDF для заявки поставщику
   */
  static async generateSupplierRequestPDF(requestItems: any[], companyProfile: CompanyProfile | null): Promise<void> {
    try {
      const doc = await PdfService.initializeDoc();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = await PdfService.drawCompanyHeader(doc, companyProfile, 'ЗАЯВКА ПОСТАВЩИКУ');

      // Информация о заказчике
      doc.setFontSize(12);
      PdfService.ensureCyrillicSupport(doc, 'bold');
      try {
        doc.text('Информация о заказе:', 14, yPosition);
      } catch (error) {
        console.warn('Ошибка при добавлении подзаголовка:', error);
        doc.text('Informatsiya o zakaze:', 14, yPosition);
      }
      yPosition += 12;
      
      doc.setFontSize(10);
      PdfService.ensureCyrillicSupport(doc);
      try {
        doc.text(`Заказчик: ${companyProfile?.name || 'Не указан'}`, 14, yPosition);
      } catch (error) {
        console.warn('Ошибка при добавлении заказчика:', error);
        doc.text(`Zakazchik: ${companyProfile?.name || 'Ne ukazan'}`, 14, yPosition);
      }
      yPosition += 10;
      
      if (companyProfile?.details) {
        // Разбиваем details на строки и добавляем каждую отдельно
        const detailsLines = companyProfile.details.split('\n');
        
        detailsLines.forEach((line, index) => {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            try {
              // Разбиваем длинные строки на несколько строк
              const wrappedLines = PdfService.wrapText(doc, trimmedLine, pageWidth - 28);
              wrappedLines.forEach(wrappedLine => {
                try {
                  doc.text(wrappedLine, 14, yPosition);
                  yPosition += 8;
                } catch (textError) {
                  console.warn('Ошибка при добавлении текста, пропускаем строку:', textError);
                  yPosition += 8;
                }
              });
            } catch (wrapError) {
              console.warn('Ошибка при переносе текста, добавляем как есть:', wrapError);
              try {
                doc.text(trimmedLine, 14, yPosition);
                yPosition += 8;
              } catch (textError) {
                console.warn('Не удалось добавить текст:', textError);
                yPosition += 8;
              }
            }
          }
        });
        yPosition += 10; // Увеличенный отступ после details
      }
      
      try {
        doc.text(`Дата заявки: ${PdfService.formatDate(new Date().toISOString())}`, 14, yPosition);
      } catch (error) {
        console.warn('Ошибка при добавлении даты:', error);
        doc.text(`Data zayavki: ${PdfService.formatDate(new Date().toISOString())}`, 14, yPosition);
      }
      yPosition += 20;

      // Проверяем, есть ли материалы для заявки
      if (!requestItems || requestItems.length === 0) {
        doc.setFontSize(12);
        PdfService.ensureCyrillicSupport(doc);
        try {
          doc.text('Нет материалов для заявки', 14, yPosition);
        } catch (error) {
          console.warn('Ошибка при добавлении сообщения о пустой заявке:', error);
          doc.text('Net materialov dlya zayavki', 14, yPosition);
        }
        yPosition += 20;
      } else {
        // Таблица материалов (без цен)
        const tableData = requestItems.map((item, index) => [
          (index + 1).toString(),
          item.name || 'Не указано',
          item.quantity ? item.quantity.toString() : '0',
          item.unit || 'шт',
          item.note || '-'
        ]);

        autoTable(doc, {
          head: [['№', 'Наименование материалов', 'Кол-во', 'Ед. изм.', 'Примечание']],
          body: tableData,
          startY: yPosition,
          styles: {
            fontSize: 9,
            font: PdfService.FONT_NAME,
            fontStyle: 'normal',
            cellPadding: 4,
            overflow: 'linebreak',
            cellWidth: 'wrap'
          },
          headStyles: {
            fillColor: PdfService.BRAND_PRIMARY,
            textColor: 255,
            fontStyle: 'bold',
            font: PdfService.FONT_NAME,
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 15, font: PdfService.FONT_NAME },
            1: { cellWidth: 80, font: PdfService.FONT_NAME },
            2: { halign: 'center', cellWidth: 20, font: PdfService.FONT_NAME },
            3: { halign: 'center', cellWidth: 20, font: PdfService.FONT_NAME },
            4: { cellWidth: 40, font: PdfService.FONT_NAME },
          },
          margin: { left: 20, right: 20 },
          didDrawPage: (data) => {
            // Добавляем поддержку кириллицы для каждой страницы
            PdfService.ensureCyrillicSupport(doc);
          }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 20;
      }

      // Подпись
      doc.setFontSize(10);
      PdfService.ensureCyrillicSupport(doc);
      try {
        doc.text('Подпись заказчика: _________________', 14, yPosition);
        doc.text('Дата: _________________', pageWidth - 80, yPosition);
      } catch (error) {
        console.warn('Ошибка при добавлении подписи:', error);
        doc.text('Podpis zakazchika: _________________', 14, yPosition);
        doc.text('Data: _________________', pageWidth - 80, yPosition);
      }

      // Сохраняем файл
      const fileName = `Заявка_поставщику_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '_')}.pdf`;
      PdfService.addPageNumbers(doc);
      doc.save(fileName);
      
      console.log('✅ PDF заявки поставщику успешно сгенерирован');
    } catch (error) {
      console.error('❌ Ошибка при генерации PDF заявки поставщику:', error);
      throw error;
    }
  }

  /**
   * Генерирует PDF для сметы
   */
  static async generateEstimatePDF(
    estimate: Estimate,
    project: Project | null,
    companyProfile: CompanyProfile
  ): Promise<void> {
    const doc = await PdfService.initializeDoc();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = await PdfService.drawCompanyHeader(doc, companyProfile, `СМЕТА № ${estimate.number}`, project ? `${project.name} • ${project.address}` : undefined);

    // Дата сметы
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Дата: ${PdfService.formatDate(estimate.date)}`, 20, yPosition);
    yPosition += 10;

    // Профессиональная секция информации о заказе
    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('ИНФОРМАЦИЯ О ЗАКАЗЕ', 20, yPosition);
    yPosition += 12;

    // Улучшенная рамка для информации о заказе (без жесткой тени)
    const infoBoxY = yPosition;
    const infoBoxHeight = 30;
    const infoBoxWidth = pageWidth - 40;
    doc.setFillColor(248, 250, 253);
    doc.setDrawColor(220, 226, 236);
    doc.setLineWidth(0.3);
    (doc as any).roundedRect?.(20, infoBoxY, infoBoxWidth, infoBoxHeight, 2, 2, 'FD') ?? doc.rect(20, infoBoxY, infoBoxWidth, infoBoxHeight, 'FD');

    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Заказчик: ${estimate.clientInfo}`, 25, yPosition + 8);
    
    if (project) {
      doc.text(`Объект: ${project.address}`, 25, yPosition + 18);
    }

    yPosition += infoBoxHeight + 20;

    const tableData = estimate.items.map((item: Item, index: number) => [
      index + 1,
      item.name,
      item.quantity.toString(),
      item.unit,
      PdfService.formatCurrency(item.price),
      PdfService.formatCurrency(item.quantity * item.price)
    ]);

      autoTable(doc, {
        head: [['№', 'Наименование работ/материалов', 'Кол-во', 'Ед. изм.', 'Цена за ед.', 'Сумма']],
        body: tableData,
        startY: yPosition,
        styles: {
        fontSize: 9,
        font: PdfService.FONT_NAME,
        fontStyle: 'normal',
        cellPadding: 5,
        lineWidth: 0.2,
        lineColor: [180, 180, 180],
        halign: 'left',
      },
      headStyles: {
        fillColor: PdfService.BRAND_PRIMARY,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10,
        font: PdfService.FONT_NAME,
        halign: 'center',
        cellPadding: 6,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12, font: PdfService.FONT_NAME },
        1: { cellWidth: 70, font: PdfService.FONT_NAME, valign: 'top' },
        2: { halign: 'center', cellWidth: 20, font: PdfService.FONT_NAME },
        3: { halign: 'center', cellWidth: 20, font: PdfService.FONT_NAME },
        4: { halign: 'right', cellWidth: 24, font: PdfService.FONT_NAME },
        5: { halign: 'right', cellWidth: 24, font: PdfService.FONT_NAME },
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      margin: { left: 20, right: 20 },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.3,
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    const subtotal = estimate.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const discountAmount = estimate.discountType === 'percent'
      ? subtotal * (estimate.discount / 100)
      : estimate.discount;
    const totalAfterDiscount = subtotal - discountAmount;
    const taxAmount = totalAfterDiscount * (estimate.tax / 100);
    const grandTotal = totalAfterDiscount + taxAmount;

    // Улучшенная секция итогов
    let totalsBoxY = finalY;
    const totalsBoxWidth = 90;
    const totalsBoxHeight = 45;
    
    // Если мало места до подвала, переносим блок итогов на новую страницу
    let footerY = pageHeight - 60;
    if (totalsBoxY + totalsBoxHeight + 24 > footerY) {
      doc.addPage();
      totalsBoxY = 30;
      footerY = doc.internal.pageSize.getHeight() - 60;
    }

    // Тень для рамки итогов (легкая)
    doc.setFillColor(248, 250, 253);
    doc.setDrawColor(220, 226, 236);
    doc.setLineWidth(0.4);
    ;(doc as any).roundedRect?.(pageWidth - totalsBoxWidth - 20, totalsBoxY, totalsBoxWidth, totalsBoxHeight, 2, 2, 'FD')
      ?? doc.rect(pageWidth - totalsBoxWidth - 20, totalsBoxY, totalsBoxWidth, totalsBoxHeight, 'FD');
    
    // Заголовок секции итогов
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('РАСЧЕТ', pageWidth - totalsBoxWidth - 15, totalsBoxY + 8);

    doc.setFontSize(9);
    PdfService.ensureCyrillicSupport(doc);

    let currentY = totalsBoxY + 18;
    const rightAlignX = pageWidth - 25;
    
    // Подытог
    doc.text('Подытог:', pageWidth - totalsBoxWidth - 15, currentY);
    doc.text(PdfService.formatCurrency(subtotal), rightAlignX, currentY, { align: 'right' });
    currentY += 7;

    // Скидка (если есть)
    if (discountAmount > 0) {
      doc.text(
        `Скидка (${estimate.discountType === 'percent' ? `${estimate.discount}%` : PdfService.formatCurrency(estimate.discount)}):`,
        pageWidth - totalsBoxWidth - 15,
        currentY
      );
      doc.text(`-${PdfService.formatCurrency(discountAmount)}`, rightAlignX, currentY, { align: 'right' });
      currentY += 7;
    }

    // Налог (если есть)
    if (taxAmount > 0) {
      doc.text(`НДС (${estimate.tax}%):`, pageWidth - totalsBoxWidth - 15, currentY);
      doc.text(`+${PdfService.formatCurrency(taxAmount)}`, rightAlignX, currentY, { align: 'right' });
      currentY += 7;
    }

    // Разделительная линия перед итогом
    doc.setLineWidth(0.3);
    doc.setDrawColor(100, 100, 100);
    doc.line(pageWidth - totalsBoxWidth - 15, currentY - 2, pageWidth - 25, currentY - 2);

    // Итоговая сумма (выделена)
    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('ИТОГО:', pageWidth - totalsBoxWidth - 15, currentY + 5);
    doc.text(PdfService.formatCurrency(grandTotal), rightAlignX, currentY + 5, { align: 'right' });

    // Улучшенный профессиональный подвал
    
    // Убрана разделительная линия, чтобы не пересекалась с блоком итогов
    
    // Блок подписей с рамками
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    
    // Исполнитель слева
    const leftBoxY = footerY - 5;
    doc.setLineWidth(0.3);
    doc.setDrawColor(150, 150, 150);
    doc.rect(20, leftBoxY, 80, 25);
    
    doc.text('ИСПОЛНИТЕЛЬ:', 25, leftBoxY + 8);
    doc.setFontSize(9);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('_________________', 25, leftBoxY + 16);
    doc.text('(подпись)', 25, leftBoxY + 22);
    
    // Заказчик справа
    const rightBoxY = footerY - 5;
    doc.setLineWidth(0.3);
    doc.setDrawColor(150, 150, 150);
    doc.rect(pageWidth - 100, rightBoxY, 80, 25);
    
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('ЗАКАЗЧИК:', pageWidth - 95, rightBoxY + 8);
    doc.setFontSize(9);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('_________________', pageWidth - 95, rightBoxY + 16);
    doc.text('(подпись)', pageWidth - 95, rightBoxY + 22);

    const fileName = `Смета_${estimate.number}_${PdfService.formatDate(estimate.date)}.pdf`;
    PdfService.addPageNumbers(doc);
    doc.save(fileName);
    return Promise.resolve();
  }


  /**
   * Генерирует PDF для акта выполненных работ
   */
  static async generateActPDF(
    project: Project,
    workStages: WorkStage[],
    companyProfile: CompanyProfile,
    totalAmount: number
  ): Promise<void> {
    const doc = await PdfService.initializeDoc();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = await PdfService.drawCompanyHeader(doc, companyProfile, 'АКТ', 'о приемке выполненных работ');

    const actNumber = `АКТ-${project.id.slice(-6).toUpperCase()}`;
    const currentDate = PdfService.formatDate(new Date().toISOString());

    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Акт № ${actNumber} от ${currentDate}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Информация о проекте в рамке
    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('ИНФОРМАЦИЯ О ПРОЕКТЕ', 20, yPosition);
    yPosition += 12;

    // Рамка для информации о проекте
    const infoBoxY = yPosition;
    const infoBoxHeight = 35;
    const infoBoxWidth = pageWidth - 40;
    doc.setFillColor(248, 250, 253);
    doc.setDrawColor(220, 226, 236);
    doc.setLineWidth(0.3);
    (doc as any).roundedRect?.(20, infoBoxY, infoBoxWidth, infoBoxHeight, 2, 2, 'FD') ?? doc.rect(20, infoBoxY, infoBoxWidth, infoBoxHeight, 'FD');

    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Проект: ${project.name}`, 25, yPosition + 8);
    doc.text(`Заказчик: ${project.client}`, 25, yPosition + 18);
    doc.text(`Адрес объекта: ${project.address}`, 25, yPosition + 28);

    yPosition += infoBoxHeight + 20;

    const completedStages = workStages.filter(stage => stage.status === 'completed');

    if (completedStages.length > 0) {
      const tableData = completedStages.map((stage: WorkStage, index: number) => [
        index + 1,
        stage.title,
        PdfService.formatDate(stage.startDate),
        stage.endDate ? PdfService.formatDate(stage.endDate) : 'В процессе'
      ]);

      autoTable(doc, {
        head: [['№', 'Наименование этапа', 'Дата начала', 'Дата завершения']],
        body: tableData,
        startY: yPosition,
        styles: {
          fontSize: 9,
          font: PdfService.FONT_NAME,
          fontStyle: 'normal',
          cellPadding: 5,
          lineWidth: 0.2,
          lineColor: [180, 180, 180],
          halign: 'left',
        },
        headStyles: {
          fillColor: PdfService.BRAND_PRIMARY,
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 10,
          font: PdfService.FONT_NAME,
          halign: 'center',
          cellPadding: 6,
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15, font: PdfService.FONT_NAME },
          1: { cellWidth: 80, font: PdfService.FONT_NAME },
          2: { halign: 'center', cellWidth: 40, font: PdfService.FONT_NAME },
          3: { halign: 'center', cellWidth: 40, font: PdfService.FONT_NAME },
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        margin: { left: 20, right: 20 },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.3,
      });

      const finalY = (doc as any).lastAutoTable.finalY + 20;

      // Итоговая сумма в рамке
      const totalBoxY = finalY;
      const totalBoxWidth = 120;
      const totalBoxHeight = 25;
      
      // Тень для рамки итогов
      doc.setFillColor(235, 235, 235);
      doc.rect(pageWidth/2 - totalBoxWidth/2 + 2, totalBoxY + 2, totalBoxWidth, totalBoxHeight, 'F');
      
      // Основная рамка для итогов
      doc.setLineWidth(0.8);
      doc.setDrawColor(60, 60, 60);
      doc.rect(pageWidth/2 - totalBoxWidth/2, totalBoxY, totalBoxWidth, totalBoxHeight);
      
      doc.setFontSize(12);
      PdfService.ensureCyrillicSupport(doc, 'bold');
      doc.text(`Всего выполнено работ на сумму: ${PdfService.formatCurrency(totalAmount)}`, pageWidth / 2, totalBoxY + 15, { align: 'center' });
    } else {
      doc.setFontSize(10);
      PdfService.ensureCyrillicSupport(doc);
      doc.text('Выполненные этапы работ отсутствуют.', 20, yPosition);
    }

    // Улучшенный подвал акта
    const footerY = pageHeight - 60;
    
    // Убрана разделительная линия для аккуратного подвала
    
    // Блок подписей с рамками
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    
    // Исполнитель слева
    const leftBoxY = footerY - 5;
    doc.setLineWidth(0.3);
    doc.setDrawColor(150, 150, 150);
    doc.rect(20, leftBoxY, 80, 25);
    
    doc.text('ИСПОЛНИТЕЛЬ:', 25, leftBoxY + 8);
    doc.setFontSize(9);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('_________________', 25, leftBoxY + 16);
    doc.text('(подпись)', 25, leftBoxY + 22);
    doc.text('М.П.', 25, leftBoxY + 28);
    
    // Заказчик справа
    const rightBoxY = footerY - 5;
    doc.setLineWidth(0.3);
    doc.setDrawColor(150, 150, 150);
    doc.rect(pageWidth - 100, rightBoxY, 80, 25);
    
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('ЗАКАЗЧИК:', pageWidth - 95, rightBoxY + 8);
    doc.setFontSize(9);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('_________________', pageWidth - 95, rightBoxY + 16);
    doc.text('(подпись)', pageWidth - 95, rightBoxY + 22);

    const fileName = `Акт_${actNumber}_${currentDate}.pdf`;
    PdfService.addPageNumbers(doc);
    doc.save(fileName);
    return Promise.resolve();
  }


  /**
   * Генерирует PDF для графика работ
   */
  static async generateWorkSchedulePDF(
    project: Project,
    workStages: WorkStage[],
    companyProfile: CompanyProfile
  ): Promise<void> {
    const doc = await PdfService.initializeDoc();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = await PdfService.drawCompanyHeader(doc, companyProfile, 'ГРАФИК ВЫПОЛНЕНИЯ РАБОТ', `Проект: ${project.name}`);

    // Информация о проекте в рамке
    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('ИНФОРМАЦИЯ О ПРОЕКТЕ', 20, yPosition);
    yPosition += 12;

    // Рамка для информации о проекте
    const infoBoxY = yPosition;
    // Уберем дублирование названия проекта в графике: оставим заказчика и адрес
    const infoBoxHeight = 26;
    const infoBoxWidth = pageWidth - 40;
    doc.setFillColor(248, 250, 253);
    doc.setDrawColor(220, 226, 236);
    doc.setLineWidth(0.3);
    (doc as any).roundedRect?.(20, infoBoxY, infoBoxWidth, infoBoxHeight, 2, 2, 'FD') ?? doc.rect(20, infoBoxY, infoBoxWidth, infoBoxHeight, 'FD');

    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Заказчик: ${project.client}`, 25, yPosition + 8);
    doc.text(`Адрес объекта: ${project.address}`, 25, yPosition + 18);

    yPosition += infoBoxHeight + 20;

    if (workStages.length > 0) {
      const tableData = workStages.map((stage: WorkStage, index: number) => [
        index + 1,
        stage.title,
        PdfService.formatDate(stage.startDate),
        stage.endDate ? PdfService.formatDate(stage.endDate) : 'В процессе',
        stage.status === 'completed' ? 'Завершен'
          : stage.status === 'in_progress' ? 'В работе'
          : 'Планируется',
        `${Math.round(stage.progress ?? 0)}%`
      ]);

      autoTable(doc, {
        head: [['№', 'Наименование этапа', 'Дата начала', 'Дата завершения', 'Статус', 'Прогресс']],
        body: tableData,
        startY: yPosition,
        styles: {
          fontSize: 8,
          font: PdfService.FONT_NAME,
          fontStyle: 'normal',
          cellPadding: 4,
          lineWidth: 0.2,
          lineColor: [180, 180, 180],
          halign: 'left',
        },
        headStyles: {
          fillColor: PdfService.BRAND_PRIMARY,
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
          font: PdfService.FONT_NAME,
          halign: 'center',
          cellPadding: 5,
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12, font: PdfService.FONT_NAME },
          1: { cellWidth: 58, font: PdfService.FONT_NAME },
          2: { halign: 'center', cellWidth: 28, font: PdfService.FONT_NAME },
          3: { halign: 'center', cellWidth: 28, font: PdfService.FONT_NAME },
          4: { halign: 'center', cellWidth: 22, font: PdfService.FONT_NAME },
          5: { halign: 'center', cellWidth: 22, font: PdfService.FONT_NAME },
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        margin: { left: 20, right: 20 },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.3,
      });
    } else {
      doc.setFontSize(10);
      PdfService.ensureCyrillicSupport(doc);
      doc.text('Этапы работ не добавлены.', 20, yPosition);
    }

    // Улучшенный подвал графика
    const footerY = pageHeight - 60;
    
    // Убрана разделительная линия для аккуратного подвала
    
    // Блок подписей с рамками
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    
    // Ответственный слева
    const leftBoxY = footerY - 5;
    doc.setLineWidth(0.3);
    doc.setDrawColor(150, 150, 150);
    doc.rect(20, leftBoxY, 80, 25);
    
    doc.text('ОТВЕТСТВЕННЫЙ:', 25, leftBoxY + 8);
    doc.setFontSize(9);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('_________________', 25, leftBoxY + 16);
    doc.text('(подпись)', 25, leftBoxY + 22);
    
    // Заказчик справа
    const rightBoxY = footerY - 5;
    doc.setLineWidth(0.3);
    doc.setDrawColor(150, 150, 150);
    doc.rect(pageWidth - 100, rightBoxY, 80, 25);
    
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('ЗАКАЗЧИК:', pageWidth - 95, rightBoxY + 8);
    doc.setFontSize(9);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('_________________', pageWidth - 95, rightBoxY + 16);
    doc.text('(подпись)', pageWidth - 95, rightBoxY + 22);

    const fileName = `График_работ_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${PdfService.formatDate(new Date().toISOString())}.pdf`;
    PdfService.addPageNumbers(doc);
    doc.save(fileName);
    return Promise.resolve();
  }

  /**
   * Финансовый дашборд по проекту (сводный отчет)
   */
  static async generateProjectFinancialDashboardPDF(
    project: Project,
    estimates: Estimate[],
    financeEntries: FinanceEntry[],
    companyProfile: CompanyProfile | null
  ): Promise<void> {
    const doc = await PdfService.initializeDoc();
    const pageWidth = doc.internal.pageSize.getWidth();

    let y = await PdfService.drawCompanyHeader(doc, companyProfile, 'ФИНАНСОВЫЙ ОТЧЕТ ПО ПРОЕКТУ', project.name);

    // Подготовка данных
    const totalEstimatesAmount = estimates
      .filter(e => e.project_id === project.id)
      .reduce((sum, estimate) => sum + (estimate.items?.reduce((s, i) => s + (i.quantity * i.price), 0) || 0), 0);

    const projectFinanceEntries = financeEntries.filter(f => f.projectId === project.id);
    const totalIncome = projectFinanceEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const totalExpenses = projectFinanceEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    const profit = totalIncome - totalExpenses;
    const profitability = totalExpenses > 0 ? (profit / totalExpenses) * 100 : 0;

    // Карточки сводных показателей
    const cardWidth = (pageWidth - 48) / 2;
    const cardHeight = 28;
    const cardY = y;

    const drawCard = (x: number, label: string, value: string, color: [number, number, number]) => {
      doc.setFillColor(...PdfService.BRAND_LIGHT);
      doc.setDrawColor(220, 226, 236);
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(9);
      PdfService.ensureCyrillicSupport(doc);
      doc.setTextColor(...PdfService.BRAND_DARK);
      doc.text(label, x + 8, cardY + 10);
      doc.setFontSize(12);
      PdfService.ensureCyrillicSupport(doc, 'bold');
      doc.setTextColor(...color);
      doc.text(value, x + 8, cardY + 20);
      doc.setTextColor(...PdfService.BRAND_DARK);
    };

    drawCard(16, 'Сумма смет', PdfService.formatCurrency(totalEstimatesAmount), PdfService.BRAND_DARK);
    drawCard(26 + cardWidth, 'Оплачено', PdfService.formatCurrency(totalIncome), [48, 170, 70]);

    const cardY2 = cardY + cardHeight + 10;
    const profitColor: [number, number, number] = profit >= 0 ? [48, 170, 70] : [200, 60, 60];
    drawCard(16, 'Расходы', PdfService.formatCurrency(totalExpenses), [200, 60, 60]);
    drawCard(26 + cardWidth, 'Прибыль / Рентабельность', `${PdfService.formatCurrency(profit)} • ${profitability.toFixed(0)}%`, profitColor);

    y = cardY2 + cardHeight + 16;

    // Расходы по категориям
    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('Расходы по категориям', 16, y);
    y += 6;

    const expensesByCategory = projectFinanceEntries
      .filter(e => e.type === 'expense')
      .reduce((acc: Record<string, number>, e) => {
        const cat = e.category || 'other';
        acc[cat] = (acc[cat] || 0) + e.amount;
        return acc;
      }, {});

    const categoryRows = Object.entries(expensesByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount], idx) => [String(idx + 1), category, PdfService.formatCurrency(amount)]);

    if (categoryRows.length > 0) {
      autoTable(doc, {
        head: [['№', 'Категория', 'Сумма']],
        body: categoryRows,
        startY: y + 4,
        styles: { font: PdfService.FONT_NAME, fontSize: 9, cellPadding: 4, lineWidth: 0.2, lineColor: [200, 200, 200] },
        headStyles: { fillColor: PdfService.BRAND_PRIMARY, textColor: 255, font: PdfService.FONT_NAME, fontStyle: 'bold' },
        columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 1: { cellWidth: 90 }, 2: { halign: 'right', cellWidth: 30 } },
        margin: { left: 16, right: 16 },
      });
      y = (doc as any).lastAutoTable.finalY + 12;
    } else {
      doc.setFontSize(10);
      PdfService.ensureCyrillicSupport(doc);
      doc.text('Расходы отсутствуют', 16, y + 10);
      y += 20;
    }

    // Последние движения кэшфлоу (до 10 записей)
    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('Кэшфлоу (последние операции)', 16, y);
    y += 6;

    const cashRows = projectFinanceEntries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map((e, idx) => [
        String(idx + 1),
        new Date(e.date).toLocaleDateString('ru-RU'),
        e.type === 'income' ? 'Приход' : 'Расход',
        e.description || '-',
        `${e.type === 'income' ? '+' : '-'}${PdfService.formatCurrency(e.amount)}`
      ]);

    if (cashRows.length > 0) {
      autoTable(doc, {
        head: [['№', 'Дата', 'Тип', 'Описание', 'Сумма']],
        body: cashRows,
        startY: y + 4,
        styles: { font: PdfService.FONT_NAME, fontSize: 9, cellPadding: 4, lineWidth: 0.2, lineColor: [200, 200, 200] },
        headStyles: { fillColor: PdfService.BRAND_PRIMARY, textColor: 255, font: PdfService.FONT_NAME, fontStyle: 'bold' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'center', cellWidth: 24 },
          2: { halign: 'center', cellWidth: 22 },
          3: { cellWidth: 75 },
          4: { halign: 'right', cellWidth: 35 }
        },
        margin: { left: 16, right: 16 },
      });
    } else {
      doc.setFontSize(10);
      PdfService.ensureCyrillicSupport(doc);
      doc.text('Операции не найдены', 16, y + 10);
    }

    const fileName = `Финансовый_отчет_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${PdfService.formatDate(new Date().toISOString())}.pdf`;
    PdfService.addPageNumbers(doc);
    doc.save(fileName);
    return Promise.resolve();
  }

  /**
   * Список финансовых операций проекта
   */
  static async generateProjectFinancesPDF(
    project: Project,
    financeEntries: FinanceEntry[],
    companyProfile: CompanyProfile | null
  ): Promise<void> {
    const doc = await PdfService.initializeDoc();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = await PdfService.drawCompanyHeader(doc, companyProfile, 'ФИНАНСЫ ПРОЕКТА', project.name);

    // Сводка
    const totalIncome = financeEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const totalExpenses = financeEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    const balance = totalIncome - totalExpenses;

    const cardWidth = (pageWidth - 48) / 3;
    const cardHeight = 24;
    const startX = 16;
    const labels: Array<[string, string, [number, number, number]]> = [
      ['Приход', PdfService.formatCurrency(totalIncome), [48, 170, 70]],
      ['Расход', PdfService.formatCurrency(totalExpenses), [200, 60, 60]],
      ['Баланс', PdfService.formatCurrency(balance), balance >= 0 ? [48, 170, 70] : [200, 60, 60]],
    ];
    labels.forEach(([label, value, color], idx) => {
      const x = startX + idx * (cardWidth + 8);
      doc.setFillColor(...PdfService.BRAND_LIGHT);
      doc.setDrawColor(220, 226, 236);
      doc.setLineWidth(0.3);
      ;(doc as any).roundedRect?.(x, y, cardWidth, cardHeight, 2, 2, 'FD') ?? doc.rect(x, y, cardWidth, cardHeight, 'FD');
      doc.setFontSize(9);
      PdfService.ensureCyrillicSupport(doc);
      doc.setTextColor(...PdfService.BRAND_DARK);
      doc.text(label, x + 8, y + 9);
      doc.setFontSize(12);
      PdfService.ensureCyrillicSupport(doc, 'bold');
      doc.setTextColor(...(color as [number, number, number]));
      doc.text(value, x + 8, y + 18);
      doc.setTextColor(...PdfService.BRAND_DARK);
    });
    y += cardHeight + 16;

    // Таблица операций
    const catMap: Record<string, string> = {
      materials: 'Материалы',
      labor: 'Работы',
      transport: 'Транспорт',
      tools_rental: 'Аренда инструмента',
      other: 'Прочее'
    };
    const rows = financeEntries
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(e => [
        new Date(e.date).toLocaleDateString('ru-RU'),
        e.type === 'income' ? 'Приход' : 'Расход',
        (e.category ? (catMap[e.category] || e.category) : 'Без категории'),
        e.description || '-',
        `${e.type === 'income' ? '+' : '-'}${PdfService.formatCurrency(e.amount)}`
      ]);

    autoTable(doc, {
      head: [['Дата', 'Тип', 'Категория', 'Описание', 'Сумма']],
      body: rows,
      startY: y,
      styles: { font: PdfService.FONT_NAME, fontSize: 9, cellPadding: 4, lineWidth: 0.2, lineColor: [200, 200, 200] },
      headStyles: { fillColor: PdfService.BRAND_PRIMARY, textColor: 255, font: PdfService.FONT_NAME, fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 24 },
        1: { halign: 'center', cellWidth: 20 },
        2: { cellWidth: 32 },
        3: { cellWidth: 74 },
        4: { halign: 'right', cellWidth: 20 },
      },
      margin: { left: 16, right: 16 },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });

    const fileName = `Финансы_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${PdfService.formatDate(new Date().toISOString())}.pdf`;
    PdfService.addPageNumbers(doc);
    doc.save(fileName);
    return Promise.resolve();
  }

  /**
   * Смета материалов (калькулятор)
   */
  static async generateMaterialsEstimatePDF(
    summary: { floorArea: number; wallArea: number; perimeter: number; totalCost: number; date?: string },
    rows: { name: string; quantity: string; cost: number | null }[],
    companyProfile: CompanyProfile | null
  ): Promise<void> {
    const doc = await PdfService.initializeDoc();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = await PdfService.drawCompanyHeader(doc, companyProfile, 'СМЕТА МАТЕРИАЛОВ');

    // Мета-информация
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc);
    const dateStr = summary.date || new Date().toLocaleDateString('ru-RU');
    doc.text(`Дата: ${dateStr}`, 16, y);
    y += 8;
    const info = [
      `Общая площадь пола: ${summary.floorArea.toFixed(2)} м²`,
      `Общая площадь стен: ${summary.wallArea.toFixed(2)} м²`,
      `Общий периметр: ${summary.perimeter.toFixed(2)} м`,
    ];
    info.forEach(line => { doc.text(line, 16, y); y += 6; });

    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text(`Итоговая стоимость: ${PdfService.formatCurrency(summary.totalCost)}`, 16, y + 6);
    y += 14;

    const tableRows = rows.map(r => [
      r.name,
      r.quantity,
      r.cost && r.cost > 0 ? PdfService.formatCurrency(r.cost) : '-'
    ]);

    autoTable(doc, {
      head: [['Материал', 'Количество', 'Стоимость']],
      body: tableRows,
      startY: y,
      styles: { font: PdfService.FONT_NAME, fontSize: 9, cellPadding: 4, lineWidth: 0.2, lineColor: [200, 200, 200] },
      headStyles: { fillColor: PdfService.BRAND_PRIMARY, textColor: 255, font: PdfService.FONT_NAME, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 50 }, 2: { halign: 'right', cellWidth: 30 } },
      margin: { left: 16, right: 16 },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });

    const fileName = `Смета_материалов_${new Date().toISOString().slice(0,10)}.pdf`;
    PdfService.addPageNumbers(doc);
    doc.save(fileName);
    return Promise.resolve();
  }

}

export { PdfService };
export default PdfService;
