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
  Checkbox, 
  Button, 
  Input, 
  Tag, 
  message,
  Modal,
  Tooltip
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
  CheckCircleOutlined
} from '@ant-design/icons';
import './MedicalRecordScan.css';

const { Search } = Input;

/**
 * 左侧导航菜单数据结构
 * 包含所有病案文档分类，支持多级嵌套
 */
// 模拟左侧导航菜单数据
const menuData = [
  {
    key: 'overview',
    title: '总览',
    icon: <FolderOutlined />,
    children: []
  },
  {
    key: 'record-home',
    title: '病案首页',
    icon: <FileTextOutlined />,
    children: []
  },
  {
    key: 'admission-record',
    title: '入院记录',
    icon: <FileTextOutlined />,
    children: []
  },
  {
    key: 'discharge-related',
    title: '出院相关记录',
    icon: <FolderOutlined />,
    children: [
      { key: 'discharge-death', title: '出院（死亡）记录', icon: <FilePdfOutlined /> },
      { key: 'health-education', title: '患者健康教育处方', icon: <FilePdfOutlined /> },
      { key: 'discharge-certificate', title: '出院医疗证明', icon: <FilePdfOutlined /> }
    ]
  },
  {
    key: 'progress-note',
    title: '病程记录',
    icon: <FolderOutlined />,
    children: [
      { key: 'discharge-discussion', title: '出院（死亡）讨论', icon: <FilePdfOutlined /> }
    ]
  },
  {
    key: 'consultation-record',
    title: '知情谈话记录',
    icon: <FolderOutlined />,
    children: []
  },
  {
    key: 'surgery-related',
    title: '手术相关记录与资料',
    icon: <FolderOutlined />,
    children: []
  },
  {
    key: 'approval-sheet',
    title: '审批单',
    icon: <FolderOutlined />,
    children: []
  },
  {
    key: 'consultation-sheet',
    title: '会诊单',
    icon: <FolderOutlined />,
    children: []
  },
  {
    key: 'specialist-assessment',
    title: '专科评估记录单',
    icon: <FolderOutlined />,
    children: []
  },
  {
    key: 'difficult-case',
    title: '疑难病历讨论',
    icon: <FolderOutlined />,
    children: []
  },
  {
    key: 'lab-report',
    title: '检查检验报告',
    icon: <FolderOutlined />,
    children: []
  },
  {
    key: 'temperature-sheet',
    title: '体温单',
    icon: <FolderOutlined />,
    children: []
  },
  {
    key: 'doctor-order',
    title: '医嘱单',
    icon: <FolderOutlined />,
    children: []
  },
  {
    key: 'nursing-record',
    title: '护理记录',
    icon: <FolderOutlined />,
    children: []
  },
  {
    key: 'other-related',
    title: '其他相关资料',
    icon: <FolderOutlined />,
    children: []
  }
];

/**
 * 生成模拟文档数据
 * @returns {Array} 文档数组，包含文档分类、图片、选择状态等
 */
// 模拟文档数据
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
   * 切换菜单展开/收起状态
   * @param {string} menuKey - 菜单项的 key
   */
  const toggleMenuExpand = (menuKey) => {
    setExpandedMenus(prev => 
      prev.includes(menuKey) 
        ? prev.filter(key => key !== menuKey)
        : [...prev, menuKey]
    );
  };

  /**
   * 菜单项点击处理
   * @param {string} menuKey - 菜单项的 key
   */
  const handleMenuClick = (menuKey) => {
    setSelectedMenu(menuKey);
  };

  /**
   * 全选/取消全选处理
   * @param {Event} e - 复选框变化事件
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
   * @param {number} docKey - 文档的 key
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
   * @param {number} docKey - 文档的 key
   */
  const handleDeleteDocument = (docKey) => {
    setDocuments(docs => docs.filter(doc => doc.key !== docKey));
    message.success('删除成功');
  };

  /**
   * 开始扫描操作
   * 校验是否选择文档，显示扫描提示
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
   * 用于在现有文档中插入新页面
   */
  const handleInsertPage = () => {
    message.info('插入页面功能');
  };

  /**
   * 替扫操作
   * 重新扫描已有文档
   */
  const handleRescan = () => {
    message.info('替扫功能');
  };

  /**
   * 扫描暂存操作
   * 保存当前扫描进度
   */
  const handleSaveTemp = () => {
    message.success('扫描暂存成功');
  };

  /**
   * 扫描完成操作
   * 弹出确认框，确认后完成扫描
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

  // ========== 渲染辅助函数 ==========
  
  /**
   * 渲染菜单图标
   * @param {ReactNode} icon - 图标组件
   * @param {boolean} hasChildren - 是否有子菜单
   * @returns {ReactNode} 渲染的图标
   */
  const renderMenuIcon = (icon, hasChildren) => {
    if (hasChildren) {
      return icon;
    }
    return <span style={{ marginLeft: 20 }}>{icon}</span>;
  };

  /**
   * 递归渲染菜单项
   * @param {Object} item - 菜单项数据
   * @param {number} level - 菜单层级（用于缩进）
   * @returns {ReactNode} 渲染的菜单项
   */
  const renderMenuItem = (item, level = 0) => {
    const hasChildren = item.children && item.children.length > 0; // 判断是否有子菜单
    const isExpanded = expandedMenus.includes(item.key); // 判断是否展开
    const isSelected = selectedMenu === item.key; // 判断是否选中

    return (
      <div key={item.key}>
        <div 
          className={`menu-item ${isSelected ? 'menu-item-selected' : ''}`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleMenuExpand(item.key); // 有子菜单时切换展开状态
            } else {
              handleMenuClick(item.key); // 无子菜单时选中该项
            }
          }}
        >
          <span className="menu-icon">
            {renderMenuIcon(item.icon, hasChildren)}
          </span>
          <span className="menu-title">{item.title}</span>
          {hasChildren && (
            <span className={`menu-arrow ${isExpanded ? 'expanded' : ''}`}>
              ▶
            </span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="menu-children">
            {item.children.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // ========== JSX 渲染 ==========
  return (
    <div className="medical-record-scan">
      {/* ==================== 顶部信息栏 ==================== */}
      {/* 包含：页面标题、病案条码输入、病人信息、操作按钮组 */}
      <div className="top-bar">
        <div className="top-bar-left">
          <h1 className="page-title">病案扫描</h1>
          {/* 病案条码输入框 - 支持扫码枪或手工输入 */}
          <div className="info-group">
            <label>病案条码：</label>
            <Search
              placeholder="扫码枪或者手工调入"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
          </div>
          {/* 病人基本信息展示 */}
          <div className="info-group">
            <span className="info-label">病人姓名：</span>
            <span className="info-value">李二二</span>
          </div>
          <div className="info-group">
            <span className="info-label">住院次：</span>
            <span className="info-value">第 2 次住院</span>
          </div>
          <div className="info-group">
            <span className="info-label">出院科室：</span>
            <span className="info-value">消化内科</span>
          </div>
          <div className="info-group">
            <span className="info-label">出院日期：</span>
            <span className="info-value">2024-08-09</span>
          </div>
        </div>
        <div className="top-bar-right">
          {/* 全选复选框 */}
          <Checkbox 
            checked={selectAll}
            onChange={handleSelectAll}
            className="select-all-checkbox"
          >
            全选
          </Checkbox>
          {/* 删除按钮 - 未选中时禁用 */}
          <Button 
            danger 
            icon={<DeleteOutlined />}
            disabled={selectedCount === 0}
          >
            删除
          </Button>
          {/* 主要操作按钮组 */}
          <div className="button-group">
            <Button 
              type="primary" 
              icon={<ScanOutlined />}
              onClick={handleStartScan}
            >
              开始扫描
            </Button>
            <Button icon={<PlusOutlined />} onClick={handleInsertPage}>
              插描
            </Button>
            <Button icon={<RotateLeftOutlined />} onClick={handleRescan}>
              替扫
            </Button>
            <Button icon={<SaveOutlined />} onClick={handleSaveTemp}>
              扫描暂存
            </Button>
            <Button 
              type="primary" 
              icon={<CheckCircleOutlined />}
              onClick={handleScanComplete}
            >
              扫描完成
            </Button>
          </div>
        </div>
      </div>

      {/* ==================== 主内容区 ==================== */}
      <div className="main-content">
        {/* 左侧导航栏 - 病案分类树形菜单 */}
        <div className="left-sidebar">
          <div className="menu-container">
            {menuData.map(item => renderMenuItem(item))}
          </div>
        </div>

        {/* 右侧文档预览区 - 文档缩略图网格 */}
        <div className="document-area">
          {/* 文档区域头部 - 显示当前分类 */}
          <div className="document-header">
            <div className="current-category">
              总览
              <span className="close-icon">×</span>
            </div>
          </div>
          
          {/* 文档网格 - 展示所有文档缩略图 */}
          <div className="document-grid">
            {documents.map(doc => (
              <div 
                key={doc.key}
                className={`document-card ${doc.isSelected ? 'selected' : ''} ${doc.isClassified ? 'classified' : ''}`}
              >
                {/* 文档卡片头部 - 复选框和删除按钮 */}
                <div className="card-header">
                  <Checkbox
                    checked={doc.isSelected}
                    onChange={() => handleSelectDocument(doc.key)}
                    className="doc-checkbox"
                  />
                  <span 
                    className="close-btn"
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

          {/* 文档区域底部 - 统计信息 */}
          <div className="document-footer">
            <span>共：{documents.length}页，</span>
            <span className="classified-count">已分类{classifiedCount}页（蓝色边框），</span>
            <span className="unclassified-count">未分类{unclassifiedCount}页</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MedicalRecordScan;
