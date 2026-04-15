import React, { useState, useEffect } from 'react';
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
  Space,
  Progress,
  Image,
  Spin
} from 'antd';
import { 
  FolderOutlined, 
  FileTextOutlined, 
  FilePdfOutlined
} from '@ant-design/icons';
import './MedicalRecordScan.css';
import * as UTIF from 'utif';
import { getMedicalRecordMenu, getMockMedicalRecordMenu } from '../api/menuApi';

const { Search } = Input;
const { Content, Sider } = Layout;



const tifFileNames = [
  '1.tiff', '2.tiff', '3.tiff', '4.tiff', '5.tiff',
  '6.tiff', '7.tiff', '8.tiff', '9.tiff', '10.tiff',
  '11.tiff', '12.tiff', '13.tiff', '14.tiff', '15.tiff',
  '16.tiff', 'blue-tiff-jpeg-comp.tif', 'blue-tiff-no-comp.tif',
  'blue-tiff-zip-comp.tif', 'Space02-Default.tiff'
];

const loadTifImage = async (filePath) => {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    
    const ifds = UTIF.decode(arrayBuffer);
    
    if (ifds && ifds.length > 0) {
      const ifd = ifds[0];
      UTIF.decodeImage(arrayBuffer, ifd);
      
      const canvas = document.createElement('canvas');
      canvas.width = ifd.width;
      canvas.height = ifd.height;
      const ctx = canvas.getContext('2d');
      
      const rgba = UTIF.toRGBA8(ifd);
      const imageData = ctx.createImageData(ifd.width, ifd.height);
      imageData.data.set(rgba);
      ctx.putImageData(imageData, 0, 0);
      
      const resizeCanvas = document.createElement('canvas');
      const maxWidth = 400;
      const maxHeight = 560;
      let ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height, 1);
      resizeCanvas.width = Math.floor(canvas.width * ratio);
      resizeCanvas.height = Math.floor(canvas.height * ratio);
      
      const resizeCtx = resizeCanvas.getContext('2d');
      resizeCtx.drawImage(canvas, 0, 0, resizeCanvas.width, resizeCanvas.height);
      
      return resizeCanvas.toDataURL('image/jpeg', 0.85);
    }
    
    throw new Error('无法解析 TIF 文件');
  } catch (error) {
    console.error('加载 TIF 图片失败:', error);
    return null;
  }
};

function MedicalRecordScan() {
  // 默认菜单项（当API调用失败时使用）
  const defaultMenuItems = [
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

  const [barcode, setBarcode] = useState('');
  const [selectedMenu, setSelectedMenu] = useState('overview');
  const [expandedMenus, setExpandedMenus] = useState(['discharge-related', 'progress-note']);
  const [documents, setDocuments] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState(null);
  // 新增状态：菜单数据
  const [menuItems, setMenuItems] = useState(defaultMenuItems);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState(null);
  // 拖拽排序状态
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // 获取菜单数据的effect
  useEffect(() => {
    const fetchMenuData = async () => {
      setMenuLoading(true);
      setMenuError(null);
      
      try {
        // 尝试调用真实API获取菜单数据
        const response = await getMedicalRecordMenu();
        
        // API返回格式：{ code: 200, body: [...] }
        if (response && response.code === 200 && Array.isArray(response.body)) {
          // 将API返回的菜单数据转换为Ant Design Menu需要的格式
          const formattedMenuItems = formatMenuItems(response.body);
          setMenuItems(formattedMenuItems);
        } else {
          // API返回数据格式不正确，使用默认数据
          console.warn('API返回数据格式不正确，使用默认菜单数据', response);
          setMenuItems(defaultMenuItems);
          setMenuError('API返回数据格式不正确');
        }
      } catch (error) {
        console.warn('获取菜单数据失败，使用默认数据:', error.message);
        setMenuItems(defaultMenuItems);
        setMenuError(`获取菜单失败: ${error.message}`);
        
        // 可以尝试使用模拟数据（用于开发测试）
        try {
          const mockData = await getMockMedicalRecordMenu();
          let itemsToFormat;
          
          // 模拟数据有两种格式：新格式 { code: 200, body: [...] } 或旧格式 { menuItems: [...] }
          if (mockData && mockData.code === 200 && Array.isArray(mockData.body)) {
            itemsToFormat = mockData.body;
          } else if (mockData && mockData.menuItems && Array.isArray(mockData.menuItems)) {
            itemsToFormat = mockData.menuItems;
          }
          
          if (itemsToFormat) {
            const formattedMenuItems = formatMenuItems(itemsToFormat);
            setMenuItems(formattedMenuItems);
            setMenuError(null);
          }
        } catch (mockError) {
          console.error('连模拟数据也失败:', mockError);
        }
      } finally {
        setMenuLoading(false);
      }
    };

    fetchMenuData();
  }, []);

  // 格式化菜单项，将API返回的数据转换为Ant Design Menu需要的格式
  const formatMenuItems = (items) => {
    if (!items || !Array.isArray(items)) {
      return defaultMenuItems;
    }
    
    return items.map(item => {
      // 根据API返回的字段名映射
      const key = item.medicalRecordArchiveTpId || item.id || item.key;
      const label = item.name || item.label || '未命名';
      const code = item.code || '';
      
      // 根据code值确定图标类型
      let iconType;
      if (code === '-1' || code === '0' || code.startsWith('F')) {
        // -1或0开头或F开头可能是文件夹
        iconType = 'folder';
      } else if (parseInt(code) > 0) {
        // 正数可能是文件
        iconType = 'file-text';
      } else {
        iconType = 'folder';
      }
      
      // 构建格式化后的菜单项
      const formattedItem = {
        key: key,
        label: label,
        icon: iconType === 'folder' ? <FolderOutlined /> : <FileTextOutlined />
      };
      
      // 递归处理子菜单
      if (item.children && Array.isArray(item.children) && item.children.length > 0) {
        formattedItem.children = formatMenuItems(item.children);
      }
      
      return formattedItem;
    });
  };

  const selectedCount = documents.filter(doc => doc.isSelected).length;
  const classifiedCount = documents.filter(doc => doc.isClassified).length;
  const unclassifiedCount = documents.length - classifiedCount;

  // 拖拽排序处理函数
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
    // 添加拖拽中的样式
    setTimeout(() => {
      const draggedElement = e.target.closest('.document-card');
      if (draggedElement) {
        draggedElement.classList.add('dragging');
      }
    }, 0);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e) => {
    // 检查是否离开到子元素
    const relatedTarget = e.relatedTarget;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      handleDragEnd();
      return;
    }

    // 重新排序文档
    const newDocuments = [...documents];
    const draggedItem = newDocuments[draggedIndex];
    newDocuments.splice(draggedIndex, 1);
    newDocuments.splice(dropIndex, 0, draggedItem);

    setDocuments(newDocuments);
    message.success(`已将图片移动到第 ${dropIndex + 1} 位`);

    handleDragEnd();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    // 移除所有拖拽样式
    document.querySelectorAll('.document-card.dragging').forEach(el => {
      el.classList.remove('dragging');
    });
    document.querySelectorAll('.document-card.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
  };

  const handleMenuOpenChange = (keys) => {
    setExpandedMenus(keys);
  };

  const handleMenuClick = ({ key }) => {
    setSelectedMenu(key);
  };

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setDocuments(docs => docs.map(doc => ({
      ...doc,
      isSelected: newSelectAll
    })));
  };

  const handleSelectDocument = (docKey) => {
    setDocuments(docs => docs.map(doc => 
      doc.key === docKey 
        ? { ...doc, isSelected: !doc.isSelected }
        : doc
    ));
  };

  const handleDeleteDocument = (docKey) => {
    setDocuments(docs => docs.filter(doc => doc.key !== docKey));
    message.success('删除成功');
  };

  const handleStartScan = async () => {
    if (isScanning) {
      message.warning('正在扫描中，请稍候...');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    message.info('开始扫描...');

    // 尝试连接WebSocket并执行方法，如果失败则继续使用静态图片
    try {
      // 连接WebSocket服务器
      const ws = new WebSocket('ws://localhost:8080');
      
      // 等待连接建立
      await new Promise((resolve, reject) => {
        ws.onopen = () => {
          resolve();
        };
        ws.onerror = (error) => {
          console.error('WebSocket连接错误:', error);
          reject(new Error('WebSocket连接失败'));
        };
        ws.onclose = () => {
          reject(new Error('WebSocket连接被关闭'));
        };
      });

      // 调用第一个方法：开始扫描
      await new Promise((resolve, reject) => {
        ws.onmessage = (event) => {
          const response = JSON.parse(event.data);
          if (response.method === 'startScan') {
            if (response.success) {
              resolve();
            } else {
              reject(new Error('第一个方法执行失败'));
            }
          }
        };
        
        ws.send(JSON.stringify({ method: 'startScan' }));
      });

      // 调用第二个方法：加载图片
      await new Promise((resolve, reject) => {
        ws.onmessage = (event) => {
          const response = JSON.parse(event.data);
          if (response.method === 'loadImages') {
            if (response.success) {
              resolve();
            } else {
              reject(new Error('第二个方法执行失败'));
            }
          }
        };
        
        ws.send(JSON.stringify({ method: 'loadImages' }));
      });

      // 关闭WebSocket连接
      ws.close();
      message.info('WebSocket操作成功完成');
    } catch (error) {
      console.warn('WebSocket连接或操作失败，继续使用静态图片:', error);
      message.warning('WebSocket连接失败，使用静态图片继续扫描');
    }

    // 无论WebSocket是否成功，都加载静态TIF图片
    try {
      const categories = ['病案首页', '入院记录', '首次病程', '出院记录', '病程记录', '检验报告'];
      
      for (let i = 0; i < tifFileNames.length; i++) {
        const fileName = tifFileNames[i];
        const filePath = `/sample-tiffs/${fileName}`;
        const category = categories[i % categories.length];
        
        const imageUrl = await loadTifImage(filePath);
        
        setDocuments(prevDocs => [
          ...prevDocs,
          {
            key: `tif-${i}`,
            order: prevDocs.length + 1,
            category: category,
            image: imageUrl,
            fullImage: imageUrl,
            fileName: fileName,
            isSelected: false,
            isClassified: false
          }
        ]);
        
        setScanProgress(Math.round(((i + 1) / tifFileNames.length) * 100));
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      setTimeout(() => {
        setIsScanning(false);
        message.success(`扫描完成！共加载 ${tifFileNames.length} 张图片`);
      }, 500);
    } catch (error) {
      console.error('加载静态图片失败:', error);
      setIsScanning(false);
      message.error('加载静态图片失败，请检查图片文件');
    }
  };

  // 重试获取菜单数据
  const handleRetryMenu = async () => {
    setMenuLoading(true);
    setMenuError(null);
    
      try {
        console.log('重试获取菜单数据...');
        const response = await getMedicalRecordMenu();
        
        // API返回格式：{ code: 200, body: [...] }
        if (response && response.code === 200 && Array.isArray(response.body)) {
          const formattedMenuItems = formatMenuItems(response.body);
          setMenuItems(formattedMenuItems);
          console.log('菜单数据重试成功', formattedMenuItems.length, '项');
          message.success('菜单加载成功');
        } else {
          console.warn('API返回数据格式不正确，使用默认菜单数据', response);
          setMenuItems(defaultMenuItems);
          setMenuError('API返回数据格式不正确');
          message.warning('菜单数据格式错误，使用默认菜单');
        }
    } catch (error) {
      console.warn('重试获取菜单数据失败，使用默认数据:', error.message);
      setMenuItems(defaultMenuItems);
      setMenuError(`获取菜单失败: ${error.message}`);
      message.warning('菜单加载失败，使用默认菜单');
      
      // 尝试使用模拟数据
      try {
        const mockData = await getMockMedicalRecordMenu();
        let itemsToFormat;
        
        // 模拟数据有两种格式：新格式 { code: 200, body: [...] } 或旧格式 { menuItems: [...] }
        if (mockData && mockData.code === 200 && Array.isArray(mockData.body)) {
          itemsToFormat = mockData.body;
        } else if (mockData && mockData.menuItems && Array.isArray(mockData.menuItems)) {
          itemsToFormat = mockData.menuItems;
        }
        
        if (itemsToFormat) {
          const formattedMenuItems = formatMenuItems(itemsToFormat);
          setMenuItems(formattedMenuItems);
          setMenuError(null);
          message.info('使用模拟菜单数据');
        }
      } catch (mockError) {
        console.error('连模拟数据也失败:', mockError);
      }
    } finally {
      setMenuLoading(false);
    }
  };

  const handleInsertPage = async () => {
    const selectedDocs = documents.filter(doc => doc.isSelected);
    if (selectedDocs.length === 0) {
      message.warning('请先选择要在其后插入的图片');
      return;
    }

    try {
      const filePath = `/sample-tiffs/1.tiff`;
      const imageUrl = await loadTifImage(filePath);
      
      if (!imageUrl) {
        message.error('加载 1.tiff 失败');
        return;
      }

      const newDocument = {
        key: `tif-insert-${Date.now()}`,
        order: newDocuments.length + 1,
        category: '插入页面',
        image: imageUrl,
        fullImage: imageUrl,
        fileName: '1.tiff',
        isSelected: false,
        isClassified: false
      };

      const newDocuments = [...documents];
      selectedDocs.forEach(doc => {
        const index = newDocuments.findIndex(d => d.key === doc.key);
        if (index !== -1) {
          newDocuments.splice(index + 1, 0, { ...newDocument, key: `tif-insert-${Date.now()}-${index}` });
        }
      });

      setDocuments(newDocuments);
      message.success(`成功插入 ${selectedDocs.length} 张图片`);
    } catch (error) {
      console.error('插描失败:', error);
      message.error('插描失败');
    }
  };

  const handleRescan = async () => {
    const selectedDocs = documents.filter(doc => doc.isSelected);
    if (selectedDocs.length === 0) {
      message.warning('请先选择要替换的图片');
      return;
    }
    if (selectedDocs.length > 1) {
      message.warning('只能选择一张图片进行替扫');
      return;
    }

    try {
      const filePath = `/sample-tiffs/1.tiff`;
      const imageUrl = await loadTifImage(filePath);
      
      if (!imageUrl) {
        message.error('加载 1.tiff 失败');
        return;
      }

      const selectedDoc = selectedDocs[0];
      setDocuments(docs => docs.map(doc => 
        doc.key === selectedDoc.key 
          ? {
              ...doc,
              image: imageUrl,
              fullImage: imageUrl,
              fileName: '1.tiff',
              isClassified: false
            }
          : doc
      ));

      message.success('替扫成功');
    } catch (error) {
      console.error('替扫失败:', error);
      message.error('替扫失败');
    }
  };

  const handleSaveTemp = () => {
    message.success('扫描暂存成功');
  };

  const handleScanComplete = () => {
    Modal.confirm({
      title: '确认完成扫描？',
      content: `已完成 ${classifiedCount} 页文档的分类`,
      onOk() {
        message.success('扫描完成');
      }
    });
  };

  return (
    <Layout className="medical-record-scan">
      <div className="title-bar">
        <h1 className="page-title">病案扫描</h1>
        <span className="close-btn">×</span>
      </div>
      
      <div className="info-bar">
        <Row align="middle" justify="space-between" style={{ width: '100%' }}>
          <Col>
            <Space size="middle">
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
              <Button 
                type="primary"
                onClick={handleSelectAll}
                className="select-all-btn"
              >
                全选
              </Button>
              <Button 
                type="primary"
                disabled={selectedCount === 0}
                onClick={() => {
                  Modal.confirm({
                    title: '确认删除',
                    content: `确定要删除选中的 ${selectedCount} 张图片吗？`,
                    onOk() {
                      setDocuments(docs => docs.filter(doc => !doc.isSelected));
                      setSelectAll(false);
                      message.success(`删除成功，共删除 ${selectedCount} 张图片`);
                    }
                  });
                }}
              >
                删除
              </Button>
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

      <Layout className="main-content">
        <Sider width={260} className="left-sidebar">
          {menuLoading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Spin size="large" tip="加载菜单中..." />
            </div>
          ) : menuError ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#ff4d4f' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '16px' }}>⚠️</span>
              </div>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>菜单加载失败</div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>{menuError}</div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '12px' }}>已使用默认菜单</div>
              <Button 
                type="primary" 
                size="small"
                onClick={handleRetryMenu}
                style={{ marginTop: '8px' }}
              >
                重试
              </Button>
            </div>
          ) : (
            <Menu
              mode="inline"
              selectedKeys={[selectedMenu]}
              openKeys={expandedMenus}
              onOpenChange={handleMenuOpenChange}
              onClick={handleMenuClick}
              items={menuItems}
            />
          )}
        </Sider>

        <Content className="document-area">
          <div className="document-header">
            <div className="current-category">
              总览
              <span className="close-icon">×</span>
            </div>
          </div>
          
          <div className="document-grid">
            {documents.map((doc, index) => (
              <div
                key={doc.key}
                className={`document-card ${doc.isSelected ? 'selected' : ''} ${doc.isClassified ? 'classified' : ''} ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
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
            ))}
          </div>

          <div className="document-footer">
            <Space size="small">
              <span>共：{documents.length}页，</span>
              <span className="classified-count">已分类{classifiedCount}页（蓝色边框），</span>
              <span className="unclassified-count">未分类{unclassifiedCount}页</span>
            </Space>
          </div>
        </Content>
      </Layout>

      {previewImage && (
        <Image.PreviewGroup
          preview={{
            visible: !!previewImage,
            onVisibleChange: (visible) => {
              if (!visible) setPreviewImage(null);
            },
          }}
        >
          <Image src={previewImage} style={{ display: 'none' }} />
        </Image.PreviewGroup>
      )}
    </Layout>
  );
}

export default MedicalRecordScan;
