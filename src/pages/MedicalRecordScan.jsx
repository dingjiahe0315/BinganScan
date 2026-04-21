import React, { useState, useEffect } from 'react';
import { Layout, Checkbox, Button, Input, message, Modal, Row, Col, Space, Progress, Image, Upload } from 'antd';
import { SearchOutlined, FolderOutlined, FileTextOutlined } from '@ant-design/icons';
import './MedicalRecordScan.css';
import * as UTIF from 'utif';
import { getMedicalRecordMenu, saveScanMedRecordInfo } from '../api/menuApi';
import PatientInfoBar from '../components/PatientInfoBar';
import MenuSidebar from '../components/MenuSidebar';
import DocumentGrid from '../components/DocumentGrid';

const { Search } = Input;
const { Content, Sider } = Layout;

/**
 * 将Blob格式的图片转换为DataURL
 * @param {Blob|ArrayBuffer|string} blobData - 图片数据
 * @param {string} fileName - 文件名，用于判断图片格式
 * @param {string} mimeType - MIME类型（可选）
 * @returns {string|null} DataURL格式的图片数据
 */
const convertBlobToImage = async (blobData, fileName, mimeType = 'image/jpeg') => {
  try {
    const isTiff = fileName && (fileName.toLowerCase().endsWith('.tif') || fileName.toLowerCase().endsWith('.tiff'));
    let arrayBuffer;
    if (typeof blobData === 'string') {
      const binaryString = atob(blobData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
    } else if (blobData instanceof ArrayBuffer) {
      arrayBuffer = blobData;
    } else {
      arrayBuffer = await blobData.arrayBuffer();
    }

    if (isTiff) {
      const ifds = UTIF.decode(arrayBuffer);
      if (ifds && ifds.length > 0) {
        const ifd = ifds[0];
        const width = ifd.t256?.[0] || ifd.tifw || ifd.width;
        const height = ifd.t257?.[0] || ifd.tifh || ifd.height;
        if (!width || !height) throw new Error('无法获取TIF图片尺寸');
        UTIF.decodeImage(arrayBuffer, ifd);
        // if (!ifd.t259) ifd.t259 = [1];
        // if (!ifd.t258) ifd.t258 = [8, 8, 8, 8];
        // if (!ifd.t277) ifd.t277 = [4];
        const rgba = UTIF.toRGBA8(ifd);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(width, height);
        imageData.data.set(rgba);
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.92);
      }
      throw new Error('无法解析 TIF 文件');
    } else {
      const uint8Array = new Uint8Array(arrayBuffer);
      let base64 = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        base64 += String.fromCharCode(...chunk);
      }
      return `data:${mimeType};base64,${btoa(base64)}`;
    }
  } catch (error) {
    console.error('转换图片失败:', error);
    return null;
  }
};

function MedicalRecordScan() {
  const [medicalRecordArchiveId, setMedicalRecordArchiveId] = useState('');
  const [selectedMenu, setSelectedMenu] = useState('overview');
  const [expandedMenus, setExpandedMenus] = useState(['discharge-related', 'progress-note']);
  const [documents, setDocuments] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState(null);
  const [rawMenuData, setRawMenuData] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState(null);
  const [scanEnabled, setScanEnabled] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [draggedDocumentKey, setDraggedDocumentKey] = useState(null);
  const [selectedMenuKey, setSelectedMenuKey] = useState(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  useEffect(() => {
    const fetchMenuData = async () => {
      setMenuLoading(true);
      setMenuError(null);
      try {
        const response = await getMedicalRecordMenu();
        if (response && response.success && Array.isArray(response.data)) {
          setRawMenuData(response.data);
          setMenuItems(formatMenuItems(response.data));
          setScanEnabled(true);
        } else {
          console.warn('API返回数据格式不正确', response);
          setMenuItems([]);
          setMenuError('API返回数据格式不正确');
          setScanEnabled(false);
        }
      } catch (error) {
        console.warn('获取菜单数据失败:', error.message);
        setMenuItems([]);
        setMenuError(`获取菜单失败: ${error.message}`);
        setScanEnabled(false);
      } finally {
        setMenuLoading(false);
      }
    };
    fetchMenuData();
  }, []);

  useEffect(() => {
    if (rawMenuData.length > 0) {
      setMenuItems(formatMenuItems(rawMenuData));
    }
  }, [documents]);

  const getBoundCountForMenu = (menuCode) => {
    return documents.filter(doc => doc.menuCode && doc.menuCode === menuCode).length;
  };

  const formatMenuItems = (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) return [];
    const formattedItems = items.map(item => {
      const code = String(item.code || item.medicalRecordArchiveTpId || item.id || item.key);
      const key = code;
      const name = item.name || item.label || '未命名';
      const boundCount = getBoundCountForMenu(code);
      const label = (
        <div
          className={`menu-drop-zone ${boundCount > 0 ? 'menu-item-bound' : ''}`}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('menu-drop-hover'); }}
          onDragEnter={(e) => { e.preventDefault(); e.currentTarget.classList.add('menu-drop-hover'); }}
          onDragLeave={(e) => { e.currentTarget.classList.remove('menu-drop-hover'); }}
          onDrop={(e) => {
            e.stopPropagation();
            const docKey = e.dataTransfer.getData('documentKey');
            if (!docKey) return;
            setDocuments(docs => {
              const boundDocs = docs.filter(doc => doc.menuCode === key);
              const pageNumber = boundDocs.length + 1;
              return docs.map(doc => doc.key === docKey ? { ...doc, menuCode: key, menuTpId: item.medicalRecordArchiveTpId || '', isClassified: true, pageNumber } : doc);
            });
            setDraggedDocumentKey(null);
            message.success('图片已绑定到菜单项');
          }}
          onDragEnd={() => { document.querySelectorAll('.menu-drop-hover').forEach(el => el.classList.remove('menu-drop-hover')); }}
        >
          <span>{name}</span>
        </div>
      );
      const children = item.children ? formatMenuItems(item.children) : null;
      const hasChildren = item.children !== undefined && Array.isArray(item.children);
      return {
        key, label, icon: hasChildren ? <FolderOutlined /> : <FileTextOutlined />,
        menuCode: code, menuTpId: item.medicalRecordArchiveTpId || '', className: boundCount > 0 ? 'menu-item-bound' : '',
        ...(hasChildren ? { children } : {})
      };
    });
    return formattedItems.sort((a, b) => {
      const origA = items.find(i => String(i.code || i.medicalRecordArchiveTpId || i.id || i.key) === a.key);
      const origB = items.find(i => String(i.code || i.medicalRecordArchiveTpId || i.id || i.key) === b.key);
      if (!origA || !origB) return 0;
      const aNum = origA.serialNumber !== undefined ? origA.serialNumber : parseInt(origA.code) || parseFloat(origA.code) || 0;
      const bNum = origB.serialNumber !== undefined ? origB.serialNumber : parseInt(origB.code) || parseFloat(origB.code) || 0;
      return aNum - bNum;
    });
  };

  const fetchImagesFromWebSocket = (params = {}) => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('ws://localhost:8080');
      ws.binaryType = 'blob';
      ws.onopen = () => { ws.send(`startScan:${JSON.stringify(params)}`); };
      const receivedImages = [];
      let timeoutId = null;
      let closeReceived = false;
      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          const text = event.data.toLowerCase();
          if (text.includes('completed') || text.includes('finished') || text.includes('done')) {
            clearTimeout(timeoutId);
            closeReceived = true;
            ws.close();
            resolve(receivedImages);
          }
          return;
        }
        if (event.data instanceof Blob) {
          receivedImages.push({ blob: event.data, fileName: `image-${receivedImages.length}.tif` });
        }
      };
      ws.onclose = () => { closeReceived = true; clearTimeout(timeoutId); resolve(receivedImages); };
      ws.onerror = () => { clearTimeout(timeoutId); reject(new Error('WebSocket连接失败')); };
      timeoutId = setTimeout(() => {
        if (!closeReceived) { ws.close(); reject(new Error('接收图片超时')); }
      }, 60000);
    });
  };

  const handleStartScan = async () => {
    if (isScanning) { message.warning('正在扫描中，请稍候...'); return; }
    setIsScanning(true);
    setScanProgress(0);
    message.info('开始扫描...');
    try {
      const params = {};
      const imagesData = await fetchImagesFromWebSocket(params);
      console.log('获取到的图片数据', imagesData);
      if (imagesData.length === 0) { message.warning('未获取到扫描图片'); setIsScanning(false); return; }
      message.info('图片数据接收完成');
      for (let i = 0; i < imagesData.length; i++) {
        const imageData = imagesData[i];
        const fileName = imageData.fileName || `image-${i}.tif`;
        const imageUrl = await convertBlobToImage(imageData.blob, fileName, 'image/tiff');
        if (!imageUrl) continue;
        setDocuments(prev => [...prev, { key: `ws-${i}-${Date.now()}`, order: prev.length + 1, image: imageUrl, fullImage: imageUrl, fileName, isSelected: false, isClassified: false }]);
        setScanProgress(Math.round(((i + 1) / imagesData.length) * 100));
        await new Promise(r => setTimeout(r, 300));
      }
      setTimeout(() => { setIsScanning(false); message.success(`扫描完成！共加载 ${imagesData.length} 张图片`); }, 500);
    } catch (error) {
      console.error('处理图片数据失败:', error);
      setIsScanning(false);
      message.warning('扫描已取消');
    }
  };

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setDocuments(docs => docs.map(doc => ({ ...doc, isSelected: newSelectAll })));
  };

  const handleSelectDocument = (docKey) => {
    setDocuments(docs => docs.map(doc => doc.key === docKey ? { ...doc, isSelected: !doc.isSelected } : doc));
  };

  const handleDeleteDocument = (docKey) => {
    setDocuments(docs => docs.filter(doc => doc.key !== docKey));
    message.success('删除成功');
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
    setTimeout(() => { e.target.closest('.document-card')?.classList.add('dragging'); }, 0);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) setDragOverIndex(index);
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) setDragOverIndex(index);
  };

  const handleDragLeave = (e) => {
    const relatedTarget = e.relatedTarget;
    if (!e.currentTarget.contains(relatedTarget)) setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) { handleDragEnd(); return; }
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
    document.querySelectorAll('.document-card.dragging, .document-card.drag-over').forEach(el => el.classList.remove('dragging', 'drag-over'));
  };

  const handleDocumentDragStartToMenu = (e, docKey) => {
    setDraggedDocumentKey(docKey);
    e.dataTransfer.setData('documentKey', docKey);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleMenuDragEnd = () => {
    setDraggedDocumentKey(null);
    document.querySelectorAll('.menu-drop-hover').forEach(el => el.classList.remove('menu-drop-hover'));
  };

  const handleMenuOpenChange = (keys) => { setExpandedMenus(keys); };

  const handleMenuClick = ({ key }) => {
    const findMenuItem = (items, targetKey) => {
      for (const menuItem of items) {
        if (menuItem.key === targetKey) return menuItem;
        if (menuItem.children) { const found = findMenuItem(menuItem.children, targetKey); if (found) return found; }
      }
      return null;
    };
    const clickedItem = findMenuItem(menuItems, key);
    if (clickedItem && !clickedItem.children) {
      setSelectedMenuKey(clickedItem.menuCode || key);
      setSelectedMenu(key);
    } else {
      setSelectedMenuKey(null);
      setSelectedMenu(key);
    }
  };

  const filteredDocuments = selectedMenuKey
    ? documents.filter(doc => doc.menuCode && doc.menuCode === selectedMenuKey)
    : documents;

  const handleInsertPage = async () => {
    const selectedDocs = documents.filter(doc => doc.isSelected);
    if (selectedDocs.length === 0) { message.warning('请先选择要在其后插入的图片'); return; }
    try {
      setIsScanning(true);
      setScanProgress(0);
      message.info('正在获取插入图片...');
      const imagesData = await fetchImagesFromWebSocket({});
      if (imagesData.length === 0) { message.warning('未获取到插入图片'); setIsScanning(false); return; }
      const imageUrl = await convertBlobToImage(imagesData[0].blob, imagesData[0].fileName, 'image/tiff');
      if (!imageUrl) { message.error('图片转换失败'); setIsScanning(false); return; }
      const newDocuments = [...documents];
      let insertCount = 0;
      selectedDocs.forEach(doc => {
        const index = newDocuments.findIndex(d => d.key === doc.key);
        if (index !== -1) {
          newDocuments.splice(index + 1, 0, { key: `ws-insert-${Date.now()}-${insertCount}`, order: newDocuments.length + 1, image: imageUrl, fullImage: imageUrl, fileName: imagesData[0].fileName, isSelected: false, isClassified: false });
          insertCount++;
        }
      });
      setDocuments(newDocuments);
      setIsScanning(false);
      message.success(`成功插入 ${insertCount} 张图片`);
    } catch (error) {
      console.error('插描失败:', error);
      setIsScanning(false);
      message.error('插描失败');
    }
  };

  const handleRescan = async () => {
    const selectedDocs = documents.filter(doc => doc.isSelected);
    if (selectedDocs.length === 0) { message.warning('请先选择要替换的图片'); return; }
    if (selectedDocs.length > 1) { message.warning('只能选择一张图片进行替扫'); return; }
    try {
      setIsScanning(true);
      setScanProgress(0);
      message.info('正在获取替扫图片...');
      const imagesData = await fetchImagesFromWebSocket({});
      if (imagesData.length === 0) { message.warning('未获取到替扫图片'); setIsScanning(false); return; }
      const imageUrl = await convertBlobToImage(imagesData[0].blob, imagesData[0].fileName, 'image/tiff');
      if (!imageUrl) { message.error('图片转换失败'); setIsScanning(false); return; }
      const selectedDoc = selectedDocs[0];
      setDocuments(docs => docs.map(doc => doc.key === selectedDoc.key ? { ...doc, image: imageUrl, fullImage: imageUrl, fileName: imagesData[0].fileName, isClassified: false } : doc));
      setIsScanning(false);
      message.success('替扫成功');
    } catch (error) {
      console.error('替扫失败:', error);
      setIsScanning(false);
      message.error('替扫失败');
    }
  };

  const handleSaveTemp = () => {
    if (documents.length === 0) {
      message.warning('没有可上传的图片');
      return;
    }
    setUploadModalVisible(true);
  };

  const handleUploadModalCancel = () => {
    setUploadModalVisible(false);
  };

  const uploadFileList = documents.map((doc, index) => ({
    uid: doc.key,
    name: doc.fileName || `image-${index}.tif`,
    status: 'done',
    thumbUrl: doc.fullImage || doc.image,
    url: doc.fullImage || doc.image,
  }));

  const dataUrlToBlob = (dataUrl, fileName) => {
    const [header, base64] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/tiff';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  };

  const handleUploadAll = async () => {
    if (documents.length === 0) { message.warning('没有可上传的图片'); return; }
    setUploadComplete(false);
    let uploadedDocs = [...documents];
    try {
      for (let i = 0; i < uploadedDocs.length; i++) {
        const doc = uploadedDocs[i];
        const blob = dataUrlToBlob(doc.fullImage || doc.image, doc.fileName || `image-${i}.tif`);
        const formData = new FormData();
        formData.append('files', blob, doc.fileName || `image-${i}.tif`);
        const response = await fetch('/upload', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.code === 0 || result.success) {
          uploadedDocs[i] = { ...uploadedDocs[i], fileId: result.data?.reocrd?.fileId || result?.record?.fileId };
          message.success(`第 ${i + 1}/${documents.length} 张图片上传成功`);
        } else {
          throw new Error(result.message || `第 ${i + 1} 张图片上传失败`);
        }
      }
      console.log('上传后补充fileId信息', uploadedDocs);
      setDocuments(uploadedDocs);
      setUploadModalVisible(false);
      setUploadComplete(true);
      message.success(`成功上传 ${documents.length} 张图片`);
    } catch (error) {
      console.error('上传失败:', error);
      message.error(`上传失败: ${error.message}`);
      setUploadComplete(false);
    }
  };

  const handleScanComplete = () => {
    if (!medicalRecordArchiveId) {
      message.error("未获取到患者的medicalRecordArchiveId！");
      return;
    }
    if (documents.length === 0) {
      message.error("未获取到图像数据！");
      return;
    }
    Modal.confirm({
      title: '确认保存所有图像？',
      content: `您共有 ${documents.length} 页图片，确认提交？`,
      okText: '确认提交',
      cancelText: '取消',
      onOk: async () => {
        try {
          const params = {
            medicalRecordArchiveId: medicalRecordArchiveId,
            medScanRecordFileVOList: documents.map((doc) => ({
              medicalRecordArchiveTpId: doc.menuTpId,
              medicalRecordArchiveTpCode: doc.menuCode,
              fileId: doc.fileId,
              scanTypeCode: "1",
              pageNumber: doc.pageNumber
            })),
            medicalRecordArchiveScanStatusCode: "1"
          };
          const response = await saveScanMedRecordInfo(params);
          console.log('response', response);
          if (response.success) {
            setMedicalRecordArchiveId('');
            setDocuments([]);
            setSelectAll(false);
            setSelectedMenuKey(null);
            setSelectedMenu('overview');
            setExpandedMenus(['discharge-related', 'progress-note']);
            setPreviewImage('图像已保存');
          } else {
            throw new Error(result?.message || "保存失败");
          }
        } catch (error) {
          console.warn('保存图像数据失败:', error.message);
          message.error(`保存图像数据失败: ${error.message}`);
        }
      }
    });
  };

  const handleDeleteSelected = () => {
    const selectedDocs = documents.filter(doc => doc.isSelected);
    if (selectedDocs.length === 0) { message.warning('请先选择要删除的图片'); return; }
    Modal.confirm({
      title: '确认删除？',
      content: `确认删除选中的 ${selectedDocs.length} 张图片？`,
      okText: '确认删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        setDocuments(docs => docs.filter(doc => !doc.isSelected));
        setSelectAll(false);
        message.success(`已删除 ${selectedDocs.length} 张图片`);
      }
    });
  };

  const selectedCount = documents.filter(doc => doc.isSelected).length;
  const classifiedCount = documents.filter(doc => doc.isClassified).length;
  const unclassifiedCount = documents.length - classifiedCount;

  return (
    <Layout className="medical-record-scan">
      <PatientInfoBar
        medicalRecordArchiveId={medicalRecordArchiveId}
        setMedicalRecordArchiveId={setMedicalRecordArchiveId}
        onScan={handleStartScan}
        onInsertPage={handleInsertPage}
        onRescan={handleRescan}
        onUploadClick={handleSaveTemp}
        onComplete={handleScanComplete}
        onDeleteSelected={handleDeleteSelected}
        onSelectAll={handleSelectAll}
        selectedCount={selectedCount}
        isScanning={isScanning}
        scanProgress={scanProgress}
        scanEnabled={scanEnabled}
        uploadComplete={uploadComplete}
        visitType={'114'}
      />

      <Layout className="main-content">
        <Sider width={260} className="left-sidebar">
          <MenuSidebar
            menuItems={menuItems}
            menuLoading={menuLoading}
            menuError={menuError}
            selectedMenuKey={selectedMenuKey}
            selectedMenu={selectedMenu}
            expandedMenus={expandedMenus}
            onMenuOpenChange={handleMenuOpenChange}
            onMenuClick={handleMenuClick}
          />
        </Sider>

        <Content>
          <DocumentGrid
            filteredDocuments={filteredDocuments}
            documents={documents}
            selectedMenuKey={selectedMenuKey}
            selectedMenu={selectedMenu}
            setSelectedMenuKey={setSelectedMenuKey}
            setSelectedMenu={setSelectedMenu}
            classifiedCount={classifiedCount}
            unclassifiedCount={unclassifiedCount}
            draggedIndex={draggedIndex}
            dragOverIndex={dragOverIndex}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onSelectDocument={handleSelectDocument}
            onDeleteDocument={handleDeleteDocument}
            onDocumentDragStartToMenu={handleDocumentDragStartToMenu}
            onMenuDragEnd={handleMenuDragEnd}
            setPreviewImage={setPreviewImage}
          />
        </Content>
      </Layout>

      {previewImage && (
        <Image.PreviewGroup
          preview={{
            visible: !!previewImage,
            onVisibleChange: (visible) => { if (!visible) setPreviewImage(null); }
          }}
        >
          <Image src={previewImage} style={{ display: 'none' }} />
        </Image.PreviewGroup>
      )}

      <Modal
        title="扫描上传"
        open={uploadModalVisible}
        onCancel={handleUploadModalCancel}
        footer={[
          <Button key="cancel" onClick={handleUploadModalCancel}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleUploadAll}>
            确认上传
          </Button>,
        ]}
        width={600}
      >
        <Upload
          listType="picture"
          fileList={uploadFileList}
          showUploadList={{ showPreviewIcon: false, showRemoveIcon: false, showDownloadIcon: false }}
          beforeUpload={() => false}
        />
        <div style={{ marginTop: 12, fontSize: 13, color: '#666' }}>
          共 <strong>{documents.length}</strong> 张图片，文件类型：.tif / .tiff
        </div>
      </Modal>
    </Layout>
  );
}

export default MedicalRecordScan;
