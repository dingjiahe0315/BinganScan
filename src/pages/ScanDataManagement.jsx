/**
 * 病案扫描数据管理页面
 * 文件位置：src/pages/ScanDataManagement.jsx
 */
import React, { useState } from 'react';
import { 
  Table, 
  Input, 
  Select, 
  DatePicker, 
  Checkbox, 
  Button, 
  Tag,
  message,
  Space,
  Row,
  Col
} from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined,
  FileTextOutlined,
  ScanOutlined
} from '@ant-design/icons';
import './ScanDataManagement.css';

const { RangePicker } = DatePicker;
const { Option } = Select;

// 模拟数据
const mockData = [
  {
    key: '1',
    序号: '1',
    病案号: '80000183',
    住院号: '23005689',
    姓名: '李小萌',
    入院日期: '2024-08-31',
    出院日期: '2024-09-05',
    住院次数: '1',
    住院天数: '6',
    出院科室: '消化内科',
    出院病区: '六病区',
    离院方式: '死亡',
    归档状态: '归档',
    存放位置: '产妇架',
    存放货架: 'B5-162-66',
    特殊患者标识: ['重点', '军人'],
    扫描状态: '未扫描',
    扫描页数: '22'
  },
  {
    key: '2',
    序号: '2',
    病案号: '80000185',
    住院号: '21568940',
    姓名: '张阳阳',
    入院日期: '2024-08-30',
    出院日期: '2024-09-05',
    住院次数: '3',
    住院天数: '7',
    出院科室: '消化内科',
    出院病区: '六病区',
    离院方式: '医嘱离院',
    归档状态: '归档',
    存放位置: '产妇架',
    存放货架: 'B5-132-67',
    特殊患者标识: [],
    扫描状态: '未扫描',
    扫描页数: '54'
  },
  {
    key: '3',
    序号: '3',
    病案号: '80000186',
    住院号: '2577974',
    姓名: '王一鸣',
    入院日期: '2024-09-03',
    出院日期: '2024-09-03',
    住院次数: '4',
    住院天数: '2',
    出院科室: '消化内科',
    出院病区: '六病区',
    离院方式: '',
    归档状态: '入库',
    存放位置: '地下货架',
    存放货架: 'B1-165-25',
    特殊患者标识: [],
    扫描状态: '未扫描',
    扫描页数: '9'
  },
  {
    key: '4',
    序号: '4',
    病案号: '80000187',
    住院号: '44779888',
    姓名: '张晓欧',
    入院日期: '2024-09-03',
    出院日期: '2024-09-04',
    住院次数: '2',
    住院天数: '2',
    出院科室: '消化内科',
    出院病区: '六病区',
    离院方式: '',
    归档状态: '入库',
    存放位置: '地下货架',
    存放货架: 'B3-162-28',
    特殊患者标识: [],
    扫描状态: '未扫描',
    扫描页数: '88'
  }
];

function ScanDataManagement() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [institution, setInstitution] = useState('默认当前机构');
  const [dischargeDate, setDischargeDate] = useState(null);
  const [medicalRecordNumber, setMedicalRecordNumber] = useState('');
  const [activeTab, setActiveTab] = useState('inpatient');
  
  const [archiveStatus, setArchiveStatus] = useState({
    archived: true,
    qualityControl: true,
    stored: true
  });
  
  const [borrowStatus, setBorrowStatus] = useState({
    inStock: true,
    borrowed: true
  });
  
  const [scanStatus, setScanStatus] = useState({
    notScanned: true,
    scanning: true,
    notArchived: true
  });

  const totalRecords = 1463;

  const handleSearch = () => {
    message.success('搜索成功');
  };

  const handleReset = () => {
    setInstitution('默认当前机构');
    setDischargeDate(null);
    setMedicalRecordNumber('');
    message.info('筛选条件已重置');
  };

  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const handleViewLog = (record) => {
    message.info(`查看病案号 ${record.病案号} 的流通日志`);
  };

  const handleScan = (record) => {
    message.info(`扫描病案号 ${record.病案号}`);
  };

  const renderSpecialTags = (tags) => {
    if (!tags || tags.length === 0) return null;
    return tags.map((tag, index) => (
      <Tag
        key={index}
        color={tag === '重点' ? 'red' : tag === '军人' ? 'green' : 'blue'}
      >
        {tag}
      </Tag>
    ));
  };

  const renderAction = (record) => {
    return (
      <Space size="small">
        <Button 
          type="link" 
          size="small"
          onClick={() => handleViewLog(record)}
        >
          流通日志
        </Button>
        {record.扫描状态 === '未扫描' && (
          <Button 
            type="link" 
            size="small"
            icon={<ScanOutlined />}
            onClick={() => handleScan(record)}
          >
            扫描
          </Button>
        )}
      </Space>
    );
  };

  const columns = [
    { title: '序号', dataIndex: '序号', key: '序号', width: 70, fixed: 'left', ellipsis: false },
    { title: '病案号', dataIndex: '病案号', key: '病案号', width: 120, fixed: 'left', ellipsis: false },
    { title: '住院号', dataIndex: '住院号', key: '住院号', width: 140, ellipsis: false },
    { title: '姓名', dataIndex: '姓名', key: '姓名', width: 100, ellipsis: false },
    { title: '入院日期', dataIndex: '入院日期', key: '入院日期', width: 160, ellipsis: false },
    { title: '出院日期', dataIndex: '出院日期', key: '出院日期', width: 160, ellipsis: false },
    { title: '住院次数', dataIndex: '住院次数', key: '住院次数', width: 160, ellipsis: false },
    { title: '住院天数', dataIndex: '住院天数', key: '住院天数', width: 160, ellipsis: false },
    { title: '出院科室', dataIndex: '出院科室', key: '出院科室', width: 160, ellipsis: false },
    { title: '出院病区', dataIndex: '出院病区', key: '出院病区', width: 160, ellipsis: false },
    { title: '离院方式', dataIndex: '离院方式', key: '离院方式', width: 160, ellipsis: false },
    { title: '归档状态', dataIndex: '归档状态', key: '归档状态', width: 160, ellipsis: false },
    { title: '存放位置', dataIndex: '存放位置', key: '存放位置', width: 160, ellipsis: false },
    { title: '存放货架', dataIndex: '存放货架', key: '存放货架', width: 160, ellipsis: false },
    { 
      title: '特殊患者标识', 
      key: '特殊患者标识', 
      render: (_, record) => renderSpecialTags(record.特殊患者标识),
      width: 200,
      ellipsis: false
    },
    { title: '扫描状态', dataIndex: '扫描状态', key: '扫描状态', width: 100, ellipsis: false },
    { title: '扫描页数', dataIndex: '扫描页数', key: '扫描页数', width: 100, ellipsis: false },
    { 
      title: '操作', 
      key: '操作', 
      render: (_, record) => renderAction(record),
      width: 200,
      fixed: 'right',
      ellipsis: false
    }
  ];



  return (
    <div className="scan-data-management">
      {/* 顶部导航栏 */}
      <header className="top-header">
        <div className="header-left">
          <div className="system-title">
            <FileTextOutlined className="title-icon" />
            病案流通管理系统
          </div>
          <nav className="nav-menu">
            <span className="nav-item">首页</span>
            <span className="nav-item nav-item-active">病案扫描管理</span>
          </nav>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="message-icon">📧<span className="message-badge">0</span></span>
            <span className="user-name">苏大强 (mzys04)</span>
            <span className="user-dept">大内科 2</span>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="main-content">
        {/* 内容容器 */}
        <div className="content-container">
          {/* 第一行：搜索筛选区 */}
          <Row className="search-row">
            <Col span={24}>
              <div className="search-section">
                {/* 搜索条件 */}
                <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
                  {/* 机构名称：占 4/24 = 16.7% 宽度 */}
                  <Col xs={4} sm={4} md={4} lg={4}>
                    <div className="search-field">
                      <label className="search-label">机构名称：</label>
                      <Select 
                        value={institution}
                        onChange={setInstitution}
                        style={{ width: '100%' }}
                      >
                        <Option value="默认当前机构">默认当前机构</Option>
                      </Select>
                    </div>
                  </Col>
                  
                  {/* 出院日期：占 6/24 = 25% 宽度 */}
                  <Col xs={6} sm={6} md={6} lg={6}>
                    <div className="search-field">
                      <label className="search-label">出院日期：</label>
                      <RangePicker 
                        value={dischargeDate}
                        onChange={setDischargeDate}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </Col>
                  
                  {/* 病案号：占 5/24 = 20.8% 宽度 */}
                  <Col xs={5} sm={5} md={5} lg={5}>
                    <div className="search-field">
                      <label className="search-label">病案号：</label>
                      <Input 
                        placeholder="请输入病案号"
                        value={medicalRecordNumber}
                        onChange={(e) => setMedicalRecordNumber(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </Col>
                  
                  {/* 搜索按钮 + 病案扫描按钮：共占 9/24 = 37.5% 宽度 */}
                  <Col xs={9} sm={9} md={9} lg={9}>
                    <div className="search-field" style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button 
                          type="primary" 
                          icon={<SearchOutlined />}
                          onClick={handleSearch}
                        >
                          搜索
                        </Button>
                        <Button 
                          icon={<ReloadOutlined />}
                          onClick={handleReset}
                        >
                          重置
                        </Button>
                      </div>
                      <Button type="primary" size="large" className="scan-btn" style={{ marginLeft: 200 }}>病案扫描</Button>
                    </div>
                  </Col>
                </Row>

                {/* 标签页 + 状态筛选 */}
                <Row gutter={16} align="middle" style={{ marginTop: 16 }}>
                  {/* 左侧：归档状态、借阅标志、扫描状态 */}
                  <Col xs={24} sm={18} md={18} lg={19}>
                    <div style={{ display: 'flex', gap: 80, alignItems: 'center', flexWrap: 'nowrap' }}>
                      <div className="filter-group">
                        <span className="filter-label">归档状态：</span>
                        <Checkbox 
                          checked={archiveStatus.archived}
                          onChange={(e) => setArchiveStatus({...archiveStatus, archived: e.target.checked})}
                        >
                          归档
                        </Checkbox>
                        <Checkbox 
                          checked={archiveStatus.qualityControl}
                          onChange={(e) => setArchiveStatus({...archiveStatus, qualityControl: e.target.checked})}
                        >
                          质控
                        </Checkbox>
                        <Checkbox 
                          checked={archiveStatus.stored}
                          onChange={(e) => setArchiveStatus({...archiveStatus, stored: e.target.checked})}
                        >
                          入库
                        </Checkbox>
                      </div>
                      
                      <div className="filter-group">
                        <span className="filter-label">借阅标志：</span>
                        <Checkbox 
                          checked={borrowStatus.inStock}
                          onChange={(e) => setBorrowStatus({...borrowStatus, inStock: e.target.checked})}
                        >
                          在库
                        </Checkbox>
                        <Checkbox 
                          checked={borrowStatus.borrowed}
                          onChange={(e) => setBorrowStatus({...borrowStatus, borrowed: e.target.checked})}
                        >
                          借出
                        </Checkbox>
                      </div>
                      
                      <div className="filter-group">
                        <span className="filter-label">扫描状态：</span>
                        <Checkbox 
                          checked={scanStatus.notScanned}
                          onChange={(e) => setScanStatus({...scanStatus, notScanned: e.target.checked})}
                        >
                          未扫描
                        </Checkbox>
                        <Checkbox 
                          checked={scanStatus.scanning}
                          onChange={(e) => setScanStatus({...scanStatus, scanning: e.target.checked})}
                        >
                          扫描中
                        </Checkbox>
                        <Checkbox 
                          checked={scanStatus.notArchived}
                          onChange={(e) => setScanStatus({...scanStatus, notArchived: e.target.checked})}
                        >
                          未扫描
                        </Checkbox>
                      </div>
                    </div>
                  </Col>
                  
                  {/* 右侧：住院/急诊/门诊标签页 */}
                  <Col xs={24} sm={6} md={6} lg={5}>
                    <div className="tabs-wrapper">
                      <div 
                        className={`tab-item ${activeTab === 'inpatient' ? 'active' : ''}`}
                        onClick={() => setActiveTab('inpatient')}
                      >
                        住院
                      </div>
                      <div 
                        className={`tab-item ${activeTab === 'emergency' ? 'active' : ''}`}
                        onClick={() => setActiveTab('emergency')}
                      >
                        急诊
                      </div>
                      <div 
                        className={`tab-item ${activeTab === 'outpatient' ? 'active' : ''}`}
                        onClick={() => setActiveTab('outpatient')}
                      >
                        门诊
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>

          {/* 第二行：表格区 */}
          <Row className="table-row">
            <Col span={24}>
              <div className="table-section">
                <Table
                  rowKey="key"
                  columns={columns}
                  dataSource={mockData}
                  pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    pageSizeOptions: ['10', '20', '24', '30', '50'],
                    showSizeChanger: true,
                    total: totalRecords,
                    showTotal: (total) => `共 ${total} 条`,
                    showQuickJumper: true
                  }}
                  onChange={handleTableChange}
                  scroll={{ x: true }}
                  size="middle"
                />
              </div>
            </Col>
          </Row>
        </div>
      </main>
    </div>
  );
}

export default ScanDataManagement;