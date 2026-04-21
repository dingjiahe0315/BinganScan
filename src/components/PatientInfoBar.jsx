import { Row, Col, Input, Button, Space, Progress } from 'antd';
import { SearchOutlined, UploadOutlined } from '@ant-design/icons';

const { Search } = Input;

function PatientInfoBar({
  medicalRecordArchiveId,
  setMedicalRecordArchiveId,
  onScan,
  onInsertPage,
  onRescan,
  onUploadClick,
  onComplete,
  onDeleteSelected,
  onSelectAll,
  selectedCount,
  isScanning,
  scanProgress,
  scanEnabled,
  uploadComplete
}) {
  return (
    <div className="patient-info-bar-wrapper">
      <div className="patient-info-bar">
        <Row justify="space-between" align="middle" gutter={[16, 8]}>
          <Col>
            <Space size="middle">
              <Space.Compact>
                <span style={{ whiteSpace: 'nowrap', padding: '0 8px', lineHeight: '32px', backgroundColor: '#f0f0f0', borderRadius: '2px 0 0 2px' }}>病案条码：</span>
                <Search
                  placeholder="扫码枪或者手动输入条码号"
                  value={medicalRecordArchiveId}
                  onChange={(e) => setMedicalRecordArchiveId(e.target.value)}
                  onSearch={onScan}
                  style={{ width: 240 }}
                  enterButton={<SearchOutlined />}
                  allowClear
                />
              </Space.Compact>
              <Space size="small" className="patient-info">
                <span className="info-label">病人姓名：</span>
                <span className="info-value">李二二</span>
                <span className="info-label">住院次：</span>
                <span className="info-value">第2次住院</span>
                <span className="info-label">出院科室：</span>
                <span className="info-value">消化内科</span>
                <span className="info-label">出院日期：</span>
                <span className="info-value">2024-08-09</span>
              </Space>
            </Space>
          </Col>
          <Col>
            <Space size="middle" align="center">
              <Button
                type="primary"
                onClick={onSelectAll}
                className="select-all-btn"
              >
                全选
              </Button>
              <Button
                type="primary"
                danger
                onClick={onDeleteSelected}
                disabled={selectedCount === 0}
              >
                删除
              </Button>
              <Button
                type="primary"
                onClick={onScan}
                disabled={!scanEnabled || isScanning}
                className="start-scan-btn"
              >
                开始扫描
              </Button>
              <Button
                type="primary"
                onClick={onInsertPage}
                disabled={!scanEnabled || isScanning || selectedCount === 0}
              >
                插描
              </Button>
              <Button
                type="primary"
                onClick={onRescan}
                disabled={!scanEnabled || isScanning || selectedCount === 0}
              >
                替扫
              </Button>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={onUploadClick}
                disabled={!scanEnabled || isScanning}
              >
                扫描上传
              </Button>
              <Button
                type="primary"
                onClick={onComplete}
                disabled={!scanEnabled || isScanning || !uploadComplete}
              >
                扫描完成
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {isScanning && (
        <div className="scan-progress-bar">
          <Progress
            percent={scanProgress}
            status="active"
            showInfo={true}
            format={(percent) => `扫描中... ${percent}%`}
          />
        </div>
      )}
    </div>
  );
}

export default PatientInfoBar;
