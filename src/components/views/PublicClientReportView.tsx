import React, { useMemo } from 'react';
import { ClientReportPayload } from '../../utils/shareUtils';
import { IconCheckCircle, IconImage } from '../common/Icon';

interface Props {
  payload: ClientReportPayload;
}

const PublicClientReportView: React.FC<Props> = ({ payload }) => {
  const today = useMemo(() => new Date(payload.generatedAt).toLocaleDateString('ru-RU', {
    year: 'numeric', month: 'long', day: 'numeric'
  }), [payload.generatedAt]);

  const { project, financials } = payload;

  return (
    <div className="public-client-report" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
      <header className="projects-list-header" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
        <h1 style={{ margin: '0 auto' }}>Отчет по проекту</h1>
      </header>

      <main className="project-detail-main" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-m)' }}>
        <div className="card">
          <h2 style={{ marginBottom: 'var(--spacing-s)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-l)', textAlign: 'center' }}>
            {project.name}
          </h2>
          {(project.client || project.address) && (
            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-s)' }}>
              {project.client || ''}{project.client && project.address ? ' • ' : ''}{project.address || ''}
            </p>
          )}
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-m)' }}>
            Обновлено: {today}
          </p>
        </div>

        <div className="card project-section financial-dashboard">
          <div className="project-section-header">
            <h3>Финансовый дашборд</h3>
          </div>
          <div className="project-section-body">
            <div className="dashboard-grid-final">
              <div className="dashboard-column">
                <div className="dashboard-item">
                  <span className="dashboard-value">{formatCurrency(financials.estimatesTotal)}</span>
                  <span className="dashboard-label">Сумма смет</span>
                </div>
                <div className="dashboard-item">
                  <span className="dashboard-value payment-value">{formatCurrency(financials.paidTotal)}</span>
                  <span className="dashboard-label">Оплачено клиентом</span>
                </div>
              </div>
              <div className="dashboard-column">
                <div className="dashboard-item expenses-card">
                  <span className="dashboard-value expense-value">{formatCurrency(Math.max(financials.remainingToPay, 0))}</span>
                  <span className="dashboard-label">Остаток к оплате</span>
                  <div className="dashboard-breakdown">
                    <div className="breakdown-item">
                      <span>Статус</span>
                      <span>{financials.remainingToPay > 0 ? 'К оплате' : 'Оплачено полностью'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="dashboard-item profit-card-final">
              <span className="dashboard-label">Итог</span>
              <div className="profit-details-final">
                <span className="dashboard-value profit-value">{formatCurrency(financials.paidTotal)}</span>
                <span className="dashboard-label">Оплачено из {formatCurrency(financials.estimatesTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {payload.workStages && payload.workStages.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
              <IconCheckCircle />
              Выполненные работы
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-s)' }}>
              {payload.workStages.map((stage, idx) => (
                <div key={idx} className="list-item" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <IconCheckCircle />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{stage.title}</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                      {stage.endDate ? `Завершено: ${new Date(stage.endDate).toLocaleDateString('ru-RU')}` : 'Завершено'}
                    </div>
                  </div>
                  {typeof stage.progress === 'number' && (
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{stage.progress}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
            <IconImage />
            Фотоотчет
          </h3>
          {payload.photoReports && payload.photoReports.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-m)' }}>
              {payload.photoReports.map((rep) => (
                <div key={rep.id}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600 }}>{rep.title}</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{new Date(rep.date).toLocaleDateString('ru-RU')}</div>
                  </div>
                  <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    {rep.photos.map((p, i) => (
                      <div key={i} style={{ width: '100%', aspectRatio: '1/1', overflow: 'hidden', borderRadius: 8, background: 'var(--color-surface-1)' }}>
                        <img src={p.url} alt={p.caption || 'Фото'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--spacing-l)' }}>
              Фотоотчеты отсутствуют
            </p>
          )}
        </div>

        {payload.expiresAt && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 12 }}>
            Ссылка действительна до {new Date(payload.expiresAt).toLocaleString('ru-RU')}
          </div>
        )}
      </main>
    </div>
  );
};

// Local formatting to avoid importing whole app utils
const formatCurrency = (value: number) => {
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value || 0);
  } catch {
    return `${Math.round(value || 0)} ₽`;
  }
};

export default PublicClientReportView;

