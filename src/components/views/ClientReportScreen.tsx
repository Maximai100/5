import React, { useEffect, useMemo, useState } from 'react';
import { Project, FinanceEntry, WorkStage, PhotoReport } from '../../types';
import { ListItem } from '../ui/ListItem';
import { IconTrendingUp, IconCheckCircle, IconImage, IconChevronRight } from '../common/Icon';
import { financeCategoryToRu, safeShowAlert, safeCopyToClipboard } from '../../utils';
import { buildClientReportPayload, buildShareUrl, encodePayloadToParam, tryCreateServerShare } from '../../utils/shareUtils';
import { useFileStorage } from '../../hooks/useFileStorage';

interface ClientReportScreenProps {
  project: Project;
  estimates: any[];
  financeEntries: FinanceEntry[];
  workStages: WorkStage[];
  formatCurrency: (amount: number) => string;
  onBack: () => void;
}

export const ClientReportScreen: React.FC<ClientReportScreenProps> = ({
  project,
  estimates,
  financeEntries,
  workStages,
  formatCurrency,
  onBack
}) => {
  const { getPhotoReports } = useFileStorage();
  const [photoReports, setPhotoReports] = useState<PhotoReport[]>([]);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await getPhotoReports(project.id);
        if (!isMounted) return;
        const mapped: PhotoReport[] = (data || []).map((row: any) => ({
          id: row.id,
          projectId: row.project_id,
          title: row.title,
          photos: row.photos || [],
          date: row.date || row.created_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
        setPhotoReports(mapped);
      } catch (e) {
        console.warn('Не удалось загрузить фотоотчеты для отчета клиента:', e);
      }
    })();
    return () => { isMounted = false; };
  }, [project.id, getPhotoReports]);
  // Получаем текущую дату
  const today = new Date().toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Фильтруем данные по проекту
  const projectEstimates = estimates.filter(e => e.project_id === project.id);
  const projectFinanceEntries = financeEntries.filter(f => f.projectId === project.id);
  const projectWorkStages = workStages.filter(w => w.projectId === project.id);

  // Рассчитываем финансовые показатели (только для клиента)
  const totalEstimateAmount = projectEstimates.reduce((sum, estimate) => {
    const estimateTotal = estimate.items?.reduce((itemSum: number, item: any) =>
      itemSum + (item.quantity * item.price), 0) || 0;
    return sum + estimateTotal;
  }, 0);

  const totalPaidByClient = projectFinanceEntries
    .filter(entry => entry.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const remainingToPay = totalEstimateAmount - totalPaidByClient;

  // Получаем завершенные этапы работ
  const completedWorkStages = projectWorkStages
    .filter(stage => stage.status === 'completed')
    .sort((a, b) => new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime());

  const flatPhotos = useMemo(() => {
    const sorted = [...photoReports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const list: Array<{ id: string; url: string; caption?: string; title?: string; date?: string; } > = [];
    sorted.forEach(rep => {
      rep.photos.forEach(p => list.push({ id: rep.id, url: p.url, caption: p.caption, title: rep.title, date: rep.date }));
    });
    return list.slice(0, 12);
  }, [photoReports]);

  const handleShare = async () => {
    try {
      setIsSharing(true);

      const payload = buildClientReportPayload({
        project,
        estimatesTotal: totalEstimateAmount,
        paidTotal: totalPaidByClient,
        remainingToPay,
        workStages: projectWorkStages,
        photoReports,
      });

      const serverRes = await tryCreateServerShare({ projectId: project.id, payload });
      let shareParam: string;
      if (serverRes.ok && serverRes.token) {
        shareParam = `s.${serverRes.token}`;
      } else {
        shareParam = encodePayloadToParam(payload);
      }

      const url = buildShareUrl(shareParam);
      await safeCopyToClipboard(url, () => {
        safeShowAlert('Ссылка на отчет скопирована в буфер обмена. Отправьте её заказчику.');
      }, () => {
        safeShowAlert('Готово. Перешлите эту ссылку заказчику:\n' + url);
      });
    } catch (e) {
      console.error('Ошибка при создании ссылки отчета:', e);
      safeShowAlert('Не удалось создать ссылку на отчет. Попробуйте позже.');
    } finally {
      setIsSharing(false);
    }
  };


  return (
    <>
      <header className="projects-list-header">
        <button onClick={onBack} className="back-btn">
          <IconChevronRight style={{ transform: 'rotate(180deg)' }} />
          <span>Назад</span>
        </button>
        <h1>Отчет для клиента</h1>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={handleShare} className="btn btn-primary" disabled={isSharing}>
            {isSharing ? 'Создание...' : 'Поделиться'}
          </button>
        </div>
      </header>

      <main className="project-detail-main" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-m)' }}>

        {/* Заголовок отчета */}
        <div className="card">
          <h2 style={{ 
            marginBottom: 'var(--spacing-s)', 
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-l)',
            textAlign: 'center'
          }}>
            Отчет по проекту "{project.name}"
          </h2>
          <p style={{ 
            textAlign: 'center', 
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-m)'
          }}>
            от {today}
          </p>
        </div>

        {/* Финансовая сводка — унифицированный дашборд */}
        <div className="card project-section financial-dashboard">
          <div className="project-section-header">
            <h3>Финансовый дашборд</h3>
          </div>
          <div className="project-section-body">
            <div className="dashboard-grid-final">
              <div className="dashboard-column">
                <div className="dashboard-item">
                  <span className="dashboard-value">{formatCurrency(totalEstimateAmount)}</span>
                  <span className="dashboard-label">Сумма смет</span>
                </div>
                <div className="dashboard-item">
                  <span className="dashboard-value payment-value">{formatCurrency(totalPaidByClient)}</span>
                  <span className="dashboard-label">Оплачено клиентом</span>
                </div>
              </div>
              <div className="dashboard-column">
                <div className="dashboard-item expenses-card">
                  <span className="dashboard-value expense-value">{formatCurrency(Math.max(remainingToPay, 0))}</span>
                  <span className="dashboard-label">Остаток к оплате</span>
                  <div className="dashboard-breakdown">
                    <div className="breakdown-item">
                      <span>Статус</span>
                      <span>{remainingToPay > 0 ? 'К оплате' : 'Оплачено полностью'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="dashboard-item profit-card-final">
              <span className="dashboard-label">Итог</span>
              <div className="profit-details-final">
                <span className="dashboard-value profit-value">{formatCurrency(totalPaidByClient)}</span>
                <span className="dashboard-label">Оплачено из {formatCurrency(totalEstimateAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Выполненные работы */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
            <IconCheckCircle />
            Выполненные работы
          </h3>

          {completedWorkStages.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-s)' }}>
              {completedWorkStages.map((stage) => (
                <ListItem
                  key={stage.id}
                  icon={<IconCheckCircle />}
                  title={stage.title}
                  subtitle={stage.endDate ? 
                    `Завершено: ${new Date(stage.endDate).toLocaleDateString('ru-RU')}` : 
                    'Завершено'
                  }
                  amountText={stage.progress ? `${stage.progress}%` : undefined}
                  amountColor="var(--color-success)"
                />
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--spacing-l)' }}>
              Завершенные этапы работ пока не добавлены
            </p>
          )}
        </div>

        {/* Фотоотчет */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
            <IconImage />
            Фотоотчет
          </h3>

          {flatPhotos.length > 0 ? (
            <div style={{ 
              display: 'grid', 
              gap: '8px', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
              marginBottom: 'var(--spacing-m)'
            }}>
              {flatPhotos.map((p, idx) => (
                <div key={idx} style={{ width: '100%', aspectRatio: '1/1', overflow: 'hidden', borderRadius: 8, background: 'var(--color-surface-1)' }}>
                  <img src={p.url} alt={p.caption || 'Фото'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          ) : (
            <p style={{ 
              color: 'var(--color-text-secondary)', 
              textAlign: 'center', 
              fontSize: 'var(--font-size-s)',
              fontStyle: 'italic'
            }}>
              Пока нет загруженных фотографий для этого проекта
            </p>
          )}
        </div>

      </main>
    </>
  );
};
