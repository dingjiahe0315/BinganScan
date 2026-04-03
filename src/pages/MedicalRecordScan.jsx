/**
 * 病案扫描页面组件
 * 文件位置：src/pages/MedicalRecordScan.jsx
 * 功能：病案扫描管理，包括文档预览、分类、扫描操作等
 * 
 * 主要功能模块：
 * 1. 顶部信息栏 - 显示病人信息、条码输入、操作按钮
 * 2. 左侧导航菜单 - 病案分类树形菜单
 * 3. 文档预览区 - 文档缩略图网格展示
 */
import React, { useState } from 'react';
import { 
  Layout, 
  Menu, 
  Checkbox, 
  Button, 
  Input, 
  message,
  Modal,
  Row, 
  Col,
  Space
} from 'antd';
import { 
  FolderOutlined, 
  FileTextOutlined, 
  FilePdfOutlined,
  PlusOutlined,
  DeleteOutlined,
  ScanOutlined,
  RotateLeftOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  RightOutlined,
  DownOutlined
} from '@ant-design/icons';
import './MedicalRecordScan.css';

const { Search } = Input;
const { Header, Content, Sider } = Layout;

/**
 * 左侧导航菜单数据结构（为Ant Design Menu准备）
 */
const menuItems = [
  {
    key: 'overview',
    label: '总览',
    icon: <FolderOutlined />
  },
  {
    key: 'record-home',
    label: '病案首页',
    icon: <FileTextOutlined />
  },
  {
    key: 'admission-record',
    label: '入院记录',
    icon: <FileTextOutlined />
  },
  {
    key: 'discharge-related',
    label: '出院相关记录',
    icon: <FolderOutlined />,
    children: [
      { 
        key: 'discharge-death', 
        label: '出院（死亡）记录', 
        icon: <FilePdfOutlined /> 
      },
      { 
        key: 'health-education', 
        label: '患者健康教育处方', 
        icon: <FilePdfOutlined /> 
      },
      { 
        key: 'discharge-certificate', 
        label: '出院医疗证明', 
        icon: <FilePdfOutlined /> 
      }
    ]
  },
  {
    key: 'progress-note',
    label: '病程记录',
    icon: <FolderOutlined />,
    children: [
      { 
        key: 'discharge-discussion', 
        label: '出院（死亡）讨论', 
        icon: <FilePdfOutlined /> 
      }
    ]
  },
  {
    key: 'consultation-record',
    label: '知情谈话记录',
    icon: <FolderOutlined />
  },
  {
    key: 'surgery-related',
    label: '手术相关记录与资料',
    icon: <FolderOutlined />
  },
  {
    key: 'approval-sheet',
    label: '审批单',
    icon: <FolderOutlined />
  },
  {
    key: 'consultation-sheet',
    label: '会诊单',
    icon: <FolderOutlined />
  },
  {
    key: 'specialist-assessment',
    label: '专科评估记录单',
    icon: <FolderOutlined />
  },
  {
    key: 'difficult-case',
    label: '疑难病历讨论',
    icon: <FolderOutlined />
  },
  {
    key: 'lab-report',
    label: '检查检验报告',
    icon: <FolderOutlined />
  },
  {
    key: 'temperature-sheet',
    label: '体温单',
    icon: <FolderOutlined />
  },
  {
    key: 'doctor-order',
    label: '医嘱单',
    icon: <FolderOutlined />
  },
  {
    key: 'nursing-record',
    label: '护理记录',
    icon: <FolderOutlined />
  },
  {
    key: 'other-related',
    label: '其他相关资料',
    icon: <FolderOutlined />
  }
];

/**
 * 生成模拟文档数据
 * @returns {Array} 文档数组，包含文档分类、图片、选择状态等
 */
const generateMockDocuments = () => {
  const docs = [];
  const categories = ['病案首页', '入院记录', '首次病程'];
  
  for (let i = 0; i < 32; i++) {
    const category = categories[i % categories.length];
    docs.push({
      key: i,
      category: category,
      image: `https://via.placeholder.com/200x280?text=${category}-${i + 1}`,
      isSelected: i < 15,
      isClassified: i < 15
    });
  }
  
  return docs;
};

/**
 * 病案扫描主组件
 */
function MedicalRecordScan() {
  // ========== State 状态管理 ==========
  const [barcode, setBarcode] = useState(''); // 病案条码
  const [selectedMenu, setSelectedMenu] = useState('overview'); // 当前选中的菜单项
  const [expandedMenus, setExpandedMenus] = useState(['discharge-related', 'progress-note']); // 展开的菜单项
  const [documents, setDocuments] = useState(generateMockDocuments()); // 文档列表
  const [selectAll, setSelectAll] = useState(false); // 全选状态

  // ========== 计算属性 ==========
  const selectedCount = documents.filter(doc => doc.isSelected).length; // 已选中文档数
  const classifiedCount = documents.filter(doc => doc.isClassified).length; // 已分类文档数
  const unclassifiedCount = documents.length - classifiedCount; // 未分类文档数

  // ========== 事件处理函数 ==========
  
  /**
   * 菜单展开/收起处理
   */
  const handleMenuOpenChange = (keys) => {
    setExpandedMenus(keys);
  };

  /**
   * 菜单项点击处理
   */
  const handleMenuClick = ({ key }) => {
    setSelectedMenu(key);
  };

  /**
   * 全选/取消全选处理
   */
  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    setSelectAll(checked);
    setDocuments(docs => docs.map(doc => ({
      ...doc,
      isSelected: checked
    })));
  };

  /**
   * 选择/取消选择单个文档
   */
  const handleSelectDocument = (docKey) => {
    setDocuments(docs => docs.map(doc => 
      doc.key === docKey 
        ? { ...doc, isSelected: !doc.isSelected }
        : doc
    ));
  };

  /**
   * 删除文档
   */
  const handleDeleteDocument = (docKey) => {
    setDocuments(docs => docs.filter(doc => doc.key !== docKey));
    message.success('删除成功');
  };

  /**
   * 开始扫描操作
   */
  const handleStartScan = () => {
    if (selectedCount === 0) {
      message.warning('请先选择要扫描的文档');
      return;
    }
    message.success(`开始扫描 ${selectedCount} 个文档`);
  };

  /**
   * 插入页面操作
   */
  const handleInsertPage = () => {
    message.info('插入页面功能');
  };

  /**
   * 替扫操作
   */
  const handleRescan = () => {
    message.info('替扫功能');
  };

  /**
   * 扫描暂存操作
   */
  const handleSaveTemp = () => {
    message.success('扫描暂存成功');
  };

  /**
   * 扫描完成操作
   */
  const handleScanComplete = () => {
    Modal.confirm({
      title: '确认完成扫描？',
      content: `已完成 ${classifiedCount} 页文档的分类`,
      onOk() {
        message.success('扫描完成');
      }
    });
  };

  // ========== JSX 渲染 ==========
  return (
    <Layout className="medical-record-scan">
      {/* ==================== 顶部标题栏 ==================== */}
      <div className="title-bar">
        <h1 className="page-title">病案扫描</h1>
        <span className="close-btn">×</span>
      </div>
      
      {/* ==================== 信息栏 ==================== */}
      <div className="info-bar">
        <Row align="middle" justify="space-between" style={{ width: '100%' }}>
          <Col>
            <Space size="middle">
              {/* 病案条码输入框 */}
              <Space size="small">
                <span className="info-label">病案条码：</span>
                <Search
                  placeholder="扫码枪或者手工调入"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  style={{ width: 180 }}
                  allowClear
                />
              </Space>
              {/* 病人基本信息 */}
              <Space size="small">
                <span className="info-label">病人姓名：</span>
                <span className="info-value">李二二</span>
              </Space>
              <Space size="small">
                <span className="info-label">住院次：</span>
                <span className="info-value">第2次住院</span>
              </Space>
              <Space size="small">
                <span className="info-label">出院科室：</span>
                <span className="info-value">消化内科</span>
              </Space>
              <Space size="small">
                <span className="info-label">出院日期：</span>
                <span className="info-value">2024-08-09</span>
              </Space>
            </Space>
          </Col>
          <Col>
            <Space size="middle" align="center">
              {/* 全选复选框 */}
              <Button 
                type="primary"
                ghost
                onClick={handleSelectAll}
                className="select-all-btn"
              >
                全选
              </Button>
              {/* 删除按钮 */}
              <Button 
                type="primary"
                ghost
                disabled={selectedCount === 0}
              >
                删除
              </Button>
              {/* 主要操作按钮组 */}
              <Space size="small">
                <Button 
                  type="primary" 
                  onClick={handleStartScan}
                >
                  开始扫描
                </Button>
                <Button 
                  type="primary" 
                  onClick={handleInsertPage}
                >
                  插描
                </Button>
                <Button 
                  type="primary" 
                  onClick={handleRescan}
                >
                  替扫
                </Button>
                <Button 
                  type="primary" 
                  onClick={handleSaveTemp}
                >
                  扫描暂存
                </Button>
                <Button 
                  type="primary" 
                  onClick={handleScanComplete}
                >
                  扫描完成
                </Button>
              </Space>
            </Space>
          </Col>
        </Row>
      </div>

      {/* ==================== 主内容区 ==================== */}
      <Layout className="main-content">
        {/* 左侧导航栏 */}
        <Sider width={260} className="left-sidebar">
          <Menu
            mode="inline"
            selectedKeys={[selectedMenu]}
            openKeys={expandedMenus}
            onOpenChange={handleMenuOpenChange}
            onClick={handleMenuClick}
            items={menuItems}
            expandIcon={({ isOpen }) => isOpen ? <DownOutlined /> : <RightOutlined />}
          />
        </Sider>

        {/* 右侧文档预览区 */}
        <Content className="document-area">
          {/* 文档区域头部 */}
          <div className="document-header">
            <div className="current-category">
              总览
              <span className="close-icon">×</span>
            </div>
          </div>
          
          {/* 文档网格 */}
          <div className="document-grid">
            {documents.map(doc => (
              <div 
                key={doc.key}
                className={`document-card ${doc.isSelected ? 'selected' : ''} ${doc.isClassified ? 'classified' : ''}`}
                onClick={() => handleSelectDocument(doc.key)}
              >
                {/* 文档卡片头部 */}
                <div className="card-header">
                  <Checkbox
                    checked={doc.isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectDocument(doc.key);
                    }}
                    className="doc-checkbox"
                  />
                  <span 
                    className="card-close-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDocument(doc.key);
                    }}
                  >
                    ×
                  </span>
                </div>
                {/* 文档缩略图 */}
                <div className="card-image">
                  <img src={doc.image} alt={doc.category} />
                </div>
                {/* 文档分类标签 */}
                <div className="card-footer">
                  {doc.category}
                </div>
              </div>
            ))}
          </div>

          {/* 文档区域底部 */}
          <div className="document-footer">
            <Space size="small">
              <span>共：{documents.length}页，</span>
              <span className="classified-count">已分类{classifiedCount}页（蓝色边框），</span>
              <span className="unclassified-count">未分类{unclassifiedCount}页</span>
            </Space>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default MedicalRecordScan;
