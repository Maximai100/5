import React from 'react';
import { Project, FinanceEntry, CompanyProfile } from '../../types';
import { ListItem } from '../ui/ListItem';
import { IconTrendingUp, IconCreditCard, IconChevronRight, IconDownload } from '../common/Icon';
import { financeCategoryToRu } from '../../utils';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import PdfService from '../../services/PdfService';

interface ProjectFinancialReportScreenProps {
  project: Project;
  estimates: any[];
  financeEntries: FinanceEntry[];
  formatCurrency: (amount: number) => string;
  profile: CompanyProfile | null;
  onBack: () => void;
}

export const ProjectFinancialReportScreen: React.FC<ProjectFinancialReportScreenProps> = ({
  project,
  estimates,
  financeEntries,
  formatCurrency,
  profile,
  onBack
}) => {
  // Состояние для фильтров по датам
  const [startDate, setStartDate] = React.useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = React.useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  });

  // Фильтруем данные по проекту и датам
  const projectEstimates = estimates.filter(e => e.project_id === project.id);
  const projectFinanceEntries = financeEntries.filter(f => {
    if (f.projectId !== project.id) return false;
    
    // Фильтрация по датам
    if (f.date) {
      const entryDate = new Date(f.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59); // Включаем весь день
      
      return entryDate >= start && entryDate <= end;
    }
    return true; // Если дата не указана, включаем
  });

  const handleExportDashboardPDF = async () => {
    try {
      await PdfService.generateProjectFinancialDashboardPDF(
        project,
        projectEstimates,
        projectFinanceEntries,
        profile || null
      );
    } catch (error) {
      console.error('Ошибка при генерации PDF финансового отчета:', error);
    }
  };

  // Рассчитываем финансовые показатели
  const totalEstimatesAmount = projectEstimates.reduce((sum, estimate) => {
    const estimateTotal = estimate.items?.reduce((itemSum: number, item: any) => 
      itemSum + (item.quantity * item.price), 0) || 0;
    return sum + estimateTotal;
  }, 0);

  const totalIncome = projectFinanceEntries
    .filter(entry => entry.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalExpenses = projectFinanceEntries
    .filter(entry => entry.type === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const profit = totalIncome - totalExpenses;
  const profitability = totalExpenses > 0 ? (profit / totalExpenses) * 100 : 0;

  // Группируем расходы по категориям
  const expensesByCategory = projectFinanceEntries
    .filter(entry => entry.type === 'expense')
    .reduce((acc, entry) => {
      const category = entry.category || 'Без категории';
      acc[category] = (acc[category] || 0) + entry.amount;
      return acc;
    }, {} as Record<string, number>);

  // Подготавливаем данные для круговой диаграммы
  const pieChartData = Object.entries(expensesByCategory).map(([category, amount]) => ({
    name: financeCategoryToRu(category),
    value: amount
  }));

  // Цвета для секторов диаграммы (из дизайн-токенов)
  const chartColors = [
    'var(--color-danger)',           // Красный для расходов
    'var(--color-primary)',          // Синий
    'var(--color-success)',          // Зеленый
    'var(--color-text-secondary)',   // Серый
    'var(--color-surface-2)',        // Темно-серый
  ];

  return (
    <>
      <header className="projects-list-header">
        <button onClick={onBack} className="back-btn">
          <IconChevronRight style={{ transform: 'rotate(180deg)' }} />
          <span>Назад</span>
        </button>
        <h1>Отчет по проекту: {project.name}</h1>
      </header>

      <main className="project-detail-main" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-m)' }}>
        
        {/* Фильтры по датам */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
            📅 Фильтр по периоду
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gap: 'var(--spacing-m)', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            alignItems: 'end'
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: 'var(--spacing-s)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-s)',
                fontWeight: '500'
              }}>
                Начало периода
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-s)',
                  border: '1px solid var(--color-separator)',
                  borderRadius: 'var(--border-radius-s)',
                  backgroundColor: 'var(--color-surface-1)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-m)'
                }}
              />
            </div>
            
            <div>
              <label style={{
                display: 'block',
                marginBottom: 'var(--spacing-s)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-s)',
                fontWeight: '500'
              }}>
                Конец периода
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-s)',
                  border: '1px solid var(--color-separator)',
                  borderRadius: 'var(--border-radius-s)',
                  backgroundColor: 'var(--color-surface-1)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-m)'
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Основные финансовые показатели - унифицированный дашборд */}
        <div className="card project-section financial-dashboard">
          <div className="project-section-header">
            <h3>Финансовый дашборд</h3>
            <div className="header-actions">
              <button
                type="button"
                className="add-in-header-btn"
                title="Экспорт в PDF"
                aria-label="Экспорт в PDF"
                onClick={handleExportDashboardPDF}
              >
                <IconDownload />
              </button>
            </div>
          </div>
          <div className="project-section-body">
            <div className="dashboard-grid-final">
              <div className="dashboard-column">
                <div className="dashboard-item">
                  <span className="dashboard-value">{formatCurrency(totalEstimatesAmount)}</span>
                  <span className="dashboard-label">Сумма смет</span>
                </div>
                <div className="dashboard-item">
                  <span className="dashboard-value payment-value">{formatCurrency(totalIncome)}</span>
                  <span className="dashboard-label">Оплачено</span>
                </div>
              </div>
              <div className="dashboard-column">
                <div className="dashboard-item expenses-card">
                  <span className="dashboard-value expense-value">{formatCurrency(totalExpenses)}</span>
                  <span className="dashboard-label">Расходы</span>
                  <div className="dashboard-breakdown">
                    {Object.entries(expensesByCategory)
                      .sort(([,a], [,b]) => b - a)
                      .map(([category, amount]) => (
                        <div key={category} className="breakdown-item">
                          <span>{financeCategoryToRu(category)}</span>
                          <span>{formatCurrency(amount)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="dashboard-item profit-card-final">
              <span className="dashboard-label">Прибыль</span>
              <div className="profit-details-final">
                <span className="dashboard-value profit-value">{formatCurrency(profit)}</span>
                <span className="dashboard-label">Рентабельность {`${profitability.toFixed(0)}%`}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Расходы по категориям */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
            <IconCreditCard />
            Расходы по категориям
          </h3>
          
          {Object.keys(expensesByCategory).length > 0 ? (
            <>
              {/* Круговая диаграмма расходов */}
              <div style={{ marginBottom: 'var(--spacing-l)', display: 'flex', justifyContent: 'center' }}>
                <PieChart width={300} height={250}>
                  <Pie
                    data={pieChartData}
                    cx={150}
                    cy={125}
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Сумма']}
                    labelFormatter={(label: string) => `Категория: ${label}`}
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-1)',
                      border: '1px solid var(--color-separator)',
                      borderRadius: 'var(--border-radius-s)',
                      color: 'var(--color-text-primary)'
                    }}
                  />
                  <Legend 
                    formatter={(value: string) => (
                      <span style={{ color: 'var(--color-text-primary)' }}>{value}</span>
                    )}
                  />
                </PieChart>
              </div>

              {/* Список расходов по категориям */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-s)' }}>
                {Object.entries(expensesByCategory)
                  .sort(([,a], [,b]) => b - a) // Сортируем по убыванию
                  .map(([category, amount]) => (
                    <ListItem
                      key={category}
                      icon={<IconCreditCard />}
                      title={financeCategoryToRu(category)}
                      amountText={formatCurrency(amount)}
                      amountColor="var(--color-danger)"
                    />
                  ))}
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--spacing-l)' }}>
              Расходы не найдены
            </p>
          )}
        </div>

        {/* Детализация смет */}
        {projectEstimates.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
              Сметы проекта
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-s)' }}>
              {projectEstimates.map((estimate) => {
                const estimateTotal = estimate.items?.reduce((sum: number, item: any) => 
                  sum + (item.quantity * item.price), 0) || 0;
                
                return (
                  <ListItem
                    key={estimate.id}
                    icon={<IconTrendingUp />}
                    title={estimate.number || `Смета ${estimate.id?.slice(0, 8)}`}
                    subtitle={estimate.date ? new Date(estimate.date).toLocaleDateString('ru-RU') : 'Без даты'}
                    amountText={formatCurrency(estimateTotal)}
                    amountColor="var(--color-success)"
                  />
                );
              })}
            </div>
          </div>
        )}
      </main>
    </>
  );
};
