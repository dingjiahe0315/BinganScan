import { Checkbox, Space } from 'antd';

function DocumentGrid({
  filteredDocuments,
  documents,
  selectedMenuKey,
  selectedMenu,
  setSelectedMenuKey,
  setSelectedMenu,
  classifiedCount,
  unclassifiedCount,
  draggedIndex,
  dragOverIndex,
  onDragStart,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragEnd,
  onSelectDocument,
  onDeleteDocument,
  onDocumentDragStartToMenu,
  onMenuDragEnd,
  setPreviewImage,
}) {
  return (
    <div className="document-area">
      <div className="document-header">
        <div className="current-category">
          {selectedMenuKey ? `菜单项绑定的图片` : '总览'}
          {selectedMenuKey && (
            <span
              className="close-icon"
              onClick={() => {
                setSelectedMenuKey(null);
                setSelectedMenu('overview');
              }}
            >
              ×
            </span>
          )}
        </div>
      </div>

      <div className="document-grid">
        {filteredDocuments.map((doc, index) => {
          const originalIndex = documents.findIndex(d => d.key === doc.key);
          return (
            <div
              key={doc.key}
              className={`document-card ${doc.isSelected ? 'selected' : ''} ${doc.isClassified ? 'classified' : ''} ${draggedIndex === originalIndex ? 'dragging' : ''} ${dragOverIndex === originalIndex ? 'drag-over' : ''} ${doc.menuCode && doc.menuCode !== '-1' ? 'bound' : ''}`}
              draggable
              onDragStart={(e) => {
                onDragStart(e, originalIndex);
                onDocumentDragStartToMenu(e, doc.key);
              }}
              onDragOver={(e) => onDragOver(e, originalIndex)}
              onDragEnter={(e) => onDragEnter(e, originalIndex)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, originalIndex)}
              onDragEnd={() => {
                onDragEnd();
                onMenuDragEnd();
              }}
            >
              <div className="card-header">
                <Checkbox
                  checked={doc.isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    onSelectDocument(doc.key);
                  }}
                  className="doc-checkbox"
                />
                <span
                  className="card-close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDocument(doc.key);
                  }}
                >
                  ×
                </span>
                {doc.menuCode && doc.menuCode !== '-1' && (
                  <span className="bound-badge">已绑定</span>
                )}
              </div>
              <div
                className="card-image"
                onClick={() => {
                  if (doc.fullImage) {
                    setPreviewImage(doc.fullImage);
                  }
                }}
              >
                {doc.image ? (
                  <img src={doc.image} alt={doc.category} loading="lazy" />
                ) : (
                  <div className="load-failed">加载失败</div>
                )}
              </div>
              <div className="card-footer">
                {doc.fileName ? doc.fileName : doc.category}
              </div>
            </div>
          );
        })}
      </div>

      <div className="document-footer">
        <Space size="small">
          <span>共：{documents.length}页，</span>
          {selectedMenuKey && (
            <span className="classified-count">
              当前显示：{filteredDocuments.length}页（绑定到菜单项），
            </span>
          )}
          <span className="classified-count">已分类{classifiedCount}页（蓝色边框），</span>
          <span className="unclassified-count">未分类{unclassifiedCount}页</span>
        </Space>
      </div>
    </div>
  );
}

export default DocumentGrid;
