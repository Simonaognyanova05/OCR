import DashboardPanel from '../components/DashboardPanel';
import MvpFlow from '../components/MvpFlow';

function DashboardPage({ dashboard, onRefresh }) {
  return (
    <>
      <section className="page-hero">
        <div>
          <p className="eyebrow">Финансов контрол</p>
          <h2>Табло за разходи и документи</h2>
          <p>Следи месечните разходи, ДДС, доставчици и категории от одобрените документи.</p>
        </div>
      </section>
      <MvpFlow />
      <DashboardPanel dashboard={dashboard} onRefresh={onRefresh} />
    </>
  );
}

export default DashboardPage;

