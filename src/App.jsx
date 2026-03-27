/**
 * 应用主入口文件
 * 文件位置：src/App.jsx
 * 
 * 路由配置：
 * - '/' 重定向到 '/data-management'（病案扫描数据管理页面）
 * - '/scan' 病案扫描页面（文档预览）
 * - '/data-management' 病案扫描数据管理页面（表格检索）
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MedicalRecordScan from './pages/MedicalRecordScan';
import ScanDataManagement from './pages/ScanDataManagement';

/**
 * 应用根组件
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 默认路由重定向到病案扫描数据管理页面 */}
        <Route path="/" element={<Navigate to="/data-management" replace />} />
        {/* 病案扫描页面路由（文档预览） */}
        <Route path="/scan" element={<MedicalRecordScan />} />
        {/* 病案扫描数据管理页面路由（表格检索） */}
        <Route path="/data-management" element={<ScanDataManagement />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
