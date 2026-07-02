import DocumentsPanel from '../components/DocumentsPanel';

function DocumentsPage(props) {
  return (
    <>
      <section className="page-hero">
        <div>
          <p className="eyebrow">Документооборот</p>
          <h2>Списък и филтриране</h2>
          <p>Преглеждай, филтрирай и отваряй документи за корекция или експорт.</p>
        </div>
      </section>
      <DocumentsPanel {...props} />
    </>
  );
}

export default DocumentsPage;

